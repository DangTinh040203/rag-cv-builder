import { type Resume } from '@/modules/resume/domain';
import {
  type CreateResumeDto,
  type UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';

export const RESUME_REPOSITORY_TOKEN = 'RESUME_REPOSITORY_TOKEN';

export interface IResumeRepository {
  create(payload: CreateResumeDto): Promise<Resume>;
  findById(id: string): Promise<Resume>;
  update(id: string, payload: UpdateResumeDto): Promise<Resume>;
  delete(id: string): Promise<void>;
}
