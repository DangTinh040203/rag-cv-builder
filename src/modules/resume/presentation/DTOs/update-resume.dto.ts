import { PartialType } from '@nestjs/mapped-types';

import { CreateResumeDto } from '@/modules/resume/presentation/DTOs';

export class UpdateResumeDto extends PartialType(CreateResumeDto) {}
