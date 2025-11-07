import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/generated';
import { IsEnum, IsOptional } from 'class-validator';
import { TicketDto } from './create-ticket.dto';

export class UpdateTicketDto extends PartialType(TicketDto) {
  @ApiPropertyOptional({ enum: TicketStatus, description: 'Ticket status' })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;
}
