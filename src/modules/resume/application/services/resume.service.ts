import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { type UpdateResumeCommand } from '@/modules/resume/application/commands';
import {
  type IResumeRepository,
  RESUME_REPOSITORY_TOKEN,
} from '@/modules/resume/application/interfaces';
import { Resume } from '@/modules/resume/domain';

@Injectable()
export class ResumeService {
  constructor(
    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
  ) {}

  async update(
    id: string,
    payload: UpdateResumeCommand,
    userId: string,
  ): Promise<Resume> {
    await this.findAndAuthorize(id, userId);
    return this.resumeRepository.update(id, payload);
  }

  async findById(id: string, userId: string): Promise<Resume> {
    return this.findAndAuthorize(id, userId);
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    return this.resumeRepository.findByUserId(userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findAndAuthorize(id, userId);
    return this.resumeRepository.delete(id);
  }

  /**
   * Find a resume by ID and verify it belongs to the given user.
   * Throws NotFoundException if not found, ForbiddenException if not owned.
   */
  private async findAndAuthorize(id: string, userId: string): Promise<Resume> {
    const resume = await this.resumeRepository.findById(id);
    if (!resume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }
    if (resume.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this resume',
      );
    }
    return resume;
  }
}
