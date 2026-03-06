# Mock Interview with AI — Implementation Plan

## 1. Overview

Tính năng **Mock Interview with AI** cho phép user thực hiện phỏng vấn giả lập real-time với AI trong quá trình edit resume. Sử dụng **Gemini Live API** qua WebSocket, backend đóng vai trò **proxy** giữa frontend và Gemini.

### Flow tổng quan

```
┌──────────┐   WebSocket    ┌──────────┐   WebSocket    ┌─────────────────┐
│ Frontend │ ◄────────────► │ Backend  │ ◄────────────► │ Gemini Live API │
│ (Browser)│  Audio/Events  │ (NestJS) │  Audio/Events  │   (Google AI)   │
└──────────┘                └──────────┘                └─────────────────┘
     │                           │
     │ MediaRecorder API         │ Interview orchestration
     │ Web Audio API             │ Session management
     │ Voice Wave UI             │ Feedback evaluation
     └───────────────────────────┘
```

### User Journey

1. User đang edit resume → click **"Mock Interview"** button trên control bar
2. **Setup Dialog** xuất hiện:
   - Upload JD (PDF file)
   - Chọn số lượng câu hỏi: 5 → 10 (slider/select)
   - Chọn loại phỏng vấn: Technical / Behavioral / All
3. Click **"Start Interview"**:
   - Auto-save (sync resume xuống backend)
   - Backend tạo session, connect Gemini Live API với system prompt chứa resume + JD + config
   - Frontend chuyển sang **Active Interview UI** (voice wave, timer, controls)
4. **Interview diễn ra**:
   - AI đặt câu hỏi qua audio → Frontend phát qua speaker
   - User trả lời qua microphone → Audio stream qua backend → Gemini
   - Backend đếm số câu hỏi đã hỏi
5. **Kết thúc** (tự động khi hết câu hỏi HOẶC user click Stop):
   - Ngắt Gemini Live session
   - Backend gọi Gemini (single-shot) để đánh giá toàn bộ conversation
   - Frontend hiển thị **Result UI**: điểm tổng, feedback từng câu, suggestions

---

## 2. Backend Architecture

### 2.1 Module Structure (Clean Architecture — 4 Layers)

> **Note**: Chức năng này **không lưu dữ liệu xuống DB**. Backend chỉ đóng vai trò proxy giữa Frontend và Gemini Live API. Toàn bộ interview session là ephemeral (tồn tại trong memory trong suốt phiên interview, kết thúc là mất).

```
src/modules/interview/
├── interview.module.ts
│
├── domain/
│   ├── index.ts
│   ├── interview-session.domain.ts          # InterviewSession (in-memory state)
│   ├── interview-feedback.domain.ts         # InterviewFeedback (returned to client, not persisted)
│   └── enums/
│       ├── index.ts
│       ├── interview-type.enum.ts           # TECHNICAL | BEHAVIORAL | ALL
│       └── interview-status.enum.ts         # PENDING | IN_PROGRESS | COMPLETED | CANCELLED
│
├── application/
│   ├── commands/
│   │   ├── index.ts
│   │   └── start-interview.command.ts
│   ├── constants/
│   │   └── prompt.constant.ts               # System prompts, evaluation prompts, schemas
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── live-interview-provider.interface.ts  # ILiveInterviewProvider + LIVE_INTERVIEW_PROVIDER_TOKEN
│   └── services/
│       ├── index.ts
│       ├── interview.service.ts             # Orchestrates interview lifecycle (in-memory)
│       └── interview-evaluation.service.ts  # Handles post-interview evaluation via RagService
│
├── infrastructure/
│   └── adapters/
│       ├── index.ts
│       └── gemini-live.adapter.ts           # Implements ILiveInterviewProvider
│
└── presentation/
    ├── gateways/
    │   ├── index.ts
    │   └── interview.gateway.ts             # WebSocket Gateway (thay vì REST Controller)
    ├── DTOs/
    │   ├── index.ts
    │   ├── start-interview.dto.ts           # Validation cho setup form data
    │   └── interview-feedback.dto.ts        # Response DTO cho feedback
    └── guards/
        └── ws-auth.guard.ts                 # WebSocket authentication guard (Clerk JWT)
```

### 2.2 Domain Layer

#### InterviewSession Entity

```typescript
export class InterviewSession {
  id: string;
  userId: string;
  resumeId: string;
  jobDescription: string;
  interviewType: InterviewType; // TECHNICAL | BEHAVIORAL | ALL
  totalQuestions: number; // 5-10
  questionsAsked: number;
  status: InterviewStatus; // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  conversationHistory: ConversationTurn[]; // Stored as JSON
  createdAt: Date;
  updatedAt: Date;

  // Domain behavior
  get isCompleted(): boolean;
  get remainingQuestions(): number;
  incrementQuestionCount(): void;
  complete(): void;
  cancel(): void;
}
```

#### InterviewFeedback Entity

```typescript
export class InterviewFeedback {
  id: string;
  sessionId: string;
  overallScore: number; // 0-100
  summary: string;
  questionFeedbacks: QuestionFeedback[]; // Per-question evaluation
  strengths: string[];
  improvements: string[];
  createdAt: Date;
}
```

### 2.3 Application Layer

#### ILiveInterviewProvider Interface (Port)

```typescript
export const LIVE_INTERVIEW_PROVIDER_TOKEN = Symbol(
  'LIVE_INTERVIEW_PROVIDER_TOKEN',
);

export interface ILiveInterviewProvider {
  /**
   * Mở connection tới LLM Live API
   * @returns sessionId để track connection
   */
  connect(config: LiveInterviewConfig): Promise<string>;

  /**
   * Gửi audio data tới LLM
   */
  sendAudio(sessionId: string, audioData: Buffer): void;

  /**
   * Đăng ký callback nhận audio response từ LLM
   */
  onAudioResponse(
    sessionId: string,
    callback: (audioData: Buffer) => void,
  ): void;

  /**
   * Đăng ký callback khi LLM hoàn thành 1 turn (kết thúc 1 câu hỏi/response)
   */
  onTurnComplete(
    sessionId: string,
    callback: (turnData: TurnCompleteData) => void,
  ): void;

  /**
   * Đăng ký callback khi bị interrupt (user nói chen)
   */
  onInterrupted(sessionId: string, callback: () => void): void;

  /**
   * Ngắt connection
   */
  disconnect(sessionId: string): Promise<void>;
}

export interface LiveInterviewConfig {
  systemInstruction: string;
  responseModalities: string[]; // ['AUDIO']
}

export interface TurnCompleteData {
  turnIndex: number;
  textTranscript?: string; // Nếu Gemini trả về transcript
}
```

> **Tại sao thiết kế như này?** Interface này hoàn toàn agnostic với Gemini. Nếu muốn switch sang OpenAI Realtime API, Azure Speech, hay bất kỳ provider nào khác, chỉ cần tạo adapter mới implement interface này. Không cần thay đổi `InterviewService` hay bất kỳ code nào ở Application/Domain layer.

#### IInterviewRepository Interface

```typescript
export const INTERVIEW_REPOSITORY_TOKEN = Symbol('INTERVIEW_REPOSITORY_TOKEN');

export interface IInterviewRepository {
  create(command: CreateInterviewSessionCommand): Promise<InterviewSession>;
  findById(id: string): Promise<InterviewSession | null>;
  findByUserId(userId: string): Promise<InterviewSession[]>;
  update(
    id: string,
    data: Partial<InterviewSession>,
  ): Promise<InterviewSession>;
  saveFeedback(
    sessionId: string,
    feedback: InterviewFeedback,
  ): Promise<InterviewFeedback>;
  findFeedbackBySessionId(sessionId: string): Promise<InterviewFeedback | null>;
}
```

#### InterviewService (Orchestrator)

```typescript
@Injectable()
export class InterviewService {
  constructor(
    @Inject(INTERVIEW_REPOSITORY_TOKEN)
    private readonly interviewRepo: IInterviewRepository,
    @Inject(LIVE_INTERVIEW_PROVIDER_TOKEN)
    private readonly liveProvider: ILiveInterviewProvider,
    private readonly ragService: RagService, // For evaluation (single-shot)
  ) {}

  async startInterview(
    command: CreateInterviewSessionCommand,
  ): Promise<InterviewSession>;
  async handleAudioInput(sessionId: string, audioData: Buffer): void;
  async endInterview(sessionId: string): Promise<InterviewFeedback>;

  // Internal
  private buildSystemPrompt(
    resume: Resume,
    jd: string,
    config: InterviewConfig,
  ): string;
  private async evaluateInterview(
    session: InterviewSession,
  ): Promise<InterviewFeedback>;
}
```

#### InterviewEvaluationService

```typescript
@Injectable()
export class InterviewEvaluationService {
  constructor(private readonly ragService: RagService) {}

  async evaluate(
    conversationHistory: ConversationTurn[],
    config: EvaluationConfig,
  ): Promise<InterviewFeedback>;

  // Uses RagService.sendMessage() with structured schema
  // to get JSON evaluation from Gemini (single-shot, not live)
}
```

### 2.4 Infrastructure Layer

#### GeminiLiveAdapter

```typescript
@Injectable()
export class GeminiLiveAdapter implements ILiveInterviewProvider {
  private sessions: Map<string, GeminiLiveSession> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async connect(config: LiveInterviewConfig): Promise<string> {
    // 1. Create Gemini AI client
    // 2. Call ai.live.connect() with WebSocket
    // 3. Store session in Map
    // 4. Return sessionId (UUID)
  }

  sendAudio(sessionId: string, audioData: Buffer): void {
    // Forward PCM audio to Gemini via session.sendRealtimeInput()
  }

  onAudioResponse(
    sessionId: string,
    callback: (audioData: Buffer) => void,
  ): void {
    // Register callback on Gemini session's onmessage
    // Extract audio from serverContent.modelTurn.parts[].inlineData
  }

  onTurnComplete(
    sessionId: string,
    callback: (turnData: TurnCompleteData) => void,
  ): void {
    // Detect when model finishes a complete turn
  }

  onInterrupted(sessionId: string, callback: () => void): void {
    // Handle serverContent.interrupted signal
  }

  async disconnect(sessionId: string): Promise<void> {
    // Close Gemini WebSocket, cleanup session from Map
  }
}
```

### 2.5 Presentation Layer

#### InterviewGateway (WebSocket)

```typescript
@WebSocketGateway({
  namespace: '/interview',
  cors: { origin: process.env.CORS_ORIGIN },
})
export class InterviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(
    private readonly interviewService: InterviewService,
    private readonly resumeService: ResumeService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    // Authenticate via Clerk JWT from handshake auth
  }

  async handleDisconnect(client: Socket): Promise<void> {
    // Cleanup: end interview if active
  }

  @SubscribeMessage('interview:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: StartInterviewDto,
  ): Promise<void> {
    // 1. Validate DTO
    // 2. Sync resume (get latest from DB)
    // 3. Parse JD PDF
    // 4. Create interview session
    // 5. Connect to Gemini Live API
    // 6. Register callbacks:
    //    - onAudioResponse → emit 'interview:audio' to client
    //    - onTurnComplete → emit 'interview:turn-complete' + track question count
    //    - onInterrupted → emit 'interview:interrupted'
    // 7. Emit 'interview:started' with session info
  }

  @SubscribeMessage('interview:audio')
  async handleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string }, // base64 PCM
  ): Promise<void> {
    // Forward audio to Gemini via InterviewService
  }

  @SubscribeMessage('interview:stop')
  async handleStop(@ConnectedSocket() client: Socket): Promise<void> {
    // 1. End Gemini session
    // 2. Evaluate conversation
    // 3. Save feedback to DB
    // 4. Emit 'interview:feedback' with evaluation results
  }
}
```

#### WebSocket Events (Contract)

| Direction       | Event                     | Payload                                                            | Description                     |
| --------------- | ------------------------- | ------------------------------------------------------------------ | ------------------------------- |
| Client → Server | `interview:start`         | `{ jdFile: Buffer, questionCount: number, interviewType: string }` | Bắt đầu interview               |
| Client → Server | `interview:audio`         | `{ audio: string (base64 PCM) }`                                   | Stream audio từ mic             |
| Client → Server | `interview:stop`          | `{}`                                                               | Dừng interview sớm              |
| Server → Client | `interview:started`       | `{ sessionId: string }`                                            | Xác nhận đã connect             |
| Server → Client | `interview:audio`         | `{ audio: string (base64 PCM) }`                                   | Audio response từ AI            |
| Server → Client | `interview:turn-complete` | `{ questionNumber: number, totalQuestions: number }`               | AI hoàn thành 1 câu hỏi         |
| Server → Client | `interview:interrupted`   | `{}`                                                               | AI bị interrupt (user nói chen) |
| Server → Client | `interview:feedback`      | `InterviewFeedback`                                                | Kết quả đánh giá                |
| Server → Client | `interview:error`         | `{ message: string }`                                              | Lỗi                             |

### 2.6 System Prompt Strategy

```typescript
// application/constants/prompt.constant.ts

export const INTERVIEW_SYSTEM_PROMPT = `
You are an experienced technical interviewer conducting a mock interview.

## Candidate's Resume:
{resume_json}

## Job Description:
{jd_text}

## Interview Configuration:
- Type: {interview_type}
- Total Questions: {total_questions}
- Language: Vietnamese (or English based on JD/Resume language)

## Instructions:
1. Start with a brief greeting and introduction
2. Ask questions one at a time, wait for the candidate's response
3. Questions should be based on BOTH the resume content AND the job description
4. For TECHNICAL type: Focus on technical skills, system design, coding concepts
5. For BEHAVIORAL type: Focus on STAR method questions, teamwork, leadership
6. For ALL type: Mix both technical and behavioral questions
7. After each answer, provide brief acknowledgment before the next question
8. Keep track of the question number
9. After the last question, thank the candidate and indicate the interview is complete
10. Be professional, encouraging, and constructive
`;

export const EVALUATION_PROMPT = `
Analyze the following mock interview conversation and provide a structured evaluation.

## Conversation:
{conversation_history}

## Job Description:
{jd_text}

## Evaluation Criteria:
1. Technical Knowledge (if applicable)
2. Communication Skills
3. Problem-Solving Approach
4. Relevance of Answers to JD
5. Overall Confidence & Professionalism

Provide scores (0-100) for each criterion, overall score, strengths, areas for improvement,
and specific feedback for each question-answer pair.
`;
```

---

## 3. Frontend Architecture

### 3.1 New Files Structure

```
apps/web/
├── components/builder-screen/
│   ├── resume-control.tsx                    # MODIFIED: Add Interview button
│   ├── interview-dialog.tsx                  # NEW: Dialog wrapper (state machine)
│   └── interview/
│       ├── interview-setup-form.tsx          # NEW: Config form (JD, questions, type)
│       ├── interview-active.tsx              # NEW: Active interview UI (voice wave)
│       ├── interview-loading.tsx             # NEW: "Evaluating..." animation
│       └── interview-result.tsx              # NEW: Feedback/score display
│
├── services/
│   └── interview.service.ts                 # NEW: WebSocket + HTTP service
│
├── hooks/
│   └── use-interview.ts                     # NEW: Interview lifecycle hook
│
├── types/
│   └── interview.type.ts                    # NEW: Interview type definitions
│
└── constants/
    └── interview.constant.ts                # NEW: Interview-related constants
```

### 3.2 Component Architecture

#### InterviewDialog (State Machine)

```
States: 'setup' → 'connecting' → 'active' → 'evaluating' → 'result'
                                     ↓
                                  'stopped' → 'evaluating' → 'result'
```

| State        | Component            | Description                                         |
| ------------ | -------------------- | --------------------------------------------------- |
| `setup`      | `InterviewSetupForm` | Upload JD, config questions, select type            |
| `connecting` | Loading spinner      | Syncing resume + connecting to Gemini               |
| `active`     | `InterviewActive`    | Voice wave UI, timer, question counter, Stop button |
| `evaluating` | `InterviewLoading`   | "AI đang đánh giá..." animation                     |
| `result`     | `InterviewResult`    | Score gauge, per-question feedback, suggestions     |

#### InterviewSetupForm

- **JD Upload**: File input (PDF) — reuse pattern từ `matching-form.tsx` (tabs: paste text / upload file)
- **Question Count**: Slider hoặc Select (5-10), default 5
- **Interview Type**: Select options — Technical / Behavioral / All
- **Start Button**: Triggers `useSyncResume.handleSave()` → then WebSocket connect

#### InterviewActive (Voice Wave UI)

```
┌─────────────────────────────────────────┐
│           Mock Interview                │
│                                         │
│    ┌─────────────────────────────┐      │
│    │                             │      │
│    │    ~~~~  Voice Wave  ~~~~   │      │
│    │    ════════════════════     │      │
│    │                             │      │
│    └─────────────────────────────┘      │
│                                         │
│    🎤 Listening...                      │
│                                         │
│    Question 3/7                         │
│    ⏱ 05:32                              │
│                                         │
│    [ 🔇 Mute ]        [ ⏹ Stop ]       │
│                                         │
└─────────────────────────────────────────┘
```

- **Voice Wave**: Canvas/SVG animation using Web Audio API `AnalyserNode` → `getByteFrequencyData()`
- **Status indicator**: "AI is speaking..." / "Listening..." / "Processing..."
- **Question counter**: "Question X/Y" — updated via `interview:turn-complete` event
- **Timer**: Elapsed time since interview started
- **Controls**: Mute mic toggle, Stop interview button

#### InterviewResult

Reuse patterns từ `matching-result.tsx`:

- **ScoreGauge** component (already exists) — hiển thị overall score
- **Per-question feedback**: Accordion/collapsible list với score bar per question
- **Strengths**: Badge list (green)
- **Improvements**: Badge list (orange)
- **Summary**: Text block with AI's overall assessment
- **Actions**: "Interview Again" button, "Close" button

### 3.3 Service Layer

#### InterviewService

```typescript
// services/interview.service.ts
import { io, type Socket } from 'socket.io-client';

export class InterviewService extends HttpService {
  private socket: Socket | null = null;

  // WebSocket connection
  connect(token: string): Socket;
  disconnect(): void;

  // Events
  startInterview(data: StartInterviewPayload): void;
  sendAudio(audioBase64: string): void;
  stopInterview(): void;

  // Listeners
  onStarted(callback: (data: { sessionId: string }) => void): void;
  onAudioResponse(callback: (data: { audio: string }) => void): void;
  onTurnComplete(callback: (data: TurnCompleteData) => void): void;
  onInterrupted(callback: () => void): void;
  onFeedback(callback: (data: InterviewFeedback) => void): void;
  onError(callback: (data: { message: string }) => void): void;
}
```

### 3.4 Hook Layer

#### useInterview

```typescript
// hooks/use-interview.ts

interface UseInterviewReturn {
  // State
  state: InterviewState; // 'idle' | 'setup' | 'connecting' | 'active' | 'evaluating' | 'result'
  sessionId: string | null;
  questionProgress: { current: number; total: number };
  feedback: InterviewFeedback | null;
  error: string | null;
  isAISpeaking: boolean;
  isMuted: boolean;

  // Actions
  startInterview: (config: InterviewConfig) => Promise<void>;
  stopInterview: () => void;
  toggleMute: () => void;
  reset: () => void;

  // Audio
  audioAnalyser: AnalyserNode | null; // For voice wave visualization
}
```

Hook responsibilities:

1. Manage WebSocket lifecycle (connect/disconnect/cleanup)
2. Manage MediaRecorder (mic capture → PCM 16kHz → base64 → send)
3. Manage AudioContext + AnalyserNode (voice wave data)
4. Manage audio playback (receive base64 PCM → AudioBuffer → play)
5. Track interview state machine transitions
6. Handle errors and cleanup on unmount

### 3.5 Audio Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌──────────┐
│ getUserMedia │ ──► │ AudioContext  │ ──► │ PCM 16kHz  │ ──► │ base64   │
│ (microphone) │     │ + AnalyserNode│     │ encoding   │     │ encode   │
└─────────────┘     └──────────────┘     └────────────┘     └────┬─────┘
                          │                                      │
                   ┌──────┴──────┐                    WebSocket send
                   │ Voice Wave  │                    'interview:audio'
                   │ Visualization│                              │
                   └─────────────┘                               ▼
                                                          ┌──────────┐
┌─────────────┐     ┌──────────────┐     ┌────────────┐  │ Backend  │
│   Speaker   │ ◄── │ AudioBuffer  │ ◄── │ base64     │◄─│ (proxy)  │
│  (playback) │     │  playback    │     │ decode     │  └──────────┘
└─────────────┘     └──────────────┘     └────────────┘
```

### 3.6 Type Definitions

```typescript
// types/interview.type.ts

export enum InterviewType {
  TECHNICAL = 'TECHNICAL',
  BEHAVIORAL = 'BEHAVIORAL',
  ALL = 'ALL',
}

export enum InterviewStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface InterviewConfig {
  jdFile?: File;
  jdText?: string;
  questionCount: number; // 5-10
  interviewType: InterviewType;
}

export interface InterviewSession {
  sessionId: string; // In-memory session ID (UUID)
  interviewType: InterviewType;
  totalQuestions: number;
  questionsAsked: number;
  status: InterviewStatus;
}

export interface QuestionFeedback {
  questionNumber: number;
  question: string;
  score: number; // 0-100
  feedback: string;
  suggestions: string;
}

export interface InterviewFeedback {
  overallScore: number;
  summary: string;
  questionFeedbacks: QuestionFeedback[];
  strengths: string[];
  improvements: string[];
}

export interface TurnCompleteData {
  questionNumber: number;
  totalQuestions: number;
}

export interface StartInterviewPayload {
  jdFile?: string; // base64 encoded PDF
  jdText?: string;
  questionCount: number;
  interviewType: InterviewType;
}
```

---

## 4. Dependency Injection & Adapter Pattern

### Backend DI Registration

```typescript
// interview.module.ts
@Module({
  imports: [RagModule, DatabaseModule],
  providers: [
    // Application services
    InterviewService,
    InterviewEvaluationService,

    // Infrastructure → Application (Port-Adapter binding)
    {
      provide: LIVE_INTERVIEW_PROVIDER_TOKEN,
      useClass: GeminiLiveAdapter, // ← Swap this to change AI provider
    },
    {
      provide: INTERVIEW_REPOSITORY_TOKEN,
      useClass: PrismaInterviewRepository,
    },
  ],
  exports: [InterviewService],
})
export class InterviewModule {}
```

### Future: Switch Adapter

Để switch từ Gemini sang provider khác (e.g., OpenAI Realtime API):

1. Tạo `openai-realtime.adapter.ts` implement `ILiveInterviewProvider`
2. Thay `useClass: GeminiLiveAdapter` → `useClass: OpenAIRealtimeAdapter`
3. **Zero changes** ở Application/Domain/Presentation layers

### Future: User-Selected Adapter (từ Frontend)

1. Thêm field `provider` vào `StartInterviewDto`
2. Dùng **Factory Pattern**:

```typescript
{
  provide: LIVE_INTERVIEW_PROVIDER_TOKEN,
  useFactory: (gemini: GeminiLiveAdapter, openai: OpenAIRealtimeAdapter) => {
    return new LiveInterviewProviderFactory(gemini, openai);
  },
  inject: [GeminiLiveAdapter, OpenAIRealtimeAdapter],
}
```

3. `InterviewService` gọi `factory.getProvider(dto.provider)` → trả về adapter tương ứng

---

## 5. Environment Variables (New)

```env
# Gemini Live API (đã có GEMINI_API_KEY cho RAG module)
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025

# WebSocket
WS_PORT=3001                    # Hoặc dùng chung port với HTTP
WS_CORS_ORIGIN=http://localhost:3000
```

---

## 6. New Dependencies

### Backend

| Package                      | Purpose                      |
| ---------------------------- | ---------------------------- |
| `@nestjs/websockets`         | WebSocket support cho NestJS |
| `@nestjs/platform-socket.io` | Socket.IO adapter cho NestJS |
| `socket.io`                  | WebSocket library (server)   |

### Frontend

| Package            | Purpose                    |
| ------------------ | -------------------------- |
| `socket.io-client` | WebSocket library (client) |

> **Note**: Không cần thêm audio library — dùng native Web Audio API + MediaRecorder API của browser.
