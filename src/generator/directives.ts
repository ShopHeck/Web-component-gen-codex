import type { Span } from './entities';

export type DirectiveTarget = 'final_card' | 'premium_plan' | 'card' | 'header' | 'body' | 'controls' | 'cta_area' | 'unknown';
export type DirectiveEffect = 'scale' | 'glow' | 'bevel' | 'highlight' | 'emphasis';
export type Directive = {
  raw: string;
  target: DirectiveTarget;
  effect: DirectiveEffect;
  magnitude: number | string;
  span: Span;
  reason: string;
};

const magnitudeWords = ['subtle', 'medium', 'strong'] as const;

function resolveTarget(text: string): DirectiveTarget {
  if (/final\s+card|last\s+card/.test(text)) return 'final_card';
  if (/premium\s+plan|pro\s+plan/.test(text)) return 'premium_plan';
  if (/\b\d+(st|nd|rd|th)\s+card\b/.test(text) || /\bnamed\s+\w+\s+plan\b/.test(text)) return 'card';
  if (/\bcard\b/.test(text)) return 'card';
  if (/\bheader|hero|title\b/.test(text)) return 'header';
  if (/\bbody|content|section\b/.test(text)) return 'body';
  if (/\bcontrols?|toggle|switch|input\b/.test(text)) return 'controls';
  if (/\bcta|button|action\b/.test(text)) return 'cta_area';
  return 'unknown';
}

function parseMagnitude(text: string): number | string {
  const pct = text.match(/(\d+(?:\.\d+)?)%/);
  if (pct) return 1 + Number(pct[1]) / 100;
  const ratio = text.match(/(\d+(?:\.\d+)?)x/i);
  if (ratio) return Number(ratio[1]);
  for (const word of magnitudeWords) if (text.includes(word)) return word;
  return 'medium';
}

export function extractDirectives(prompt: string): Directive[] {
  const lower = prompt.toLowerCase();
  const hits: Directive[] = [];
  const directiveRegex = /(final\s+card|premium|\d+(?:st|nd|rd|th)\s+card|named\s+\w+\s+plan|card)?[^.\n,;]*(scale|size|glow|bevel|highlight|emphasis|stand out|bigger|larger)[^.\n]*/gi;
  for (const m of prompt.matchAll(directiveRegex)) {
    const raw = (m[0] || '').trim();
    if (!raw) continue;
    const effectRaw = (m[2] || '').toLowerCase();
    const effect: DirectiveEffect = effectRaw === 'stand out' ? 'highlight' : effectRaw === 'bigger' || effectRaw === 'larger' || effectRaw === 'size' ? 'scale' : (effectRaw as DirectiveEffect);
    const target = resolveTarget(raw.toLowerCase());
    const magnitude = parseMagnitude(raw.toLowerCase());
    const start = m.index || 0;
    hits.push({ raw, target, effect, magnitude, reason: 'directive_parser', span: { start, end: start + raw.length, text: raw, reason: 'directive_span', source: 'directive_parser' } });
  }
  if (lower.includes('premium plan') && !hits.some((h) => h.target === 'premium_plan')) {
    const i = lower.indexOf('premium plan');
    hits.push({ raw: 'premium plan', target: 'premium_plan', effect: 'highlight', magnitude: 1, reason: 'entity_link', span: { start: i, end: i + 12, text: 'premium plan', reason: 'directive_span', source: 'directive_parser' } });
  }
  return hits;
}
