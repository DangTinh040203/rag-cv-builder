import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { CacheKeys, CacheService } from '@/libs/cache';
import { type UpdateResumeCommand } from '@/modules/resume/application/commands';
import {
  type IResumeRepository,
  RESUME_REPOSITORY_TOKEN,
} from '@/modules/resume/application/interfaces';
import { Resume } from '@/modules/resume/domain';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
    private readonly cacheService: CacheService,
  ) {}

  async update(
    id: string,
    payload: UpdateResumeCommand,
    userId: string,
  ): Promise<Resume> {
    await this.authorizeOwner(id, userId);
    const resume = await this.resumeRepository.update(id, payload);
    await this.invalidateResumeCache(userId, id);
    return resume;
  }

  async findById(id: string, userId: string): Promise<Resume> {
    return this.findAndAuthorize(id, userId);
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    const cacheKey = CacheKeys.resume.byUserId(userId);
    const cached = await this.cacheService.get<Resume | null>(cacheKey);

    if (cached !== undefined) {
      return cached ? new Resume(cached) : null;
    }

    this.logger.debug(`Cache MISS for resume by userId: ${userId}`);
    const resume = await this.resumeRepository.findByUserId(userId);

    if (resume) {
      await this.cacheService.set(cacheKey, resume);
    } else {
      await this.cacheService.set(cacheKey, null, 60 * 1000);
    }

    return resume;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.authorizeOwner(id, userId);
    await this.resumeRepository.delete(id);
    await this.invalidateResumeCache(userId, id);
  }

  private async invalidateResumeCache(
    userId: string,
    resumeId: string,
  ): Promise<void> {
    await Promise.all([
      this.cacheService.del(CacheKeys.resume.byUserId(userId)),
      this.cacheService.del(CacheKeys.resume.byId(resumeId)),
    ]);
    this.logger.debug(
      `Cache invalidated for resume — userId: ${userId}, resumeId: ${resumeId}`,
    );
  }

  /**
   * Lightweight ownership check — only selects id + userId.
   * Use this when you don't need the full resume data (e.g., before update/delete).
   */
  private async authorizeOwner(id: string, userId: string): Promise<void> {
    const owner = await this.resumeRepository.findOwner(id);
    if (!owner) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }
    if (owner.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this resume',
      );
    }
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
