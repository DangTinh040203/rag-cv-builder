import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { HealthController } from '@/app/health.controller';
import { CacheModule } from '@/libs/cache';
import { Env } from '@/libs/configs';
import { AppConfigModule } from '@/libs/configs/config.module';
import { DatabaseModule } from '@/libs/databases/database.module';
import { GlobalExceptionFilter } from '@/libs/filters';
import { ClerkAuthGuard } from '@/libs/guards';
import { InterviewModule } from '@/modules/interview/interview.module';
import { RagModule } from '@/modules/rag/rag.module';
import { ResumeModule } from '@/modules/resume/resume.module';
import { UserModule } from '@/modules/user/user.module';

@Module({
  imports: [
    UserModule,
    ResumeModule,
    RagModule,
    InterviewModule,
    DatabaseModule,
    AppConfigModule,
    CacheModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>(Env.THROTTLE_TTL),
          limit: configService.getOrThrow<number>(Env.THROTTLE_LIMIT),
        },
      ],
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
