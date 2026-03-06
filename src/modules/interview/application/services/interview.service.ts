import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { type StartInterviewCommand } from '@/modules/interview/application/commands';
import {
  INTERVIEW_SYSTEM_PROMPT,
  PACE_INSTRUCTIONS,
  SILENCE_AFTER_NUDGE_TIMEOUT_MS,
  SILENCE_NUDGE_MESSAGE,
  SILENCE_SKIP_MESSAGE,
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
  /** Sessions that have already been nudged once for the current question */
  private readonly nudgedSessions = new Set<string>();

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
      command.voiceName,
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

          // Nudge turns (silence reminders) should NOT count as questions.
          if (turnData?.isNudge) {
            this.logger.log(
              `Nudge turn complete — not counting as question (session: ${session.id})`,
            );

            // Mark as nudged so the next silence timer will skip.
            // Timer is NOT started here — it starts on 'playback-complete'
            // when the client finishes playing the nudge audio.
            this.nudgedSessions.add(session.id);
            return;
          }

          // Normal turn — check if this was a silence-skip before clearing
          const wasSkippedDueToSilence = this.nudgedSessions.has(session.id);
          this.nudgedSessions.delete(session.id);

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

            // Determine candidate's response content
            let candidateContent: string;

            if (wasSkippedDueToSilence && !turnData?.inputTranscript?.trim()) {
              // Candidate was completely silent → question was skipped
              candidateContent =
                '[No response — candidate was silent, question skipped]';
            } else {
              candidateContent =
                turnData?.inputTranscript ||
                '[Audio response - no transcript available]';
            }

            // Record candidate's actual answer (transcribed from speech)
            session.addTurn({
              role: 'candidate',
              content: candidateContent,
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
          }
          // NOTE: Silence timer is NOT started here.
          // It is started when the client emits 'playback-complete'
          // (i.e., after the user has finished hearing the question).
          // This prevents the nudge from firing while audio is still playing.
        },
        onUserSpeechDetected: () => {
          // User started speaking (or is still speaking) — reset the
          // silence timer so hesitant/slow speakers aren't prematurely nudged.
          // The timer restarts from scratch each time speech is detected.
          this.resetSilenceTimerOnSpeech(session);
        },
        onInterrupted: () => {
          this.clearSilenceTimer(session.id);
          callbacks.onInterrupted();
        },
        onDisconnected: (reason) => {
          this.logger.error(
            `Provider session disconnected unexpectedly (session: ${session.id}): ${reason ?? 'unknown'}`,
          );
          this.clearSilenceTimer(session.id);
          this.nudgedSessions.delete(session.id);
          this.activeSessions.delete(session.id);
          callbacks.onSessionError?.(
            reason ?? 'The interview session was lost. Please try again.',
          );
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
    this.nudgedSessions.delete(sessionId);
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
    this.nudgedSessions.delete(sessionId);
    session.cancel();

    if (session.providerSessionId) {
      await this.liveProvider.disconnect(session.providerSessionId);
    }

    this.activeSessions.delete(sessionId);

    this.logger.log(`Interview cancelled: ${sessionId}`);
  }

  /**
   * Called when the client reports that AI audio playback has finished.
   * This is the correct moment to start the silence timer, because
   * the user has now fully heard the question.
   */
  handlePlaybackComplete(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Don't start timer if the interview is already over
    if (session.shouldEndInterview) return;

    this.logger.log(
      `Client playback complete — starting silence timer (session: ${sessionId})`,
    );
    this.startSilenceTimer(session);
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

    const alreadyNudged = this.nudgedSessions.has(session.id);

    // Use shorter timeout after nudge, longer initial timeout to
    // give the candidate time to think before their first answer.
    const timeoutMs = alreadyNudged
      ? SILENCE_AFTER_NUDGE_TIMEOUT_MS
      : SILENCE_TIMEOUT_MS;

    const timer = setTimeout(() => {
      this.silenceTimers.delete(session.id);

      if (!session.providerSessionId) return;

      if (alreadyNudged) {
        // Already nudged once — skip to next question.
        // NOT marked as nudge so the response counts as a normal turn.
        this.logger.log(
          `Silence timeout (${timeoutMs / 1000}s after nudge) — skipping to next question (session: ${session.id})`,
        );
        this.nudgedSessions.delete(session.id);
        this.liveProvider.sendText(
          session.providerSessionId,
          SILENCE_SKIP_MESSAGE,
        );
      } else {
        // First silence — gentle nudge.
        // Marked as nudge so the response does NOT count as a question.
        this.logger.log(
          `Silence timeout (${timeoutMs / 1000}s) — nudging Gemini (session: ${session.id})`,
        );
        this.liveProvider.sendText(
          session.providerSessionId,
          SILENCE_NUDGE_MESSAGE,
          true,
        );
      }
    }, timeoutMs);

    this.silenceTimers.set(session.id, timer);
  }

  /**
   * Reset the silence timer when user speech is detected.
   * This prevents the nudge from firing while the user is actively
   * speaking (even if hesitantly with pauses).
   */
  private resetSilenceTimerOnSpeech(session: InterviewSession): void {
    // Only reset if there is an active silence timer
    if (!this.silenceTimers.has(session.id)) return;

    this.logger.debug(
      `User speech detected — resetting silence timer (session: ${session.id})`,
    );
    this.startSilenceTimer(session);
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
    voiceName?: string,
  ): string {
    const lang = language || 'English';
    const name = voiceName || 'the interviewer';

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

    return INTERVIEW_SYSTEM_PROMPT.replace(
      '{resume_json}',
      this.sanitizeUserContent(resumeJson),
    )
      .replace('{jd_text}', this.sanitizeUserContent(jobDescription))
      .replace(/{interview_type}/g, interviewType)
      .replace(/{total_questions}/g, String(totalQuestions))
      .replace('{language}', lang)
      .replace('{interviewer_name}', name)
      .replace('{pace_instruction}', paceInstruction);
  }

  /**
   * Sanitize user-provided content (JD text, resume JSON) to mitigate
   * prompt injection attacks.
   *
   * Strategy: wrap in clear data delimiters so the LLM treats
   * the content as data rather than instructions.
   */
  private sanitizeUserContent(content: string): string {
    // Strip common injection markers that try to break out of context
    const cleaned = content
      .replace(/\[SYSTEM(?:\s+INSTRUCTION)?]/gi, '[FILTERED]')
      .replace(/\[INST]/gi, '[FILTERED]')
      .replace(/<<\s*SYS\s*>>/gi, '<<FILTERED>>')
      .replace(/<\/?system>/gi, '<FILTERED>');

    return `"""\n${cleaned}\n"""`;
  }
}
