import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import {
  type CreateUserCommand,
  type UpdateUserCommand,
} from '@/modules/user/application/commands';
import { type IUserRepository } from '@/modules/user/application/interfaces';
import { User } from '@/modules/user/domain';

@Injectable()
export class PrismaAdapterUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateUserCommand): Promise<User> {
    const user = await this.prisma.user.create({ data: payload });
    return new User(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? new User(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? new User(user) : null;
  }

  async findByProviderId(providerId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({ where: { providerId } });
    return user ? new User(user) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async update(id: string, payload: UpdateUserCommand): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: payload,
    });
    return new User(user);
  }
}
