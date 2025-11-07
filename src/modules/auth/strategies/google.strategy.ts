import { GoogleProfile } from '@/modules/auth/auth.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthSocialService } from '../services/auth-social.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private logger = new Logger(GoogleStrategy.name);

  constructor(
    readonly configService: ConfigService,
    private readonly authSocialService: AuthSocialService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI'),
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: GoogleProfile) {
    try {
      const user = await this.authSocialService.validateGoogleUser(profile);
      return user;
    } catch (error) {
      this.logger.error('Google Strategy - Error validating user:', error);
      throw error;
    }
  }
}
