# Mock Interview — WebSocket Events API

Complete reference for all WebSocket events used in the Mock Interview feature.

**Namespace:** `/interview`  
**Transport:** Socket.IO  

---

## Connection

### Handshake Authentication

The client must provide a Clerk JWT token during the WebSocket handshake:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/interview', {
  auth: {
    token: clerkSessionToken,
  },
});
```

**Alternative:** Send the token via `Authorization` header:
```typescript
const socket = io('http://localhost:3000/interview', {
  extraHeaders: {
    Authorization: `Bearer ${clerkSessionToken}`,
  },
});
```

If authentication fails, the server emits `interview:error` and disconnects the client.

---

## Client → Server Events

### `interview:start`

Start a new mock interview session.

**Payload:**

```typescript
{
  jobDescription: string;    // Required — the target job description text
  questionCount: number;     // Required — integer between 5 and 10
  interviewType: 'TECHNICAL' | 'BEHAVIORAL' | 'ALL';  // Required
}
```

**Validation rules:**
- `jobDescription` — must be a non-empty string
- `questionCount` — must be an integer, minimum 5, maximum 10
- `interviewType` — must be one of the enum values

**Server response:** `interview:started` on success, `interview:error` on failure.

---

### `interview:audio`

Stream audio data from the user's microphone to the AI interviewer.

**Payload:**

```typescript
{
  audio: string;  // Base64-encoded 16-bit PCM audio, 16 kHz sample rate, mono
}
```

**Notes:**
- Send audio chunks continuously as the user speaks
- Recommended chunk size: 4096–8192 bytes of raw PCM before base64 encoding
- No server acknowledgment is sent for each audio chunk (fire-and-forget)

---

### `interview:stop`

Manually end the interview and trigger evaluation.

**Payload:** None

**Server response:** `interview:evaluating` followed by `interview:feedback`.

---

## Server → Client Events

### `interview:started`

Emitted when the interview session is successfully created and the Gemini connection is established.

```typescript
{
  sessionId: string;  // UUID of the interview session
}
```

---

### `interview:audio`

Emitted when the AI interviewer sends audio response chunks. May fire multiple times per AI turn.

```typescript
{
  audio: string;  // Base64-encoded audio from Gemini (24 kHz sample rate)
}
```

**Usage:** Decode the base64 string, convert to an audio buffer, and play through `AudioContext` or `<audio>` element.

---

### `interview:turn-complete`

Emitted when the AI interviewer finishes one complete response (one question or acknowledgment).

```typescript
{
  questionNumber: number;    // Current question count (1-based)
  totalQuestions: number;    // Total questions configured for this session
}
```

**Usage:** Update progress UI (e.g., "Question 3 of 7").

---

### `interview:interrupted`

Emitted when the user starts speaking while the AI is still responding. The AI's response is cut short.

**Payload:** None

**Usage:** Stop playing the current AI audio buffer.

---

### `interview:evaluating`

Emitted after the interview ends, indicating that the AI is generating feedback. This may take 5–15 seconds.

**Payload:** None

**Usage:** Show a loading/evaluation state in the UI.

---

### `interview:feedback`

Emitted when the AI evaluation is complete. Contains the structured feedback.

```typescript
{
  overallScore: number;           // 0–100 weighted average
  summary: string;                // 3–5 sentence performance summary
  questionFeedbacks: Array<{
    questionNumber: number;       // 1-based
    question: string;             // The question text
    score: number;                // 0–100
    feedback: string;             // Specific feedback for this answer
    suggestions: string;          // How to improve the answer
  }>;
  strengths: string[];            // 3–5 key strengths
  improvements: string[];         // 3–5 areas for improvement
}
```

---

### `interview:error`

Emitted when an error occurs at any stage.

```typescript
{
  message: string;  // Human-readable error message
}
```

**Possible messages:**
- `"Authentication failed"` — invalid or missing JWT
- `"Not authenticated"` — socket connected but auth failed
- `"An interview is already in progress"` — duplicate start attempt
- `"Failed to start interview. Please try again."` — Gemini connection error
- `"Failed to evaluate interview. Please try again."` — evaluation error

---

## Event Flow Diagram

```text
Client                                        Server
  │                                              │
  │── connect (auth.token) ─────────────────────▶│  ← authenticate
  │                                              │
  │── interview:start ──────────────────────────▶│  ← validate DTO, fetch resume
  │◀──────────────────────── interview:started ──│     connect to Gemini
  │                                              │
  │══ interview:audio (mic stream) ═════════════▶│  ← forward to Gemini
  │◀═════════════════════ interview:audio (AI) ══│  ← forward from Gemini
  │◀─────────────────── interview:turn-complete ─│  ← question progress
  │                                              │
  │══ interview:audio (mic stream) ═════════════▶│  ← forward to Gemini
  │◀═════════════════════ interview:audio (AI) ══│  ← forward from Gemini
  │◀─────────────────────── interview:interrupted│  ← user spoke mid-response
  │◀─────────────────── interview:turn-complete ─│
  │                                              │
  │   ... repeat for each question ...           │
  │                                              │
  │── interview:stop ───────────────────────────▶│  ← (or auto-triggered)
  │◀──────────────────── interview:evaluating ───│  ← AI evaluation in progress
  │◀──────────────────── interview:feedback ─────│  ← structured result
  │                                              │
  │── disconnect ───────────────────────────────▶│  ← cleanup all resources
```

---

## Error Handling & Edge Cases

| Scenario | Behavior |
| -------- | -------- |
| Client disconnects mid-interview | Session is cancelled, Gemini connection closed, all maps cleaned |
| Network timeout | Socket.IO handles reconnection; but the Gemini session is lost |
| Invalid DTO payload | `interview:error` emitted with validation message |
| Gemini API error | `interview:error` emitted; session cleaned up |
| Duplicate `interview:start` | Rejected with `"An interview is already in progress"` |
| Evaluation parse failure | `interview:error` with `"Failed to evaluate interview"` |
