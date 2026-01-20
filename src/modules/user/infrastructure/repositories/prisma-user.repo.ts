import { type PrismaService } from '@/libs/databases/prisma.service';
import { type IUserRepository } from '@/modules/user/application/interfaces';
import { type User } from '@/modules/user/domain';
import {
  type CreateUserDto,
  type UpdateUserDto,
} from '@/modules/user/presentation/DTOs';

export class PrismaAdapterUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data: payload });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async update(id: string, payload: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: payload });
  }
}
