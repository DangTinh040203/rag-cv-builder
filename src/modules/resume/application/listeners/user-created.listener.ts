import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import type { IResumeRepository } from '@/modules/resume/application/interfaces';
import { RESUME_REPOSITORY_TOKEN } from '@/modules/resume/application/interfaces';
import { User } from '@/modules/user/domain';

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  constructor(
    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
  ) {}

  @OnEvent('user.created')
  async handleUserCreatedEvent(user: User) {
    if (!user.id) return;

    try {
      await this.resumeRepository.create(user.id, {
        title: 'Full Name',
        subTitle: 'Fullstack Developer',
        overview:
          'Passionate software engineer with 5+ years of experience in building scalable web applications. Expert in React, Node.js, and cloud technologies. Proven track record of delivering high-quality code and leading development teams.',
        avatar: user.avatar,
        information: [
          { label: 'Phone', value: '+1 (555) 123-4567' },
          { label: 'Email', value: user.email },
          { label: 'Address', value: 'Ho Chi Minh City, Vietnam' },
          { label: 'Website', value: 'https://example.com' },
          { label: 'LinkedIn', value: 'https://linkedin.com/in/example' },
          { label: 'GitHub', value: 'https://github.com/example' },
        ],
        educations: [],
        workExperiences: [],
        projects: [],
        skills: [],
        certifications: [],
        languages: [],
      });
      this.logger.log(`Initialized default resume for user ${user.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize default resume for user ${user.id}`,
        error,
      );
    }
  }
}
