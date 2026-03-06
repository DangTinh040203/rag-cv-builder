# Mock Interview — Module Structure

This document describes the file organization and layer responsibilities for the Interview module.

---

## File Tree

```text
src/modules/interview/
├── interview.module.ts                          # NestJS module — wires all layers together
│
├── domain/                                      # Layer 1 — Pure business models
│   ├── index.ts                                 # Barrel exports
│   ├── interview-session.domain.ts              # InterviewSession entity (in-memory)
│   ├── interview-feedback.domain.ts             # InterviewFeedback value object
│   └── enums/
│       ├── index.ts
│       ├── interview-type.enum.ts               # TECHNICAL | BEHAVIORAL | ALL
│       └── interview-status.enum.ts             # IN_PROGRESS | COMPLETED | CANCELLED
│
├── application/                                 # Layer 2 — Business logic & ports
│   ├── commands/
│   │   ├── index.ts
│   │   └── start-interview.command.ts           # Pure input type for starting an interview
│   ├── constants/
│   │   └── prompt.constant.ts                   # System prompt, evaluation prompt, Gemini schema
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── live-interview-provider.interface.ts  # ILiveInterviewProvider port + DI token
│   └── services/
│       ├── index.ts
│       ├── interview.service.ts                 # Core orchestrator — session lifecycle
│       └── interview-evaluation.service.ts      # Post-interview AI evaluation via RagService
│
├── infrastructure/                              # Layer 3 — External API adapters
│   └── adapters/
│       ├── index.ts
│       └── gemini-live.adapter.ts               # ILiveInterviewProvider implementation (Gemini)
│
└── presentation/                                # Layer 4 — WebSocket interface
    ├── DTOs/
    │   ├── index.ts
    │   └── start-interview.dto.ts               # Validated input for interview:start event
    ├── gateways/
    │   ├── index.ts
    │   └── interview.gateway.ts                 # Socket.IO gateway — event handlers
    └── guards/
        └── ws-auth.guard.ts                     # Clerk JWT verification for WebSocket
```

---

## Layer Responsibilities

### 1. Domain Layer (`domain/`)

Pure TypeScript — **zero framework imports**.

| File | Purpose |
| ---- | ------- |
| `InterviewSession` | Represents an active interview. Tracks userId, resume, JD, question count, status, conversation history. Provides behavior methods: `incrementQuestionCount()`, `shouldEndInterview`, `complete()`, `cancel()`. |
| `InterviewFeedback` | Value object holding evaluation results: overall score, per-question feedback, strengths, improvements. |
| `InterviewType` | Enum controlling question style: `TECHNICAL`, `BEHAVIORAL`, or `ALL` (mixed). |
| `InterviewStatus` | Enum tracking session lifecycle: `IN_PROGRESS` → `COMPLETED` or `CANCELLED`. |

### 2. Application Layer (`application/`)

Business logic and port definitions. Depends only on the Domain layer.

| File | Purpose |
| ---- | ------- |
| `ILiveInterviewProvider` | **Port interface** defining the contract for any live interview LLM provider. Methods: `connect()`, `sendAudio()`, `onAudioResponse()`, `onTurnComplete()`, `onInterrupted()`, `disconnect()`. Bound via `LIVE_INTERVIEW_PROVIDER_TOKEN` (Symbol-based DI). |
| `InterviewCallbacks` | Type defining the callback shape that the Gateway passes into the Service, enabling the Service to push events back to the WebSocket client. |
| `StartInterviewCommand` | Clean input type (no framework decorators) for starting an interview: userId, socketId, resumeJson, jobDescription, questionCount, interviewType. |
| `InterviewService` | **Core orchestrator.** Manages an in-memory `Map<string, InterviewSession>`. Handles `startInterview()` (creates session, connects to provider, registers callbacks), `handleAudioInput()` (forwards PCM to provider), `endInterview()` (disconnects provider, returns completed session), `cancelInterview()`. Also builds the system prompt by injecting resume, JD, and config into the template. |
| `InterviewEvaluationService` | Uses `RagService.sendMessage()` with a structured Gemini schema (`EVALUATION_SCHEMA`) for a single-shot evaluation call. Returns an `InterviewFeedback` object. |
| `INTERVIEW_SYSTEM_PROMPT` | Template for the AI interviewer persona. Placeholders: `{resume_json}`, `{jd_text}`, `{interview_type}`, `{total_questions}`. |
| `EVALUATION_PROMPT` | Template for post-interview evaluation with weighted criteria (Technical 30%, Communication 25%, Problem-Solving 20%, Relevance 15%, Professionalism 10%). |
| `EVALUATION_SCHEMA` | Gemini structured output schema ensuring the LLM returns well-formed JSON matching `InterviewFeedback`. |

### 3. Infrastructure Layer (`infrastructure/`)

Implements the Application layer's ports. Tightly coupled to Google's `@google/genai` SDK.

| File | Purpose |
| ---- | ------- |
| `GeminiLiveAdapter` | Implements `ILiveInterviewProvider`. Uses `genAI.live.connect()` to establish a WebSocket to Gemini Live API. Manages a `Map<string, GeminiLiveSessionEntry>` for multiplexed sessions. Converts PCM audio to base64 for `sendRealtimeInput()`. Parses incoming messages: `serverContent.modelTurn.parts[].inlineData` → audio buffer callback, `serverContent.turnComplete` → turn callback, `serverContent.interrupted` → interrupted callback. |

### 4. Presentation Layer (`presentation/`)

WebSocket interface. Translates Socket.IO events into Commands for the Application layer.

| File | Purpose |
| ---- | ------- |
| `StartInterviewDto` | Validated with `class-validator`: `jobDescription` (required string), `questionCount` (int, 5–10), `interviewType` (enum). |
| `WsAuthGuard` | Extracts JWT from `client.handshake.auth.token` or `Authorization` header. Verifies via Clerk `verifyToken()`. Returns the user's `sub` (Clerk user ID) or `null`. |
| `InterviewGateway` | Socket.IO gateway on namespace `/interview`. Handles lifecycle (`handleConnection` → authenticate, `handleDisconnect` → cancel session) and 3 message events (`interview:start`, `interview:audio`, `interview:stop`). Maps socket IDs to session IDs via `clientSessions` Map. |

### 5. Module Registration (`interview.module.ts`)

```typescript
@Module({
  imports: [RagModule, ResumeModule],
  providers: [
    InterviewService,
    InterviewEvaluationService,
    InterviewGateway,
    WsAuthGuard,
    {
      provide: LIVE_INTERVIEW_PROVIDER_TOKEN,
      useClass: GeminiLiveAdapter,  // Swap this to change LLM provider
    },
  ],
})
export class InterviewModule {}
```

**Key design decisions:**
- No `DatabaseModule` import — the feature is fully ephemeral
- `ResumeModule` imported to fetch the user's latest resume via `ResumeService`
- `RagModule` imported for post-interview evaluation via `RagService`
- `LIVE_INTERVIEW_PROVIDER_TOKEN` enables hot-swapping the LLM provider

---

## Dependency Graph

```text
InterviewModule
├── imports
│   ├── RagModule          → provides RagService (for evaluation)
│   └── ResumeModule       → provides ResumeService (to fetch user resume)
│
└── providers
    ├── InterviewGateway   → depends on InterviewService, InterviewEvaluationService,
    │                         ResumeService, WsAuthGuard
    ├── InterviewService   → depends on ILiveInterviewProvider (via DI token)
    ├── InterviewEvaluationService → depends on RagService
    ├── WsAuthGuard        → depends on ConfigService
    └── GeminiLiveAdapter  → depends on ConfigService (API key, model name)
```

---

## How to Swap the LLM Provider

1. Create a new adapter in `infrastructure/adapters/` implementing `ILiveInterviewProvider`.
2. Update the DI binding in `interview.module.ts`:
   ```typescript
   {
     provide: LIVE_INTERVIEW_PROVIDER_TOKEN,
     useClass: NewProviderAdapter,
   }
   ```
3. No other code changes required — the Service and Gateway are provider-agnostic.
