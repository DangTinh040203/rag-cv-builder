import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  EVALUATION_NOTES_WITH_TRANSCRIPT,
  EVALUATION_NOTES_WITHOUT_TRANSCRIPT,
  EVALUATION_PROMPT,
  EVALUATION_SCHEMA,
} from '@/modules/interview/application/constants/prompt.constant';
import {
  InterviewFeedback,
  type InterviewSession,
} from '@/modules/interview/domain';
import { RagService } from '@/modules/rag/application/services/rag.service';

@Injectable()
export class InterviewEvaluationService {
  private readonly logger = new Logger(InterviewEvaluationService.name);

  constructor(private readonly ragService: RagService) {}

  async evaluate(session: InterviewSession): Promise<InterviewFeedback> {
    this.logger.log(`Evaluating interview session: ${session.id}`);

    const prompt = this.buildEvaluationPrompt(session);

    const response = await this.ragService.sendMessage(
      prompt,
      EVALUATION_SCHEMA,
    );

    try {
      const parsed = JSON.parse(response);

      return new InterviewFeedback({
        overallScore: parsed.overallScore,
        verdict: parsed.verdict,
        summary: parsed.summary,
        criteria: parsed.criteria ?? {
          technicalKnowledge: 0,
          communicationSkills: 0,
          problemSolving: 0,
          relevanceToRole: 0,
          interviewConduct: 0,
        },
        questionFeedbacks: parsed.questionFeedbacks ?? [],
        strengths: parsed.strengths ?? [],
        improvements: parsed.improvements ?? [],
      });
    } catch {
      this.logger.error('Failed to parse evaluation response');
      throw new InternalServerErrorException(
        'Failed to parse interview evaluation response',
      );
    }
  }

  private buildEvaluationPrompt(session: InterviewSession): string {
    const MAX_CONTENT_LENGTH = 6000;

    const resumeSummary =
      session.resumeJson.length > MAX_CONTENT_LENGTH
        ? session.resumeJson.substring(0, MAX_CONTENT_LENGTH) + '...'
        : session.resumeJson;

    const jdSummary =
      session.jobDescription.length > MAX_CONTENT_LENGTH
        ? session.jobDescription.substring(0, MAX_CONTENT_LENGTH) + '...'
        : session.jobDescription;

    let interviewNotes: string;
    const duration = String(this.calculateDuration(session.startedAt));

    if (session.conversationHistory.length > 0) {
      const transcript = session.conversationHistory
        .map((turn) => {
          const role =
            turn.role === 'interviewer' ? 'Interviewer' : 'Candidate';

          // Append metadata for candidate turns
          const meta: string[] = [];
          if (turn.wasNudged) meta.push('Nudged');
          if (turn.wasSkipped) meta.push('Skipped due to silence');
          const metaSuffix = meta.length > 0 ? ` [${meta.join(', ')}]` : '';

          return `${role}: ${turn.content}${metaSuffix}`;
        })
        .join('\n');

      interviewNotes = EVALUATION_NOTES_WITH_TRANSCRIPT.replace(
        '{transcript}',
        transcript,
      )
        .replace('{interview_type}', session.interviewType)
        .replace('{questions_asked}', String(session.questionsAsked))
        .replace('{total_questions}', String(session.totalQuestions))
        .replace('{duration}', duration)
        .replace('{status}', session.status)
        .trim();
    } else {
      interviewNotes = EVALUATION_NOTES_WITHOUT_TRANSCRIPT.replace(
        '{interview_type}',
        session.interviewType,
      )
        .replace('{questions_asked}', String(session.questionsAsked))
        .replace('{total_questions}', String(session.totalQuestions))
        .replace('{duration}', duration)
        .replace('{status}', session.status)
        .trim();
    }

    return EVALUATION_PROMPT.replace('{interview_type}', session.interviewType)
      .replace('{total_questions}', String(session.questionsAsked))
      .replace('{jd_summary}', jdSummary)
      .replace('{resume_summary}', resumeSummary)
      .replace('{interview_notes}', interviewNotes);
  }

  private calculateDuration(startedAt: Date): number {
    const durationMs = Date.now() - startedAt.getTime();
    return Math.round(durationMs / 60000);
  }
}
