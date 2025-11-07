import { IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class AddProductCartDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsPositive()
  @IsNotEmpty()
  quantity: number;
}
