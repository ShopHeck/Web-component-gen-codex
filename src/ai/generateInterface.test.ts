import { describe, expect, it } from 'vitest';
import { generateInterfaceFromPrompt, mockProvider, validateAISchemaContract } from './generateInterface';

describe('AI assist adapter', () => {
  it('validates and sanitizes contract shape', () => {
    const warnings = validateAISchemaContract({ title: '', intent: 'x', blocks: [{ type: 'invalidBlock' as any }], components: [], interactions: [], styleDirectives: [], requirements: [], warnings: [] });
    expect(warnings.some((x) => x.includes('Missing title'))).toBe(true);
    expect(warnings.some((x) => x.includes('Unsupported block'))).toBe(true);
  });

  it('mock provider returns kanban schema contract', async () => {
    const out = await mockProvider.generateFromPrompt('build an interactive kanban board with subtle glow behind active components');
    expect(out.blocks.some((b) => b.type === 'customRequirementGrid')).toBe(true);
    expect(out.styleDirectives).toContain('kanban:glow:subtle');
  });

  it('maps prompt to schema for export pipeline', async () => {
    const out = await generateInterfaceFromPrompt('build an interactive kanban board with subtle glow behind active components');
    expect(out.schema.strategy).toBe('ai-assisted');
    expect(out.schema.blocks.some((b) => b.type === 'customRequirementGrid')).toBe(true);
  });

  it('hybrid fast-path routes standard patterns to deterministic template', async () => {
    const out = await generateInterfaceFromPrompt('build a modern pricing grid with monthly toggle', { mode: 'hybrid' });
    expect(out.provider).toBe('hybrid-fastpath (Deterministic Template Engine)');
    expect(out.schema.pattern).toBe('pricing');
    expect(out.schema.strategy).toBe('grid');
  });

  it('hybrid slow-path routes custom pattern to AI agent orchestrator', async () => {
    const out = await generateInterfaceFromPrompt('build a custom futuristic holographic audio synthesizer', { mode: 'hybrid' });
    expect(out.provider).toContain('hybrid-slowpath');
    expect(out.schema.pattern).toBe('custom');
    expect(out.schema.strategy).toBe('ai-assisted');
  });
});
