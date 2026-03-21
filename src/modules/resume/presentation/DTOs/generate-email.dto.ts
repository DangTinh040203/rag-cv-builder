import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

class MatchContextDto {
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @IsArray()
  @IsString({ each: true })
  suggestions: string[];

  @IsNumber()
  overallScore: number;
}

export class GenerateEmailDto {
  @IsUUID()
  resumeId: string;

  @IsNotEmpty({ message: 'Please provide a Job Description' })
  @IsString()
  jobDescription: string;

  @ValidateNested()
  @Type(() => MatchContextDto)
  matchContext: MatchContextDto;
}
