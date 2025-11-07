import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type } from '@google/genai';
import { ChatMessageHistoryDto } from './dto/chat-message.dto';

export interface GeminiResponse {
  content: string;
  error?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenAI;
  private readonly modelName = 'gemini-2.5-flash';

  // Shared configurations
  private readonly defaultChatConfig = {
    maxOutputTokens: 65535,
    temperature: 0.7,
    topP: 0.95,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.OFF,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.OFF,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.OFF,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.OFF,
      },
    ],
  };

  private readonly systemPrompt = `You are a helpful customer support assistant for a web platform. 
Your role is to:
- Provide friendly, professional customer support
- Answer questions about pricing, features, support, trials, and demos
- Keep responses concise and helpful (2-3 sentences max)
- If you don't know something specific, offer to connect them with a human agent
- Be conversational and empathetic`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    const useVertexAI = this.configService.get<string>('GOOGLE_GENAI_USE_VERTEXAI') === 'true';
    const project = this.configService.get<string>('GOOGLE_CLOUD_PROJECT');
    const location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION');

    // Initialize based on configuration - Vertex AI or ML Dev API
    if (useVertexAI && project && location) {
      this.genAI = new GoogleGenAI({
        vertexai: true,
        project,
        location,
      });
      this.logger.log('Initialized Gemini with Vertex AI');
    } else {
      this.genAI = new GoogleGenAI({
        vertexai: false,
        apiKey,
      });
      this.logger.log('Initialized Gemini with ML Dev API');
    }
  }

  /**
   * Check if Gemini is properly configured
   */
  isConfigured(): boolean {
    return !!this.genAI;
  }

  /**
   * Create a chat session with shared configuration
   */
  private createChatSession(configOverrides: Partial<typeof this.defaultChatConfig> = {}) {
    return this.genAI.chats.create({
      model: this.modelName,
      config: {
        ...this.defaultChatConfig,
        ...configOverrides,
      },
    });
  }

  /**
   * Build conversation prompt with history
   */
  private buildConversationPrompt(userMessage: string, conversationHistory: ChatMessageHistoryDto[] = []): string {
    let fullPrompt = `${this.systemPrompt}

`;

    // Add conversation history for context
    if (conversationHistory.length > 0) {
      fullPrompt += 'Previous conversation:\n';
      const recentHistory = conversationHistory.slice(-4); // Keep last 4 messages for context

      for (const msg of recentHistory) {
        fullPrompt += `${msg.role}: ${msg.content}\n`;
      }
      fullPrompt += '\n';
    }

    fullPrompt += `User: ${userMessage}\n\nAssistant:`;
    return fullPrompt;
  }

  /**
   * Generate a response using Gemini AI for customer support chat
   */
  async generateChatResponse(
    userMessage: string,
    conversationHistory: ChatMessageHistoryDto[] = [],
  ): Promise<GeminiResponse> {
    try {
      // Create a new chat session using shared configuration
      const chatSession = this.createChatSession();

      // Build the conversation prompt using shared method
      const fullPrompt = this.buildConversationPrompt(userMessage, conversationHistory);

      // Send the message with full context
      const response = await chatSession.sendMessage({
        message: fullPrompt,
      });

      const text = response.text;

      this.logger.log(`Generated response for user message: "${userMessage.substring(0, 50)}..."`);

      return {
        content: text?.trim() || '',
      };
    } catch (error) {
      this.logger.error('Gemini API error:', error);

      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate a streaming response using Gemini AI for real-time chat
   */
  async generateChatResponseStream(
    userMessage: string,
    conversationHistory: ChatMessageHistoryDto[] = [],
  ): Promise<AsyncIterable<{ content: string; error?: string }>> {
    try {
      // Create a new chat session using shared configuration
      const chatSession = this.createChatSession();

      // Build the conversation prompt using shared method
      const fullPrompt = this.buildConversationPrompt(userMessage, conversationHistory);

      // Send message and return streaming response
      const streamResponse = await chatSession.sendMessageStream({
        message: fullPrompt,
      });

      this.logger.log(`Started streaming response for user message: "${userMessage.substring(0, 50)}..."`);

      // Transform the stream to match our expected format
      return (async function* () {
        for await (const chunk of streamResponse) {
          yield {
            content: chunk.text || '',
          };
        }
      })();
    } catch (error) {
      this.logger.error('Gemini streaming API error:', error);

      // Return an async generator that yields the error
      return (async function* () {
        await Promise.resolve();
        yield {
          content: '',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      })();
    }
  }

  /**
   * Generate a structured JSON response using Gemini AI
   * Example usage for getting structured data from the AI
   */
  async generateStructuredResponse<T = any>(
    prompt: string,
    responseSchema: any,
  ): Promise<{ data: T | null; error?: string }> {
    try {
      // Use models.generateContent for structured responses as it supports responseSchema
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.3, // Lower temperature for more consistent structured output
        },
      });

      const text = response.text;
      if (!text) {
        return { data: null, error: 'No response received' };
      }

      try {
        const parsedData = JSON.parse(text) as T;
        return { data: parsedData };
      } catch (parseError) {
        this.logger.error('Failed to parse JSON response:', parseError);
        return { data: null, error: 'Invalid JSON response' };
      }
    } catch (error) {
      this.logger.error('Structured response error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper method to create common response schemas using the Type enum
   * Example: createArraySchema for lists, createObjectSchema for structured data
   */
  createArraySchema(itemProperties: Record<string, any>) {
    return {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: itemProperties,
      },
    };
  }

  createObjectSchema(properties: Record<string, any>, required: string[] = []) {
    return {
      type: Type.OBJECT,
      properties,
      required,
    };
  }

  /**
   * Generate a response with retry logic
   */
  async generateChatResponseWithRetry(
    userMessage: string,
    conversationHistory: ChatMessageHistoryDto[] = [],
    maxRetries: number = 2,
  ): Promise<GeminiResponse> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await this.generateChatResponse(userMessage, conversationHistory);

      if (!response.error) {
        return response;
      }

      lastError = response.error;

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        this.logger.warn(`Retrying Gemini API call (attempt ${attempt + 2}/${maxRetries + 1})`);
      }
    }

    this.logger.error(`Gemini API failed after ${maxRetries + 1} attempts: ${lastError}`);

    return {
      content: '',
      error: lastError || 'Failed after multiple retries',
    };
  }
}
