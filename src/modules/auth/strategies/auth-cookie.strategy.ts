import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import { User } from '@prisma/generated';
import { Payload } from '../auth.interface';

@Injectable()
export class AuthCookieStrategy extends PassportStrategy(Strategy, 'auth-cookie') {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prismaService: PrismaService,
  ) {
    super();
  }

  async validate(req: Request): Promise<User> {
    const accessToken: string = req.cookies?.access_token;

    if (!accessToken) {
      throw new UnauthorizedException('Access token not found');
    }

    let payload: Payload;

    try {
      payload = this.jwtService.verify(accessToken, {
        secret: this.config.getOrThrow<string>('ACCESS_TOKEN_SECRET_KEY'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    try {
      const user = await this.prismaService.user.findUniqueOrThrow({
        where: { id: payload.sub },
        select: undefined,
      });

      if (!user.isVerified) {
        throw new ForbiddenException('User needs to be verified');
      }

      if (user.isBanned) {
        throw new ForbiddenException('User has been banned');
      }

      return user;
    } catch {
      throw new UnauthorizedException('User not found');
    }
  }
}
