export interface QuestionFeedback {
  questionNumber: number;
  question: string;
  score: number;
  feedback: string;
  suggestions: string;
}

export class InterviewFeedback {
  overallScore: number;
  summary: string;
  questionFeedbacks: QuestionFeedback[];
  strengths: string[];
  improvements: string[];

  constructor(partial: Partial<InterviewFeedback>) {
    Object.assign(this, partial);
    this.questionFeedbacks = partial.questionFeedbacks ?? [];
    this.strengths = partial.strengths ?? [];
    this.improvements = partial.improvements ?? [];
  }
}
