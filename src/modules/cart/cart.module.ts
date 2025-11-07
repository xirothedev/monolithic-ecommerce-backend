import { Module } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { CartController } from './cart.controller';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartResolver, ProductsService],
})
export class CartModule {}
