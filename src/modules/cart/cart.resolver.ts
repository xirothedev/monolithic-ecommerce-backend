import { Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ProductQL } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CartService } from './cart.service';
import { CartItemQL } from './entities/cart.entity';
import { GqlContext } from '@/typings/gql';

@Resolver(() => CartItemQL)
export class CartResolver {
  constructor(
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
  ) {}

  @Query(() => [CartItemQL], { name: 'cartItems' })
  async cartItems(@Context() context: GqlContext) {
    return this.cartService.findCartByUserId(context.req.user.id);
  }

  @ResolveField('product', () => ProductQL)
  product(@Parent() cartItem: CartItemQL) {
    return this.productsService.getProductById(cartItem.productId);
  }
}
