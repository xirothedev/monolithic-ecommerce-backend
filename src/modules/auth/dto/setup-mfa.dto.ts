import { IsEmail, IsEnum, IsMobilePhone, IsNotEmpty, IsNumberString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MfaType } from '@prisma/generated';

export class SetupMfaDto {
  @ApiProperty({ example: 'TOTP', description: 'Type of MFA', enum: MfaType })
  @IsEnum(MfaType)
  @IsNotEmpty()
  type: MfaType;

  @ApiProperty({ example: '+84123456789', description: 'Phone number for SMS MFA', required: false })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email for email MFA', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class VerifyMfaSetupDto {
  @ApiProperty({ example: 'TOTP', description: 'Type of MFA', enum: MfaType })
  @IsEnum(MfaType)
  @IsNotEmpty()
  type: MfaType;

  @ApiProperty({ example: '123456', description: 'Verification code for MFA setup' })
  @IsNumberString()
  @Length(6, 6)
  @IsNotEmpty()
  code: string;
}

export class ToggleMfaDto {
  @ApiProperty({ example: 'TOTP', description: 'Type of MFA', enum: MfaType })
  @IsEnum(MfaType)
  @IsNotEmpty()
  type: MfaType;

  @ApiProperty({ example: '123456', description: 'Code required when disabling MFA', required: false })
  @IsNumberString()
  @IsOptional()
  @Length(6, 6)
  code?: string;
}
