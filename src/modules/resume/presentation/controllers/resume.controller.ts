import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { ResumeService } from '@/modules/resume/application/services';
import { UpdateResumeDto } from '@/modules/resume/presentation/DTOs';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  async findAll() {
    return this.resumeService.findAll();
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.resumeService.findById(id);
  }

  @Post('/:id')
  async update(@Param('id') id: string, @Body() payload: UpdateResumeDto) {
    return this.resumeService.update(id, payload);
  }
}
