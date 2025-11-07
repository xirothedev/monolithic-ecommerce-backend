import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Category } from '@prisma/generated';

@ObjectType()
export class CategoryQL implements Partial<Category> {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;
}
