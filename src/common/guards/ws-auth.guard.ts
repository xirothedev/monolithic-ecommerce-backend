import { PrismaService } from '@/prisma/prisma.service';
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { Payload } from '@/modules/auth/auth.interface';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prismaService: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the handler or class is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Public endpoint, skipping authentication');
      return true;
    }

    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`Unauthorized connection attempt from ${client.handshake.address} - No token provided`);
        throw new WsException({
          message: 'Access token not found',
          code: 'ACCESS_TOKEN_NOT_FOUND',
        });
      }

      const payload = this.jwtService.verify<Payload>(token, {
        secret: this.config.getOrThrow<string>('ACCESS_TOKEN_SECRET_KEY'),
      });

      if (!payload) {
        this.logger.warn(`Invalid token provided or expired`);
        throw new WsException({
          message: 'Invalid token provided or expired',
          code: 'INVALID_TOKEN_OR_EXPIRED',
        });
      }

      const user = await this.prismaService.user.findUniqueOrThrow({
        where: { id: payload.sub },
        select: undefined,
      });

      if (!user.isVerified) {
        this.logger.warn(`Unverified user ${user.email} attempted to connect`);
        throw new WsException({
          message: 'User needs to be verified',
          code: 'USER_NOT_VERIFIED',
        });
      }

      if (user.isBanned) {
        this.logger.warn(`Banned user ${user.email} attempted to connect`);
        throw new WsException({
          message: 'User has been banned',
          code: 'USER_HAS_BEEN_BANNED',
        });
      }

      if (user.isLocked) {
        this.logger.warn(`Locked user ${user.email} attempted to connect`);
        throw new WsException({
          message: 'User has been locked',
          code: 'USER_HAS_BEEN_LOCKED',
        });
      }

      // Attach user to socket for later use
      client.data.user = user;
      client.data.authenticatedAt = new Date();

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw new WsException({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      this.logger.error(`Authentication failed: ${error.message}`);
      throw new WsException({
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from cookies first (most common for web clients)
    const cookies = client.handshake.headers.cookie;
    if (cookies) {
      const cookieToken = this.extractTokenFromCookies(cookies);
      if (cookieToken) {
        return cookieToken;
      }
    }

    // Try to get token from authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters (for mobile apps or testing)
    const queryToken = client.handshake.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Try to get token from handshake auth object (Socket.IO specific)
    const authToken = client.handshake.auth?.token as string;
    if (authToken) {
      return authToken;
    }

    return null;
  }

  private extractTokenFromCookies(cookieString: string): string | null {
    try {
      const cookies = cookieString.split(';').reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      return cookies['access_token'] || null;
    } catch {
      return null;
    }
  }
}
