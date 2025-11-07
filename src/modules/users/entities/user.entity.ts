import { CartItemQL } from '@/modules/cart/entities/cart.entity';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { User, UserFlag, UserRole } from '@prisma/generated';

registerEnumType(UserFlag, {
  name: 'UserFlag',
});

registerEnumType(UserRole, {
  name: 'UserRole',
});

@ObjectType()
export class UserQL implements Partial<User> {
  @Field(() => ID)
  id: string;

  @Field()
  fullname: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  isVerified: boolean;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  zipCode?: string;

  @Field({ nullable: true })
  biography?: string;

  @Field(() => [UserRole])
  roles: UserRole[];

  @Field(() => [UserFlag])
  flags: UserFlag[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  credit: number;

  @Field(() => [CartItemQL])
  cart: CartItemQL;
}
