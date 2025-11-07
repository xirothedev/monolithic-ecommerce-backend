import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CategoriesService } from '../categories/categories.service';
import { ProductQL } from './entities/product.entity';
import { CategoryQL } from '../categories/entities/category.entity';

@Resolver(() => ProductQL)
export class ProductsResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ResolveField('category', () => CategoryQL)
  category(@Parent() product: ProductQL) {
    return this.categoriesService.getCategoryById(product.categoryId);
  }
}
