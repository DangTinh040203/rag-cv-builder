import { Injectable } from '@nestjs/common';

import { IClerkWebhookStrategy } from '@/modules/user/application/interfaces';
import { UserService } from '@/modules/user/application/services/user.service';
import { ClerkUserWebhook, ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class UserUpdatedStrategy implements IClerkWebhookStrategy {
  constructor(private readonly userService: UserService) {}

  getType(): ClerkUserWebhook {
    return ClerkUserWebhook.USER_UPDATED;
  }

  async handle(evt: ClerkWebhook): Promise<void> {
    const { data } = evt;

    if (data.id) {
      await this.userService.invalidateUserCache(data.id);
    }
  }
}
