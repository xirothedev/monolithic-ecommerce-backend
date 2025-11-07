import { NecordPaginationService } from '@necord/pagination';
import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from 'discord.js';
import {
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  SlashCommand,
  SlashCommandContext,
  TargetMessage,
  TargetUser,
  UserCommand,
  UserCommandContext,
} from 'necord';
import { LengthDto } from './dtos/length.dto';

@Injectable()
export class DiscordCommands {
  constructor(private readonly paginationService: NecordPaginationService) {}

  @SlashCommand({
    name: 'ping',
    description: 'Get bot latency!',
  })
  public ping(@Context() [interaction]: SlashCommandContext) {
    const message = 'Message';
    return interaction.reply(message);
  }

  @SlashCommand({ name: 'length', description: 'Get length of text' })
  public onLength(@Context() [interaction]: SlashCommandContext, @Options() { text }: LengthDto) {
    return interaction.reply({ content: `Length of your text ${text.length}` });
  }

  @MessageCommand({ name: 'Get message id' })
  public getMessageId(@Context() [interaction]: MessageCommandContext, @TargetMessage() message: Message) {
    return interaction.reply({ content: `Message ID is ${message.id}` });
  }

  @UserCommand({ name: 'Get user avatar' })
  public getUserAvatar(@Context() [interaction]: UserCommandContext, @TargetUser() user: User) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Avatar ${user.username}`)
          .setImage(user.displayAvatarURL({ size: 4096, forceStatic: false })),
      ],
    });
  }

  @SlashCommand({ name: 'button', description: 'Creates button component.' })
  public createButton(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({
      content: 'Button',
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('BUTTON').setLabel('LABEL').setStyle(ButtonStyle.Primary),
        ),
      ],
    });
  }

  @SlashCommand({ name: 'select-menu', description: 'Creates select menu component.' })
  public createSelectMenu(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({
      content: 'Button',
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('SELECT_MENU')
            .setPlaceholder('Select your color')
            .setMaxValues(1)
            .setMinValues(1)
            .setOptions([
              { label: 'Red', value: 'Red' },
              { label: 'Blue', value: 'Blue' },
              { label: 'Yellow', value: 'Yellow' },
            ]),
        ),
      ],
    });
  }

  @SlashCommand({ name: 'modal', description: 'Creates modal component.' })
  public createModel(@Context() [interaction]: SlashCommandContext) {
    return interaction.showModal(
      new ModalBuilder()
        .setTitle('What your fav pizza?')
        .setCustomId('pizza/12345')
        .setComponents([
          new ActionRowBuilder<TextInputBuilder>().addComponents([
            new TextInputBuilder().setCustomId('pizza').setLabel('???').setStyle(TextInputStyle.Paragraph),
          ]),
        ]),
    );
  }

  @SlashCommand({ name: 'pagination', description: 'Test pagination' })
  public async onPagination(@Context() [interaction]: SlashCommandContext) {
    const pagination = this.paginationService.get('test');
    const page = await pagination.build();

    return interaction.reply(page);
  }
}
