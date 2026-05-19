import type { AISchemaContract, InterfaceProvider } from './generateInterface';
import { AI_PROMPT_CONTRACT, validateAISchemaContract } from './generateInterface';

export type OpenAIProviderEnv = {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions';

export function resolveAIProviderFromEnv(env: OpenAIProviderEnv = {}): { provider: InterfaceProvider; note?: string; warning?: string } {
  const wantsOpenAI = (env.provider ?? '').toLowerCase() === 'openai';
  if (!wantsOpenAI) {
    return { provider: { id: 'mock', generateFromPrompt: async (prompt) => (await import('./generateInterface')).mockProvider.generateFromPrompt(prompt) }, note: 'AI Assist is using the local mock provider.' };
  }
  if (!env.apiKey) {
    return {
      provider: { id: 'mock', generateFromPrompt: async (prompt) => (await import('./generateInterface')).mockProvider.generateFromPrompt(prompt) },
      note: 'AI Assist is using the local mock provider.',
      warning: 'OpenAI-compatible provider selected but API key is missing.'
    };
  }
  return { provider: createOpenAICompatibleProvider({ apiKey: env.apiKey, model: env.model, baseUrl: env.baseUrl }) };
}

export function createOpenAICompatibleProvider(config: { apiKey: string; model?: string; baseUrl?: string }): InterfaceProvider {
  return {
    id: 'openai-compatible',
    async generateFromPrompt(prompt: string): Promise<AISchemaContract> {
      const response = await fetch(config.baseUrl ?? DEFAULT_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `${AI_PROMPT_CONTRACT} Do not include markdown fences or prose.` },
            { role: 'user', content: `Prompt: ${prompt}` }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`Provider request failed (${response.status})`);
      }
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('Provider returned empty content');
      let parsed: AISchemaContract;
      try {
        parsed = JSON.parse(content) as AISchemaContract;
      } catch {
        throw new Error('Provider returned invalid JSON content');
      }
      const warnings = validateAISchemaContract(parsed);
      if (warnings.length > 0) {
        throw new Error(`Provider schema validation failed: ${warnings.join(', ')}`);
      }
      return parsed;
    }
  };
}
