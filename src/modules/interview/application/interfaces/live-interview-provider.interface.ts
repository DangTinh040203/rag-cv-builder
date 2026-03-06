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
}

export interface LiveSessionCallbacks {
  onAudioResponse?: (audioData: Buffer) => void;
  onTurnComplete?: (turnData: TurnCompleteData) => void;
  onInterrupted?: () => void;
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
   */
  sendText(sessionId: string, text: string): void;

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
}
