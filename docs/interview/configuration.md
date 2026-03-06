# Mock Interview — Configuration

Environment variables and configuration parameters for the Mock Interview feature.

---

## Environment Variables

Add these to your `.env` file:

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `GEMINI_API_KEY` | ✅ Yes | — | Google AI API key for Gemini. Shared with the RAG module. |
| `GEMINI_LIVE_MODEL` | No | `gemini-2.5-flash-native-audio-preview-12-2025` | The Gemini model used for live audio interviews. |
| `FRONTEND_ORIGIN` | ✅ Yes | — | Allowed CORS origin for WebSocket connections (e.g., `http://localhost:3000`). |
| `CLERK_SECRET_KEY` | ✅ Yes | — | Clerk secret key for JWT verification during WebSocket handshake. |

### Example `.env` Addition

```env
# Already existing
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_ORIGIN=http://localhost:3000
CLERK_SECRET_KEY=sk_test_xxxxx

# New for Mock Interview
GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
```

---

## Env Config Registration

The `GEMINI_LIVE_MODEL` is registered in `src/libs/configs/env.config.ts`:

```typescript
export enum Env {
  // ... existing
  GEMINI_LIVE_MODEL = 'GEMINI_LIVE_MODEL',
}

export const validationSchema = Joi.object({
  // ... existing
  [Env.GEMINI_LIVE_MODEL]: Joi.string().default(
    'gemini-2.5-flash-native-audio-preview-12-2025',
  ),
});
```

---

## Interview Parameters

These are configured per-session via the `interview:start` event payload:

| Parameter | Type | Range | Description |
| --------- | ---- | ----- | ----------- |
| `questionCount` | integer | 5–10 | Number of questions the AI interviewer will ask |
| `interviewType` | enum | `TECHNICAL`, `BEHAVIORAL`, `ALL` | Controls question focus |
| `jobDescription` | string | — | Full job description text for contextual questions |

---

## Audio Configuration

| Parameter | Value | Notes |
| --------- | ----- | ----- |
| Input sample rate | 16,000 Hz | 16-bit PCM, mono channel |
| Output sample rate | 24,000 Hz | From Gemini Live API |
| Input MIME type | `audio/pcm;rate=16000` | Set in `GeminiLiveAdapter.sendAudio()` |
| Modality | `AUDIO` | Configured in `LiveInterviewConfig.responseModalities` |

---

## Evaluation Scoring Weights

The post-interview evaluation uses weighted criteria:

| Criterion | Weight | Description |
| --------- | ------ | ----------- |
| Technical Knowledge | 30% | Depth and accuracy of technical answers |
| Communication Skills | 25% | Clarity, structure, articulation |
| Problem-Solving Approach | 20% | Analytical thinking, methodology |
| Relevance to Role | 15% | Alignment with JD requirements |
| Professionalism | 10% | Confidence, composure, etiquette |

These weights are defined in `EVALUATION_PROMPT` in `src/modules/interview/application/constants/prompt.constant.ts`.

---

## WebSocket Gateway Configuration

The gateway is configured in `InterviewGateway`:

```typescript
@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? '*',
    credentials: true,
  },
})
```

- **Namespace:** `/interview` — isolated from other WebSocket namespaces
- **CORS:** Uses `FRONTEND_ORIGIN` env variable, falls back to `*` in development
- **Credentials:** Enabled for cookie/auth header support

---

## Prompt Truncation Limits

To stay within Gemini token limits during evaluation:

| Data | Max Characters | Defined In |
| ---- | -------------- | ---------- |
| Resume JSON | 2,000 | `InterviewEvaluationService.buildEvaluationPrompt()` |
| Job Description | 1,500 | `InterviewEvaluationService.buildEvaluationPrompt()` |

If the data exceeds these limits, it is truncated with `...` appended.
