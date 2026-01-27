import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';

import { ResumeService } from '@/modules/resume/application/services';
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
    private readonly resumeService: ResumeService,
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

    const title = primaryEmail.email_address.split('@')[0] || 'Full Name';
    const resumeData = {
      title,
      subTitle: 'Your Position',
      overview: 'Your Overview',
      avatar: data.image_url,
      information: { create: [] },
      educations: { create: [] },
      workExperiences: { create: [] },
      projects: { create: [] },
      skills: { create: [] },
    };

    const newUser = await this.userRepository.create(
      {
        email: primaryEmail.email_address,
        firstName: data.first_name,
        lastName: data.last_name,
        avatar: data.image_url,
        provider: 'clerk',
        providerId: data.id,
      },
      resumeData,
    );

    this.logger.log(
      `User created successfully with email: ${primaryEmail.email_address}`,
    );
  }
}
