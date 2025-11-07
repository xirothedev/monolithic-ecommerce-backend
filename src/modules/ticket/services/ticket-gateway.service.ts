import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Socket } from 'socket.io';
import { User } from '@prisma/generated';

@Injectable()
export class TicketGatewayService {
  constructor(private readonly prismaService: PrismaService) {}

  async handleJoinRoom(client: Socket, user: User) {
    const room = `user:${user.id}`;
    await client.join(room);
  }

  async handleLeaveRoom(client: Socket, user: User) {
    const room = `user:${user.id}`;
    await client.leave(room);
  }

  async handleJoinTicketRoom(ticketId: string, client: Socket, user: User) {
    const ticket = await this.prismaService.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        members: { select: { userId: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!ticket.members.some((member) => member.userId === user.id)) {
      throw new ForbiddenException('You are not a member of this ticket');
    }

    const room = `ticket:${ticketId}`;
    await client.join(room);
  }

  async handleLeaveTicketRoom(ticketId: string, client: Socket) {
    const room = `ticket:${ticketId}`;
    await client.leave(room);
  }
}
