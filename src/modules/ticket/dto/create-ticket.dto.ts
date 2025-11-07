import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketContextType, TicketPriority } from '@prisma/generated';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class TicketContextDto {
  @ApiProperty({ example: 'order-123', description: 'Reference label' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'cujsmsyuuwhjshu', description: 'Reference id' })
  @IsString()
  @IsNotEmpty()
  labelId: string;

  @ApiProperty({ example: 'order', description: 'Reference type' })
  @IsNotEmpty()
  @IsEnum(TicketContextType)
  type: TicketContextType;
}

export class TicketDto {
  @ApiProperty({ example: 'Cannot login', description: 'Title of the ticket' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'I cannot login with my account...', description: 'Detailed description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: TicketCategory, description: 'Ticket category' })
  @IsEnum(TicketCategory)
  @IsNotEmpty()
  category: TicketCategory;

  @ApiProperty({ enum: TicketPriority, description: 'Ticket priority' })
  @IsEnum(TicketPriority)
  @IsNotEmpty()
  priority: TicketPriority;
}

export class CreateTicketDto extends TicketDto {
  @ApiPropertyOptional({
    type: [TicketContextDto],
    description: 'Reference contexts (optional)',
    example: [{ label: 'order-123', type: 'order' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketContextDto)
  contexts: TicketContextDto[];
}
