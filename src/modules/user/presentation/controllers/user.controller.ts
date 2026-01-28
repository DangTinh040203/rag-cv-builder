import { Controller, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';

import { Public } from '@/libs/decorators';
import { ClerkWebhookService } from '@/modules/user/application/services';
import { ClerkWebhookGuard } from '@/modules/user/presentation/guards/clerk-webhook.guard';

@Controller('users')
export class UserController {
  constructor(
    private readonly logger: Logger,
    private readonly clerkWebhookService: ClerkWebhookService,
  ) {}

  @Public()
  @UseGuards(ClerkWebhookGuard)
  @Post('clerk')
  async handleClerkWebhook(@Req() req: Request) {
    this.logger.log(
      'Clerk webhook received:',
      req.clerkEvent?.data.backup_code_enabled,
    );
    await this.clerkWebhookService.processWebhook(req.clerkEvent);
  }
}
