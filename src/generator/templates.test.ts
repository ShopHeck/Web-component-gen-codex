import { describe, expect, it } from 'vitest';
import { PROMPT_TEMPLATES, resolveTemplatePrompt } from './templates';
import { buildSchema } from './parser';

describe('prompt template regressions', () => {
  it('exports prompt templates including modern dashboard examples', () => {
    expect(PROMPT_TEMPLATES.length).toBeGreaterThan(2);
    expect(PROMPT_TEMPLATES.some((t) => t.category === 'dashboard')).toBe(true);
    expect(PROMPT_TEMPLATES.some((t) => t.name.includes('AI Pricing'))).toBe(true);
  });

  it('resolves template prompt deterministically', () => {
    const prompt = resolveTemplatePrompt('pricing-ai-studio', { tone: 'modern', product: 'InterfaceForge' }, 'studio');
    expect(prompt).toContain('modern pricing component');
    expect(prompt).toContain('InterfaceForge');
    expect(prompt).toContain('micro-interactions');
  });

  it('dashboard template generates dashboard schema blocks', () => {
    const prompt = resolveTemplatePrompt('saas-analytics-dashboard', { tone: 'minimal', product: 'DataDash' }) as string;
    const schema = buildSchema(prompt);
    expect(schema.pattern).toBe('dashboard');
    expect(schema.blocks.some((b) => b.type === 'metricGrid' || b.type === 'activityFeed')).toBe(true);
  });

  it('3D spatial audio workspace generates spatial audio blocks', () => {
    const prompt = resolveTemplatePrompt('3d-audio-workspace', { tone: 'cinematic', product: 'SynthDesk' }) as string;
    const schema = buildSchema(prompt);
    expect(schema.pattern).toBe('visualization');
    expect(schema.blocks.some((b) => b.type === 'audioVisualizer3D')).toBe(true);
    expect(schema.blocks.some((b) => b.type === 'frequencyControls')).toBe(true);
  });

  it('cybersecurity threat intel template generates threat radar blocks', () => {
    const prompt = resolveTemplatePrompt('cybersecurity-threat-intel', { tone: 'studio', product: 'ThreatShield' }) as string;
    const schema = buildSchema(prompt);
    expect(schema.pattern).toBe('dashboard');
    expect(schema.blocks.some((b) => b.type === 'threatRadar')).toBe(true);
  });
});

