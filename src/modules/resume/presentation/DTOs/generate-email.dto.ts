import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
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
  @IsNotEmpty({ message: 'Please provide a Job Description' })
  @IsString()
  jobDescription: string;

  @ValidateNested()
  @Type(() => MatchContextDto)
  matchContext: MatchContextDto;
}
