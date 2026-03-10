import {
  type CreateResumeCommand,
  type UpdateResumeCommand,
} from '@/modules/resume/application/commands';
import { type Resume } from '@/modules/resume/domain';

export const RESUME_REPOSITORY_TOKEN = Symbol('RESUME_REPOSITORY_TOKEN');

export interface IResumeRepository {
  create(userId: string, payload: CreateResumeCommand): Promise<Resume>;
  findById(id: string): Promise<Resume | null>;
  findOwner(id: string): Promise<{ id: string; userId: string } | null>;
  findByUserId(userId: string): Promise<Resume | null>;
  update(id: string, payload: UpdateResumeCommand): Promise<Resume>;
  delete(id: string): Promise<void>;
}
