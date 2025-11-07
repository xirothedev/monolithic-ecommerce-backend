import { Module } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { ProductsController } from './products.controller';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsResolver, CategoriesService],
})
export class ProductsModule {}
