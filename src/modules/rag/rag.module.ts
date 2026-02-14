import { Module } from '@nestjs/common';

import { LLM_PROVIDER_TOKEN } from '@/modules/rag/application/interfaces/llm-provider.interface';
import { RagService } from '@/modules/rag/application/services/rag.service';
import { OpenAiAdapter } from '@/modules/rag/infrastructure/adapters/openai.adapter';
import { RagController } from '@/modules/rag/presentation/controllers/rag.controller';

@Module({
  controllers: [RagController],
  providers: [
    RagService,
    {
      provide: LLM_PROVIDER_TOKEN,
      useClass: OpenAiAdapter,
    },
  ],
  exports: [RagService],
})
export class RagModule {}
