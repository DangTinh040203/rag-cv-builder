import { type Resume } from '@/modules/resume/domain';
import {
  type CreateResumeDto,
  type UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';

export const RESUME_REPOSITORY_TOKEN = 'RESUME_REPOSITORY_TOKEN';

export interface IResumeRepository {
  create(userId: string, payload: CreateResumeDto): Promise<Resume>;
  findAll(): Promise<Resume[]>;
  findById(id: string): Promise<Resume | null>;
  update(id: string, payload: UpdateResumeDto): Promise<Resume>;
  delete(id: string): Promise<void>;
}
