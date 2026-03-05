import { type CreateResumeCommand } from '@/modules/resume/application/commands/create-resume.command';

export type UpdateResumeCommand = Partial<CreateResumeCommand>;
