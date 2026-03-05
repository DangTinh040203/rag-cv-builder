import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import {
  type CreateResumeCommand,
  type UpdateResumeCommand,
} from '@/modules/resume/application/commands';
import { IResumeRepository } from '@/modules/resume/application/interfaces';
import { Resume } from '@/modules/resume/domain';

const resumeInclude = {
  information: true,
  educations: true,
  workExperiences: true,
  projects: true,
  skills: true,
  certifications: true,
  languages: true,
  user: true,
} as const;

@Injectable()
export class PrismaAdapterResumeRepository implements IResumeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Resume | null> {
    const resume = await this.prisma.resume.findUnique({
      where: {
        userId,
      },
      include: resumeInclude,
    });
    return resume ? new Resume(resume) : null;
  }

  async create(userId: string, payload: CreateResumeCommand): Promise<Resume> {
    const resume = await this.prisma.resume.create({
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
        certifications: {
          create: payload.certifications,
        },
        languages: {
          create: payload.languages,
        },
      },
      include: resumeInclude,
    });
    return new Resume(resume);
  }

  async findById(id: string): Promise<Resume | null> {
    const resume = await this.prisma.resume.findUnique({
      where: {
        id: id,
      },
      include: resumeInclude,
    });
    return resume ? new Resume(resume) : null;
  }

  async update(id: string, payload: UpdateResumeCommand): Promise<Resume> {
    const resume = await this.prisma.resume.update({
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
        certifications: {
          deleteMany: {},
          create: payload.certifications,
        },
        languages: {
          deleteMany: {},
          create: payload.languages,
        },
      },
      include: resumeInclude,
    });
    return new Resume(resume);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.resume.delete({
      where: {
        id: id,
      },
    });
  }
}
