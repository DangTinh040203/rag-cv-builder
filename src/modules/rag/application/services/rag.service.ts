import { Inject, Injectable } from '@nestjs/common';

import {
  LLM_PROVIDER_TOKEN,
  type LLMProvider,
} from '@/modules/rag/application/interfaces/llm-provider.interface';

@Injectable()
export class RagService {
  constructor(
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LLMProvider,
  ) {}

  async sendMessage(content: string) {
    return this.llmProvider.sendMessage(content);
  }
}
