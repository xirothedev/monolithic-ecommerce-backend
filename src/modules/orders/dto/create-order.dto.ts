import { PaymentMethod, SelectFrom } from '@prisma/generated';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  productItemId?: string;

  @IsPositive()
  quantity: number;

  @IsEnum(SelectFrom)
  from: SelectFrom;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;

  // For direct purchase (bypass cart)
  @IsOptional()
  @IsEnum(SelectFrom)
  from?: SelectFrom;
}
