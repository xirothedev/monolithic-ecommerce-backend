import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './services/mfa.service';
import { AuthCookieStrategy } from './strategies/auth-cookie.strategy';
import { AuthSocialService } from './services/auth-social.service';
import { SessionSerializer } from '@/common/utils/session.serializer';
import { DiscordStrategy } from './strategies/discord.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    AuthSocialService,
    AuthCookieStrategy,
    GoogleStrategy,
    DiscordStrategy,
    SessionSerializer,
  ],
  exports: [AuthService, MfaService],
})
export class AuthModule {}
