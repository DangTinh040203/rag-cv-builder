import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';

import {
  type IClerkWebhookStrategy,
  type IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/modules/user/application/interfaces';
import { ClerkUserWebhook, ClerkWebhook } from '@/modules/user/domain';

@Injectable()
export class UserCreatedStrategy implements IClerkWebhookStrategy {
  private readonly logger = new Logger(UserCreatedStrategy.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  getType(): ClerkUserWebhook {
    return ClerkUserWebhook.USER_CREATED;
  }

  async handle(event: ClerkWebhook): Promise<void> {
    const { data } = event;

    const primaryEmail = data.email_addresses.find(
      (email) => email.id === data.primary_email_address_id,
    );

    if (!primaryEmail) {
      this.logger.warn(`No primary email found for user ${data.id}`);
      return;
    }

    const existingUser = await this.userRepository.findByEmail(
      primaryEmail.email_address,
    );

    if (existingUser) {
      throw new ConflictException(
        `User with email ${primaryEmail.email_address} already exists`,
      );
    }

    await this.userRepository.create({
      email: primaryEmail.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      avatar: data.image_url,
      provider: 'clerk',
      providerId: data.id,
    });

    this.logger.log(
      `User created successfully with email: ${primaryEmail.email_address}`,
    );
  }
}
