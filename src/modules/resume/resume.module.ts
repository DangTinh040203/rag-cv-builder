import { Logger, Module } from '@nestjs/common';

import { RagModule } from '@/modules/rag/rag.module';
import { RESUME_REPOSITORY_TOKEN } from '@/modules/resume/application/interfaces';
import { UserCreatedListener } from '@/modules/resume/application/listeners/user-created.listener';
import {
  EmailGenerationService,
  ResumeMatchingService,
  ResumeParserService,
  ResumeService,
} from '@/modules/resume/application/services';
import { PrismaAdapterResumeRepository } from '@/modules/resume/infrastructure/repositories/prisma-resume.repo';
import { ResumeController } from '@/modules/resume/presentation/controllers';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [RagModule, UserModule],
  providers: [
    Logger,
    ResumeService,
    ResumeParserService,
    ResumeMatchingService,
    EmailGenerationService,
    UserCreatedListener,

    {
      provide: RESUME_REPOSITORY_TOKEN,
      useClass: PrismaAdapterResumeRepository,
    },
  ],
  controllers: [ResumeController],
  exports: [ResumeService, RESUME_REPOSITORY_TOKEN],
})
export class ResumeModule {}
