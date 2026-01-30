import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';

import {
  type IResumeRepository,
  RESUME_REPOSITORY_TOKEN,
} from '@/modules/resume/application/interfaces';
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

    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
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

    const newUser = await this.userRepository.create({
      email: primaryEmail.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      avatar: data.image_url,
      provider: 'clerk',
      providerId: data.id,
    });

    await this.resumeRepository.create(newUser.id, {
      title: 'Full Name',
      subTitle: 'Fullstack Developer',
      overview:
        'Passionate software engineer with 5+ years of experience in building scalable web applications. Expert in React, Node.js, and cloud technologies. Proven track record of delivering high-quality code and leading development teams.',
      avatar: data.image_url,
      information: [
        { label: 'Phone', value: '+1 (555) 123-4567' },
        { label: 'Email', value: primaryEmail.email_address },
        { label: 'Address', value: 'Ho Chi Minh City, Vietnam' },
        { label: 'Website', value: 'https://example.com' },
        { label: 'LinkedIn', value: 'https://linkedin.com/in/example' },
        { label: 'GitHub', value: 'https://github.com/example' },
      ],
      educations: [],
      workExperiences: [],
      projects: [],
      skills: [],
    });

    this.logger.log(
      `User created successfully with email: ${primaryEmail.email_address}`,
    );
  }
}
