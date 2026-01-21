import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CreateInformationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value: string;
}

class CreateSkillDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;
}

class CreateEducationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  school: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  degree: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  major: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate: Date | null;
}

class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subTitle: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  details: string;
}

class CreateWorkExperienceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  position: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsOptional()
  description: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate: Date | null;
}

export class CreateResumeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  subTitle: string;

  @IsString()
  @MaxLength(5000)
  overview: string;

  @IsString()
  @IsOptional()
  avatar: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInformationDto)
  information: CreateInformationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEducationDto)
  educations: CreateEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkExperienceDto)
  workExperiences: CreateWorkExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectDto)
  projects: CreateProjectDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkillDto)
  skills: CreateSkillDto[];
}
