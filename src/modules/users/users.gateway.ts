import { WsUser } from '@/common/decorators/ws-user.decorator';
import { WsAuthGuard } from '@/common/guards/ws-auth.guard';
import { RedisService } from '@/redis/redis.service';
import { Logger, OnModuleInit, UseGuards } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { User } from '@prisma/generated';
import { Server, Socket } from 'socket.io';
import { UserStatusService } from './services/users-status.service';

@WebSocketGateway({ namespace: 'users', transports: ['websocket', 'polling'] })
@UseGuards(WsAuthGuard)
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private logger = new Logger(UsersGateway.name);

  constructor(
    private readonly userStatusService: UserStatusService,
    private readonly redisService: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  async onModuleInit() {
    // Subscribe to user status changes
    await this.redisService.subscribe('user:status:changed', (message) => {
      try {
        const statusData = JSON.parse(message);

        // Broadcast to all connected clients in the users namespace
        this.server.emit('user.status.changed', statusData);
      } catch (error) {
        this.logger.error('Error parsing status change message:', error);
      }
    });

    this.logger.log('Subscribed to Redis events');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[Connected] ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`[Disconnected] ${client.id}`);
    if (client.data.user) {
      await this.userStatusService.setUserOffline(client.data.user.id);
    }
  }

  @SubscribeMessage('set.user.online')
  async handleSetUserOnline(@WsUser() user: User) {
    return this.userStatusService.setUserOnline(user.id);
  }

  @SubscribeMessage('set.user.offline')
  async handleSetUserOffline(@WsUser() user: User) {
    return this.userStatusService.setUserOffline(user.id);
  }

  @SubscribeMessage('get.user.status')
  handleGetUserStatus(@WsUser() user: User) {
    return this.userStatusService.getUserStatus(user.id);
  }

  @SubscribeMessage('get.online.users')
  async handleGetOnlineUsers() {
    return this.userStatusService.getOnlineUsers();
  }

  @SubscribeMessage('get.online.users.count')
  async handleGetOnlineUsersCount() {
    return this.userStatusService.getOnlineUsersCount();
  }

  @SubscribeMessage('check.user.online')
  async handleCheckUserOnline(@MessageBody() data: { userId: string }) {
    try {
      const isOnline = await this.userStatusService.isUserOnline(data.userId);
      return { userId: data.userId, isOnline };
    } catch (error) {
      this.logger.error('Error checking user online status:', error);
      return { userId: data.userId, isOnline: false };
    }
  }
}
