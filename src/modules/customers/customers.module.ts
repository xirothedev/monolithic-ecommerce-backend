import { Module } from '@nestjs/common';
import { DiscordModule } from '../discord/discord.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [DiscordModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
