# Mock Interview — Data Flow

This document describes the complete end-to-end flow of a mock interview session, from WebSocket connection to feedback delivery.

---

## High-Level Architecture

```text
┌─────────────────┐     WebSocket (Socket.IO)     ┌───────────────────────┐     WebSocket (genai SDK)     ┌──────────────────┐
│                 │  ───── interview:start ──────▶ │                       │  ───── live.connect() ──────▶ │                  │
│   Browser       │  ───── interview:audio ──────▶ │   NestJS Backend      │  ───── sendRealtimeInput() ─▶ │  Gemini Live API │
│   (Frontend)    │  ◀──── interview:audio ─────── │   (WebSocket Proxy)   │  ◀──── onmessage callback ── │                  │
│                 │  ◀──── interview:feedback ──── │                       │                               │                  │
└─────────────────┘                                └───────────────────────┘                               └──────────────────┘
```

The backend does **not** process audio itself. It acts as a **real-time proxy** that:

1. Authenticates the user
2. Creates an in-memory session
3. Connects to Gemini Live API
4. Forwards audio in both directions
5. Tracks question progress
6. Evaluates the session after completion

---

## Detailed Flow

### Phase 1: Connection & Authentication

```text
Browser                          InterviewGateway              WsAuthGuard
  │                                     │                          │
  │── WebSocket connect ───────────────▶│                          │
  │   (auth.token = Clerk JWT)          │                          │
  │                                     │── authenticate(client) ─▶│
  │                                     │                          │── verifyToken(jwt, secretKey)
  │                                     │                          │   via @clerk/backend
  │                                     │◀── userId (sub) ─────────│
  │                                     │                          │
  │                                     │── store userId in        │
  │                                     │   client.data.userId     │
  │◀── connection established ──────────│                          │
```

**If authentication fails:** The gateway emits `interview:error` and immediately disconnects the client.

---

### Phase 2: Starting an Interview

```text
Browser                    InterviewGateway         InterviewService        GeminiLiveAdapter        Gemini API
  │                              │                        │                       │                      │
  │── interview:start ──────────▶│                        │                       │                      │
  │   { jobDescription,         │                        │                       │                      │
  │     questionCount: 7,       │                        │                       │                      │
  │     interviewType: "ALL" }  │                        │                       │                      │
  │                              │── findByUserId() ─────▶│ ResumeService         │                      │
  │                              │◀── resume JSON ────────│                       │                      │
  │                              │                        │                       │                      │
  │                              │── startInterview() ───▶│                       │                      │
  │                              │   (command + callbacks) │                       │                      │
  │                              │                        │── buildSystemPrompt() │                      │
  │                              │                        │   (inject resume,     │                      │
  │                              │                        │    JD, type, count)   │                      │
  │                              │                        │                       │                      │
  │                              │                        │── connect(config) ───▶│                      │
  │                              │                        │                       │── genAI.live.connect()─▶│
  │                              │                        │                       │◀── session opened ────│
  │                              │                        │◀── providerSessionId ─│                      │
  │                              │                        │                       │                      │
  │                              │                        │── new InterviewSession()                     │
  │                              │                        │── activeSessions.set()  │                      │
  │                              │                        │── registerCallbacks()   │                      │
  │                              │◀── session ────────────│                       │                      │
  │                              │                        │                       │                      │
  │◀── interview:started ───────│                        │                       │                      │
  │    { sessionId }             │                        │                       │                      │
```

**What happens inside `buildSystemPrompt()`:**
The `INTERVIEW_SYSTEM_PROMPT` template is populated with the candidate's resume JSON, job description, interview type, and total question count. This becomes the Gemini session's `systemInstruction`, so the AI interviewer has full context from the first turn.

---

### Phase 3: Real-Time Audio Streaming (Interview in Progress)

```text
Browser                    InterviewGateway         InterviewService        GeminiLiveAdapter        Gemini API
  │                              │                        │                       │                      │
  │══ interview:audio ══════════▶│                        │                       │                      │
  │   { audio: base64 PCM }     │── handleAudioInput() ─▶│                       │                      │
  │                              │                        │── sendAudio() ───────▶│                      │
  │                              │                        │                       │── sendRealtimeInput() │
  │                              │                        │                       │   { audio: base64,   ▶│
  │                              │                        │                       │     mimeType: pcm }   │
  │                              │                        │                       │                      │
  │   (Gemini generates answer)  │                        │                       │                      │
  │                              │                        │                       │◀── onmessage ────────│
  │                              │                        │                       │    serverContent:     │
  │                              │                        │                       │    modelTurn.parts[]  │
  │                              │                        │◀── onAudioResponse ──│   (inlineData audio) │
  │                              │◀── callback ──────────│                       │                      │
  │◀══ interview:audio ═════════│                        │                       │                      │
  │    { audio: base64 }         │                        │                       │                      │
  │                              │                        │                       │                      │
  │   (AI finishes one turn)     │                        │                       │◀── onmessage ────────│
  │                              │                        │                       │    serverContent:     │
  │                              │                        │                       │    turnComplete       │
  │                              │                        │◀── onTurnComplete ───│                      │
  │                              │                        │── incrementQuestionCount()                   │
  │                              │                        │── check shouldEndInterview                   │
  │                              │◀── callback ──────────│                       │                      │
  │◀── interview:turn-complete ─│                        │                       │                      │
  │    { questionNumber: 3,      │                        │                       │                      │
  │      totalQuestions: 7 }     │                        │                       │                      │
```

**Audio format details:**

- **Client → Server:** Base64-encoded 16-bit PCM, 16 kHz sample rate, mono channel
- **Server → Gemini:** Same base64 string, sent via `sendRealtimeInput({ audio: { data, mimeType: 'audio/pcm;rate=16000' } })`
- **Gemini → Server:** Base64 audio in `serverContent.modelTurn.parts[].inlineData.data`
- **Server → Client:** Base64-encoded buffer via `interview:audio` event

**Interruption handling:** If the user speaks while Gemini is still responding, Gemini sends `serverContent.interrupted = true`. The adapter fires the `onInterrupted` callback, and the gateway emits `interview:interrupted` to the client.

---

### Phase 4: Interview Completion & Evaluation

This phase is triggered either by:

- **Auto-completion:** `InterviewService` detects `session.shouldEndInterview` (questionsAsked ≥ totalQuestions) after a `turnComplete` event
- **Manual stop:** Client sends `interview:stop` event

```text
Browser                    InterviewGateway        InterviewService    InterviewEvaluationService    RagService
  │                              │                       │                       │                       │
  │── interview:stop ───────────▶│                       │                       │                       │
  │   (or auto-triggered)       │                       │                       │                       │
  │                              │── endInterview() ────▶│                       │                       │
  │                              │                       │── session.complete()   │                       │
  │                              │                       │── provider.disconnect()│                       │
  │                              │                       │── remove from Map      │                       │
  │                              │◀── completedSession ──│                       │                       │
  │                              │                       │                       │                       │
  │◀── interview:evaluating ────│                       │                       │                       │
  │                              │                       │                       │                       │
  │                              │── evaluate(session) ──────────────────────────▶│                       │
  │                              │                       │                       │── buildEvaluationPrompt()
  │                              │                       │                       │   (inject type, count, │
  │                              │                       │                       │    JD/resume summaries,│
  │                              │                       │                       │    interview notes)    │
  │                              │                       │                       │                       │
  │                              │                       │                       │── sendMessage() ──────▶│
  │                              │                       │                       │   (prompt, schema)     │── Gemini API
  │                              │                       │                       │◀── JSON response ─────│   (structured)
  │                              │                       │                       │                       │
  │                              │                       │                       │── parse → InterviewFeedback
  │                              │◀── feedback ──────────────────────────────────│                       │
  │                              │                       │                       │                       │
  │◀── interview:feedback ──────│                       │                       │                       │
  │    { overallScore,           │                       │                       │                       │
  │      summary,                │                       │                       │                       │
  │      questionFeedbacks[],    │                       │                       │                       │
  │      strengths[],            │                       │                       │                       │
  │      improvements[] }        │                       │                       │                       │
```

**Evaluation details:**

- Uses `RagService.sendMessage()` with `EVALUATION_SCHEMA` (Gemini structured output)
- Weighted scoring: Technical (30%), Communication (25%), Problem-Solving (20%), Relevance (15%), Professionalism (10%)
- Resume/JD are truncated to 2000/1500 chars to fit token limits
- Response language matches the JD language (Vietnamese or English)

---

### Phase 5: Disconnection & Cleanup

```text
Browser                    InterviewGateway         InterviewService        GeminiLiveAdapter
  │                              │                        │                       │
  │── disconnect ───────────────▶│                        │                       │
  │   (close tab, network loss)  │                        │                       │
  │                              │── handleDisconnect() ──│                       │
  │                              │   look up sessionId    │                       │
  │                              │   from clientSessions  │                       │
  │                              │                        │                       │
  │                              │── cancelInterview() ──▶│                       │
  │                              │                        │── session.cancel()     │
  │                              │                        │── disconnect() ───────▶│
  │                              │                        │                       │── session.close()
  │                              │                        │── remove from Map      │── remove from Map
  │                              │── delete from          │                       │
  │                              │   clientSessions       │                       │
```

**All resources are cleaned up:**

- `InterviewGateway.clientSessions` (socketId → sessionId mapping)
- `InterviewService.activeSessions` (sessionId → InterviewSession)
- `GeminiLiveAdapter.sessions` (providerSessionId → GeminiLiveSessionEntry)
- Gemini WebSocket connection is closed

---

## Session Lifecycle State Machine

```text
                    ┌──────────────┐
                    │  (no session) │
                    └──────┬───────┘
                           │ interview:start
                           ▼
                    ┌──────────────┐
           ┌───────│  IN_PROGRESS  │───────┐
           │       └──────┬───────┘       │
           │              │                │
    disconnect /     interview:stop /      │ questionsAsked
    cancel           manual stop           │ >= totalQuestions
           │              │                │ (auto-complete)
           ▼              ▼                ▼
    ┌────────────┐  ┌─────────────┐  ┌─────────────┐
    │  CANCELLED  │  │  COMPLETED  │  │  COMPLETED  │
    └────────────┘  └─────────────┘  └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  EVALUATING  │  (client receives interview:evaluating)
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   FEEDBACK   │  (client receives interview:feedback)
                    └──────────────┘
```

---

## In-Memory Data Model

Since this feature has **no database persistence**, all state lives in 3 `Map` instances:

| Map              | Location            | Key                 | Value                    | Lifetime           |
| ---------------- | ------------------- | ------------------- | ------------------------ | ------------------ |
| `clientSessions` | `InterviewGateway`  | Socket ID           | Session ID               | Socket connection  |
| `activeSessions` | `InterviewService`  | Session ID          | `InterviewSession`       | Interview duration |
| `sessions`       | `GeminiLiveAdapter` | Provider Session ID | `GeminiLiveSessionEntry` | Gemini connection  |

All 3 maps are cleaned up when the interview ends or the client disconnects.
