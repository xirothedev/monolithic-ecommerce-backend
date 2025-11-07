import { EmailService } from '@/email/email.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Snowflake } from '@/utils/snowflake';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  MethodNotAllowedException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { CookieOptions, Request, Response } from 'express';
import { randomInt } from 'node:crypto';
import { Payload } from './auth.interface';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaService } from './services/mfa.service';
import { StringValue } from 'ms';

export const MINIMUM_RETRY_TIME = 60_000;
export const MAXINUM_AVAILABLE_TIME = 5 * 60 * 1000;
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7d
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly mfaService: MfaService,
    private readonly jwtService: JwtService,
  ) {}

  public async create(body: CreateAuthDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (user) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.hashing(body.password);

    const data = await this.prismaService.user.create({
      data: {
        email: body.email,
        fullname: body.fullname,
        hashedPassword,
      },
    });

    return {
      message: 'Created user succesful',
      data,
    };
  }

  public async login(body: LoginDto, res: Response, sessionId?: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: body.email },
      select: { isVerified: true, hashedPassword: true, id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('User needs to be verified');
    }

    if (!user.hashedPassword) {
      throw new MethodNotAllowedException('You need a password to perform this action');
    }

    const isValidPassword = await verify(user.hashedPassword, body.password);
    if (!isValidPassword) throw new UnauthorizedException('Invalid credentials');

    const hasMfa = await this.mfaService.hasMfaEnabled(user.id);

    // Check if user has MFA enabled
    if (hasMfa) {
      // If MFA is enabled but no MFA code provided, return MFA required response
      if (!body.mfaCode && !body.backupCode) {
        const mfaStatus = await this.mfaService.getMfaStatus(user.id);
        return {
          message: 'MFA verification required',
          requiresMfa: true,
          mfaMethods: mfaStatus.mfaMethods.filter((m) => m.isEnabled),
          hasBackupCodes: mfaStatus.hasBackupCodes,
        };
      }

      // Verify MFA if code provided
      if (body.mfaCode && body.mfaType) {
        await this.mfaService.verifyMfa(user.id, {
          type: body.mfaType,
          code: body.mfaCode,
        });
      } else if (body.backupCode) {
        await this.mfaService.verifyMfa(user.id, {
          type: 'BACKUP_CODE',
          code: body.backupCode,
        });
      } else {
        throw new BadRequestException('MFA code or backup code required');
      }
    }

    // Create session and tokens using the centralized method
    const sessionResult = await this.createUserSession(user, res, sessionId);

    const { hashedPassword: _hashedPassword, ...data } = user;

    return {
      message: 'Login successful',
      data,
      '@accessToken': sessionResult.accessToken,
      '@refreshToken': sessionResult.refreshToken,
      '@sessionId': sessionResult.sessionId,
      '@data': {
        hasMfa,
      },
    };
  }

  public async verifyEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: { isVerified: true, id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User verified');
    }

    const auth = await this.prismaService.authentication.findUnique({
      where: { id: { type: 'VERIFY_EMAIL', userId: user.id } },
      select: { lastSentAt: true },
    });

    if (auth && auth.lastSentAt > new Date(Date.now() - MINIMUM_RETRY_TIME)) {
      throw new BadRequestException('Please wait 1 minutes before requesting again');
    }

    const code = randomInt(100000, 999999).toString();
    const baseUrl = this.configService.getOrThrow<string>('APPLICATION_BASE_URL');
    const url = `${baseUrl}/auth/verify-email?code=${code}&email=${user.email}`;

    try {
      await this.emailService.sendVerifyEmail({ url, code, email: user.email });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Email service error');
    }

    await this.prismaService.authentication.upsert({
      where: { id: { type: 'VERIFY_EMAIL', userId: user.id } },
      update: {
        code,
        retryTime: { increment: 1 },
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + MAXINUM_AVAILABLE_TIME),
      },
      create: {
        code,
        userId: user.id,
        type: 'VERIFY_EMAIL',
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + MAXINUM_AVAILABLE_TIME),
      },
    });

    return {
      message: 'Sent email succesful',
      data: null,
    };
  }

  public async confirmVerifyEmail(query: VerifyEmailDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: query.email },
      select: { id: true, isVerified: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User verified');
    }

    const auth = await this.prismaService.authentication.findUnique({
      where: { id: { type: 'VERIFY_EMAIL', userId: user.id } },
      select: { expiresAt: true, code: true },
    });
    if (!auth) {
      throw new NotFoundException('Record not found');
    }

    if (auth.expiresAt >= new Date() && auth.code !== query.code) {
      throw new UnauthorizedException('Wrong code or expired');
    }

    const data = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        roles: { push: 'USER' },
        isVerified: true,
        auth: { delete: { id: { type: 'VERIFY_EMAIL', userId: user.id } } },
      },
    });

    return {
      message: 'Verify succesful',
      data,
    };
  }

  public async refreshToken(tokenFromCookie: string, tokenFromBody: string, req: Request, res: Response) {
    const token = tokenFromCookie ?? tokenFromBody ?? req.header?.['Authentication'];

    if (!token) {
      throw new BadRequestException('Credientials must be provided');
    }

    const isValidToken = this.jwtService.verify(token, {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET_KEY'),
    });
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid credientials');
    }

    const session = await this.prismaService.loginSession.findUnique({
      where: { refreshToken: token },
      select: { id: true, isActive: true, user: { select: { id: true, email: true } } },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid credientials');
    }

    if (!session.isActive) {
      throw new ForbiddenException('Session has been revoked');
    }

    // Generate JWT token
    const payload: Payload = {
      sub: session.user.id,
      email: session.user.email,
      timestamp: new Date().toISOString(),
    };

    const { accessToken, refreshToken } = this.generateToken(payload);

    await this.prismaService.loginSession.update({
      where: { id: session.id },
      data: { refreshToken },
      select: { id: true },
    });

    // Set cookie
    res.cookie('access_token', accessToken, cookieOptions).cookie('refresh_token', refreshToken, cookieOptions);

    return {
      message: 'Refreshed',
      data: null,
    };
  }

  public async changePassword(userId: string, body: ChangePasswordDto) {
    // Get user with current password
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { hashedPassword: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.hashedPassword) {
      throw new BadRequestException('User has no password set');
    }

    // Verify current password
    const isValidCurrentPassword = await verify(user.hashedPassword, body.currentPassword);
    if (!isValidCurrentPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current password
    const isSamePassword = await verify(user.hashedPassword, body.newPassword);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedNewPassword = await this.hashing(body.newPassword);

    // Update password in database
    await this.prismaService.user.update({
      where: { id: userId },
      data: { hashedPassword: hashedNewPassword },
    });

    return {
      message: 'Password changed successfully',
      data: null,
    };
  }

  public async logout(refreshToken: string, sessionId: string, res: Response) {
    try {
      // Find and invalidate the session
      if (sessionId) {
        await this.prismaService.loginSession.updateMany({
          where: {
            sessionId,
            isActive: true,
          },
          data: {
            isActive: false,
            refreshToken: null,
          },
        });
      } else if (refreshToken) {
        // Fallback to refresh token if no session ID
        await this.prismaService.loginSession.updateMany({
          where: {
            refreshToken,
            isActive: true,
          },
          data: {
            isActive: false,
            refreshToken: null,
          },
        });
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed from user perspective
      console.error('Error during logout:', error);
    }

    // Clear cookies regardless of database operation success
    res
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/' })
      .clearCookie('session_id', { path: '/' });

    return {
      message: 'Logout successful',
      data: null,
    };
  }

  public async createUserSession(user: { id: string; email: string }, res: Response, sessionId?: string) {
    // Generate JWT token payload
    const payload: Payload = {
      sub: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    };

    // Generate tokens
    const { accessToken, refreshToken } = this.generateToken(payload);

    // Create/update session in database
    const session = await this.storageSession(user.id, refreshToken, sessionId);

    // Set cookies
    res
      .cookie('access_token', accessToken, cookieOptions)
      .cookie('refresh_token', refreshToken, cookieOptions)
      .cookie('session_id', session.sessionId, cookieOptions);

    return {
      accessToken,
      refreshToken,
      sessionId: session.sessionId,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  // private helper
  private hashing(string: string) {
    return hash(string);
  }

  private generateToken(payload: Payload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET_KEY'),
      expiresIn: this.configService.getOrThrow<StringValue>('ACCESS_TOKEN_TIME_LIFE'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET_KEY'),
      expiresIn: this.configService.getOrThrow<StringValue>('REFRESH_TOKEN_TIME_LIFE'),
    });

    return { accessToken, refreshToken };
  }

  private async storageSession(userId: string, refreshToken: string, sessionId?: string) {
    if (sessionId) {
      const session = await this.prismaService.loginSession.findUnique({ where: { sessionId }, select: { id: true } });
      if (!session) {
        return this.createSession(userId, refreshToken);
      } else {
        return this.prismaService.loginSession.update({ where: { sessionId }, data: { refreshToken } });
      }
    } else {
      return this.createSession(userId, refreshToken);
    }
  }

  private async createSession(userId: string, refreshToken: string) {
    const snowflake = new Snowflake();
    const sessionId = snowflake.generate();

    return this.prismaService.loginSession.create({
      data: {
        userId,
        sessionId,
        refreshToken,
      },
    });
  }
}
