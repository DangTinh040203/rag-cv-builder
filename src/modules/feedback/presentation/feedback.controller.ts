import { Body, Controller, Post } from '@nestjs/common';

import { CurrentDbUser } from '@/libs/decorators';
import { FeedbackService } from '@/modules/feedback/application';
import { CreateFeedbackDto } from '@/modules/feedback/presentation/DTOs';
import { User } from '@/modules/user/domain';

@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Body() dto: CreateFeedbackDto, @CurrentDbUser() user: User) {
    return this.feedbackService.create(user.id, dto);
  }
}
