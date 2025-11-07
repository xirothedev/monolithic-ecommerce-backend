import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, GeminiService],
  exports: [ChatService, GeminiService],
})
export class ChatModule {}
