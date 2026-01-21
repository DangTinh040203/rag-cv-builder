import { Module } from '@nestjs/common';

import { ResumeController } from '@/modules/resume/presentation/controllers';

@Module({
  controllers: [ResumeController],
})
export class ResumeModule {}
