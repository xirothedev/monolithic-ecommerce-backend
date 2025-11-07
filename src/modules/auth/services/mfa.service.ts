import { EmailService } from '@/email/email.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/generated';
import { Request } from 'express';
import { randomBytes, randomInt } from 'node:crypto';
import { authenticator } from 'otplib';
import { MfaStatus } from '../auth.interface';
import { MfaVerificationDto, RequestMfaCodeDto } from '../dto/mfa-verification.dto';
import { SetupMfaDto, ToggleMfaDto, VerifyMfaSetupDto } from '../dto/setup-mfa.dto';

export const MFA_CODE_EXPIRY = 5 * 60 * 1000;
export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_LENGTH = 8;

@Injectable()
export class MfaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  public async setupMfa(req: Request, body: SetupMfaDto) {
    // Check if MFA is already enabled for this type
    const existingMfa = await this.prismaService.mfaSetup.findUnique({
      where: { userMfaType: { userId: req.user.id, type: body.type } },
      select: { id: true },
    });

    if (existingMfa) {
      throw new BadRequestException(`MFA ${body.type} is already enabled`);
    }

    switch (body.type) {
      case 'TOTP':
        return await this.setupTotp(req.user.id);
      case 'SMS':
        return await this.setupSms(req.user.id, body.phone);
      case 'EMAIL':
        return await this.setupEmail(req.user.id, body.email);
      default:
        throw new BadRequestException('Invalid MFA type');
    }
  }

  public async verifyMfaSetup(userId: string, verifyDto: VerifyMfaSetupDto) {
    const mfaSetup = await this.prismaService.mfaSetup.findUnique({
      where: { userMfaType: { userId, type: verifyDto.type } },
      select: { secret: true, id: true },
    });

    if (!mfaSetup) {
      throw new NotFoundException('MFA setup not found');
    }

    let isValid = false;

    switch (verifyDto.type) {
      case 'TOTP':
        if (!mfaSetup.secret) {
          isValid = false;
          break;
        }
        isValid = this.verifyTotp(mfaSetup.secret, verifyDto.code);
        break;
      case 'SMS':
      case 'EMAIL':
        isValid = await this.verifyOtp(userId, verifyDto.type, verifyDto.code);
        break;
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // MFA is already enabled by the existence of the record
    // Generate backup codes if this is the first MFA method
    const enabledMfaCount = await this.prismaService.mfaSetup.count({
      where: { userId },
    });

    if (enabledMfaCount === 1) {
      await this.generateBackupCodes(userId);
    }

    return { message: 'MFA enabled successfully' };
  }

  public async toggleMfa(userId: string, status: MfaStatus, body: ToggleMfaDto) {
    const mfaSetup = await this.prismaService.mfaSetup.findUnique({
      where: { userMfaType: { userId, type: body.type } },
      select: { id: true, secret: true },
    });

    if (!mfaSetup && status === 'disable') {
      throw new NotFoundException('MFA setup not found');
    }

    if (mfaSetup && status === 'enable') {
      throw new BadRequestException('MFA is already enabled');
    }

    if (!mfaSetup && status === 'enable') {
      throw new BadRequestException('MFA setup not found. Please setup MFA first.');
    }

    if (status === 'disable') {
      if (!body.code) {
        throw new BadRequestException("You need to enter the 'code' field to disable MFA");
      }

      // Verify the code before disabling
      let isValid = false;

      switch (body.type) {
        case 'TOTP':
          if (!mfaSetup?.secret) {
            isValid = false;
            break;
          }
          isValid = this.verifyTotp(mfaSetup.secret, body.code);
          break;
        case 'SMS':
        case 'EMAIL':
          isValid = await this.verifyOtp(userId, body.type, body.code);
          break;
      }

      if (!isValid) {
        throw new UnauthorizedException('Invalid verification code');
      }

      // Delete the MFA setup to disable it
      await this.prismaService.mfaSetup.delete({
        where: { id: mfaSetup?.id ?? '' },
      });

      // If no MFA methods are enabled, remove backup codes
      const enabledMfaCount = await this.prismaService.mfaSetup.count({
        where: { userId },
      });

      if (enabledMfaCount === 0) {
        await this.prismaService.mfaBackupCode.deleteMany({
          where: { userId },
        });
      }

      return { message: 'MFA disabled successfully' };
    } else {
      // MFA is already enabled by the existence of the record
      // Generate backup codes if this is the first MFA method
      const enabledMfaCount = await this.prismaService.mfaSetup.count({
        where: { userId },
      });

      if (enabledMfaCount === 1) {
        await this.generateBackupCodes(userId);
      }

      return { message: 'MFA enabled successfully' };
    }
  }

  public async verifyMfa(userId: string, body: MfaVerificationDto) {
    switch (body.type) {
      case 'TOTP':
        return await this.verifyTotpMfa(userId, body.code);
      case 'SMS':
        return await this.verifyOtpMfa(userId, 'SMS', body.code);
      case 'EMAIL':
        return await this.verifyOtpMfa(userId, 'EMAIL', body.code);
      case 'BACKUP_CODE':
        return await this.verifyBackupCode(userId, body.code);
      default:
        throw new BadRequestException('Invalid MFA verification type');
    }
  }

  public async requestMfaCode(body: RequestMfaCodeDto) {
    const mfaSetup = await this.prismaService.mfaSetup.findUnique({
      where: { userMfaType: { userId: body.userId, type: body.type } },
      select: { phone: true, email: true },
    });

    if (!mfaSetup) {
      throw new NotFoundException('MFA setup not found or not enabled');
    }

    switch (body.type) {
      case 'SMS':
        if (!mfaSetup.phone) throw new NotFoundException('Phone in MFA not found');
        return await this.sendSmsCode(body.userId, mfaSetup.phone);
      case 'EMAIL':
        if (!mfaSetup.email) throw new NotFoundException('Email in MFA not found');
        return await this.sendEmailCode(body.userId, mfaSetup.email);
      default:
        throw new BadRequestException('Invalid MFA type for code request');
    }
  }

  public async getMfaStatus(userId: string) {
    const mfaSetups = await this.prismaService.mfaSetup.findMany({
      where: { userId },
      select: { type: true, createdAt: true },
    });

    const backupCodes = await this.prismaService.mfaBackupCode.count({
      where: { userId, isUsed: false },
    });

    return {
      mfaMethods: mfaSetups.map((setup) => ({
        type: setup.type,
        isEnabled: true, // If record exists, MFA is enabled
        createdAt: setup.createdAt,
      })),
      hasBackupCodes: backupCodes > 0,
      backupCodesCount: backupCodes,
    };
  }

  public async regenerateBackupCodes(userId: string) {
    // Delete existing backup codes
    await this.prismaService.mfaBackupCode.deleteMany({
      where: { userId },
    });

    // Generate new backup codes
    await this.generateBackupCodes(userId);

    return { message: 'Backup codes regenerated successfully' };
  }

  public async hasMfaEnabled(userId: string): Promise<boolean> {
    const count = await this.prismaService.mfaSetup.count({
      where: { userId },
    });
    return count > 0;
  }

  // Private helper methods
  private async setupTotp(userId: string): Promise<{ secret: string; otpauthUrl: string; qrCode: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'Web Store', secret);

    await this.prismaService.mfaSetup.upsert({
      where: { userMfaType: { userId, type: 'TOTP' } },
      create: { userId, type: 'TOTP', secret },
      update: { secret },
    });

    return {
      secret,
      otpauthUrl,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
    };
  }

  private async setupSms(userId: string, phone?: string) {
    if (!phone) {
      throw new BadRequestException('Phone number is required for SMS MFA');
    }

    await this.prismaService.mfaSetup.upsert({
      where: { userMfaType: { userId, type: 'SMS' } },
      create: { userId, type: 'SMS', phone },
      update: { phone },
    });

    // Send initial SMS code
    return await this.sendSmsCode(userId, phone);
  }

  private async setupEmail(userId: string, email?: string) {
    if (!email) {
      throw new BadRequestException('Email is required for Email MFA');
    }

    await this.prismaService.mfaSetup.upsert({
      where: { userMfaType: { userId, type: 'EMAIL' } },
      create: { userId, type: 'EMAIL', email },
      update: { email },
    });

    // Send initial email code
    return await this.sendEmailCode(userId, email);
  }

  private verifyTotp(secret: string, code: string): boolean {
    return authenticator.verify({ token: code, secret });
  }

  private async verifyOtp(userId: string, type: string, code: string): Promise<boolean> {
    const auth = await this.prismaService.authentication.findUnique({
      where: { id: { type: type === 'SMS' ? 'MFA_SMS' : 'MFA_EMAIL', userId } },
      select: { code: true, expiresAt: true, type: true, userId: true },
    });

    if (!auth || auth.expiresAt < new Date() || auth.code !== code) {
      return false;
    }

    // Delete the used code
    await this.prismaService.authentication.delete({
      where: { id: { type: auth.type, userId: auth.userId } },
    });

    return true;
  }

  private async verifyTotpMfa(userId: string, code: string) {
    const mfaSetup = await this.prismaService.mfaSetup.findUnique({
      where: { userMfaType: { userId, type: 'TOTP' } },
      select: { secret: true },
    });

    if (!mfaSetup || !mfaSetup.secret) {
      throw new UnauthorizedException('TOTP MFA not enabled');
    }

    if (!this.verifyTotp(mfaSetup.secret, code)) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    return { message: 'TOTP verification successful' };
  }

  private async verifyOtpMfa(userId: string, type: string, code: string) {
    const isValid = await this.verifyOtp(userId, type, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    return { message: `${type} verification successful` };
  }

  private async verifyBackupCode(userId: string, code: string) {
    const backupCode = await this.prismaService.mfaBackupCode.findUnique({
      where: { userBackupCode: { userId, code } },
      select: { isUsed: true, id: true },
    });

    if (!backupCode || backupCode.isUsed) {
      throw new UnauthorizedException('Invalid or used backup code');
    }

    // Mark backup code as used
    await this.prismaService.mfaBackupCode.update({
      where: { id: backupCode.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    return { message: 'Backup code verification successful' };
  }

  private async sendSmsCode(userId: string, phone: string) {
    const code = randomInt(100000, 999999).toString();

    await this.prismaService.authentication.upsert({
      where: { id: { type: 'MFA_SMS', userId } },
      update: {
        code,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + MFA_CODE_EXPIRY),
      },
      create: {
        code,
        type: 'MFA_SMS',
        userId,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + MFA_CODE_EXPIRY),
      },
    });

    // TODO: Integrate with SMS service
    console.log(`SMS code for ${phone}: ${code}`);

    return { message: 'SMS code sent successfully' };
  }

  private async sendEmailCode(userId: string, email: string) {
    const code = randomInt(100000, 999999).toString();

    await this.prismaService.authentication.upsert({
      where: { id: { type: 'MFA_EMAIL', userId } },
      update: {
        code,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + MFA_CODE_EXPIRY),
      },
      create: {
        code,
        type: 'MFA_EMAIL',
        userId,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + MFA_CODE_EXPIRY),
      },
    });

    // Send email with code
    await this.emailService.sendMfaCode({ code, email });

    return { message: 'Email code sent successfully' };
  }

  private async generateBackupCodes(userId: string) {
    const codes: Array<Prisma.MfaBackupCodeCreateManyInput> = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = randomBytes(BACKUP_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase()
        .slice(0, BACKUP_CODE_LENGTH);

      codes.push({
        userId,
        code,
      });
    }

    await this.prismaService.mfaBackupCode.createMany({
      data: codes,
    });

    return codes.map((c) => c.code);
  }
}
