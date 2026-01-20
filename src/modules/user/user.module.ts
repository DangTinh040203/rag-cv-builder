import { Logger, Module } from '@nestjs/common';

import { USER_REPOSITORY_TOKEN } from '@/modules/user/application/interfaces';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { UserService } from '@/modules/user/application/services/user.service';
import { UserStrategyModule } from '@/modules/user/application/strategies/user-strategy.module';
import { PrismaAdapterUserRepository } from '@/modules/user/infrastructure/repositories';
import { UserController } from '@/modules/user/presentation/controllers';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [
    ClerkWebhookService,
    UserService,
    Logger,
    UserStrategyModule,

    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaAdapterUserRepository,
    },
  ],
})
export class UserModule {}
