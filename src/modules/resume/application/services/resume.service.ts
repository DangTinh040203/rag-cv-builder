import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  type IResumeRepository,
  RESUME_REPOSITORY_TOKEN,
} from '@/modules/resume/application/interfaces';
import { Resume } from '@/modules/resume/domain';
import {
  CreateResumeDto,
  UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';

@Injectable()
export class ResumeService {
  constructor(
    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
  ) {}

  async create(userId: string, payload: CreateResumeDto): Promise<Resume> {
    return this.resumeRepository.create(userId, payload);
  }

  async update(
    id: string,
    payload: UpdateResumeDto,
    userId: string,
  ): Promise<Resume> {
    const resumeExist = await this.resumeRepository.findById(id);
    if (!resumeExist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    if (resumeExist.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this resume',
      );
    }

    return this.resumeRepository.update(id, payload);
  }

  async findById(id: string, userId: string): Promise<Resume> {
    const resumeExist = await this.resumeRepository.findById(id);
    if (!resumeExist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    if (resumeExist.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this resume',
      );
    }

    return resumeExist;
  }

  async findAll(userId: string): Promise<Resume[]> {
    return this.resumeRepository.findAll(userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const exist = await this.resumeRepository.findById(id);
    if (!exist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    if (exist.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this resume',
      );
    }

    return this.resumeRepository.delete(id);
  }
}
