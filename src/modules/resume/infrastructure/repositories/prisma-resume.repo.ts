import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import { IResumeRepository } from '@/modules/resume/application/interfaces';
import { type Resume } from '@/modules/resume/domain';
import {
  type CreateResumeDto,
  type UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';

const resumeInclude = {
  information: true,
  educations: true,
  workExperiences: true,
  projects: true,
  skills: true,
  user: true,
} as const;

@Injectable()
export class PrismaAdapterResumeRepository implements IResumeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<Resume[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      include: resumeInclude,
    });
  }

  async create(userId: string, payload: CreateResumeDto): Promise<Resume> {
    return this.prisma.resume.create({
      data: {
        title: payload.title,
        subTitle: payload.subTitle,
        overview: payload.overview,
        userId: userId,
        avatar: payload.avatar,
        information: {
          create: payload.information,
        },
        educations: {
          create: payload.educations,
        },
        workExperiences: {
          create: payload.workExperiences,
        },
        projects: {
          create: payload.projects,
        },
        skills: {
          create: payload.skills,
        },
      },
      include: resumeInclude,
    });
  }

  async findById(id: string): Promise<Resume | null> {
    return this.prisma.resume.findUnique({
      where: {
        id: id,
      },
      include: resumeInclude,
    });
  }

  async update(id: string, payload: UpdateResumeDto): Promise<Resume> {
    return this.prisma.resume.update({
      where: {
        id: id,
      },
      data: {
        title: payload.title,
        subTitle: payload.subTitle,
        overview: payload.overview,
        information: {
          deleteMany: {},
          create: payload.information,
        },
        educations: {
          deleteMany: {},
          create: payload.educations,
        },
        workExperiences: {
          deleteMany: {},
          create: payload.workExperiences,
        },
        projects: {
          deleteMany: {},
          create: payload.projects,
        },
        skills: {
          deleteMany: {},
          create: payload.skills,
        },
      },
      include: resumeInclude,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.resume.delete({
      where: {
        id: id,
      },
    });
  }
}
