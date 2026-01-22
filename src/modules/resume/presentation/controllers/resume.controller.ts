import { Body, Controller, Param, Post } from '@nestjs/common';

import { ResumeService } from '@/modules/resume/application/services';
import { UpdateResumeDto } from '@/modules/resume/presentation/DTOs';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('/:id')
  async update(@Param('id') id: string, @Body() payload: UpdateResumeDto) {
    return this.resumeService.update(id, payload);
  }
}
