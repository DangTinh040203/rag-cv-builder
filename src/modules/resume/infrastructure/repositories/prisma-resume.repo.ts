import { Injectable } from '@nestjs/common';
import { type PrismaPromise } from '@prisma/client/runtime/client';

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

  /**
   * Checks if a resume exists and returns only the userId for authorization.
   * Avoids loading all relations just to verify ownership.
   */
  async findOwner(id: string): Promise<{ id: string; userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
  }

  async update(id: string, payload: UpdateResumeCommand): Promise<Resume> {
    // Use batched $transaction to send all queries in minimal round-trips.
    // This is critical because DB latency is ~232ms per round-trip.
    // Old approach: nested deleteMany+create = ~19 sequential SQL operations = ~4.4s network latency alone.
    // New approach: batch transaction = all operations sent together.
    const operations: PrismaPromise<unknown>[] = [
      // 1. Delete all child records in parallel within the transaction
      this.prisma.resumeInformation.deleteMany({ where: { resumeId: id } }),
      this.prisma.education.deleteMany({ where: { resumeId: id } }),
      this.prisma.workExperience.deleteMany({ where: { resumeId: id } }),
      this.prisma.project.deleteMany({ where: { resumeId: id } }),
      this.prisma.skill.deleteMany({ where: { resumeId: id } }),
      this.prisma.certification.deleteMany({ where: { resumeId: id } }),
      this.prisma.language.deleteMany({ where: { resumeId: id } }),

      // 2. Update resume scalar fields
      this.prisma.resume.update({
        where: { id },
        data: {
          title: payload.title,
          subTitle: payload.subTitle,
          overview: payload.overview,
        },
      }),
    ];

    // 3. Batch all CREATE operations using createMany (bulk insert)
    if (payload.information?.length) {
      operations.push(
        this.prisma.resumeInformation.createMany({
          data: payload.information.map((item) => ({ ...item, resumeId: id })),
        }),
      );
    }
    if (payload.educations?.length) {
      operations.push(
        this.prisma.education.createMany({
          data: payload.educations.map((item) => ({ ...item, resumeId: id })),
        }),
      );
    }
    if (payload.workExperiences?.length) {
      operations.push(
        this.prisma.workExperience.createMany({
          data: payload.workExperiences.map((item) => ({
            ...item,
            resumeId: id,
          })),
        }),
      );
    }
    if (payload.projects?.length) {
      operations.push(
        this.prisma.project.createMany({
          data: payload.projects.map((item) => ({ ...item, resumeId: id })),
        }),
      );
    }
    if (payload.skills?.length) {
      operations.push(
        this.prisma.skill.createMany({
          data: payload.skills.map((item) => ({ ...item, resumeId: id })),
        }),
      );
    }
    if (payload.certifications?.length) {
      operations.push(
        this.prisma.certification.createMany({
          data: payload.certifications.map((item) => ({
            ...item,
            resumeId: id,
          })),
        }),
      );
    }
    if (payload.languages?.length) {
      operations.push(
        this.prisma.language.createMany({
          data: payload.languages.map((item) => ({ ...item, resumeId: id })),
        }),
      );
    }

    // Execute all operations in a single batched transaction
    await this.prisma.$transaction(operations);

    // Fetch the updated resume with all relations
    const resume = await this.prisma.resume.findUniqueOrThrow({
      where: { id },
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
