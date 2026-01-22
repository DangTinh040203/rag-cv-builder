import { Logger, Module } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import { ResumeModule } from '@/modules/resume/resume.module';
import {
  CLERK_STRATEGY,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';
import {
  UserCreatedStrategy,
  UserUpdatedStrategy,
} from '@/modules/user/application/strategies';
import { PrismaAdapterUserRepository } from '@/modules/user/infrastructure/repositories';
import { UserController } from '@/modules/user/presentation/controllers';

@Module({
  imports: [ResumeModule],
  controllers: [UserController],
  providers: [
    PrismaService,
    ClerkWebhookService,
    UserService,
    Logger,

    // Repository
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaAdapterUserRepository,
    },

    // Strategies
    UserCreatedStrategy,
    UserUpdatedStrategy,
    {
      provide: CLERK_STRATEGY,
      useFactory: (
        userCreatedStrategy: UserCreatedStrategy,
        userUpdatedStrategy: UserUpdatedStrategy,
      ) => [userCreatedStrategy, userUpdatedStrategy],
      inject: [UserCreatedStrategy, UserUpdatedStrategy],
    },
  ],
  exports: [USER_REPOSITORY_TOKEN, UserService],
})
export class UserModule {}
