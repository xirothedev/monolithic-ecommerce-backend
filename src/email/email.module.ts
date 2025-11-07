import { MailerModule } from '@nestjs-modules/mailer';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          service: 'gmail',
          auth: {
            user: config.getOrThrow<string>('EMAIL_USER'),
            pass: config.getOrThrow<string>('EMAIL_PASS'),
          },
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
          },
        },
        defaults: {
          from: `"No Reply" <${config.getOrThrow<string>('EMAIL_USER')}>`,
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
