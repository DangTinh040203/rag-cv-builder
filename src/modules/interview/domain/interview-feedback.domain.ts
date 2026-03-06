export interface QuestionFeedback {
  questionNumber: number;
  question: string;
  score: number;
  feedback: string;
  suggestions: string;
}

export interface EvaluationCriteria {
  technicalKnowledge: number;
  communicationSkills: number;
  problemSolving: number;
  relevanceToRole: number;
  interviewConduct: number;
}

export class InterviewFeedback {
  overallScore: number;
  verdict: 'PASS' | 'BORDERLINE' | 'FAIL';
  summary: string;
  criteria: EvaluationCriteria;
  questionFeedbacks: QuestionFeedback[];
  strengths: string[];
  improvements: string[];

  constructor(partial: Partial<InterviewFeedback>) {
    Object.assign(this, partial);
    this.verdict = partial.verdict ?? 'FAIL';
    this.criteria = partial.criteria ?? {
      technicalKnowledge: 0,
      communicationSkills: 0,
      problemSolving: 0,
      relevanceToRole: 0,
      interviewConduct: 0,
    };
    this.questionFeedbacks = partial.questionFeedbacks ?? [];
    this.strengths = partial.strengths ?? [];
    this.improvements = partial.improvements ?? [];
  }
}
