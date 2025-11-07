import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { GuildMember } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { SourceAutocompleteInterceptor } from './components/source.autocomplete';
import { QueryDto } from './dtos/query.dto';

@Injectable()
export class LavaCommands {
  private logger = new Logger(LavaCommands.name);

  public constructor(private readonly lavalinkManager: LavalinkManager) {}

  @UseInterceptors(SourceAutocompleteInterceptor)
  @SlashCommand({
    name: 'play',
    description: 'play a track',
  })
  public async onPlay(@Context() [interaction]: SlashCommandContext, @Options() { query, source }: QueryDto) {
    const member = interaction.member as GuildMember;
    if (!member || !member.voice.channelId) {
      return interaction.reply({ content: 'You must be join a voice channel to do this' });
    }

    const player = this.lavalinkManager.createPlayer({
      guildId: interaction.guildId!,
      voiceChannelId: member.voice.channelId,
      textChannelId: interaction.channelId,
      // optional configurations:
      selfDeaf: true,
      selfMute: false,
      volume: 40,
    });

    try {
      await player.connect();

      const res = await player.search(
        {
          query,
          source: source ?? 'soundcloud',
        },
        interaction.user.id,
      );

      await player.queue.add(res.tracks[0]);
      if (!player.playing) await player.play();

      return interaction.reply({
        content: `Now playing ${res.tracks[0].info.title}`,
      });
    } catch (error) {
      this.logger.error('An error occured during play a music', error);
      throw error;
    }
  }
}
