# Mock Interview with AI

> Real-time voice-based mock interview feature powered by Google Gemini Live API.

## Overview

The Mock Interview module enables users to practice job interviews in real time with an AI interviewer. The system streams bidirectional audio between the user's browser and Google's Gemini Live API, with the NestJS backend acting as a **WebSocket proxy**. After the interview completes, an AI evaluation service scores the candidate's performance and returns structured feedback.

### Key Characteristics

| Aspect                 | Detail                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| **Transport**          | WebSocket (Socket.IO) — not REST                                        |
| **Audio Format**       | 16-bit PCM, 16 kHz mono (input) / 24 kHz (output)                       |
| **Persistence**        | None — all sessions are ephemeral in-memory (`Map`)                     |
| **Architecture**       | Clean Architecture 4-layer + Port-Adapter pattern                       |
| **Provider Swappable** | `ILiveInterviewProvider` interface allows replacing Gemini with any LLM |
| **Auth**               | Clerk JWT verified at WebSocket handshake                               |

## Documentation

- [Module Structure](module-structure.md) — File tree, layer breakdown, and responsibilities
- [Data Flow](data-flow.md) — End-to-end sequence from connection to feedback
- [WebSocket Events API](websocket-events.md) — Complete event reference for frontend integration
- [Configuration](configuration.md) — Environment variables and tuning parameters
