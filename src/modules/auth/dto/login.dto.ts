import { IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MfaType } from '@prisma/generated';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'User password' })
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '123456', description: 'MFA code (if required)', required: false })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  mfaCode?: string;

  @ApiProperty({ example: 'TOTP', description: 'Type of MFA (if required)', required: false, enum: MfaType })
  @IsOptional()
  @IsString()
  mfaType?: MfaType;

  @ApiProperty({ example: 'backupcode123', description: 'Backup code for MFA (if required)', required: false })
  @IsOptional()
  @IsString()
  backupCode?: string;
}
