import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOpenAICompatibleProvider, resolveAIProviderFromEnv } from './openAIProvider';
import { generateInterfaceFromPrompt } from './generateInterface';

describe('openai-compatible provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds request and parses valid json response', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: 'T', intent: 'I', blocks: [{ type: 'hero' }], components: ['hero'], interactions: ['click'], styleDirectives: ['x'], requirements: ['r'], warnings: [] }) } }] }) }));
    vi.stubGlobal('fetch', fetchMock as any);
    const provider = createOpenAICompatibleProvider({ apiKey: 'k', model: 'm' });
    const out = await provider.generateFromPrompt('hello');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer k' }) })
    );
    expect(out.title).toBe('T');
  });

  it('rejects invalid json', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{bad' } }] }) })) as any);
    await expect(createOpenAICompatibleProvider({ apiKey: 'k' }).generateFromPrompt('x')).rejects.toThrow(/invalid JSON/i);
  });

  it('rejects schema validation failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: '', intent: '', blocks: [], components: [], interactions: [], styleDirectives: [], requirements: [], warnings: [] }) } }] }) })) as any);
    await expect(createOpenAICompatibleProvider({ apiKey: 'k' }).generateFromPrompt('x')).rejects.toThrow(/schema validation failed/i);
  });

  it('handles network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }) as any);
    await expect(createOpenAICompatibleProvider({ apiKey: 'k' }).generateFromPrompt('x')).rejects.toThrow(/network/i);
  });

  it('provider selection defaults to mock and generate path does not call fetch', async () => {
    const sel = resolveAIProviderFromEnv({ provider: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as any);
    const out = await generateInterfaceFromPrompt('kanban board', { mode: 'provider', provider: sel.provider });
    expect(sel.provider.id).toBe('mock');
    expect(out.provider).toBe('mock');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
