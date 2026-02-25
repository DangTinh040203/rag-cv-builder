import { IsOptional, IsString, IsUUID } from 'class-validator';

export class MatchResumeDto {
  @IsUUID()
  resumeId: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;
}
