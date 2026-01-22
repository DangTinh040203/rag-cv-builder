import { Inject, Injectable, NotFoundException } from '@nestjs/common';

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

  create(userId: string, payload: CreateResumeDto): Promise<Resume> {
    return this.resumeRepository.create(userId, payload);
  }

  async update(id: string, payload: UpdateResumeDto): Promise<Resume> {
    const exist = await this.resumeRepository.findById(id);
    if (!exist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    return this.resumeRepository.update(id, payload);
  }

  async findById(id: string): Promise<Resume> {
    const exist = await this.resumeRepository.findById(id);
    if (!exist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    return exist;
  }
}
