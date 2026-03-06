import { Logger, Module } from '@nestjs/common';

import { LIVE_INTERVIEW_PROVIDER_TOKEN } from '@/modules/interview/application/interfaces';
import {
  InterviewEvaluationService,
  InterviewService,
} from '@/modules/interview/application/services';
import { GeminiLiveAdapter } from '@/modules/interview/infrastructure/adapters';
import { InterviewGateway } from '@/modules/interview/presentation/gateways';
import { WsAuthGuard } from '@/modules/interview/presentation/guards/ws-auth.guard';
import { RagModule } from '@/modules/rag/rag.module';
import { ResumeModule } from '@/modules/resume/resume.module';

@Module({
  imports: [RagModule, ResumeModule],
  providers: [
    Logger,
    InterviewService,
    InterviewEvaluationService,
    InterviewGateway,
    WsAuthGuard,
    {
      provide: LIVE_INTERVIEW_PROVIDER_TOKEN,
      useClass: GeminiLiveAdapter,
    },
  ],
})
export class InterviewModule {}
