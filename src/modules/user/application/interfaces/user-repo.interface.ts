import { type User } from '@/modules/user/domain';
import {
  type CreateUserDto,
  type UpdateUserDto,
} from '@/modules/user/presentation/DTOs';

export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY_TOKEN';

export interface IUserRepository {
  create(payload: CreateUserDto, resumePayload: any): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProviderId(providerId: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  update(id: string, payload: UpdateUserDto): Promise<User>;
}
