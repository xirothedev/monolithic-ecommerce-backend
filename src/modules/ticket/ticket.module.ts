import { Module } from '@nestjs/common';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { TicketController } from './ticket.controller';
import { TicketGateway } from './ticket.gateway';
import { TicketEventListener } from './ticket.listener';
import { TicketService } from './ticket.service';
import { TicketGatewayService } from './services/ticket-gateway.service';

@Module({
  providers: [TicketGateway, TicketService, TicketEventListener, WsAuthGuard, TicketGatewayService],
  controllers: [TicketController],
  exports: [TicketService, TicketGatewayService],
})
export class TicketModule {}
