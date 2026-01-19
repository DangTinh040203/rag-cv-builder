import { Controller, Logger, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

import { Env } from '@/libs/configs';
import { Public } from '@/libs/decorators';
import { UserService } from '@/modules/user/application/services/user.service';
import {
  ClerkUserWebhook,
  ClerkWebhook,
} from '@/modules/user/domain/clerk-webhook.domain';
import { CreateUserDto } from '@/modules/user/presentation/DTOs/create-user.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly logger: Logger,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('clerk')
  handleClerkWebhook(@Req() req) {
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

    switch (evt.type) {
      case ClerkUserWebhook.USER_CREATED: {
        const clerkPayloadData = evt.data;
        const payload: CreateUserDto = {
          avatar: clerkPayloadData.image_url,
          provider: 'CLERK',
          email: clerkPayloadData.email_addresses[0].email_address,
          providerId: clerkPayloadData.id,
          firstName: clerkPayloadData.first_name,
          lastName: clerkPayloadData.last_name,
        };

        this.logger.log(payload, UserController.name);

        break;
      }

      default:
        break;
    }
  }
}
