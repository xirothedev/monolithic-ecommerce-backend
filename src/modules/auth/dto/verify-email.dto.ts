import { IsEmail, IsNotEmpty, IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: 'Verification code sent to email' })
  @IsNumberString()
  @Length(6, 6)
  @IsNotEmpty()
  code: string;
}
