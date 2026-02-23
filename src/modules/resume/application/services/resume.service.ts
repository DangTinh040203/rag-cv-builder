import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import { RagService } from '@/modules/rag/application/services/rag.service';
import {
  RESUME_PARSER_PROMPT,
  RESUME_SCHEMA,
} from '@/modules/resume/application/constants/prompt.constant';
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

    const prompt = RESUME_PARSER_PROMPT.replace('{cv_text}', data.text);

    const response = await this.ragService.sendMessage(prompt, RESUME_SCHEMA);

    try {
      return JSON.parse(response);
    } catch {
      throw new Error('Failed to parse LLM response as JSON: ' + response);
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
