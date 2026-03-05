import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import { RagService } from '@/modules/rag/application/services/rag.service';
import {
  RESUME_PARSER_PROMPT,
  RESUME_SCHEMA,
} from '@/modules/resume/application/constants/prompt.constant';

@Injectable()
export class ResumeParserService {
  constructor(private readonly ragService: RagService) {}

  async parse(file: Express.Multer.File): Promise<Record<string, unknown>> {
    const dataBuffer = file.buffer;
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();

    const prompt = RESUME_PARSER_PROMPT.replace('{cv_text}', data.text);

    const response = await this.ragService.sendMessage(prompt, RESUME_SCHEMA);

    try {
      return JSON.parse(response);
    } catch {
      throw new InternalServerErrorException(
        'Failed to parse LLM response as JSON',
      );
    }
  }
}
