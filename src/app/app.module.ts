import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppConfigModule } from '@/libs/configs/config.module';
import { DatabaseModule } from '@/libs/databases/database.module';
import { ClerkAuthGuard } from '@/libs/guards';
import { ResumeModule } from '@/modules/resume/resume.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [UserModule, ResumeModule, DatabaseModule, AppConfigModule],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
