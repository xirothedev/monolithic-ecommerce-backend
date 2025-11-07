import { ProductQL } from '@/modules/products/entities/product.entity';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { CartItem } from '@prisma/generated';

@ObjectType()
export class CartItemQL implements Partial<CartItem> {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  productId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => Int)
  quantity: number;

  @Field(() => ProductQL, { nullable: true })
  product?: ProductQL;
}
