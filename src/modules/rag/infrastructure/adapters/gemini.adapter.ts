import { GoogleGenAI } from '@google/genai';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from '@/libs/configs';
import { type LLMProvider } from '@/modules/rag/application/interfaces/llm-provider.interface';

@Injectable()
export class GeminiAdapter implements LLMProvider {
  private readonly genAI: GoogleGenAI;

  constructor(
    @Inject() private readonly configService: ConfigService,
    @Inject() private readonly logger: Logger,
  ) {
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.get<string>(Env.GEMINI_API_KEY),
    });
  }

  async sendMessage(content: string) {
    const response = await this.genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: content,
    });

    if (!response.text) {
      this.logger.error('GeminiAdapter: Response text is undefined');
      throw new InternalServerErrorException();
    }

    return response.text;
  }
}
