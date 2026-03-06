import { InterviewStatus } from '@/modules/interview/domain/enums/interview-status.enum';
import { type InterviewType } from '@/modules/interview/domain/enums/interview-type.enum';

export interface ConversationTurn {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
  /** Whether the candidate was nudged before answering this question */
  wasNudged?: boolean;
  /** Whether the candidate skipped this question (silence timeout) */
  wasSkipped?: boolean;
}

export class InterviewSession {
  id: string;
  userId: string;
  clientSocketId: string;
  jobDescription: string;
  resumeJson: string;
  interviewType: InterviewType;
  totalQuestions: number;
  questionsAsked: number;
  status: InterviewStatus;
  conversationHistory: ConversationTurn[];
  providerSessionId: string | null;
  startedAt: Date;

  constructor(partial: Partial<InterviewSession>) {
    Object.assign(this, partial);
    this.questionsAsked = partial.questionsAsked ?? 0;
    this.status = partial.status ?? InterviewStatus.IN_PROGRESS;
    this.conversationHistory = partial.conversationHistory ?? [];
    this.providerSessionId = partial.providerSessionId ?? null;
    this.startedAt = partial.startedAt ?? new Date();
  }

  get isCompleted(): boolean {
    return this.status === InterviewStatus.COMPLETED;
  }

  get remainingQuestions(): number {
    return this.totalQuestions - this.questionsAsked;
  }

  get shouldEndInterview(): boolean {
    return this.questionsAsked >= this.totalQuestions;
  }

  incrementQuestionCount(): void {
    this.questionsAsked++;
  }

  addTurn(turn: ConversationTurn): void {
    this.conversationHistory.push(turn);
  }

  complete(): void {
    this.status = InterviewStatus.COMPLETED;
  }

  cancel(): void {
    this.status = InterviewStatus.CANCELLED;
  }
}
