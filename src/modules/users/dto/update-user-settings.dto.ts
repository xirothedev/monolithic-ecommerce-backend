import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @ApiProperty({
    description: 'Email notifications',
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiProperty({
    description: 'Browser notifications',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  browserNotifications?: boolean;

  @ApiProperty({
    description: 'Ticket notifications',
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  ticketNotifications?: boolean;

  @ApiProperty({
    description: 'Promotion notifications',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  promotionNotifications?: boolean;

  @ApiProperty({
    description: 'Price changes notifications',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  priceChangesNotifications?: boolean;

  @ApiProperty({
    description: 'Login notifications',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  loginNotifications?: boolean;

  @ApiProperty({
    description: 'Restock notifications',
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  restockNotifications?: boolean;

  @ApiProperty({
    description: 'Suggested products',
    type: Boolean,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  suggestedProducts?: boolean;
}
