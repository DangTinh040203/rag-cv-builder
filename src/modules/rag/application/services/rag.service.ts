import { Inject, Injectable } from '@nestjs/common';

import {
  type ILLMProvider,
  LLM_PROVIDER_TOKEN,
} from '@/modules/rag/application/interfaces/llm-provider.interface';
import { type GenerateTextDto } from '@/modules/rag/presentation/dtos/generate-text.dto';

@Injectable()
export class RagService {
  constructor(
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: ILLMProvider,
  ) {}

  async generateText(dto: GenerateTextDto): Promise<string> {
    return this.llmProvider.generateText(dto.prompt);
  }
}
