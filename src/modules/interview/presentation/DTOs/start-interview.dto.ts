import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { InterviewType } from '@/modules/interview/domain/enums/interview-type.enum';

export class StartInterviewDto {
  @IsNotEmpty({ message: 'Job description is required' })
  @IsString({ message: 'Job description must be a string' })
  jobDescription: string;

  @IsInt({ message: 'Question count must be an integer' })
  @Min(1, { message: 'Minimum 1 question' })
  @Max(10, { message: 'Maximum 10 questions' })
  questionCount: number;

  @IsEnum(InterviewType, {
    message: 'Interview type must be TECHNICAL, BEHAVIORAL, or ALL',
  })
  interviewType: InterviewType;

  @IsOptional()
  @IsString({ message: 'Voice name must be a string' })
  voiceName?: string;

  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  language?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Speech rate must be a number' })
  @Min(0.5, { message: 'Minimum speech rate is 0.5' })
  @Max(2.0, { message: 'Maximum speech rate is 2.0' })
  speechRate?: number;
}
