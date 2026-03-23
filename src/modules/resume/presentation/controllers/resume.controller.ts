import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';

import { CurrentDbUser } from '@/libs/decorators';
import { FileMagicBytesValidator } from '@/libs/pipes/file-magic-bytes.pipe';
import {
  EmailGenerationService,
  ResumeMatchingService,
  ResumeParserService,
  ResumeService,
} from '@/modules/resume/application/services';
import {
  GenerateEmailDto,
  MatchResumeDto,
  UpdateResumeDto,
} from '@/modules/resume/presentation/DTOs';
import { ParseJdInterceptor } from '@/modules/resume/presentation/interceptors/parse-jd.interceptor';
import { User } from '@/modules/user/domain';

@Controller('resumes')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly resumeParserService: ResumeParserService,
    private readonly resumeMatchingService: ResumeMatchingService,
    private readonly emailGenerationService: EmailGenerationService,
  ) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseInterceptors(FileInterceptor('file'))
  @Post('/parse')
  async parse(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 })],
      }),
      new FileMagicBytesValidator(['application/pdf']),
    )
    file: Express.Multer.File,
  ) {
    return this.resumeParserService.parse(file);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseInterceptors(FileInterceptor('file'), ParseJdInterceptor)
  @Post('/match')
  async match(@Body() payload: MatchResumeDto, @CurrentDbUser() user: User) {
    return this.resumeMatchingService.match(
      payload.resumeId,
      payload.jobDescription,
      user.id,
    );
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('/:id/generate-email')
  async generateEmail(
    @Param('id') id: string,
    @Body() payload: GenerateEmailDto,
    @CurrentDbUser() user: User,
  ) {
    return this.emailGenerationService.generateEmail(
      id,
      payload.jobDescription,
      payload.matchContext,
      user.id,
    );
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
