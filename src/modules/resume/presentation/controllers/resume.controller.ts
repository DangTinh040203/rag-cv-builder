import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { CurrentDbUser } from '@/libs/decorators';
import { ResumeService } from '@/modules/resume/application/services';
import { UpdateResumeDto } from '@/modules/resume/presentation/DTOs';
import { type User } from '@/modules/user/domain';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  findResume(@CurrentDbUser() user: User) {
    return this.resumeService.findByUserId(user.id);
  }

  @Get('/:id')
  async findById(@Param('id') id: string, @CurrentDbUser() user: User) {
    return this.resumeService.findById(id, user.id);
  }

  @Post('/:id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateResumeDto,
    @CurrentDbUser() user: User,
  ) {
    return this.resumeService.update(id, payload, user.id);
  }

  @Delete('/:id')
  async remove(@Param('id') id: string, @CurrentDbUser() user: User) {
    return this.resumeService.delete(id, user.id);
  }
}
