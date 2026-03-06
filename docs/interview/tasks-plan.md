# Mock Interview with AI — Tasks Plan

## Legend

- 🔴 Critical (blocking other tasks)
- 🟡 Important
- 🟢 Nice-to-have
- ⏱ Estimated time

---

## Phase 1: Backend Foundation (🔴 Critical)

### Task 1.1: Setup Dependencies & Infrastructure

⏱ 30 min

- [ ] Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- [ ] Add new env vars to `src/libs/configs/env.config.ts` và `validation.schema.ts`:
  - `GEMINI_LIVE_MODEL`
- [ ] Update `.env.example` với các biến mới

### Task 1.2: Create Prisma Schema

⏱ 30 min

- [ ] Tạo file `src/libs/databases/prisma/schema/interview.prisma`
- [ ] Define models: `InterviewSession`, `InterviewFeedback`
- [ ] Define enums: `InterviewType`, `InterviewStatus`
- [ ] Thêm relations vào `User` model và `Resume` model (interview sessions)
- [ ] Run `pnpm run db:migrate` để generate migration
- [ ] Run `pnpm run db:generate` để update Prisma Client

### Task 1.3: Create Interview Module Skeleton

⏱ 45 min

- [ ] Tạo folder structure theo Clean Architecture pattern:
  ```
  src/modules/interview/
  ├── interview.module.ts
  ├── domain/
  ├── application/
  ├── infrastructure/
  └── presentation/
  ```
- [ ] Hoặc sử dụng script: `npx ts-node scripts/generate-module.ts interview`
- [ ] Register `InterviewModule` trong `src/app/app.module.ts`

### Task 1.4: Domain Layer

⏱ 30 min

- [ ] Tạo `domain/interview-session.domain.ts` — Entity class với behavior methods
- [ ] Tạo `domain/interview-feedback.domain.ts` — Entity class
- [ ] Tạo `domain/enums/interview-type.enum.ts`
- [ ] Tạo `domain/enums/interview-status.enum.ts`
- [ ] Tạo `domain/index.ts` barrel exports

### Task 1.5: Application Layer — Interfaces (Ports)

⏱ 30 min

- [ ] Tạo `application/interfaces/interview-repo.interface.ts`:
  - Define `IInterviewRepository` interface
  - Define `INTERVIEW_REPOSITORY_TOKEN` Symbol
- [ ] Tạo `application/interfaces/live-interview-provider.interface.ts`:
  - Define `ILiveInterviewProvider` interface
  - Define `LIVE_INTERVIEW_PROVIDER_TOKEN` Symbol
  - Define `LiveInterviewConfig`, `TurnCompleteData` types
- [ ] Tạo barrel exports

### Task 1.6: Application Layer — Commands

⏱ 15 min

- [ ] Tạo `application/commands/create-interview-session.command.ts`
- [ ] Tạo `application/commands/end-interview-session.command.ts`
- [ ] Tạo barrel exports

### Task 1.7: Application Layer — Prompts

⏱ 45 min

- [ ] Tạo `application/constants/prompt.constant.ts`:
  - `INTERVIEW_SYSTEM_PROMPT` — System instruction cho Gemini Live (với placeholders)
  - `EVALUATION_PROMPT` — Prompt cho post-interview evaluation
  - `EVALUATION_SCHEMA` — Gemini structured output schema cho evaluation
- [ ] Test prompt quality bằng cách manual test với Gemini API

### Task 1.8: Application Layer — Services

⏱ 1.5 hours

- [ ] Tạo `application/services/interview.service.ts`:
  - `startInterview()` — tạo session, build system prompt, connect provider
  - `handleAudioInput()` — forward audio tới provider
  - `endInterview()` — disconnect, evaluate, save feedback
  - `buildSystemPrompt()` — inject resume + JD vào prompt template
  - `registerProviderCallbacks()` — setup audio/turn/interrupt listeners
- [ ] Tạo `application/services/interview-evaluation.service.ts`:
  - `evaluate()` — gọi RagService (single-shot) với conversation history
  - Parse structured output → `InterviewFeedback`

---

## Phase 2: Backend Infrastructure (🔴 Critical)

### Task 2.1: Gemini Live Adapter

⏱ 2 hours

- [ ] Tạo `infrastructure/adapters/gemini-live.adapter.ts`:
  - Implement `ILiveInterviewProvider`
  - `connect()` — sử dụng `@google/genai` SDK `ai.live.connect()` với WebSocket
  - `sendAudio()` — `session.sendRealtimeInput({ audio: { data, mimeType } })`
  - `onAudioResponse()` — parse `serverContent.modelTurn.parts[].inlineData`
  - `onTurnComplete()` — detect model turn completion
  - `onInterrupted()` — handle `serverContent.interrupted`
  - `disconnect()` — close WebSocket, cleanup
  - Manage active sessions via `Map<string, LiveSession>`
- [ ] Handle error cases: connection failure, timeout, API rate limit
- [ ] Handle session cleanup on unexpected disconnection

### Task 2.2: Prisma Interview Repository

⏱ 1 hour

- [ ] Tạo `infrastructure/repositories/prisma-interview.repo.ts`:
  - Implement `IInterviewRepository`
  - `create()` — Prisma create + map to domain entity
  - `findById()` — Prisma findUnique + map
  - `findByUserId()` — Prisma findMany + map
  - `update()` — Prisma update + map
  - `saveFeedback()` — Prisma create InterviewFeedback
  - `findFeedbackBySessionId()` — Prisma findUnique

---

## Phase 3: Backend Presentation (🔴 Critical)

### Task 3.1: DTOs

⏱ 30 min

- [ ] Tạo `presentation/DTOs/start-interview.dto.ts`:
  - `jdText?: string`
  - `questionCount: number` (min 5, max 10)
  - `interviewType: InterviewType`
  - Validation decorators: `@IsOptional()`, `@IsNumber()`, `@Min()`, `@Max()`, `@IsEnum()`
- [ ] Tạo `presentation/DTOs/interview-feedback.dto.ts` (response mapping)

### Task 3.2: WebSocket Auth Guard

⏱ 45 min

- [ ] Tạo `presentation/guards/ws-auth.guard.ts`:
  - Extract JWT from `client.handshake.auth.token`
  - Verify via Clerk (`@clerk/backend`)
  - Attach user info to socket data
  - Reject unauthorized connections
- [ ] Test with Socket.IO client

### Task 3.3: Interview Gateway

⏱ 2 hours

- [ ] Tạo `presentation/gateways/interview.gateway.ts`:
  - `@WebSocketGateway({ namespace: '/interview' })`
  - `handleConnection()` — auth check, log
  - `handleDisconnect()` — cleanup active sessions
  - `@SubscribeMessage('interview:start')` — validate DTO, parse JD PDF, call service
  - `@SubscribeMessage('interview:audio')` — forward audio to service
  - `@SubscribeMessage('interview:stop')` — end interview, return feedback
  - Error handling: emit `interview:error` to client
- [ ] Setup proper event emission back to client

### Task 3.4: Module Registration & Wiring

⏱ 30 min

- [ ] Complete `interview.module.ts`:
  - Import `RagModule`, `DatabaseModule`
  - Register all providers with DI tokens
  - Register Gateway
- [ ] Register `InterviewModule` trong `app.module.ts`
- [ ] Verify WebSocket endpoint works (`ws://localhost:3000/interview`)

---

## Phase 4: Frontend Foundation (🟡 Important)

### Task 4.1: Setup Dependencies & Types

⏱ 30 min

- [ ] Install `socket.io-client`
- [ ] Tạo `types/interview.type.ts`:
  - `InterviewType`, `InterviewStatus` enums
  - `InterviewConfig`, `InterviewSession`, `InterviewFeedback` interfaces
  - `QuestionFeedback`, `TurnCompleteData`, `StartInterviewPayload` interfaces
- [ ] Tạo `constants/interview.constant.ts`:
  - `INTERVIEW_TYPE_OPTIONS` (select options)
  - `QUESTION_COUNT_RANGE` (min/max)
  - Default values

### Task 4.2: Interview Service

⏱ 1 hour

- [ ] Tạo `services/interview.service.ts`:
  - Extends `HttpService`
  - WebSocket connection management (`connect()`, `disconnect()`)
  - Event emitters: `startInterview()`, `sendAudio()`, `stopInterview()`
  - Event listeners: `onStarted()`, `onAudioResponse()`, `onTurnComplete()`, `onFeedback()`, `onError()`
  - Inject auth token from Clerk vào WebSocket handshake

### Task 4.3: useInterview Hook

⏱ 2 hours

- [ ] Tạo `hooks/use-interview.ts`:
  - **State machine**: idle → setup → connecting → active → evaluating → result
  - **WebSocket lifecycle**: connect on start, cleanup on unmount/stop
  - **Audio capture**:
    - `navigator.mediaDevices.getUserMedia({ audio: true })`
    - `AudioContext` with `AnalyserNode` (for voice wave)
    - `MediaRecorder` hoặc `ScriptProcessorNode` → PCM 16kHz mono
    - Convert to base64 → send via WebSocket
  - **Audio playback**:
    - Receive base64 PCM 24kHz from server
    - Decode → `AudioBuffer` → play via `AudioContext`
  - **Question tracking**: Listen `interview:turn-complete` events
  - **Mute toggle**: Stop/resume sending audio
  - **Cleanup**: Disconnect socket, stop MediaRecorder, close AudioContext

---

## Phase 5: Frontend UI Components (🟡 Important)

### Task 5.1: InterviewDialog (Container)

⏱ 1 hour

- [ ] Tạo `components/builder-screen/interview-dialog.tsx`:
  - State machine quản lý current view
  - Render component tương ứng với state
  - Dialog from `@shared/ui` (fullscreen on mobile)
  - Handle close: confirm nếu đang interview

### Task 5.2: InterviewSetupForm

⏱ 1.5 hours

- [ ] Tạo `components/builder-screen/interview/interview-setup-form.tsx`:
  - JD input: Tabs (paste text / upload PDF) — reuse pattern từ `matching-form.tsx`
  - Question count: Slider component (5-10) với label hiển thị số
  - Interview type: Select component (Technical / Behavioral / All)
  - Form validation: Zod schema + React Hook Form
  - Start button: `onClick` → sync resume → call `useInterview.startInterview()`
  - Loading state trên button khi đang connecting

### Task 5.3: InterviewActive (Voice Wave UI)

⏱ 2.5 hours

- [ ] Tạo `components/builder-screen/interview/interview-active.tsx`:
  - **Voice Wave Visualization**:
    - Canvas element hoặc SVG bars
    - `useEffect` với `requestAnimationFrame` loop
    - Read `AnalyserNode.getByteFrequencyData()` → render bars/wave
    - Khác style khi AI speaking vs user speaking
  - **Status Indicator**:
    - "🎙 Listening..." (user's turn)
    - "🤖 AI is speaking..." (AI's turn)
    - "⏳ Processing..." (between turns)
  - **Question Progress**: "Question 3/7" progress bar
  - **Timer**: Elapsed time display (mm:ss)
  - **Controls**:
    - Mute/Unmute microphone button
    - Stop Interview button (with confirmation dialog)
  - **Animations**: Framer Motion cho transitions, pulse effect khi active

### Task 5.4: InterviewLoading

⏱ 30 min

- [ ] Tạo `components/builder-screen/interview/interview-loading.tsx`:
  - Reuse pattern từ `matching-loading.tsx`
  - Animated icon (brain/clipboard)
  - Cycling text: "Analyzing responses...", "Evaluating answers...", "Generating feedback..."
  - Framer Motion animations

### Task 5.5: InterviewResult

⏱ 1.5 hours

- [ ] Tạo `components/builder-screen/interview/interview-result.tsx`:
  - **Overall Score**: Reuse `ScoreGauge` component
  - **Summary**: AI's overall assessment text
  - **Per-question Feedback**:
    - Collapsible accordion list
    - Each item: question text, score bar, feedback, suggestions
  - **Strengths**: Green badge list
  - **Areas for Improvement**: Orange badge list
  - **Actions**: "Interview Again" (→ reset to setup), "Close" (→ close dialog)

### Task 5.6: Integrate into Resume Control

⏱ 30 min

- [ ] Modify `components/builder-screen/resume-control.tsx`:
  - Add "Mock Interview" button (icon: `Mic` from lucide-react)
  - Place next to existing "JD Matching" button
  - Import and render `InterviewDialog`

---

## Phase 6: Testing & Polish (🟢 Nice-to-have)

### Task 6.1: Backend Unit Tests

⏱ 2 hours

- [ ] Test `InterviewService`:
  - `startInterview()` — verify prompt building, session creation
  - `endInterview()` — verify evaluation flow
- [ ] Test `InterviewEvaluationService`:
  - Verify structured output parsing
- [ ] Test `InterviewGateway`:
  - WebSocket connection/disconnection
  - Event handling
- [ ] Test `WsAuthGuard`:
  - Valid/invalid JWT scenarios

### Task 6.2: Frontend Tests

⏱ 1 hour

- [ ] Test `useInterview` hook:
  - State transitions
  - Cleanup on unmount
- [ ] Test `InterviewSetupForm`:
  - Validation logic
  - Submit flow

### Task 6.3: Error Handling & Edge Cases

⏱ 1 hour

- [ ] Backend: Handle Gemini API connection failures gracefully
- [ ] Backend: Handle unexpected WebSocket disconnection (cleanup Gemini session)
- [ ] Backend: Rate limiting for interview sessions (e.g., max 5 per day per user)
- [ ] Frontend: Handle browser microphone permission denied
- [ ] Frontend: Handle WebSocket disconnection mid-interview (reconnect or show error)
- [ ] Frontend: Handle browser tab close during interview (beforeunload warning)

### Task 6.4: UI Polish

⏱ 1 hour

- [ ] Responsive design (mobile-friendly dialog)
- [ ] Dark mode support (theo theme hiện tại)
- [ ] Loading skeletons
- [ ] Smooth transitions giữa các states
- [ ] Accessibility (ARIA labels cho voice controls)

---

## Task Dependencies Graph

```
Phase 1 (Backend Foundation)
  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8
                              ↓
Phase 2 (Backend Infrastructure)
  2.1 (Gemini Adapter) ← 1.5
  2.2 (Prisma Repo) ← 1.2, 1.4, 1.5
                              ↓
Phase 3 (Backend Presentation)
  3.1 → 3.2 → 3.3 → 3.4
  3.3 ← 1.8, 2.1, 2.2
                              ↓
Phase 4 (Frontend Foundation) — can start parallel with Phase 2
  4.1 (Types) — independent
  4.2 (Service) ← 4.1
  4.3 (Hook) ← 4.2
                              ↓
Phase 5 (Frontend UI) — can start parallel with Phase 3
  5.1 (Dialog) ← 4.3
  5.2 (Setup Form) ← 5.1
  5.3 (Active UI) ← 5.1, 4.3
  5.4 (Loading) ← 5.1
  5.5 (Result) ← 5.1
  5.6 (Integration) ← 5.1
                              ↓
Phase 6 (Testing & Polish) — after all phases
```

---

## Time Estimates Summary

| Phase | Tasks | Estimated Time |
|---|---|---|
| Phase 1: Backend Foundation | 8 tasks | ~4.5 hours |
| Phase 2: Backend Infrastructure | 2 tasks | ~3 hours |
| Phase 3: Backend Presentation | 4 tasks | ~3.75 hours |
| Phase 4: Frontend Foundation | 3 tasks | ~3.5 hours |
| Phase 5: Frontend UI | 6 tasks | ~7.5 hours |
| Phase 6: Testing & Polish | 4 tasks | ~5 hours |
| **Total** | **27 tasks** | **~27.25 hours** |

> **Note**: Thời gian ước tính cho 1 developer. Phase 4 có thể chạy song song với Phase 2-3 nếu có 2 developers (FE + BE).
