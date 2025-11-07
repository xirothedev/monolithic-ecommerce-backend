import { Body, Controller, Post, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendChatMessageDto, ChatResponseDto } from './dto/chat-message.dto';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({
    summary: 'Send a chat message',
    description: 'Send a chat message and receive an AI-powered or auto-generated response',
  })
  @ApiBody({
    type: SendChatMessageDto,
    description: 'Chat message with optional conversation history',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response generated successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @Post('message')
  @Public()
  async sendMessage(@Body() sendChatMessageDto: SendChatMessageDto): Promise<ChatResponseDto> {
    this.logger.log(`Received chat message: "${sendChatMessageDto.message.substring(0, 50)}..."`);

    return this.chatService.processMessage(sendChatMessageDto.message, sendChatMessageDto.conversationHistory);
  }

  @ApiOperation({
    summary: 'Get chat service status',
    description: 'Check if AI-powered responses are available and get service status',
  })
  @ApiResponse({
    status: 200,
    description: 'Service status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        aiEnabled: {
          type: 'boolean',
          description: 'Whether AI-powered responses are available',
          example: true,
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Current server timestamp',
          example: '2024-08-05T10:30:00.000Z',
        },
      },
    },
  })
  @Get('status')
  @Public()
  getStatus(): { aiEnabled: boolean; timestamp: string } {
    return {
      aiEnabled: this.chatService.isAiEnabled(),
      timestamp: new Date().toISOString(),
    };
  }
}
