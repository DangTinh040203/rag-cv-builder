import { type InterviewType } from '@/modules/interview/domain/enums/interview-type.enum';

export type StartInterviewCommand = {
  userId: string;
  clientSocketId: string;
  resumeJson: string;
  jobDescription: string;
  questionCount: number;
  interviewType: InterviewType;
  voiceName?: string;
  language?: string;
  speechRate?: number;
};
