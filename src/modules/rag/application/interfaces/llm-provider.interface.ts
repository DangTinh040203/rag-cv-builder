import { type Schema } from '@google/genai';

export interface LLMProvider {
  sendMessage(content: string, schema?: Schema): Promise<string>;
}

export const LLM_PROVIDER_TOKEN = Symbol('LLM_PROVIDER_TOKEN');
