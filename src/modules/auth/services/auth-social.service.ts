import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderPlatform, User } from '@prisma/generated';
import { Response } from 'express';
import { getDiscordAvatarUrl } from '../auth.helper';
import { DiscordProfile, GoogleProfile } from '../auth.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthSocialService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async validateDiscordUser(profile: DiscordProfile): Promise<Partial<User>> {
    // Step 1: Check if the user has an external account with this Discord
    const existingExternalAccount = await this.prismaService.externalAccount.findFirst({
      where: {
        provider: ProviderPlatform.DISCORD,
        providerUserId: profile.id,
      },
      select: {
        id: true,
        user: true,
      },
    });

    // If the user has an external account, return the user
    if (existingExternalAccount) {
      return existingExternalAccount.user;
    }

    // Step 2: Check if the user has an account with this email
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: profile.email },
      select: {
        id: true,
        email: true,
        fullname: true,
        isVerified: true,
        roles: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let user: Partial<User>;

    if (existingUser) {
      // Step 3a: User already exists, create a new external account and link it
      user = existingUser;

      await this.prismaService.externalAccount.create({
        data: {
          provider: ProviderPlatform.DISCORD,
          providerUserId: profile.id,
          approvedScope: 'identify email',
          emailAddress: profile.email,
          fullName: profile.global_name || profile.username,
          username: profile.username,
          avatarUrl: profile.avatar ? getDiscordAvatarUrl(profile.avatar, profile.id) : null,
          userId: existingUser.id,
        },
      });
    } else {
      // Step 3b: User does not exist, create a new user and external account
      const fullname = profile.global_name || profile.username;
      const avatarUrl = profile.avatar ? getDiscordAvatarUrl(profile.avatar, profile.id) : null;

      user = await this.prismaService.user.create({
        data: {
          email: profile.email,
          fullname,
          isVerified: true,
          roles: ['USER'],
          avatarUrl,
          externalAccounts: {
            create: {
              provider: ProviderPlatform.DISCORD,
              providerUserId: profile.id,
              approvedScope: 'identify email',
              emailAddress: profile.email,
              fullName: fullname,
              username: profile.username,
              avatarUrl,
            },
          },
        },
      });
    }

    return user;
  }

  async handleDiscordCallback(user: User, res: Response) {
    try {
      if (!user) {
        console.error('No user data received from Discord');
        throw new Error('No user data received from Discord');
      }

      // Create session and tokens using AuthService
      await this.authService.createUserSession(user, res);

      const frontendUrl = this.configService.getOrThrow<string>('CLIENT_BASE_URL');
      res.redirect(`${frontendUrl}/services`);
    } catch (error) {
      console.error('Discord callback error:', error);
      const frontendUrl = this.configService.getOrThrow<string>('CLIENT_BASE_URL');
      res.redirect(`${frontendUrl}/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  async validateGoogleUser(profile: GoogleProfile): Promise<Partial<User>> {
    // Step 1: Check if the user has an external account with this Google
    const existingExternalAccount = await this.prismaService.externalAccount.findFirst({
      where: {
        provider: ProviderPlatform.GOOGLE,
        providerUserId: profile.id,
      },
      select: {
        id: true,
        user: true,
      },
    });

    // If the user has an external account, return the user
    if (existingExternalAccount) {
      return existingExternalAccount.user;
    }

    // Step 2: Check if the user has an account with this email
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: profile.emails[0].value },
      select: {
        id: true,
        email: true,
        fullname: true,
        isVerified: true,
        roles: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let user: Partial<User>;

    if (existingUser) {
      // Step 3a: User already exists, create a new external account and link it
      user = existingUser;

      await this.prismaService.externalAccount.create({
        data: {
          provider: ProviderPlatform.GOOGLE,
          providerUserId: profile.id,
          approvedScope: 'identify email',
          emailAddress: profile.emails[0].value,
          fullName: profile.displayName,
          username: profile.name.givenName + '_' + profile.name.familyName,
          avatarUrl: profile.photos[0].value,
          userId: existingUser.id,
        },
      });
    } else {
      // Step 3b: User does not exist, create a new user and external account
      const fullname = profile.displayName;
      const avatarUrl = profile.photos[0].value;

      user = await this.prismaService.user.create({
        data: {
          email: profile.emails[0].value,
          fullname,
          isVerified: true,
          roles: ['USER'],
          avatarUrl,
          externalAccounts: {
            create: {
              provider: ProviderPlatform.GOOGLE,
              providerUserId: profile.id,
              approvedScope: 'identify email',
              emailAddress: profile.emails[0].value,
              fullName: fullname,
              username: profile.name.givenName + '_' + profile.name.familyName,
              avatarUrl,
            },
          },
        },
      });
    }

    return user;
  }

  async handleGoogleCallback(user: User, res: Response) {
    try {
      if (!user) {
        console.error('No user data received from Google');
        throw new Error('No user data received from Google');
      }

      // Create session and tokens using AuthService
      await this.authService.createUserSession(user, res);

      const frontendUrl = this.configService.getOrThrow<string>('CLIENT_BASE_URL');
      res.redirect(`${frontendUrl}/services`);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = this.configService.getOrThrow<string>('CLIENT_BASE_URL');
      res.redirect(`${frontendUrl}/error?message=${encodeURIComponent(error.message)}`);
    }
  }
}
