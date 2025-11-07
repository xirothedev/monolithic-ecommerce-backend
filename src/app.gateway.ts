import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ transports: ['websocket'] })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(AppGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`[Connected] ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Disconnected] ${client.id}`);
  }
}
