import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AddProductCartDto } from './dto/add-product-cart.dto';
import { RemoveProductCartDto } from './dto/remove-product-cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prismaService: PrismaService) {}

  public async add(req: Request, body: AddProductCartDto) {
    const user = req.user;
    const product = await this.prismaService.product.findUnique({
      where: { id: body.productId },
      select: { discountPrice: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const data = await this.prismaService.cartItem.upsert({
      where: {
        productUserId: {
          productId: body.productId,
          userId: user.id,
        },
      },
      create: {
        productId: body.productId,
        userId: user.id,
        quantity: body.quantity,
      },
      update: {
        quantity: { increment: body.quantity },
      },
      include: { product: true },
    });

    return {
      message: 'Add product to cart successful',
      data,
    };
  }

  public async remove(req: Request, body: RemoveProductCartDto) {
    const user = req.user;
    const cartItem = await this.prismaService.cartItem.findUnique({
      where: {
        productUserId: {
          productId: body.productId,
          userId: user.id,
        },
      },
      select: { quantity: true },
    });

    if (!cartItem) {
      throw new BadRequestException('Product not found in cart');
    }

    if (body.quantity >= cartItem.quantity) {
      const deletedItem = await this.prismaService.cartItem.delete({
        where: {
          productUserId: {
            productId: body.productId,
            userId: user.id,
          },
        },
      });

      return {
        message: 'Removed product from cart',
        data: {
          ...deletedItem,
          quantity: 0,
        },
      };
    } else {
      const data = await this.prismaService.cartItem.update({
        where: {
          productUserId: {
            productId: body.productId,
            userId: user.id,
          },
        },
        data: {
          quantity: { decrement: body.quantity },
        },
        include: { product: true },
      });

      return {
        message: 'Decreased product quantity in cart',
        data,
      };
    }
  }

  public async findCartByUserId(id: string) {
    const carts = await this.prismaService.cartItem.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    return carts;
  }
}
