import { Module } from '@nestjs/common';

import { CLERK_STRATEGY } from '@/modules/user/application/interfaces';
import {
  UserCreatedStrategy,
  UserUpdatedStrategy,
} from '@/modules/user/application/strategies';

@Module({
  imports: [],
  providers: [
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
  exports: [CLERK_STRATEGY],
})
export class UserStrategyModule {}
