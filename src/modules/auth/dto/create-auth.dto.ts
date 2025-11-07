import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description:
      'Strong password (at least 8 characters, including uppercase, lowercase, number, and special character)',
  })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
