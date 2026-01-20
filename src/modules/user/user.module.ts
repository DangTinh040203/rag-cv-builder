import { Logger, Module } from '@nestjs/common';

import { CLERK_STRATEGY } from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';
import {
  UserCreatedStrategy,
  UserUpdatedStrategy,
} from '@/modules/user/application/strategies';
import { UserController } from '@/modules/user/presentation/controllers/user.controller';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    ClerkWebhookService,
    UserService,
    Logger,

    // Strategies
    UserCreatedStrategy,
    UserUpdatedStrategy,
    {
      provide: CLERK_STRATEGY,
      useFactory: (
        userCreatedStrategy: UserCreatedStrategy,
        userUpdatedStrategy: UserUpdatedStrategy,
      ) => {
        return [userCreatedStrategy, userUpdatedStrategy];
      },
      inject: [UserCreatedStrategy, UserUpdatedStrategy],
    },
  ],
})
export class UserModule {}
