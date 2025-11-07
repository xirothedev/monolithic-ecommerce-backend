import { IsSlug } from '@/common/decorators/is-slug.decorator';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Product, ProductFlag, ProductItem } from '@prisma/generated';

export class CreateProductDto implements Partial<Product> {
  @IsNotEmpty()
  @IsSlug()
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString({ each: true })
  @ArrayMinSize(4)
  @IsArray()
  tags: string[];

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsNotEmpty({ each: true })
  @IsEnum(ProductFlag, { each: true })
  flags: ProductFlag[];

  @IsNotEmpty()
  @IsPositive()
  originalPrice: number;

  @IsOptional()
  @IsPositive()
  discountPrice?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductItemDto)
  productItems: CreateProductItemDto[];

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}

export class CreateProductItemDto implements Partial<ProductItem> {
  @IsNotEmpty()
  @IsString()
  data: string;
}
