import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
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
        summary: parsed.summary,
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

    // Build conversation transcript from actual turn history
    let interviewNotes: string;

    console.log(
      '🚀 ~ InterviewEvaluationService ~ buildEvaluationPrompt ~ session.conversationHistory:',
      session.conversationHistory,
    );
    if (session.conversationHistory.length > 0) {
      const transcript = session.conversationHistory
        .map((turn) => {
          const role =
            turn.role === 'interviewer' ? 'Interviewer' : 'Candidate';
          return `${role}: ${turn.content}`;
        })
        .join('\n');

      interviewNotes = `
## Conversation Transcript:
${transcript}

## Summary:
- Interview Type: ${session.interviewType}
- Questions answered: ${session.questionsAsked} out of ${session.totalQuestions} planned.
- Interview duration: ${this.calculateDuration(session.startedAt)} minutes.
- Status: ${session.status}.

Evaluate based on the actual conversation transcript above. The candidate's responses were given via voice audio — "[Audio response]" indicates where the candidate spoke. Use the interviewer's follow-up reactions and subsequent questions to infer the quality of each answer.
      `.trim();
    } else {
      interviewNotes = `
- Interview Type: ${session.interviewType}
- Questions asked: ${session.questionsAsked} out of ${session.totalQuestions} planned.
- Interview duration: ${this.calculateDuration(session.startedAt)} minutes.
- Status: ${session.status}.
- NOTE: No conversation transcript is available (audio-only session).
  Provide a general assessment based on the interview configuration and candidate's profile.
  For per-question feedback, generate typical questions that would be asked for this interview type and provide constructive feedback templates.
      `.trim();
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
