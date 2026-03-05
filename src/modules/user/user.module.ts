import { Logger, Module } from '@nestjs/common';

import {
  CLERK_STRATEGY,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';
import {
  UserCreatedStrategy,
  UserDeletedStrategy,
  UserUpdatedStrategy,
} from '@/modules/user/application/strategies';
import { PrismaAdapterUserRepository } from '@/modules/user/infrastructure/repositories';
import { UserController } from '@/modules/user/presentation/controllers';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
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
    UserDeletedStrategy,
    {
      provide: CLERK_STRATEGY,
      useFactory: (
        userCreatedStrategy: UserCreatedStrategy,
        userUpdatedStrategy: UserUpdatedStrategy,
        userDeletedStrategy: UserDeletedStrategy,
      ) => [userCreatedStrategy, userUpdatedStrategy, userDeletedStrategy],
      inject: [UserCreatedStrategy, UserUpdatedStrategy, UserDeletedStrategy],
    },
  ],
  exports: [USER_REPOSITORY_TOKEN, UserService],
})
export class UserModule {}
