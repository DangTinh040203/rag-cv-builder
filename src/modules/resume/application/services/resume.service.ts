import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import { RagService } from '@/modules/rag/application/services/rag.service';
import {
  type IResumeRepository,
  RESUME_REPOSITORY_TOKEN,
} from '@/modules/resume/application/interfaces';
import { Resume } from '@/modules/resume/domain';
import { UpdateResumeDto } from '@/modules/resume/presentation/DTOs';

@Injectable()
export class ResumeService {
  constructor(
    @Inject(RESUME_REPOSITORY_TOKEN)
    private readonly resumeRepository: IResumeRepository,
    private readonly ragService: RagService,
  ) {}

  async resumeParser(file: Express.Multer.File) {
    const dataBuffer = file.buffer;
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();

    const prompt = `
      Extract the following information from the CV text below and return it as a JSON object following this interface:
      
      interface ResumeInformation {
        label: string;
        value: string;
      }

      interface Education {
        school: string;
        degree: string;
        major: string;
        startDate: Date;
        endDate: Date | null;
      }

      interface Skill {
        label: string;
        value: string;
      }

      interface WorkExperience {
        company: string;
        position: string;
        description: string;
        startDate: Date;
        endDate: Date | null;
      }

      interface Project {
        title: string;
        subTitle: string;
        details: string;
        technologies: string;
        position: string;
        responsibilities: string;
        domain: string;
        demo?: string | null;
      }

      interface Certification {
        name: string;
        issuer: string;
        date: Date;
      }

      interface Language {
        name: string;
        description: string;
      }

      interface Resume {
        title: string;
        subTitle: string;
        overview: string;
        avatar: string | null;

        information: Array<ResumeInformation>;
        educations: Array<Education>;
        skills: Array<Skill>;
        workExperiences: Array<WorkExperience>;
        projects: Array<Project>;
        certifications: Array<Certification>;
        languages: Array<Language>;
      }


      CV Text:
      ${data.text}
      
      Return ONLY valid JSON.
    `;

    const response = await this.ragService.sendMessage(prompt);

    // Basic cleanup of response (in case LLM includes markdown backticks)
    const cleanedResponse = response
      .replace(/^```json/, '')
      .replace(/```$/, '')
      .trim();

    try {
      return JSON.parse(cleanedResponse);
    } catch {
      throw new Error(
        'Failed to parse LLM response as JSON: ' + cleanedResponse,
      );
    }
  }

  async update(
    id: string,
    payload: UpdateResumeDto,
    userId: string,
  ): Promise<Resume> {
    const resumeExist = await this.resumeRepository.findById(id);
    if (!resumeExist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    if (resumeExist.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this resume',
      );
    }

    return this.resumeRepository.update(id, payload);
  }

  async findById(id: string, userId: string): Promise<Resume> {
    const resumeExist = await this.resumeRepository.findById(id);
    if (!resumeExist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    if (resumeExist.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this resume',
      );
    }

    return resumeExist;
  }

  async findByUserId(userId: string): Promise<Resume | null> {
    return this.resumeRepository.findByUserId(userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const exist = await this.resumeRepository.findById(id);
    if (!exist) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    if (exist.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this resume',
      );
    }

    return this.resumeRepository.delete(id);
  }
}
