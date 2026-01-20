import {
  type ClerkUserWebhook,
  type ClerkWebhook,
} from '@/modules/user/domain';

export const CLERK_STRATEGY = 'CLERK_STRATEGY';

export interface IClerkWebhookStrategy {
  getType(): ClerkUserWebhook;
  handle(event: ClerkWebhook): Promise<void>;
}
