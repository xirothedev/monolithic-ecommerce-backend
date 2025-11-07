import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentLinkResponse, Webhook, PayOS } from '@payos/node';
import type { Bill, Order, OrderItem, Prisma, PrismaClient, Product } from 'prisma/generated';
import { PayOSPaymentData } from './payment.interface';
import { PrismaService } from '@/prisma/prisma.service';
import { BillStatus } from '@prisma/generated';
import { PaymentData, WebhookDto } from './dto/webook.dto';
import { DefaultArgs } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private payOS: PayOS;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const clientId = configService.getOrThrow('PAYOS_CLIENT_ID');
    const apiKey = configService.getOrThrow('PAYOS_API_KEY');
    const checksumKey = configService.getOrThrow('PAYOS_CHECKSUM_KEY');

    this.payOS = new PayOS({ clientId, apiKey, checksumKey });
  }

  async handlePaymentWebhook(webhookData: WebhookDto) {
    try {
      if (!this.verifyWebhookData(webhookData)) {
        this.logger.error('Webhook signature verification failed');
        return { success: false, message: 'Invalid signature' };
      }

      const { success, data } = webhookData;
      const orderCode = data.orderCode;

      this.logger.log(`Processing payment for order code: ${orderCode}, success: ${success}`);

      const bill = await this.prismaService.bill.findFirst({
        where: {
          transactionId: orderCode.toString(),
        },
        include: {
          order: true,
        },
      });

      if (!bill) {
        this.logger.error(`Bill not found for order code: ${orderCode}`);
        return { success: false, message: 'Bill not found' };
      }

      if (bill.amount !== data.amount) {
        this.logger.error(`Amount mismatch for bill ${bill.id}: expected ${bill.amount}, received ${data.amount}`);
        return { success: false, message: 'Amount mismatch' };
      }

      if (success) {
        await this.handleSuccessfulPayment(bill, data);
      } else {
        await this.handleFailedPayment(bill, data);
      }

      return { success: true, message: 'Payment processed successfully' };
    } catch (error) {
      this.logger.error('Error processing payment webhook:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  private async handleSuccessfulPayment(bill: Bill & { order: Order | null }, paymentData: PaymentData) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await tx.bill.update({
          where: { id: bill.id },
          data: {
            status: BillStatus.DONE,
            transactionId: paymentData.reference,
            updatedAt: new Date(),
          },
        });

        if (bill.order) {
          this.logger.log(`Payment successful for order: ${bill.order.id}`);

          await this.updateProductStock(tx, bill.order.id);
        }
      });

      this.logger.log(`Payment successful for bill: ${bill.id}, amount: ${paymentData.amount}`);
    } catch (error) {
      this.logger.error(`Error updating successful payment for bill ${bill.id}:`, error);
      throw error;
    }
  }

  private async updateProductStock(
    tx: Omit<
      PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
    orderId: string,
  ) {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      include: {
        product: {
          include: {
            productItems: {
              where: { isSold: false },
            },
          },
        },
        productItem: true,
      },
    });

    for (const item of orderItems) {
      const product = item.product;

      if (product.productItems.length > 0) {
        // Product có productItems - sử dụng stock dựa trên productItems
        if (item.productItem) {
          // Có productItem cụ thể - đánh dấu là đã bán
          await tx.productItem.update({
            where: { id: item.productItem.id },
            data: { isSold: true },
          });
          this.logger.log(`Marked productItem ${item.productItem.id} as sold for order: ${orderId}`);
        } else {
          // Không có productItem cụ thể - lấy productItem đầu tiên chưa bán
          const availableProductItem = product.productItems[0];
          if (availableProductItem) {
            await tx.productItem.update({
              where: { id: availableProductItem.id },
              data: { isSold: true },
            });
            this.logger.log(`Marked productItem ${availableProductItem.id} as sold for order: ${orderId}`);
          } else {
            this.logger.warn(`No available productItems for product ${product.id} in order: ${orderId}`);
          }
        }
      } else {
        // Product không có productItems - sử dụng stock thủ công
        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
        this.logger.log(`Decremented manual stock by ${item.quantity} for product ${product.id} in order: ${orderId}`);
      }
    }

    this.logger.log(`Updated stock for order: ${orderId}`);
  }

  private async handleFailedPayment(bill: any, paymentData: any) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await tx.bill.update({
          where: { id: bill.id },
          data: {
            status: BillStatus.FAILED,
            updatedAt: new Date(),
          },
        });

        if (bill.order) {
          this.logger.log(`Payment failed for order: ${bill.order.id}`);
        }
      });

      this.logger.log(`Payment failed for bill: ${bill.id}, amount: ${paymentData.amount}`);
    } catch (error) {
      this.logger.error(`Error updating failed payment for bill ${bill.id}:`, error);
      throw error;
    }
  }

  async createPayment(
    order: Order & { items: (OrderItem & { product: Product })[] },
  ): Promise<CreatePaymentLinkResponse> {
    try {
      const orderCode = this.generateOrderCode();

      const paymentData: PayOSPaymentData = {
        orderCode,
        amount: Math.round(order.totalPrice),
        description: this.generateOrderNumber(orderCode),
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: Math.round(item.price),
        })),
        returnUrl: `${this.configService.getOrThrow('APPLICATION_BASE_URL')}/payment/success`,
        cancelUrl: `${this.configService.getOrThrow('APPLICATION_BASE_URL')}/payment/failed`,
      };

      return await this.payOS.paymentRequests.create(paymentData);
    } catch (error) {
      console.error('Error creating PayOS payment link:', error);
      throw new Error('Cannot create payment link');
    }
  }

  async createPaymentLink(order: Order & { items: (OrderItem & { product: Product })[] }): Promise<string> {
    const paymentData = await this.createPayment(order);
    return paymentData.checkoutUrl;
  }

  async createPaymentQRData(order: Order & { items: (OrderItem & { product: Product })[] }): Promise<string> {
    const paymentData = await this.createPayment(order);
    return paymentData.qrCode;
  }

  async getPaymentInfo(orderCode: number) {
    try {
      return await this.payOS.paymentRequests.get(orderCode);
    } catch (error) {
      console.error('Error getting payment info:', error);
      throw new Error('Cannot get payment info');
    }
  }

  async cancelPaymentLink(orderCode: number) {
    try {
      return await this.payOS.paymentRequests.cancel(orderCode);
    } catch (error) {
      console.error('Error canceling payment link:', error);
      throw new Error('Cannot cancel payment link');
    }
  }

  verifyWebhookData(webhookData: Webhook): boolean {
    try {
      return !!this.payOS.webhooks.verify(webhookData);
    } catch (error) {
      console.error('Error verifying webhook:', error);
      return false;
    }
  }

  public generateOrderCode(): number {
    return Math.floor(Date.now() / 1000);
  }

  public generateOrderNumber(orderCode: number): string {
    return `ORD${orderCode}`;
  }

  async getPaymentStatus(orderId: string) {
    try {
      const order = await this.prismaService.order.findUnique({
        where: { id: orderId },
        include: {
          bill: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return {
        orderId: order.id,
        billId: order.bill.id,
        status: order.bill.status,
        amount: order.bill.amount,
        transactionId: order.bill.transactionId,
        createdAt: order.createdAt,
        updatedAt: order.bill.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting payment status for order ${orderId}:`, error);
      throw error;
    }
  }
}
