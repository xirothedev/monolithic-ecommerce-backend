import { NecordPaginationService, PageBuilder } from '@necord/pagination';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { Client } from 'discord.js';
import { CommandsService } from 'necord';

@Injectable()
export class DiscordService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(DiscordService.name);

  public constructor(
    private readonly paginationService: NecordPaginationService,
    private readonly commandService: CommandsService,
    private readonly client: Client,
  ) {}

  onModuleInit() {
    return this.paginationService.register((builder) =>
      builder
        .setCustomId('test')
        .setPages([
          new PageBuilder().setContent('Page 1'),
          new PageBuilder().setContent('Page 2'),
          new PageBuilder().setContent('Page 3'),
          new PageBuilder().setContent('Page 4'),
          new PageBuilder().setContent('Page 5'),
        ])
        .setPagesFactory((page) => new PageBuilder().setContent(`Page ${page}`))
        .setMaxPages(5),
    );
  }

  onApplicationBootstrap() {
    this.client.once('ready', () => void this.commandService.registerAllCommands());
  }

  public async sendContactNotification(channelId: string, content: string) {
    const channel = await this.client.channels.fetch(channelId);
    if (channel && channel.isTextBased && channel.isTextBased() && 'send' in channel) {
      await channel.send(content);
    } else {
      this.logger.warn(`Channel ${channelId} not found or is not text-based.`);
    }
  }
}
