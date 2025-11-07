import { NodeManagerContextOf, OnNodeManager } from '@necord/lavalink';
import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';

@Injectable()
export class DiscordUpdate {
  private readonly logger = new Logger(DiscordUpdate.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @OnNodeManager('connect')
  public onNodeCreate([node]: NodeManagerContextOf<'connect'>) {
    this.logger.log(`Node: ${node.id} Connected!`);
  }
}
