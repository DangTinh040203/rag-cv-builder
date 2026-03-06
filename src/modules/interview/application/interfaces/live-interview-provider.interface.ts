export const LIVE_INTERVIEW_PROVIDER_TOKEN = Symbol(
  'LIVE_INTERVIEW_PROVIDER_TOKEN',
);

export interface LiveInterviewConfig {
  systemInstruction: string;
  responseModalities: string[];
  voiceName?: string;
  speechRate?: number;
}

export interface TurnCompleteData {
  turnIndex: number;
  /** AI speech transcribed to text */
  textTranscript?: string;
  /** User speech transcribed to text */
  inputTranscript?: string;
  /** Whether this turn was a nudge response (not a real question) */
  isNudge?: boolean;
}

export interface LiveSessionCallbacks {
  onAudioResponse?: (audioData: Buffer) => void;
  onTurnComplete?: (turnData: TurnCompleteData) => void;
  onInterrupted?: () => void;
  /** Called when the provider detects user speech (via input transcription).
   *  Used to reset silence timers — the user is actively speaking. */
  onUserSpeechDetected?: () => void;
  /** Called when the provider session closes unexpectedly (after reconnection retries are exhausted) */
  onDisconnected?: (reason?: string) => void;
}

export interface ILiveInterviewProvider {
  /**
   * Open a connection to the LLM Live API.
   * Callbacks should be provided here so they are registered BEFORE
   * the WebSocket opens (avoiding race conditions with immediate responses).
   * @returns A provider-specific session ID to track the connection.
   */
  connect(
    config: LiveInterviewConfig,
    callbacks?: LiveSessionCallbacks,
  ): Promise<string>;

  /**
   * Send raw PCM audio data to the LLM.
   */
  sendAudio(sessionId: string, audioData: Buffer): void;

  /**
   * Send a text message to the LLM (e.g. silence nudge).
   * @param markAsNudge When true, the response turn will be flagged as a nudge (not counted as a question).
   */
  sendText(sessionId: string, text: string, markAsNudge?: boolean): void;

  /**
   * Register a callback to receive audio response chunks from the LLM.
   */
  onAudioResponse(
    sessionId: string,
    callback: (audioData: Buffer) => void,
  ): void;

  /**
   * Register a callback for when the LLM completes a response turn.
   */
  onTurnComplete(
    sessionId: string,
    callback: (turnData: TurnCompleteData) => void,
  ): void;

  /**
   * Register a callback for when the user interrupts the LLM mid-response.
   */
  onInterrupted(sessionId: string, callback: () => void): void;

  /**
   * Disconnect and clean up the LLM session.
   */
  disconnect(sessionId: string): Promise<void>;
}

export interface InterviewCallbacks {
  onAudioResponse: (audioData: Buffer) => void;
  onTurnComplete: (data: {
    questionNumber: number;
    totalQuestions: number;
  }) => void;
  onInterrupted: () => void;
  onInterviewComplete: () => void;
  /** Called when the AI provider session is lost and cannot be recovered */
  onSessionError?: (message: string) => void;
}
