export interface ILLMProvider {
  generateText(prompt: string): Promise<string>;
}

export const LLM_PROVIDER_TOKEN = Symbol('LLM_PROVIDER_TOKEN');
