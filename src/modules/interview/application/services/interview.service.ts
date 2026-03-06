import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { type StartInterviewCommand } from '@/modules/interview/application/commands';
import {
  INTERVIEW_SYSTEM_PROMPT,
  PACE_INSTRUCTIONS,
  SILENCE_NUDGE_MESSAGE,
  SILENCE_TIMEOUT_MS,
} from '@/modules/interview/application/constants/prompt.constant';
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
  /** Silence timers keyed by interview session ID */
  private readonly silenceTimers = new Map<string, NodeJS.Timeout>();

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
      command.language,
      command.speechRate,
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
        voiceName: command.voiceName,
        speechRate: command.speechRate,
      },
      {
        onAudioResponse: (audioData) => {
          callbacks.onAudioResponse(audioData);
        },
        onTurnComplete: (turnData) => {
          // Record AI's transcript if available
          if (turnData?.textTranscript) {
            session.addTurn({
              role: 'interviewer',
              content: turnData.textTranscript,
              timestamp: new Date(),
            });
          }

          // Turn 1 = greeting + Q1. No question has been ANSWERED yet.
          // Each subsequent turn = user answered previous question + AI asks next.
          // So: questionsAnswered = turnCount - 1
          //
          // Example with 5 questions:
          //   Turn 1: greeting+Q1 → answered=0 → show Q1/5
          //   Turn 2: ack+Q2     → answered=1 → show Q2/5
          //   Turn 5: ack+Q5     → answered=4 → show Q5/5
          //   Turn 6: closing    → answered=5 → end interview
          const turnIndex = turnData?.turnIndex ?? 1;

          if (turnIndex > 1) {
            session.incrementQuestionCount();

            // Record candidate's actual answer (transcribed from speech)
            session.addTurn({
              role: 'candidate',
              content:
                turnData?.inputTranscript || '[Audio response - no transcript]',
              timestamp: new Date(),
            });
          }

          const currentQuestion = Math.min(
            session.questionsAsked + 1,
            session.totalQuestions,
          );

          this.logger.log(
            `Turn #${turnIndex} complete: ${session.questionsAsked}/${session.totalQuestions} answered (session: ${session.id})`,
          );

          callbacks.onTurnComplete({
            questionNumber: currentQuestion,
            totalQuestions: session.totalQuestions,
          });

          if (session.shouldEndInterview) {
            this.clearSilenceTimer(session.id);
            callbacks.onInterviewComplete();
          } else {
            // Start silence timer — if user doesn't speak within 15s,
            // nudge Gemini to prompt or move on.
            this.startSilenceTimer(session);
          }
        },
        onInterrupted: () => {
          this.clearSilenceTimer(session.id);
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

    this.clearSilenceTimer(sessionId);
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

    this.clearSilenceTimer(sessionId);
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

  // ─── Silence Timer ──────────────────────────────────────

  private startSilenceTimer(session: InterviewSession): void {
    this.clearSilenceTimer(session.id);

    const timer = setTimeout(() => {
      this.silenceTimers.delete(session.id);

      if (!session.providerSessionId) return;

      this.logger.log(
        `Silence timeout (${SILENCE_TIMEOUT_MS / 1000}s) — nudging Gemini (session: ${session.id})`,
      );

      this.liveProvider.sendText(
        session.providerSessionId,
        SILENCE_NUDGE_MESSAGE,
      );
    }, SILENCE_TIMEOUT_MS);

    this.silenceTimers.set(session.id, timer);
  }

  private clearSilenceTimer(sessionId: string): void {
    const timer = this.silenceTimers.get(sessionId);

    if (timer) {
      clearTimeout(timer);
      this.silenceTimers.delete(sessionId);
    }
  }

  private buildSystemPrompt(
    resumeJson: string,
    jobDescription: string,
    interviewType: string,
    totalQuestions: number,
    language?: string,
    speechRate?: number,
  ): string {
    const lang = language || 'English';

    let paceInstruction = '';
    if (speechRate && speechRate !== 1.0) {
      if (speechRate < 0.8) {
        paceInstruction = PACE_INSTRUCTIONS.VERY_SLOW;
      } else if (speechRate < 1.0) {
        paceInstruction = PACE_INSTRUCTIONS.SLOW;
      } else if (speechRate <= 1.3) {
        paceInstruction = PACE_INSTRUCTIONS.FAST;
      } else {
        paceInstruction = PACE_INSTRUCTIONS.VERY_FAST;
      }
    }

    return INTERVIEW_SYSTEM_PROMPT.replace('{resume_json}', resumeJson)
      .replace('{jd_text}', jobDescription)
      .replace(/{interview_type}/g, interviewType)
      .replace(/{total_questions}/g, String(totalQuestions))
      .replace('{language}', lang)
      .replace('{pace_instruction}', paceInstruction);
  }
}
