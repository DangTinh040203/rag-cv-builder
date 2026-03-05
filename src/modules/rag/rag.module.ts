import { Logger, Module } from '@nestjs/common';

import { LLM_PROVIDER_TOKEN } from '@/modules/rag/application/interfaces/llm-provider.interface';
import { RagService } from '@/modules/rag/application/services/rag.service';
import { GeminiAdapter } from '@/modules/rag/infrastructure/adapters/gemini.adapter';

@Module({
  providers: [
    RagService,
    Logger,
    {
      provide: LLM_PROVIDER_TOKEN,
      useClass: GeminiAdapter,
    },
  ],
  exports: [RagService],
})
export class RagModule {}
