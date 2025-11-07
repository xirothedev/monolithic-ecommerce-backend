import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentPassword123!',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    example: 'NewStrongPassword123!',
    description:
      'New strong password (at least 8 characters, including uppercase, lowercase, number, and special character)',
  })
  @IsStrongPassword()
  @IsNotEmpty()
  newPassword: string;
}
