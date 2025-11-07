import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ChatMessageHistoryDto, ChatResponseDto } from './dto/chat-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // Fallback auto-responses for when Gemini is not available
  private readonly autoResponses: { [key: string]: string } = {
    pricing:
      'Our pricing plans start at $29/month for the Starter plan. Would you like me to tell you more about our different plans?',
    features:
      'Our platform offers analytics, server management, security features, and much more. What specific features are you interested in?',
    support:
      'We offer 24/7 support via chat, email, and phone for our Professional and Enterprise plans. Starter plan includes email support during business hours.',
    trial:
      "Yes! We offer a 14-day free trial with no credit card required. You'll get full access to all features during the trial period.",
    demo: "I'd be happy to arrange a demo for you! Could you please provide your email address so our team can contact you?",
    default:
      'Thank you for your message. One of our support agents will respond shortly. In the meantime, is there anything else I can help you with?',
  };

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Generate fallback response using keyword matching
   */
  private generateFallbackResponse(userInput: string): string {
    const lowercaseInput = userInput.toLowerCase();

    if (lowercaseInput.includes('pricing') || lowercaseInput.includes('cost') || lowercaseInput.includes('price')) {
      return this.autoResponses.pricing;
    } else if (
      lowercaseInput.includes('feature') ||
      lowercaseInput.includes('offer') ||
      lowercaseInput.includes('provide')
    ) {
      return this.autoResponses.features;
    } else if (
      lowercaseInput.includes('support') ||
      lowercaseInput.includes('help') ||
      lowercaseInput.includes('assistance')
    ) {
      return this.autoResponses.support;
    } else if (lowercaseInput.includes('trial') || lowercaseInput.includes('free') || lowercaseInput.includes('try')) {
      return this.autoResponses.trial;
    } else if (
      lowercaseInput.includes('demo') ||
      lowercaseInput.includes('demonstration') ||
      lowercaseInput.includes('show')
    ) {
      return this.autoResponses.demo;
    }

    return this.autoResponses.default;
  }

  /**
   * Process a chat message and generate a response
   */
  async processMessage(message: string, conversationHistory: ChatMessageHistoryDto[] = []): Promise<ChatResponseDto> {
    this.logger.log(`Processing chat message: "${message.substring(0, 50)}..."`);

    try {
      let responseContent: string;
      let error: string | undefined;

      if (this.geminiService.isConfigured()) {
        // Try to get response from Gemini
        const geminiResponse = await this.geminiService.generateChatResponseWithRetry(message, conversationHistory);

        if (geminiResponse.error) {
          this.logger.warn(`Gemini API failed, falling back to auto-responses: ${geminiResponse.error}`);
          responseContent = this.generateFallbackResponse(message);
          error = `Gemini unavailable: ${geminiResponse.error}`;
        } else {
          responseContent = geminiResponse.content;
        }
      } else {
        // Use fallback responses if Gemini is not configured
        this.logger.log('Gemini not configured, using fallback responses');
        responseContent = this.generateFallbackResponse(message);
      }

      return {
        content: responseContent,
        error,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error processing chat message:', error);

      // Fallback to auto-responses on any error
      const fallbackResponse = this.generateFallbackResponse(message);

      return {
        content: fallbackResponse,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if AI-powered responses are available
   */
  isAiEnabled(): boolean {
    return this.geminiService.isConfigured();
  }
}
