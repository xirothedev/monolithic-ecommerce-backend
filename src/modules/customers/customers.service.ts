import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { DiscordService } from '../discord/discord.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomersService {
  constructor(
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService,
  ) {}

  async createContact(body: CreateContactDto) {
    // Format the message
    const content = `New contact received:\nFull Name: ${body.fullname}\nEmail: ${body.email}\nPhone: ${body.phone}\nMessage: ${body.message}`;
    // Send to Discord
    const channelId = this.configService.getOrThrow<string>('DISCORD_CONTACT_CHANNEL_ID');
    if (channelId) {
      await this.discordService.sendContactNotification(channelId, content);
    }
    // TODO: Save contact to DB or further processing
    return { message: 'Send successful' };
  }
}
