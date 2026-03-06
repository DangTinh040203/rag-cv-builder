import { GoogleGenAI, Modality } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { Env } from '@/libs/configs';
import { INTERVIEW_KICKOFF_MESSAGE } from '@/modules/interview/application/constants/prompt.constant';
import {
  type ILiveInterviewProvider,
  type LiveInterviewConfig,
  type LiveSessionCallbacks,
  type TurnCompleteData,
} from '@/modules/interview/application/interfaces';

interface GeminiLiveSessionEntry {
  session: any;
  onAudioResponseCallback?: (audioData: Buffer) => void;
  onTurnCompleteCallback?: (turnData: TurnCompleteData) => void;
  onInterruptedCallback?: () => void;
  /** Called when the session is lost and all reconnection attempts failed */
  onDisconnectedCallback?: (reason?: string) => void;
  /** Called when user speech is detected (input transcription received) */
  onUserSpeechDetectedCallback?: () => void;
  turnCount: number;
  setupCompleted: boolean;
  /** Voice name used as the interviewer's display name */
  voiceName: string;
  /** True when a silence nudge was sent and we're waiting for Gemini's nudge response */
  pendingNudge: boolean;
  /** Accumulates text from current turn's modelTurn parts (for transcript) */
  currentTurnText: string;
  /** Accumulates output transcription text (AI speech → text) */
  currentOutputTranscript: string;
  /** Accumulates input transcription text (user speech → text) */
  currentInputTranscript: string;
  /** Stored connection config for reconnection */
  connectConfig: Record<string, any>;
  /** Number of consecutive reconnection attempts made */
  reconnectAttempts: number;
  /** True while a reconnection attempt is in progress (suppresses audio warnings) */
  reconnecting: boolean;
}

@Injectable()
export class GeminiLiveAdapter implements ILiveInterviewProvider {
  private readonly logger = new Logger(GeminiLiveAdapter.name);
  private readonly genAI: GoogleGenAI;
  private readonly model: string;
  private readonly sessions = new Map<string, GeminiLiveSessionEntry>();
  /** Tracks session IDs being intentionally disconnected (to distinguish from unexpected closes) */
  private readonly closingIntentionally = new Set<string>();
  private static readonly MAX_RECONNECT_ATTEMPTS = 2;
  private static readonly RECONNECT_DELAY_MS = 2000;

  constructor(private readonly configService: ConfigService) {
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.get<string>(Env.GEMINI_API_KEY),
    });
    this.model = this.configService.get<string>(
      Env.GEMINI_LIVE_MODEL,
      'gemini-2.5-flash-native-audio-preview-12-2025',
    );
  }

  async connect(
    config: LiveInterviewConfig,
    callbacks?: LiveSessionCallbacks,
  ): Promise<string> {
    const sessionId = randomUUID();

    this.logger.log(`Connecting to Gemini Live API (session: ${sessionId})`);

    const entry: GeminiLiveSessionEntry = {
      session: null,
      turnCount: 0,
      setupCompleted: false,
      voiceName: config.voiceName || 'the interviewer',
      pendingNudge: false,
      currentTurnText: '',
      currentOutputTranscript: '',
      currentInputTranscript: '',
      // Register callbacks BEFORE opening WebSocket to avoid race condition
      // (Gemini may start speaking immediately after connection opens)
      onAudioResponseCallback: callbacks?.onAudioResponse,
      onTurnCompleteCallback: callbacks?.onTurnComplete,
      onInterruptedCallback: callbacks?.onInterrupted,
      onDisconnectedCallback: callbacks?.onDisconnected,
      onUserSpeechDetectedCallback: callbacks?.onUserSpeechDetected,
      connectConfig: {}, // Will be set after config is built
      reconnectAttempts: 0,
      reconnecting: false,
    };

    this.sessions.set(sessionId, entry);

    try {
      const connectConfig: Record<string, any> = {
        responseModalities: [Modality.AUDIO],
        systemInstruction: config.systemInstruction,
        // Enable speech-to-text transcription for both directions
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      };

      // Apply voice selection if specified
      if (config.voiceName) {
        connectConfig.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voiceName,
            },
          },
        };
      }

      // Store config for potential reconnection
      entry.connectConfig = connectConfig;

      const session = await this.genAI.live.connect({
        model: this.model,
        config: connectConfig,
        callbacks: {
          onopen: () => {
            this.logger.log(`Gemini Live session opened: ${sessionId}`);
          },
          onmessage: (message: any) => {
            const msgKeys = message ? Object.keys(message) : [];
            this.logger.log(
              `[onmessage] Gemini message received (session: ${sessionId}): keys=[${msgKeys.join(',')}]`,
            );
            this.handleMessage(sessionId, message);
          },
          onerror: (error: any) => {
            this.logger.error(
              `Gemini Live session error: ${sessionId}`,
              error?.message,
            );
          },
          onclose: (event: any) => {
            this.logger.log(
              `Gemini Live session closed: ${sessionId} (reason: ${event?.reason ?? 'unknown'})`,
            );

            if (this.closingIntentionally.has(sessionId)) {
              this.sessions.delete(sessionId);
              return;
            }

            // Unexpected close — attempt reconnection
            void this.attemptReconnection(sessionId);
          },
        },
      });

      entry.session = session;

      this.logger.log(`Gemini Live session connected: ${sessionId}`);

      return sessionId;
    } catch (error) {
      this.sessions.delete(sessionId);
      this.logger.error(
        `Failed to connect Gemini Live: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  sendAudio(sessionId: string, audioData: Buffer): void {
    const entry = this.sessions.get(sessionId);

    if (!entry?.session || entry.reconnecting) {
      // Silently drop audio during reconnection to avoid warning spam
      if (!entry?.reconnecting) {
        this.logger.warn(`Cannot send audio — session not found: ${sessionId}`);
      }
      return;
    }

    entry.session.sendRealtimeInput({
      audio: {
        data: audioData.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  }

  sendText(sessionId: string, text: string, markAsNudge?: boolean): void {
    const entry = this.sessions.get(sessionId);

    if (!entry?.session || entry.reconnecting) {
      if (!entry?.reconnecting) {
        this.logger.warn(`Cannot send text — session not found: ${sessionId}`);
      }
      return;
    }

    this.logger.log(
      `Sending text to Gemini (session: ${sessionId}): "${text.substring(0, 100)}"`,
    );

    // Only mark as pending nudge when explicitly requested,
    // so the response turn is flagged appropriately.
    entry.pendingNudge = markAsNudge ?? false;

    entry.session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [{ text }],
        },
      ],
    });
  }

  onAudioResponse(
    sessionId: string,
    callback: (audioData: Buffer) => void,
  ): void {
    const entry = this.sessions.get(sessionId);

    if (entry) {
      entry.onAudioResponseCallback = callback;
    }
  }

  onTurnComplete(
    sessionId: string,
    callback: (turnData: TurnCompleteData) => void,
  ): void {
    const entry = this.sessions.get(sessionId);

    if (entry) {
      entry.onTurnCompleteCallback = callback;
    }
  }

  onInterrupted(sessionId: string, callback: () => void): void {
    const entry = this.sessions.get(sessionId);

    if (entry) {
      entry.onInterruptedCallback = callback;
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);

    // Mark as intentional so onclose doesn't trigger reconnection
    this.closingIntentionally.add(sessionId);

    if (entry?.session) {
      this.logger.log(`Disconnecting Gemini Live session: ${sessionId}`);

      try {
        await Promise.resolve(entry.session.close());
      } catch (error) {
        this.logger.warn(
          `Error closing Gemini session: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.sessions.delete(sessionId);
    this.closingIntentionally.delete(sessionId);
  }

  private handleMessage(sessionId: string, message: any): void {
    const entry = this.sessions.get(sessionId);

    if (!entry) return;

    const serverContent = message?.serverContent;

    if (!serverContent) {
      // Log non-serverContent messages (e.g., toolCall, setupComplete)
      const keys = message ? Object.keys(message) : [];
      this.logger.log(
        `[handleMessage] Non-serverContent message (session: ${sessionId}): keys=[${keys.join(',')}]`,
      );

      // When setupComplete is received, send a kickoff text to trigger Gemini
      // to start speaking. Without this, the model just waits for audio input.
      if (message?.setupComplete && !entry.setupCompleted && entry.session) {
        entry.setupCompleted = true;

        if (entry.turnCount > 0) {
          // This is a reconnection — resume from where we left off
          this.logger.log(
            `[handleMessage] Setup complete after reconnection — sending resume message (session: ${sessionId})`,
          );

          try {
            const questionsAnswered = Math.max(0, entry.turnCount - 1);
            const resumeMessage = `[IMPORTANT: The audio session was reconnected after a brief interruption. The candidate has already answered ${questionsAnswered} question(s). Please acknowledge the brief interruption with something like "Sorry about the brief interruption, let's continue." and then proceed to ask the NEXT question (question #${questionsAnswered + 1}). Do NOT re-introduce yourself, do NOT repeat any previous questions, and do NOT start over from the beginning.]`;
            entry.session.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: resumeMessage }],
                },
              ],
            });
          } catch (error) {
            this.logger.error(
              `[handleMessage] Failed to send resume message: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        } else {
          // Normal first connection — send kickoff
          this.logger.log(
            `[handleMessage] Setup complete — sending kickoff message (session: ${sessionId})`,
          );

          try {
            const kickoffText = INTERVIEW_KICKOFF_MESSAGE.replace(
              '{interviewer_name}',
              entry.voiceName,
            );
            entry.session.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: kickoffText }],
                },
              ],
            });
          } catch (error) {
            this.logger.error(
              `[handleMessage] Failed to send kickoff message: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      return;
    }

    // Handle interruption
    if (serverContent.interrupted) {
      this.logger.log(`[handleMessage] Interrupted (session: ${sessionId})`);
      entry.currentTurnText = '';
      entry.currentOutputTranscript = '';
      entry.currentInputTranscript = '';
      entry.onInterruptedCallback?.();
      return;
    }

    // Handle output transcription (AI speech → text)
    if (serverContent.outputTranscription?.text) {
      entry.currentOutputTranscript += serverContent.outputTranscription.text;
    }

    // Handle input transcription (user speech → text)
    if (serverContent.inputTranscription?.text) {
      const inputText = serverContent.inputTranscription.text;
      entry.currentInputTranscript += inputText;
      this.logger.log(
        `[handleMessage] User said (session: ${sessionId}): "${inputText}"`,
      );

      // Notify that user is speaking — this resets the silence timer
      // so hesitant/slow speakers don't get prematurely nudged.
      entry.onUserSpeechDetectedCallback?.();
    }

    // Process modelTurn parts: accumulate text and forward audio
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        // Accumulate text transcript for this turn
        if (part.text) {
          entry.currentTurnText += part.text;
        }

        // Forward audio chunks
        if (part.inlineData?.data) {
          const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
          entry.onAudioResponseCallback?.(audioBuffer);
        }
      }
    }

    // Handle turn completion
    if (serverContent.turnComplete) {
      entry.turnCount++;

      // Prefer output transcription over modelTurn text parts
      const outputTranscript = entry.currentOutputTranscript.trim();
      const modelText = entry.currentTurnText.trim();
      const aiTranscript = outputTranscript || modelText || undefined;

      // Capture what user said before this turn
      const inputTranscript = entry.currentInputTranscript.trim() || undefined;

      // Check if this turn was a response to a silence nudge
      const isNudge = entry.pendingNudge;
      entry.pendingNudge = false;

      this.logger.log(
        `[handleMessage] Turn #${entry.turnCount} complete${isNudge ? ' (nudge)' : ''} (session: ${sessionId})` +
          (aiTranscript ? `\n  AI: "${aiTranscript.substring(0, 300)}"` : '') +
          (inputTranscript
            ? `\n  User: "${inputTranscript.substring(0, 300)}"`
            : ''),
      );

      entry.onTurnCompleteCallback?.({
        turnIndex: entry.turnCount,
        textTranscript: aiTranscript,
        inputTranscript,
        isNudge,
      });

      // Reset for next turn
      entry.currentTurnText = '';
      entry.currentOutputTranscript = '';
      entry.currentInputTranscript = '';
    }
  }

  // ─── Reconnection Logic ──────────────────────────────────

  /**
   * Attempt to reconnect a Gemini Live session that closed unexpectedly.
   * Retries up to MAX_RECONNECT_ATTEMPTS times with exponential backoff.
   * If all retries fail, notifies via onDisconnectedCallback.
   */
  private async attemptReconnection(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;

    entry.reconnecting = true;
    entry.session = null;
    entry.reconnectAttempts++;

    if (entry.reconnectAttempts > GeminiLiveAdapter.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(
        `Max reconnection attempts (${GeminiLiveAdapter.MAX_RECONNECT_ATTEMPTS}) reached for session: ${sessionId}`,
      );
      const callback = entry.onDisconnectedCallback;
      this.sessions.delete(sessionId);
      callback?.(
        'The interview session was lost and could not be recovered. Please try again.',
      );
      return;
    }

    const attempt = entry.reconnectAttempts;
    this.logger.warn(
      `Attempting reconnection ${attempt}/${GeminiLiveAdapter.MAX_RECONNECT_ATTEMPTS} for session: ${sessionId}`,
    );

    try {
      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, GeminiLiveAdapter.RECONNECT_DELAY_MS * attempt),
      );

      const newSession = await this.genAI.live.connect({
        model: this.model,
        config: entry.connectConfig,
        callbacks: {
          onopen: () => {
            this.logger.log(
              `Reconnected Gemini session: ${sessionId} (attempt ${attempt})`,
            );
          },
          onmessage: (message: any) => {
            this.handleMessage(sessionId, message);
          },
          onerror: (error: any) => {
            this.logger.error(
              `Reconnected session error: ${sessionId}`,
              error?.message,
            );
          },
          onclose: (closeEvent: any) => {
            this.logger.log(
              `Gemini session closed: ${sessionId} (reason: ${closeEvent?.reason ?? 'unknown'})`,
            );
            if (!this.closingIntentionally.has(sessionId)) {
              void this.attemptReconnection(sessionId);
            } else {
              this.sessions.delete(sessionId);
            }
          },
        },
      });

      entry.session = newSession;
      entry.setupCompleted = false;
      entry.reconnecting = false;
      entry.reconnectAttempts = 0;

      this.logger.log(`Reconnection successful for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Reconnection attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Try again recursively (reconnectAttempts already incremented)
      void this.attemptReconnection(sessionId);
    }
  }
}
