import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import { type IUserRepository } from '@/modules/user/application/interfaces';
import { type User } from '@/modules/user/domain';
import {
  type CreateUserDto,
  type UpdateUserDto,
} from '@/modules/user/presentation/DTOs';

@Injectable()
export class PrismaAdapterUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateUserDto, resumePayload: any): Promise<User> {
    return await this.prisma.user.create({
      data: {
        ...payload,
        resume: {
          create: resumePayload,
        },
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findByProviderId(providerId: string): Promise<User | null> {
    return await this.prisma.user.findFirst({ where: { providerId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async update(id: string, payload: UpdateUserDto): Promise<User> {
    return await this.prisma.user.update({ where: { id }, data: payload });
  }
}
