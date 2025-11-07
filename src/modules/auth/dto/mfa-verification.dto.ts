import { IsEmail, IsEnum, IsMobilePhone, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MfaType } from '@prisma/generated';

const MfaTypeWithBackupCode = { ...MfaType, BACKUP_CODE: 'BACKUP_CODE' };
export type MfaTypeWithBackupCode = MfaType | 'BACKUP_CODE';

export class MfaVerificationDto {
  @ApiProperty({ example: 'TOTP', description: 'Type of MFA', enum: Object.values(MfaTypeWithBackupCode) })
  @IsEnum(MfaTypeWithBackupCode)
  @IsNotEmpty()
  type: MfaTypeWithBackupCode;

  @ApiProperty({ example: '123456', description: 'MFA verification code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'session123', description: 'Session ID for tracking login session', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class RequestMfaCodeDto {
  @ApiProperty({ example: 'TOTP', description: 'Type of MFA', enum: MfaType })
  @IsEnum(MfaType)
  @IsNotEmpty()
  type: MfaType;

  @ApiProperty({ example: 'user-uuid-123', description: 'User ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+84123456789', description: 'User phone number', required: false })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;
}
