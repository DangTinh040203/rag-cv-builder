import { Injectable } from '@nestjs/common';

import { IClerkWebhookStrategy } from '@/modules/user/application/interfaces';
import {
  ClerkUserWebhook,
  ClerkWebhook,
} from '@/modules/user/domain/clerk-webhook.domain';

@Injectable()
export class UserCreatedStrategy implements IClerkWebhookStrategy {
  getType(): ClerkUserWebhook {
    return ClerkUserWebhook.USER_CREATED;
  }

  async handle(event: ClerkWebhook): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
