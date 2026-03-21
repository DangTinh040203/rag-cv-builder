import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { RagService } from '@/modules/rag/application/services/rag.service';
import {
  GENERATE_EMAIL_PROMPT,
  GENERATE_EMAIL_SCHEMA,
} from '@/modules/resume/application/constants/prompt.constant';
import { ResumeService } from '@/modules/resume/application/services/resume.service';

interface MatchContext {
  strengths: string[];
  suggestions: string[];
  overallScore: number;
}

@Injectable()
export class EmailGenerationService {
  constructor(
    private readonly ragService: RagService,
    private readonly resumeService: ResumeService,
  ) {}

  async generateEmail(
    resumeId: string,
    jobDescription: string,
    matchContext: MatchContext,
    userId: string,
  ): Promise<{ subject: string; body: string }> {
    const resume = await this.resumeService.findById(resumeId, userId);

    const cvJson = JSON.stringify({
      title: resume.title,
      subTitle: resume.subTitle,
      overview: resume.overview,
      information: resume.information,
      skills: resume.skills,
      workExperiences: resume.workExperiences,
      projects: resume.projects,
      educations: resume.educations,
      certifications: resume.certifications,
      languages: resume.languages,
    });

    const prompt = GENERATE_EMAIL_PROMPT.replace('{cv_json}', cvJson)
      .replace('{jd_text}', jobDescription)
      .replace('{strengths}', JSON.stringify(matchContext.strengths))
      .replace('{suggestions}', JSON.stringify(matchContext.suggestions))
      .replace('{overall_score}', String(matchContext.overallScore));

    const response = await this.ragService.sendMessage(
      prompt,
      GENERATE_EMAIL_SCHEMA,
    );

    try {
      return JSON.parse(response);
    } catch {
      throw new InternalServerErrorException(
        'Failed to parse LLM email response as JSON',
      );
    }
  }
}
