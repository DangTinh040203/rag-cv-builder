import { Logger, Module } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import { RESUME_REPOSITORY_TOKEN } from '@/modules/resume/application/interfaces';
import { ResumeService } from '@/modules/resume/application/services';
import { PrismaAdapterResumeRepository } from '@/modules/resume/infrastructure/repositories/prisma-resume.repo';
import { ResumeController } from '@/modules/resume/presentation/controllers';

@Module({
  providers: [
    Logger,
    PrismaService,
    ResumeService,

    {
      provide: RESUME_REPOSITORY_TOKEN,
      useClass: PrismaAdapterResumeRepository,
    },
  ],
  controllers: [ResumeController],
  exports: [ResumeService],
})
export class ResumeModule {}
