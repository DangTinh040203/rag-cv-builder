import {
  type CreateUserCommand,
  type UpdateUserCommand,
} from '@/modules/user/application/commands';
import { type User } from '@/modules/user/domain';

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY_TOKEN');

export interface IUserRepository {
  create(payload: CreateUserCommand): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProviderId(providerId: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  update(id: string, payload: UpdateUserCommand): Promise<User>;
}
