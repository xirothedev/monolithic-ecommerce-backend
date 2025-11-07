import { DiscordProfile } from '@/modules/auth/auth.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { AuthSocialService } from '../services/auth-social.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  private logger = new Logger(DiscordStrategy.name);

  constructor(
    readonly configService: ConfigService,
    private readonly authSocialService: AuthSocialService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('DISCORD_OAUTH_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('DISCORD_OAUTH_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('DISCORD_OAUTH_REDIRECT_URI'),
      scope: ['identify', 'email'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: DiscordProfile) {
    try {
      const user = await this.authSocialService.validateDiscordUser(profile);
      return user;
    } catch (error) {
      this.logger.error('Discord Strategy - Error validating user:', error);
      throw error;
    }
  }
}
