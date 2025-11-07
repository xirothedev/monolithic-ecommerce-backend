import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { User } from '@prisma/generated';

export const WsUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const client: Socket = ctx.switchToWs().getClient();
  const user = client.data.user;

  if (!user) {
    throw new Error('User not found in socket data. Make sure WsAuthGuard is applied.');
  }

  return user;
});
