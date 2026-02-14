import { Injectable } from '@nestjs/common';

import { type ILLMProvider } from '@/modules/rag/application/interfaces/llm-provider.interface';

@Injectable()
export class OpenAiAdapter implements ILLMProvider {
  async generateText(prompt: string): Promise<string> {
    // Defines placeholder logic for now
    return await Promise.resolve(`[Mock Response] Processed: ${prompt}`);
  }
}
