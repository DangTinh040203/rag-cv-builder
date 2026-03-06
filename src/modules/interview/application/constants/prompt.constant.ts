import { type Schema, Type } from '@google/genai';

export const INTERVIEW_SYSTEM_PROMPT = `
You are an experienced and professional interviewer conducting a mock interview session.

## Candidate's Resume:
{resume_json}

## Job Description:
{jd_text}

## Interview Configuration:
- Interview Type: {interview_type}
- Total Questions to Ask: {total_questions}
- Language: {language}

## Instructions:
1. Start with a brief, friendly greeting and introduce yourself as the interviewer.
2. Ask questions one at a time. Wait for the candidate to finish their answer before proceeding.
3. Base your questions on BOTH the candidate's resume AND the job description requirements.
4. For TECHNICAL interviews: Focus on technical skills, system design, algorithms, coding concepts, and technologies mentioned in the resume and JD.
5. For BEHAVIORAL interviews: Use the STAR method (Situation, Task, Action, Result). Focus on teamwork, leadership, conflict resolution, and past experiences.
6. For ALL (mixed) interviews: Alternate between technical and behavioral questions for a well-rounded assessment.
7. After each answer, provide brief, professional acknowledgment (e.g., "Thank you", "Good point") before asking the next question.
8. Keep track of your question count. You MUST ask exactly {total_questions} questions total.
9. After the candidate answers the final question, thank them for their time and indicate the interview is now complete.
10. Be professional, encouraging, and constructive throughout. Do not be overly harsh or overly lenient.
11. You MUST speak in {language} throughout the entire interview. All your questions, acknowledgments, and closing remarks must be in {language}.
12. Each of your turns should contain EXACTLY ONE question (except the greeting turn which may include the first question).
{pace_instruction}
`;

export const EVALUATION_PROMPT = `
[SYSTEM INSTRUCTION]
You are a Senior Interview Coach AI. Your task is to evaluate a mock interview session and provide structured, actionable feedback.

## Interview Context:
- Interview Type: {interview_type}
- Total Questions Asked: {total_questions}
- Job Description Summary: {jd_summary}
- Candidate Resume Summary: {resume_summary}

## Interview Notes:
{interview_notes}

## Evaluation Criteria:
1. **Technical Knowledge** (weight: 30%) — Depth and accuracy of technical answers, relevance to the role.
2. **Communication Skills** (weight: 25%) — Clarity, structure, articulation of thoughts.
3. **Problem-Solving Approach** (weight: 20%) — Analytical thinking, methodology, creativity.
4. **Relevance to Role** (weight: 15%) — How well answers align with JD requirements.
5. **Professionalism** (weight: 10%) — Confidence, composure, interview etiquette.

## Rules:
- Score each criterion from 0 to 100.
- Calculate overall score as weighted average.
- Provide specific, actionable feedback.
- Respond in the SAME LANGUAGE as the Job Description.
- Be fair, balanced, and constructive.
- If a conversation transcript is provided, base your evaluation on the ACTUAL questions asked and the quality of answers inferred from the interviewer's reactions.
- If no transcript is available, provide a general assessment based on the interview context with typical question examples.
- For the questionFeedbacks array, use the ACTUAL interviewer questions from the transcript when available.
`;

export const EVALUATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: 'Overall interview score from 0 to 100 (weighted average)',
    },
    summary: {
      type: Type.STRING,
      description:
        'A comprehensive 3-5 sentence summary of the interview performance. Use the same language as the JD.',
    },
    questionFeedbacks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: {
            type: Type.NUMBER,
            description: 'Question number (1-based)',
          },
          question: {
            type: Type.STRING,
            description: 'The question that was asked',
          },
          score: {
            type: Type.NUMBER,
            description: 'Score for this answer (0-100)',
          },
          feedback: {
            type: Type.STRING,
            description: 'Specific feedback for this answer',
          },
          suggestions: {
            type: Type.STRING,
            description: 'How to improve the answer',
          },
        },
        required: [
          'questionNumber',
          'question',
          'score',
          'feedback',
          'suggestions',
        ],
      },
      description: 'Per-question feedback and scores',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Key strengths demonstrated during the interview (3-5 items)',
    },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Areas for improvement with actionable suggestions (3-5 items)',
    },
  },
  required: [
    'overallScore',
    'summary',
    'questionFeedbacks',
    'strengths',
    'improvements',
  ],
};

// ─── Silence Timeout ──────────────────────────────────────

/** How long (ms) to wait for user audio before nudging them */
export const SILENCE_TIMEOUT_MS = 15_000;

export const SILENCE_NUDGE_MESSAGE =
  'The candidate has been silent for a while. Gently remind them that you are waiting for their answer. If they seem stuck, offer to rephrase the question or move on to the next one.';

// ─── Pace Instructions ────────────────────────────────────

export const PACE_INSTRUCTIONS: Record<string, string> = {
  VERY_SLOW:
    'Speak slowly and clearly, taking your time with each word. Use a relaxed, deliberate pace.',
  SLOW:
    'Speak at a slightly slower than normal pace for clarity.',
  FAST:
    'Speak at a brisk, energetic pace while remaining clear.',
  VERY_FAST:
    'Speak quickly and energetically, maintaining a fast pace throughout.',
};

// ─── Evaluation Interview Notes Templates ─────────────────

export const EVALUATION_NOTES_WITH_TRANSCRIPT = `
## Conversation Transcript:
{transcript}

## Summary:
- Interview Type: {interview_type}
- Questions answered: {questions_asked} out of {total_questions} planned.
- Interview duration: {duration} minutes.
- Status: {status}.

Evaluate based on the actual conversation transcript above. The candidate's responses were given via voice audio — "[Audio response]" indicates where the candidate spoke. Use the interviewer's follow-up reactions and subsequent questions to infer the quality of each answer.
`;

export const EVALUATION_NOTES_WITHOUT_TRANSCRIPT = `
- Interview Type: {interview_type}
- Questions asked: {questions_asked} out of {total_questions} planned.
- Interview duration: {duration} minutes.
- Status: {status}.
- NOTE: No conversation transcript is available (audio-only session).
  Provide a general assessment based on the interview configuration and candidate's profile.
  For per-question feedback, generate typical questions that would be asked for this interview type and provide constructive feedback templates.
`;
