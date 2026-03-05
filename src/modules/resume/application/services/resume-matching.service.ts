import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { RagService } from '@/modules/rag/application/services/rag.service';
import {
  MATCH_CV_JD_PROMPT,
  MATCH_CV_JD_SCHEMA,
} from '@/modules/resume/application/constants/prompt.constant';
import { ResumeService } from '@/modules/resume/application/services/resume.service';

@Injectable()
export class ResumeMatchingService {
  constructor(
    private readonly ragService: RagService,
    private readonly resumeService: ResumeService,
  ) {}

  async match(
    resumeId: string,
    jobDescriptionText: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const resume = await this.resumeService.findById(resumeId, userId);

    const cvJson = JSON.stringify({
      title: resume.title,
      subTitle: resume.subTitle,
      overview: resume.overview,
      skills: resume.skills,
      workExperiences: resume.workExperiences,
      projects: resume.projects,
      educations: resume.educations,
      certifications: resume.certifications,
      languages: resume.languages,
    });

    const prompt = MATCH_CV_JD_PROMPT.replace('{cv_json}', cvJson).replace(
      '{jd_text}',
      jobDescriptionText,
    );

    const response = await this.ragService.sendMessage(
      prompt,
      MATCH_CV_JD_SCHEMA,
    );

    try {
      return JSON.parse(response);
    } catch {
      throw new InternalServerErrorException(
        'Failed to parse LLM match response as JSON',
      );
    }
  }
}
