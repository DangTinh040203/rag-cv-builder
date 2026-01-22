import { Inject, Injectable } from '@nestjs/common';

import {
  type IResumeRepository,
  RESUME_REPOSITORY_TOKEN,
} from '@/modules/resume/application/interfaces';
import { Resume } from '@/modules/resume/domain';
import { CreateResumeDto } from '@/modules/resume/presentation/DTOs';

@Injectable()
export class ResumeService {
  constructor(
    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
  ) {}

  create(userId: string, payload: CreateResumeDto): Promise<Resume> {
    return this.resumeRepository.create(userId, payload);
  }
}
