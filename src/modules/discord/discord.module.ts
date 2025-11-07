import { NecordLavalinkModule } from '@necord/lavalink';
import { NecordPaginationModule } from '@necord/pagination';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayIntentBits, Partials } from 'discord.js';
import { NecordModule } from 'necord';
import { DiscordCommands } from './discord.commands';
import { DiscordComponents } from './discord.components';
import { DiscordUpdate } from './discord.event';
import { DiscordService } from './discord.service';
import { LavaCommands } from './lava.commands';

@Module({
  imports: [
    NecordModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          token: config.getOrThrow<string>('DISCORD_BOT_TOKEN'),
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.MessageContent,
          ],
          partials: [Partials.User, Partials.GuildMember, Partials.Channel, Partials.Message, Partials.Reaction],
          prefix: config.get<string>('DISCORD_BOT_DEFAULT_PREFIX'),
          skipRegistration: true,
        };
      },
    }),
    NecordPaginationModule.forRoot({
      buttons: {},
      allowSkip: true,
      allowTraversal: true,
      buttonsPosition: 'end',
    }),
    NecordLavalinkModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        nodes: [
          {
            authorization: config.getOrThrow<string>('LAVALINK_PASSWORD'),
            host: config.getOrThrow<string>('LAVALINK_HOST'),
            port: +config.getOrThrow<string>('LAVALINK_PORT'),
          },
        ],
      }),
    }),
  ],
  providers: [DiscordUpdate, DiscordCommands, LavaCommands, DiscordComponents, DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
