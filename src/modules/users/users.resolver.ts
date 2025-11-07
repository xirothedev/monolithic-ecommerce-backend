import { Roles } from '@/common/decorators/roles.decorator';
import { GqlContext } from '@/typings/gql';
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CartService } from '../cart/cart.service';
import { CartItemQL } from '../cart/entities/cart.entity';
import { UpdateUserByAdmin } from './dto/update-user-by-admin-input.dto';
import { UpdateUserInput } from './dto/update-user-input.dto';
import { UserQL } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver(() => UserQL)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
  ) {}

  @Query(() => UserQL, { name: 'me' })
  findMe(@Context() context: GqlContext) {
    return context.req.user;
  }

  @ResolveField('cart', () => [CartItemQL])
  public cart(@Parent() user: UserQL) {
    return this.cartService.findCartByUserId(user.id);
  }

  @Roles('ADMINISTRATOR', 'SUPPORTER')
  @Query(() => UserQL, { name: 'user' })
  findUser(@Args('id', { type: () => String }) id: string) {
    return this.usersService.findUser(id);
  }

  @Mutation(() => UserQL, { name: 'updateUser' })
  updateUser(
    @Args('id', { type: () => String }) id: string,
    @Args('input', { type: () => UpdateUserInput }) input: UpdateUserInput,
  ) {
    return this.usersService.updateUser(id, input);
  }

  @Mutation(() => UserQL, { name: 'updateUserByAdmin' })
  @Roles('ADMINISTRATOR')
  updateAdminUser(
    @Args('id', { type: () => String }) id: string,
    @Args('input', { type: () => UpdateUserByAdmin }) input: UpdateUserByAdmin,
  ) {
    return this.usersService.updateUserByAdmin(id, input);
  }
}
