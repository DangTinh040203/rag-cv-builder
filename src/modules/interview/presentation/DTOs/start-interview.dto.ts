import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

import { InterviewType } from '@/modules/interview/domain/enums/interview-type.enum';

export class StartInterviewDto {
  @IsNotEmpty({ message: 'Job description is required' })
  @IsString({ message: 'Job description must be a string' })
  jobDescription: string;

  @IsInt({ message: 'Question count must be an integer' })
  @Min(5, { message: 'Minimum 5 questions' })
  @Max(10, { message: 'Maximum 10 questions' })
  questionCount: number;

  @IsEnum(InterviewType, {
    message: 'Interview type must be TECHNICAL, BEHAVIORAL, or ALL',
  })
  interviewType: InterviewType;
}
