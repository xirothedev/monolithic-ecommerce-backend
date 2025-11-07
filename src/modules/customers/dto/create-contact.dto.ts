import { IsEmail, IsMobilePhone, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'Full name of the customer' })
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @ApiProperty({ example: 'customer@email.com', description: 'Email address of the customer' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+84901234567', description: 'Phone number of the customer' })
  @IsMobilePhone()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'I would like to know more about your services.',
    description: 'Message or feedback from the customer',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
