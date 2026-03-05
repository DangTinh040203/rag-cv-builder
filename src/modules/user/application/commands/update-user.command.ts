import { type CreateUserCommand } from '@/modules/user/application/commands/create-user.command';

export type UpdateUserCommand = Partial<CreateUserCommand>;
