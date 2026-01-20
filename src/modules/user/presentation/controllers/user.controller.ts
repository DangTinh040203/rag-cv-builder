import { Controller, Logger, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

import { Env } from '@/libs/configs';
import { Public } from '@/libs/decorators';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { ClerkWebhook } from '@/modules/user/domain';

@Controller('users')
export class UserController {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly clerkWebhookService: ClerkWebhookService,
  ) {}

  @Public()
  @Post('clerk')
  async handleClerkWebhook(@Req() req) {
    const svixHeaders = {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    };

    this.logger.log('Svix headers:', svixHeaders);

    const wh = new Webhook(
      this.configService.getOrThrow(Env.CLERK_WEBHOOK_SECRET),
    );

    const payload = JSON.stringify(req.body);
    const evt = wh.verify(payload, svixHeaders) as ClerkWebhook;

    await this.clerkWebhookService.processWebhook(evt);
  }
}
