import { describe, expect, it } from 'vitest';
import { generateInterfaceFromPrompt, mockProvider, validateAISchemaContract } from './generateInterface';

describe('AI assist adapter', () => {
  it('validates and sanitizes contract shape', () => {
    const warnings = validateAISchemaContract({ title: '', intent: 'x', blocks: [{ type: 'pricingCards' as any }], components: [], interactions: [], styleDirectives: [], requirements: [], warnings: [] });
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
});
