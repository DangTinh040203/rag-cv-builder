import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { type StartInterviewCommand } from '@/modules/interview/application/commands';
import { INTERVIEW_SYSTEM_PROMPT } from '@/modules/interview/application/constants/prompt.constant';
import {
  type ILiveInterviewProvider,
  type InterviewCallbacks,
  LIVE_INTERVIEW_PROVIDER_TOKEN,
} from '@/modules/interview/application/interfaces';
import { InterviewSession } from '@/modules/interview/domain';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);
  private readonly activeSessions = new Map<string, InterviewSession>();

  constructor(
    @Inject(LIVE_INTERVIEW_PROVIDER_TOKEN)
    private readonly liveProvider: ILiveInterviewProvider,
  ) {}

  async startInterview(
    command: StartInterviewCommand,
    callbacks: InterviewCallbacks,
  ): Promise<InterviewSession> {
    this.logger.log(`Starting interview for user: ${command.userId}`);

    const systemPrompt = this.buildSystemPrompt(
      command.resumeJson,
      command.jobDescription,
      command.interviewType,
      command.questionCount,
    );

    // Create session object first so callbacks can reference it
    const session = new InterviewSession({
      id: randomUUID(),
      userId: command.userId,
      clientSocketId: command.clientSocketId,
      jobDescription: command.jobDescription,
      resumeJson: command.resumeJson,
      interviewType: command.interviewType,
      totalQuestions: command.questionCount,
      providerSessionId: '', // Will be set after connect
    });

    // Pass callbacks directly to connect() so they are registered
    // BEFORE the WebSocket opens — this prevents the race condition
    // where Gemini starts speaking immediately but callbacks aren't set yet.
    const providerSessionId = await this.liveProvider.connect(
      {
        systemInstruction: systemPrompt,
        responseModalities: ['AUDIO'],
      },
      {
        onAudioResponse: (audioData) => {
          callbacks.onAudioResponse(audioData);
        },
        onTurnComplete: () => {
          session.incrementQuestionCount();

          callbacks.onTurnComplete({
            questionNumber: session.questionsAsked,
            totalQuestions: session.totalQuestions,
          });

          if (session.shouldEndInterview) {
            this.logger.log(
              `Interview auto-complete triggered: ${session.id}`,
            );
            callbacks.onInterviewComplete();
          }
        },
        onInterrupted: () => {
          callbacks.onInterrupted();
        },
      },
    );

    session.providerSessionId = providerSessionId;
    this.activeSessions.set(session.id, session);

    this.logger.log(
      `Interview session created: ${session.id} (provider: ${providerSessionId})`,
    );

    return session;
  }

  handleAudioInput(sessionId: string, audioData: Buffer): void {
    const session = this.activeSessions.get(sessionId);

    if (!session?.providerSessionId) {
      this.logger.warn(`No active session found for: ${sessionId}`);
      return;
    }

    this.liveProvider.sendAudio(session.providerSessionId, audioData);
  }

  async endInterview(sessionId: string): Promise<InterviewSession | null> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      this.logger.warn(`Session not found for end: ${sessionId}`);
      return null;
    }

    session.complete();

    if (session.providerSessionId) {
      await this.liveProvider.disconnect(session.providerSessionId);
    }

    this.activeSessions.delete(sessionId);

    this.logger.log(
      `Interview ended: ${sessionId} (questions: ${session.questionsAsked}/${session.totalQuestions})`,
    );

    return session;
  }

  async cancelInterview(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);

    if (!session) return;

    session.cancel();

    if (session.providerSessionId) {
      await this.liveProvider.disconnect(session.providerSessionId);
    }

    this.activeSessions.delete(sessionId);

    this.logger.log(`Interview cancelled: ${sessionId}`);
  }

  getSession(sessionId: string): InterviewSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getSessionBySocketId(socketId: string): InterviewSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (session.clientSocketId === socketId) {
        return session;
      }
    }
    return undefined;
  }

  private buildSystemPrompt(
    resumeJson: string,
    jobDescription: string,
    interviewType: string,
    totalQuestions: number,
  ): string {
    return INTERVIEW_SYSTEM_PROMPT.replace('{resume_json}', resumeJson)
      .replace('{jd_text}', jobDescription)
      .replace(/{interview_type}/g, interviewType)
      .replace(/{total_questions}/g, String(totalQuestions));
  }

}
