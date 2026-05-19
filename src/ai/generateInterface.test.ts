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

  it('mock provider supports representative prompts', async () => {
    const prompts = [
      'interactive kanban board with subtle active glow',
      'CRM customer table with filters and status badges',
      'onboarding wizard with progress steps',
      'product analytics dashboard with KPI cards and activity feed',
      'timeline roadmap with milestones and launch CTA'
    ];
    for (const prompt of prompts) {
      const out = await mockProvider.generateFromPrompt(prompt);
      expect(out.blocks.length).toBeGreaterThan(0);
      expect(out.title.length).toBeGreaterThan(0);
    }
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


  it('honors mock mode even when a non-mock provider is passed', async () => {
    let providerCalled = false;
    const out = await generateInterfaceFromPrompt('build an interactive kanban board', {
      mode: 'mock',
      provider: {
        id: 'remote-provider',
        generateFromPrompt: async () => {
          providerCalled = true;
          return mockProvider.generateFromPrompt('should not be called');
        }
      }
    });

    expect(providerCalled).toBe(false);
    expect(out.provider).toBe('mock');
  });

  it('falls back to local mode when provider fails', async () => {
    const out = await generateInterfaceFromPrompt('custom interface for fallback', {
      mode: 'provider',
      provider: { id: 'broken', generateFromPrompt: async () => { throw new Error('nope'); } }
    });
    expect(out.provider).toContain('fallback');
    expect(out.warnings).toContain('fallback_used');
    expect(out.schema.blocks.length).toBeGreaterThan(0);
  });
});
