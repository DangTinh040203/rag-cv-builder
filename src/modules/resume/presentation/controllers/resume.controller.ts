import { type JwtPayload } from '@clerk/types';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { CurrentDbUser } from '@/libs/decorators';
import { ResumeService } from '@/modules/resume/application/services';
import { UpdateResumeDto } from '@/modules/resume/presentation/DTOs';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get('/:id')
  async findById(@Param('id') id: string, @CurrentDbUser() user: JwtPayload) {
    return this.resumeService.findById(id, user.sub);
  }

  @Post('/:id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateResumeDto,
    @CurrentDbUser() user: JwtPayload,
  ) {
    return this.resumeService.update(id, payload, user.sub);
  }

  @Delete('/:id')
  async remove(@Param('id') id: string, @CurrentDbUser() user: JwtPayload) {
    return this.resumeService.delete(id, user.sub);
  }
}
