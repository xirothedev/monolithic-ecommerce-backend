import { Injectable } from '@nestjs/common';
import { Button, ButtonContext, Context, ModalContext, Ctx, StringSelect, StringSelectContext, Modal } from 'necord';

@Injectable()
export class DiscordComponents {
  @Button('BUTTON')
  public onButton(@Context() [interaction]: ButtonContext) {
    return interaction.reply({ content: 'Button clicked!' });
  }

  @StringSelect('SELECT_MENU')
  public onSelectMenu(@Context() [interaction]: StringSelectContext) {
    return interaction.reply({ content: `Your selected color - ${interaction.values.join(' ')}` });
  }

  @Modal('pizza/:value')
  public onModal(@Ctx() [interaction]: ModalContext) {
    return interaction.reply({
      content: `Your fav pizza : ${interaction.fields.getTextInputValue('pizza')}`,
    });
  }
}
