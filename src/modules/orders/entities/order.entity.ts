import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Order, OrderItem, SelectFrom, BillStatus, PaymentMethod } from '@prisma/generated';
import { ProductQL } from '@/modules/products/entities/product.entity';

registerEnumType(SelectFrom, {
  name: 'SelectFrom',
});

registerEnumType(BillStatus, {
  name: 'BillStatus',
});

registerEnumType(PaymentMethod, {
  name: 'PaymentMethod',
});

@ObjectType()
export class OrderItemQL implements Partial<OrderItem> {
  @Field(() => ID)
  id: string;

  @Field(() => SelectFrom)
  from: SelectFrom;

  @Field()
  quantity: number;

  @Field()
  price: number;

  @Field(() => ID)
  productId: string;

  @Field(() => ProductQL, { nullable: true })
  product?: ProductQL;

  @Field(() => ID)
  productItemId: string;

  @Field(() => ID)
  orderId: string;
}

@ObjectType()
export class BillQL {
  @Field(() => ID)
  id: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  transactionId?: string;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => BillStatus)
  status: BillStatus;

  @Field()
  amount: number;

  @Field()
  note: string;
}

@ObjectType()
export class OrderQL implements Partial<Order> {
  @Field(() => ID)
  id: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  totalPrice: number;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  billId: string;

  @Field(() => BillQL, { nullable: true })
  bill?: BillQL;

  @Field(() => [OrderItemQL])
  items: OrderItemQL[];
}
