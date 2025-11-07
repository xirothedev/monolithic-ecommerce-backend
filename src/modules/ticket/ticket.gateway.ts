import { WsUser } from '@/common/decorators/ws-user.decorator';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { User } from '@prisma/generated';
import { Server, Socket } from 'socket.io';
import { TicketGatewayService } from './services/ticket-gateway.service';
import { TicketMessageResponse, TicketResponse } from './ticket.interface';

@WebSocketGateway({ namespace: 'ticket', transports: ['websocket', 'polling'] })
@UseGuards(WsAuthGuard)
export class TicketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(TicketGateway.name);

  constructor(private readonly ticketGatewayService: TicketGatewayService) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`[Connected] ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Disconnected] ${client.id}`);
  }

  @SubscribeMessage('join.user.room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @WsUser() user: User) {
    return this.ticketGatewayService.handleJoinRoom(client, user);
  }

  @SubscribeMessage('leave.user.room')
  async handleLeaveRoom(@ConnectedSocket() client: Socket, @WsUser() user: User) {
    return this.ticketGatewayService.handleLeaveRoom(client, user);
  }

  @SubscribeMessage('join.ticket.room')
  async handleJoinTicketRoom(@MessageBody() ticketId: string, @ConnectedSocket() client: Socket, @WsUser() user: User) {
    return this.ticketGatewayService.handleJoinTicketRoom(ticketId, client, user);
  }

  @SubscribeMessage('leave.ticket.room')
  async handleLeaveTicketRoom(@MessageBody() ticketId: string, @ConnectedSocket() client: Socket) {
    return this.ticketGatewayService.handleLeaveTicketRoom(ticketId, client);
  }

  @SubscribeMessage('ticket.user.typing')
  handleUserTyping(@MessageBody() ticketId: string, @ConnectedSocket() client: Socket, @WsUser() user: User) {
    const room = `ticket:${ticketId}`;
    this.logger.debug(`User ${user.id} is typing in ticket ${ticketId}`);
    client.broadcast.to(room).emit('ticket.user.typing', user.id);
  }

  broadcastNewTicket(ticket: TicketResponse) {
    this.logger.debug('📢 Broadcasting new ticket:', ticket.id);
    this.server.emit('ticket.new', ticket);
  }

  broadcastNewMessage(message: TicketMessageResponse) {
    const room = `ticket:${message.ticket.id}`;
    this.logger.debug(`📢 Broadcasting new message to room ${room}:`, message.id);
    this.server.to(room).emit('ticket.message.new', message);
  }
}
