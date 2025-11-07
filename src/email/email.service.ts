import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { VerifyEmailProps, MfaCodeProps } from './email.interface';

@Injectable()
export class EmailService {
  private readonly templateCache: Map<string, string> = new Map();

  constructor(private readonly mailerService: MailerService) {}

  public async sendVerifyEmail({ code, email, url }: VerifyEmailProps) {
    const html = await this.extractHtml('verify-email', {
      '{{VERIFICATION_LINK}}': url,
      '{{VERIFICATION_CODE}}': code,
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Email Verification',
      html,
    });
  }

  public async sendMfaCode({ code, email }: MfaCodeProps) {
    const html = await this.extractHtml('mfa-code', {
      '{{MFA_CODE}}': code,
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'MFA Verification Code',
      html,
    });
  }

  private async extractHtml(htmlName: string, params?: { [x: string]: string }) {
    // Kiểm tra cache trước
    if (!params && this.templateCache.has(htmlName)) {
      return this.templateCache.get(htmlName);
    }

    const templatePath = join(__dirname, 'templates', `${htmlName}.html`);
    try {
      let templateHtml: string | undefined;

      if (this.templateCache.has(htmlName)) {
        templateHtml = this.templateCache.get(htmlName);
      } else {
        templateHtml = await readFile(templatePath, 'utf8');
        this.templateCache.set(htmlName, templateHtml);
      }

      if (params) {
        Object.keys(params).forEach((key) => {
          templateHtml = templateHtml?.replaceAll(key, encodeURIComponent(params[key]));
        });
      }

      return templateHtml;
    } catch (error) {
      console.error(`Failed to read email template at ${templatePath}:`, error);
      throw new Error('Could not load email template:' + htmlName);
    }
  }
}
