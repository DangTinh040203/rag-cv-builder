import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PDFParse } from 'pdf-parse';

import { CurrentDbUser, Public } from '@/libs/decorators';
import { ResumeService } from '@/modules/resume/application/services';
import {
  MatchResumeDto,
  UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';
import { type User } from '@/modules/user/domain';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @Post('/parse')
  async parse(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.resumeService.resumeParser(file);
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post('/match')
  async match(
    @Body() payload: MatchResumeDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentDbUser() user: User,
  ) {
    let jdText = payload.jobDescription;

    if (file) {
      const parser = new PDFParse({ data: file.buffer });
      const data = await parser.getText();
      jdText = data.text;
    }

    if (!jdText || jdText.trim().length === 0) {
      throw new BadRequestException(
        'Please provide a Job Description (text or file)',
      );
    }

    return this.resumeService.matchResume(payload.resumeId, jdText, user.id);
  }

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
