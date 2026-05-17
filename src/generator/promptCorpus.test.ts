import { describe, expect, it } from 'vitest';
import { buildSchema } from './parser';
import { evaluateQuality } from './quality';

type CorpusCase = {
  name: string;
  prompt: string;
  minOverall: number;
  minSelectable: number;
  requiredBlocks: string[];
};

const corpus: CorpusCase[] = [
  {
    name: 'pricing conversion prompt',
    prompt: 'Build a modern pricing component with monthly annual toggle, comparison matrix, featured premium card glow, and CTA.',
    minOverall: 70,
    minSelectable: 3,
    requiredBlocks: ['pricingCards', 'ctaBand']
  },
  {
    name: 'visualization prompt',
    prompt: 'Create an interactive globe with rotating animation, glowing location markers, and dataset notice.',
    minOverall: 68,
    minSelectable: 2,
    requiredBlocks: ['geoMarkerLayer', 'animationControls']
  },
  {
    name: 'custom onboarding prompt',
    prompt: 'Design a custom onboarding command center with setup steps, success states, invite teammates action, and mobile-first flow.',
    minOverall: 65,
    minSelectable: 1,
    requiredBlocks: ['ctaBand']
  }
];

describe('prompt corpus quality floors', () => {
  for (const c of corpus) {
    it(c.name, () => {
      const schema = buildSchema(c.prompt);
      const report = evaluateQuality(schema);
      expect(report.overallScore).toBeGreaterThanOrEqual(c.minOverall);
      expect(schema.interactive.selectableItems.length).toBeGreaterThanOrEqual(c.minSelectable);
      for (const block of c.requiredBlocks) expect(schema.blocks.some((b) => b.type === block)).toBe(true);
    });
  }
});
