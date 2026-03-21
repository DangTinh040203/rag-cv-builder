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
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Delete all existing related data
      await Promise.all([
        tx.resumeInformation.deleteMany({ where: { resumeId: id } }),
        tx.education.deleteMany({ where: { resumeId: id } }),
        tx.workExperience.deleteMany({ where: { resumeId: id } }),
        tx.project.deleteMany({ where: { resumeId: id } }),
        tx.skill.deleteMany({ where: { resumeId: id } }),
        tx.certification.deleteMany({ where: { resumeId: id } }),
        tx.language.deleteMany({ where: { resumeId: id } }),
      ]);

      // Step 2: Update resume metadata
      await tx.resume.update({
        where: { id },
        data: {
          title: payload.title,
          subTitle: payload.subTitle,
          overview: payload.overview,
        },
      });

      // Step 3: Re-create related data
      const creates: Promise<unknown>[] = [];

      if (payload.information?.length) {
        creates.push(
          tx.resumeInformation.createMany({
            data: payload.information.map((item) => ({
              ...item,
              resumeId: id,
            })),
          }),
        );
      }
      if (payload.educations?.length) {
        creates.push(
          tx.education.createMany({
            data: payload.educations.map((item) => ({ ...item, resumeId: id })),
          }),
        );
      }
      if (payload.workExperiences?.length) {
        creates.push(
          tx.workExperience.createMany({
            data: payload.workExperiences.map((item) => ({
              ...item,
              resumeId: id,
            })),
          }),
        );
      }
      if (payload.projects?.length) {
        creates.push(
          tx.project.createMany({
            data: payload.projects.map((item) => ({ ...item, resumeId: id })),
          }),
        );
      }
      if (payload.skills?.length) {
        creates.push(
          tx.skill.createMany({
            data: payload.skills.map((item) => ({ ...item, resumeId: id })),
          }),
        );
      }
      if (payload.certifications?.length) {
        creates.push(
          tx.certification.createMany({
            data: payload.certifications.map((item) => ({
              ...item,
              resumeId: id,
            })),
          }),
        );
      }
      if (payload.languages?.length) {
        creates.push(
          tx.language.createMany({
            data: payload.languages.map((item) => ({ ...item, resumeId: id })),
          }),
        );
      }

      if (creates.length > 0) {
        await Promise.all(creates);
      }
    });

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
