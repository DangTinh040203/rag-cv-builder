import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const FEEDBACK_TYPES = ['bug', 'feature', 'improvement', 'other'] as const;

export class CreateFeedbackDto {
  @IsNotEmpty({ message: 'Feedback type is required' })
  @IsIn(FEEDBACK_TYPES, {
    message: `Type must be one of: ${FEEDBACK_TYPES.join(', ')}`,
  })
  type: string;

  @IsNotEmpty({ message: 'Feedback message is required' })
  @IsString()
  message: string;
}
