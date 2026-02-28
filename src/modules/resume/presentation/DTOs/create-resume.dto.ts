import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CreateInformationDto {
  @IsString({ message: 'Label must be a string' })
  @MinLength(1, { message: 'Label is required' })
  @MaxLength(100, { message: 'Label must not exceed 100 characters' })
  label: string;

  @IsString({ message: 'Value must be a string' })
  @MinLength(1, { message: 'Value is required' })
  @MaxLength(200, { message: 'Value must not exceed 200 characters' })
  value: string;
}

class CreateSkillDto {
  @IsString({ message: 'Skill label must be a string' })
  @MinLength(1, { message: 'Skill label is required' })
  @MaxLength(100, { message: 'Skill label must not exceed 100 characters' })
  label: string;

  @IsString({ message: 'Skill value must be a string' })
  @MinLength(1, { message: 'Skill value is required' })
  @MaxLength(100, { message: 'Skill value must not exceed 100 characters' })
  value: string;
}

class CreateEducationDto {
  @IsString({ message: 'School name must be a string' })
  @MinLength(1, { message: 'School name is required' })
  @MaxLength(200, { message: 'School name must not exceed 200 characters' })
  school: string;

  @IsString({ message: 'Degree must be a string' })
  @MinLength(1, { message: 'Degree is required' })
  @MaxLength(200, { message: 'Degree must not exceed 200 characters' })
  degree: string;

  @IsString({ message: 'Major must be a string' })
  @MinLength(1, { message: 'Major is required' })
  @MaxLength(200, { message: 'Major must not exceed 200 characters' })
  major: string;

  @IsString({ message: 'Start date must be a valid date string' })
  startDate: string;

  @IsOptional()
  @IsString({ message: 'End date must be a valid date string' })
  endDate: string | null;
}

class CreateProjectDto {
  @IsString({ message: 'Project title must be a string' })
  @MinLength(1, { message: 'Project title is required' })
  @MaxLength(200, { message: 'Project title must not exceed 200 characters' })
  title: string;

  @IsString({ message: 'Project subtitle must be a string' })
  @MinLength(1, { message: 'Project subtitle is required' })
  @MaxLength(200, {
    message: 'Project subtitle must not exceed 200 characters',
  })
  subTitle: string;

  @IsString({ message: 'Project details must be a string' })
  @IsOptional()
  @MaxLength(5000, {
    message: 'Project details must not exceed 5000 characters',
  })
  details: string;

  @IsString({ message: 'Technologies must be a string' })
  @MaxLength(2000, { message: 'Technologies must not exceed 2000 characters' })
  @IsOptional()
  technologies: string;

  @IsString({ message: 'Position must be a string' })
  @MaxLength(200, { message: 'Position must not exceed 200 characters' })
  @IsOptional()
  position: string;

  @IsString({ message: 'Responsibilities must be a string' })
  @MaxLength(5000, {
    message: 'Responsibilities must not exceed 5000 characters',
  })
  @IsOptional()
  responsibilities: string;

  @IsString({ message: 'Domain must be a string' })
  @MaxLength(200, { message: 'Domain must not exceed 200 characters' })
  @IsOptional()
  domain: string;

  @IsString({ message: 'Demo link must be a string' })
  @MaxLength(500, { message: 'Demo link must not exceed 500 characters' })
  @IsOptional()
  demo: string;
}

class CreateWorkExperienceDto {
  @IsString({ message: 'Company name must be a string' })
  @MinLength(1, { message: 'Company name is required' })
  @MaxLength(200, { message: 'Company name must not exceed 200 characters' })
  company: string;

  @IsString({ message: 'Position must be a string' })
  @MinLength(1, { message: 'Position is required' })
  @MaxLength(200, { message: 'Position must not exceed 200 characters' })
  position: string;

  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @IsOptional()
  description: string;

  @IsString({ message: 'Start date must be a valid date string' })
  startDate: string;

  @IsOptional()
  @IsString({ message: 'End date must be a valid date string' })
  endDate: string | null;
}

export class CreateResumeDto {
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsString({ message: 'Subtitle must be a string' })
  @MaxLength(200, { message: 'Subtitle must not exceed 200 characters' })
  @IsOptional()
  subTitle: string;

  @IsString({ message: 'Overview must be a string' })
  @MaxLength(5000, { message: 'Overview must not exceed 5000 characters' })
  overview: string;

  @IsString({ message: 'Avatar link must be a string' })
  @IsOptional()
  avatar: string | null;

  @IsArray({ message: 'Information must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateInformationDto)
  information: CreateInformationDto[];

  @IsArray({ message: 'Educations must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateEducationDto)
  educations: CreateEducationDto[];

  @IsArray({ message: 'Work experiences must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateWorkExperienceDto)
  workExperiences: CreateWorkExperienceDto[];

  @IsArray({ message: 'Projects must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateProjectDto)
  projects: CreateProjectDto[];

  @IsArray({ message: 'Skills must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateSkillDto)
  skills: CreateSkillDto[];

  @IsArray({ message: 'Certifications must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateCertificationDto)
  certifications: CreateCertificationDto[];

  @IsArray({ message: 'Languages must be a list' })
  @ValidateNested({ each: true })
  @Type(() => CreateLanguageDto)
  languages: CreateLanguageDto[];
}

class CreateCertificationDto {
  @IsString({ message: 'Certification name must be a string' })
  @MinLength(1, { message: 'Certification name is required' })
  @MaxLength(200, {
    message: 'Certification name must not exceed 200 characters',
  })
  name: string;

  @IsString({ message: 'Issuer name must be a string' })
  @MinLength(1, { message: 'Issuer name is required' })
  @MaxLength(200, { message: 'Issuer name must not exceed 200 characters' })
  issuer: string;

  @IsString({ message: 'Date must be a valid date string' })
  date: string;
}

class CreateLanguageDto {
  @IsString({ message: 'Language name must be a string' })
  @MinLength(1, { message: 'Language name is required' })
  @MaxLength(100, { message: 'Language name must not exceed 100 characters' })
  name: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(200, { message: 'Description must not exceed 200 characters' })
  description: string;
}
