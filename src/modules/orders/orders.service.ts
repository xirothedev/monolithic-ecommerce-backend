import { PaymentService } from '@/modules/payment/payment.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillStatus, BillType, Prisma, SelectFrom } from '@prisma/generated';
import { Request } from 'express';
import { CreateOrderFromCartDto } from './dto/create-order-from-cart.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllOrdersDto } from './dto/find-all-orders.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { OrdersScheduler } from './orders.scheduler';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly paymentService: PaymentService,
    private readonly ordersScheduler: OrdersScheduler,
  ) {}

  async manualCleanupExpiredOrders() {
    console.log('Manual cleanup triggered');
    await this.ordersScheduler.performCleanup();
  }

  async getExpiredOrdersCount() {
    const cleanupThresholdMinutes = 15;
    const fifteenMinutesAgo = new Date(Date.now() - cleanupThresholdMinutes * 60 * 1000);

    const count = await this.prismaService.order.count({
      where: {
        createdAt: {
          lt: fifteenMinutesAgo,
        },
        bill: {
          status: BillStatus.PENDING,
        },
      },
    });

    return {
      expiredOrdersCount: count,
      thresholdMinutes: cleanupThresholdMinutes,
      currentTime: new Date(),
      thresholdTime: fifteenMinutesAgo,
    };
  }

  public async create(req: Request, body: CreateOrderDto) {
    const user = req.user;

    let totalPrice = 0;
    const orderItems: Omit<Prisma.OrderItemCreateManyInput, 'orderId'>[] = [];

    // validation
    for (const item of body.items) {
      const product = await this.prismaService.product.findUnique({
        where: {
          id: item.productId,
          isActive: true,
        },
        include: {
          productItems: {
            where: { isSold: false },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found or inactive`);
      }

      if (product.productItems.length === 0) {
        // Product sử dụng stock thủ công
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}. Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }
      } else {
        // Product sử dụng stock dựa trên productItems
        const availableProductItems = product.productItems.filter((pi) => !pi.isSold);

        if (item.productItemId) {
          // Kiểm tra productItem cụ thể có tồn tại và chưa bán không
          const specificProductItem = availableProductItems.find((pi) => pi.id === item.productItemId);
          if (!specificProductItem) {
            throw new BadRequestException(
              `Product item ${item.productItemId} is not available for product ${item.productId}`,
            );
          }
        } else {
          // Không có productItem cụ thể - kiểm tra có đủ productItems không
          if (availableProductItems.length === 0) {
            throw new BadRequestException(`Product ${item.productId} is sold out`);
          }
        }
      }

      const itemPrice = product.discountPrice * item.quantity;
      totalPrice += itemPrice;

      const orderItem: Omit<Prisma.OrderItemCreateManyInput, 'orderId'> = {
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        from: item.from,
      };

      if (item.productItemId) {
        orderItem.productItemId = item.productItemId;
      }

      orderItems.push(orderItem);
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      // create bill
      const bill = await tx.bill.create({
        data: {
          userId: user.id,
          type: BillType.MONEY_IN,
          status: BillStatus.PENDING,
          paymentMethod: body.paymentMethod,
          amount: totalPrice,
          note: body.note || '',
        },
      });

      console.log(orderItems);

      // create order
      const order = await tx.order.create({
        data: {
          userId: user.id,
          totalPrice,
          billId: bill.id,
          items: {
            createMany: {
              data: orderItems,
            },
          },
        },
        include: {
          items: {
            include: {
              product: true,
              productItem: true,
            },
          },
          bill: true,
        },
      });

      try {
        const paymentResult = await this.paymentService.createPayment(order);

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            transactionId: paymentResult.orderCode.toString(),
          },
        });

        return paymentResult;
      } catch (error) {
        console.error('Failed to create payment link:', error);
        throw new BadRequestException('Failed to create payment link');
      }
    });

    return {
      message: 'Order created successfully',
      data: result,
    };
  }

  public async createFromCart(req: Request, body: CreateOrderFromCartDto) {
    const user = req.user;

    // Get cart items
    const cartItems = await this.prismaService.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            discountPrice: true,
            stock: true,
            isActive: true,
            productItems: {
              where: { isSold: false },
            },
          },
        },
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Convert cart items to order items
    const orderItems = cartItems.map((cartItem) => {
      if (!cartItem.product.isActive) {
        throw new BadRequestException(`Product ${cartItem.product.id} is no longer active`);
      }

      const product = cartItem.product;

      if (product.productItems.length === 0) {
        // Product sử dụng stock thủ công
        if (product.stock < cartItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.id}. Available: ${product.stock}, Requested: ${cartItem.quantity}`,
          );
        }
        return {
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          from: SelectFrom.CART,
        };
      } else {
        // Product sử dụng stock dựa trên productItems
        const availableProductItems = product.productItems.filter((pi) => !pi.isSold);
        if (availableProductItems.length === 0) {
          throw new BadRequestException(`Product ${product.id} is sold out`);
        }

        return {
          productId: cartItem.productId,
          productItemId: availableProductItems[0].id,
          quantity: cartItem.quantity,
          from: SelectFrom.CART,
        };
      }
    });

    // Create order using existing create method
    const createOrderDto: CreateOrderDto = {
      items: orderItems,
      paymentMethod: body.paymentMethod,
      note: body.note,
      from: SelectFrom.CART,
    };

    return this.create(req, createOrderDto);
  }

  public async findAll(req: Request, query: FindAllOrdersDto) {
    const user = req.user;
    const { page, limit, cursor, status, search, startDate, endDate } = query;
    const take = limit ?? 20;
    let skip: number | undefined = undefined;
    let cursorObj: Prisma.OrderWhereUniqueInput | undefined = undefined;

    // Handle pagination
    if (cursor) {
      cursorObj = { id: cursor };
      skip = 1;
    } else if (page && page > 1) {
      skip = (page - 1) * take;
    }

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      userId: user.id,
    };

    if (status) {
      where.bill = { status };
    }

    if (search) {
      where.items = {
        some: {
          product: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await this.prismaService.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                medias: true,
                discountPrice: true,
              },
            },
          },
        },
        bill: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      skip,
      ...(cursorObj && { cursor: cursorObj }),
    });

    const totalItems = await this.prismaService.order.count({ where });

    let nextCursor: string | null = null;
    let hasNextPage = false;
    let result = orders;

    if (orders.length > take) {
      hasNextPage = true;
      const nextItem = orders[take];
      nextCursor = nextItem?.id ?? null;
      result = orders.slice(0, take);
    }

    return {
      message: 'Get orders successful',
      data: result,
      '@data': {
        totalItems,
        nextCursor,
        hasNextPage,
      },
    };
  }

  public async findSellerOrders(req: Request, query: FindAllOrdersDto) {
    const seller = req.user;
    const { page, limit, cursor, status, search, startDate, endDate } = query;
    const take = limit ?? 20;
    let skip: number | undefined = undefined;
    let cursorObj: Prisma.OrderWhereUniqueInput | undefined = undefined;

    // Handle pagination
    if (cursor) {
      cursorObj = { id: cursor };
      skip = 1;
    } else if (page && page > 1) {
      skip = (page - 1) * take;
    }

    const where: Prisma.OrderWhereInput = {
      items: {
        some: {
          product: {
            sellerId: seller.id,
          },
        },
      },
    };

    if (status) {
      where.bill = { status };
    }

    if (search) {
      where.items = {
        some: {
          product: {
            sellerId: seller.id,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await this.prismaService.order.findMany({
      where,
      include: {
        items: {
          where: {
            product: { sellerId: seller.id },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                medias: true,
                discountPrice: true,
              },
            },
          },
        },
        bill: true,
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      skip,
      ...(cursorObj && { cursor: cursorObj }),
    });

    const totalItems = await this.prismaService.order.count({ where });

    let nextCursor: string | null = null;
    let hasNextPage = false;
    let result = orders;

    if (orders.length > take) {
      hasNextPage = true;
      const nextItem = orders[take];
      nextCursor = nextItem?.id ?? null;
      result = orders.slice(0, take);
    }

    return {
      message: 'Get seller orders successful',
      data: result,
      '@data': {
        totalItems,
        nextCursor,
        hasNextPage,
      },
    };
  }

  public async findOne(req: Request, id: string) {
    const user = req.user;

    const order = await this.prismaService.order.findFirst({
      where: {
        id,
        OR: [{ userId: user.id }, { items: { some: { product: { sellerId: user.id } } } }],
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    fullname: true,
                  },
                },
              },
            },
            productItem: true,
          },
        },
        bill: true,
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      message: 'Get order successful',
      data: order,
    };
  }

  public async getOrderItems(req: Request, orderId: string) {
    const user = req.user;

    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: user.id }, { items: { some: { product: { sellerId: user.id } } } }],
      },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderItems = await this.prismaService.orderItem.findMany({
      where: { orderId },
      include: {
        product: {
          include: {
            category: true,
            seller: {
              select: {
                id: true,
                fullname: true,
              },
            },
          },
        },
        productItem: true,
      },
    });

    return {
      message: 'Get order items successful',
      data: orderItems,
    };
  }

  public async cancel(req: Request, orderId: string) {
    const user = req.user;

    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: {
        bill: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.bill.status !== BillStatus.PENDING) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    try {
      await this.prismaService.$transaction(async (tx) => {
        // Update bill status
        await tx.bill.update({
          where: { id: order.billId },
          data: { status: BillStatus.CANCELLED },
        });

        // Restore product items and stock
        for (const item of order.items) {
          await tx.productItem.update({
            where: { id: item.productItemId ?? undefined },
            data: { isSold: false },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              sold: { decrement: item.quantity },
            },
          });
        }
      });

      return {
        message: 'Order cancelled successfully',
      };
    } catch {
      throw new BadRequestException('Failed to cancel order');
    }
  }

  public async refund(orderId: string) {
    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
      },
      include: {
        bill: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.bill.status !== BillStatus.DONE) {
      throw new BadRequestException('Order cannot be refunded');
    }

    try {
      await this.prismaService.$transaction(async (tx) => {
        // Update bill status
        await tx.bill.update({
          where: { id: order.billId },
          data: { status: BillStatus.REFUNDED },
        });

        // Restore product items and stock
        for (const item of order.items) {
          await tx.productItem.update({
            where: { id: item.productItemId ?? undefined },
            data: { isSold: false },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              sold: { decrement: item.quantity },
            },
          });
        }
      });

      return {
        message: 'Order refunded successfully',
      };
    } catch {
      throw new BadRequestException('Failed to refund order');
    }
  }

  public async generateInvoice(req: Request, orderId: string): Promise<Buffer> {
    const user = req.user;

    // Get order with all details
    const order = await this.prismaService.order.findFirst({
      where: {
        id: orderId,
        userId: user.id, // Only allow users to download their own invoices
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    fullname: true,
                  },
                },
              },
            },
          },
        },
        bill: true,
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    // Only allow invoice download for completed orders
    if (order.bill.status !== BillStatus.DONE) {
      throw new BadRequestException('Invoice is only available for completed orders');
    }

    return this.pdfGeneratorService.generateInvoicePDF(order);
  }
}
