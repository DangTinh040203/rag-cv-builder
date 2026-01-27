import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

import { Env } from '@/libs/configs';
import { ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class ClerkWebhookGuard implements CanActivate {
  private readonly logger = new Logger(ClerkWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const svixHeaders = {
      'svix-id': request.headers['svix-id'],
      'svix-timestamp': request.headers['svix-timestamp'],
      'svix-signature': request.headers['svix-signature'],
    };

    if (
      !svixHeaders['svix-id'] ||
      !svixHeaders['svix-timestamp'] ||
      !svixHeaders['svix-signature']
    ) {
      this.logger.error('Missing svix headers');
      return false;
    }

    const wh = new Webhook(
      this.configService.getOrThrow(Env.CLERK_WEBHOOK_SECRET),
    );

    try {
      const payload = JSON.stringify(request.body);
      const evt = wh.verify(payload, svixHeaders) as ClerkWebhook;
      // Attach verified event to request for controller to use
      request.clerkEvent = evt;
      return true;
    } catch (err) {
      this.logger.error('Error verifying webhook:', err);
      return false;
    }
  }
}
