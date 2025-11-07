import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { parse } from 'cookie';

export const Cookies = createParamDecorator((data: string, ctx: ExecutionContext) => {
  const type = ctx.getType<'http' | 'rpc' | 'ws' | 'graphql' | 'necord'>();

  if (type === 'http' || type === 'graphql') {
    const request = ctx.switchToHttp().getRequest<Request>();
    return data ? request.cookies?.[data] : request.cookies;
  } else if (type === 'ws') {
    const client: Socket = ctx.switchToWs().getClient();
    const parsedCookies = parse(client.handshake.headers?.cookie || '');
    return data ? parsedCookies?.[data] : parsedCookies;
  }
});
