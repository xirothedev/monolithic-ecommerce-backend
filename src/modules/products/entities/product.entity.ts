import { CategoryQL } from '@/modules/categories/entities/category.entity';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Product, ProductFlag } from '@prisma/generated';

registerEnumType(ProductFlag, {
  name: 'ProductFlag',
});

@ObjectType()
export class ProductQL implements Partial<Product> {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  categoryId: string;

  @Field(() => CategoryQL, { nullable: true })
  category?: CategoryQL;

  @Field(() => ID)
  sellerId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  averageRating: number;

  @Field()
  slug: string;

  @Field()
  sold: number;

  @Field()
  stock: number;

  @Field(() => [String])
  tags: string[];

  @Field()
  originalPrice: number;

  @Field()
  discountPrice: number;

  @Field(() => [ProductFlag])
  flags: ProductFlag[];

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  sku?: string;

  @Field(() => [String])
  medias: string[];
}
