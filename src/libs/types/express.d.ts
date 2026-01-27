import { type JwtPayload } from '@clerk/backend';

import { type ClerkWebhook } from '@/modules/user/domain';

declare global {
  namespace Express {
    interface Request {
      auth: JwtPayload;
      clerkEvent: ClerkWebhook | null;
    }
  }
}
