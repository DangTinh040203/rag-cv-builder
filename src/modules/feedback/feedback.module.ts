import { Module } from '@nestjs/common';

import { DatabaseModule } from '@/libs/databases/database.module';
import { FeedbackService } from '@/modules/feedback/application';
import { FeedbackController } from '@/modules/feedback/presentation';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [DatabaseModule, UserModule],
  providers: [FeedbackService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
