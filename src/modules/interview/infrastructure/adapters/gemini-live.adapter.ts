import { GoogleGenAI, Modality } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { Env } from '@/libs/configs';
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
  turnCount: number;
  setupCompleted: boolean;
}

@Injectable()
export class GeminiLiveAdapter implements ILiveInterviewProvider {
  private readonly logger = new Logger(GeminiLiveAdapter.name);
  private readonly genAI: GoogleGenAI;
  private readonly model: string;
  private readonly sessions = new Map<string, GeminiLiveSessionEntry>();

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
      // Register callbacks BEFORE opening WebSocket to avoid race condition
      // (Gemini may start speaking immediately after connection opens)
      onAudioResponseCallback: callbacks?.onAudioResponse,
      onTurnCompleteCallback: callbacks?.onTurnComplete,
      onInterruptedCallback: callbacks?.onInterrupted,
    };

    this.sessions.set(sessionId, entry);

    try {
      const session = await this.genAI.live.connect({
        model: this.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: config.systemInstruction,
        },
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
            this.sessions.delete(sessionId);
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

    if (!entry?.session) {
      this.logger.warn(`Cannot send audio — session not found: ${sessionId}`);
      return;
    }

    entry.session.sendRealtimeInput({
      audio: {
        data: audioData.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      },
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
        this.logger.log(
          `[handleMessage] Setup complete — sending kickoff message (session: ${sessionId})`,
        );
        try {
          entry.session.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [
                  {
                    text: 'Please begin the interview now. Greet the candidate warmly and ask your first question.',
                  },
                ],
              },
            ],
          });
        } catch (error) {
          this.logger.error(
            `[handleMessage] Failed to send kickoff message: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return;
    }

    // Log text content if present (for debugging)
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.text) {
          this.logger.log(
            `[handleMessage] Text response (session: ${sessionId}): "${part.text.substring(0, 200)}"`,
          );
        }
      }
    }

    // Handle interruption
    if (serverContent.interrupted) {
      this.logger.log(`[handleMessage] Interrupted (session: ${sessionId})`);
      entry.onInterruptedCallback?.();
      return;
    }

    // Handle audio response chunks
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
          this.logger.log(
            `[handleMessage] Audio chunk (session: ${sessionId}): ${audioBuffer.length} bytes, hasCallback=${!!entry.onAudioResponseCallback}`,
          );
          entry.onAudioResponseCallback?.(audioBuffer);
        }
      }
    }

    // Handle turn completion
    if (serverContent.turnComplete) {
      entry.turnCount++;
      this.logger.log(
        `[handleMessage] Turn complete (session: ${sessionId}): turn #${entry.turnCount}`,
      );
      entry.onTurnCompleteCallback?.({
        turnIndex: entry.turnCount,
      });
    }
  }
}
