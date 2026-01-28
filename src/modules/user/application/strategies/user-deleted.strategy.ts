import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  type IClerkWebhookStrategy,
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { UserService } from '@/modules/user/application/services/user.service';
import { ClerkUserWebhook, ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class UserDeletedStrategy implements IClerkWebhookStrategy {
  private readonly logger = new Logger(UserDeletedStrategy.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
    private readonly userService: UserService,
  ) {}

  getType(): ClerkUserWebhook {
    return ClerkUserWebhook.USER_DELETED;
  }

  async handle(event: ClerkWebhook): Promise<void> {
    const { data } = event;

    if (!data.id) {
      this.logger.warn('No user ID found in event data');
      return;
    }

    const start = Date.now();
    this.logger.log(`Processing user deletion for Clerk ID: ${data.id}`);

    const user = await this.userRepository.findByProviderId(data.id);

    if (!user) {
      this.logger.warn(`User with providerId ${data.id} not found`);
      return;
    }

    await this.userRepository.delete(user.id);

    await this.userService.invalidateUserCache(data.id);

    const duration = Date.now() - start;
    this.logger.log(
      `User ${user.id} (Clerk: ${data.id}) deleted successfully in ${duration}ms`,
    );
  }
}
