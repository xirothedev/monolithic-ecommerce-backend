import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketGateway } from './ticket.gateway';
import { TicketMessageResponse, TicketResponse } from './ticket.interface';

@Injectable()
export class TicketEventListener {
  constructor(private readonly ticketGateway: TicketGateway) {}

  @OnEvent('ticket.created')
  handleTicketCreated(payload: { ticket: TicketResponse }) {
    this.ticketGateway.broadcastNewTicket(payload.ticket);
  }

  @OnEvent('ticket.message.created')
  handleTicketMessageCreated(payload: { message: TicketMessageResponse }) {
    this.ticketGateway.broadcastNewMessage(payload.message);
  }
}
