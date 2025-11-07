import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageHistoryDto {
  @ApiProperty({
    description: 'The role of the message sender',
    enum: ['user', 'assistant'],
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, I need help with pricing information',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class SendChatMessageDto {
  @ApiProperty({
    description: 'The user message to send to the chat service',
    example: 'What are your pricing plans?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Previous conversation history for context',
    type: [ChatMessageHistoryDto],
    example: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there! How can I help you today?' },
    ],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageHistoryDto)
  conversationHistory?: ChatMessageHistoryDto[];
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'The generated response content',
    example:
      'Our pricing plans start at $29/month for the Starter plan. Would you like me to tell you more about our different plans?',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Error message if the response generation failed',
    example: 'Gemini API temporarily unavailable',
  })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty({
    description: 'Timestamp when the response was generated',
    format: 'date-time',
    example: '2024-08-05T10:30:00.000Z',
  })
  @IsString()
  timestamp: string;
}
