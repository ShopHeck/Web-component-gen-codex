import { describe, expect, it } from 'vitest';
import { PROMPT_TEMPLATES, resolveTemplatePrompt } from './templates';
import { buildSchema } from './parser';

describe('prompt template regressions', () => {
  it('exports prompt templates including visualization examples', () => {
    expect(PROMPT_TEMPLATES.length).toBeGreaterThan(2);
    expect(PROMPT_TEMPLATES.some((t) => t.category === 'visualization')).toBe(true);
    expect(PROMPT_TEMPLATES.some((t) => t.name.includes('AI Pricing'))).toBe(true);
  });

  it('resolves template prompt deterministically', () => {
    const prompt = resolveTemplatePrompt('pricing-ai-studio', { tone: 'modern', product: 'InterfaceForge' }, 'studio');
    expect(prompt).toContain('modern pricing component');
    expect(prompt).toContain('InterfaceForge');
    expect(prompt).toContain('micro-interactions');
  });

  it('visualization template generates visualization schema blocks', () => {
    const prompt = resolveTemplatePrompt('globe-ops-board', { style: 'neural', subject: 'global readiness' }) as string;
    const schema = buildSchema(prompt);
    expect(schema.pattern).toBe('visualization');
    expect(schema.blocks.some((b) => b.type === 'globeVisualization' || b.type === 'mapVisualization')).toBe(true);
  });
});
