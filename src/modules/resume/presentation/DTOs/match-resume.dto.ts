import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MatchResumeDto {
  @IsUUID()
  resumeId: string;

  @IsNotEmpty({ message: 'Please provide a Job Description (text or file)' })
  @IsString()
  jobDescription: string;
}
