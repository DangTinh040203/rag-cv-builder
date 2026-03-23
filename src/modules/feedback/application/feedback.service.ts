import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@/libs/databases/prisma.service';
import { CreateFeedbackDto } from '@/modules/feedback/presentation/DTOs';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: dto.type,
        message: dto.message,
      },
    });

    this.logger.log(`Feedback created: ${feedback.id} by user ${userId}`);
    return feedback;
  }
}
