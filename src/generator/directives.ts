import type { Span } from './entities';

export type DirectiveTarget = 'final_card' | 'premium_plan' | 'card' | 'header' | 'body' | 'controls' | 'cta_area' | 'visualization' | 'unknown';
export type DirectiveEffect = 'scale' | 'glow' | 'bevel' | 'highlight' | 'emphasis' | 'motion' | 'state' | 'theme' | 'hierarchy';
export type Directive = {
  raw: string;
  target: DirectiveTarget;
  effect: DirectiveEffect;
  magnitude: number | string;
  span: Span;
  reason: string;
};

const magnitudeWords = ['subtle', 'medium', 'strong', 'fast', 'slow', 'dense', 'compact'] as const;

function resolveTarget(text: string): DirectiveTarget {
  if (/final\s+card|last\s+card/.test(text)) return 'final_card';
  if (/premium\s+plan|pro\s+plan/.test(text)) return 'premium_plan';
  if (/\b\d+(st|nd|rd|th)\s+card\b/.test(text) || /\bnamed\s+\w+\s+plan\b/.test(text)) return 'card';
  if (/\bcard\b/.test(text)) return 'card';
  if (/\bheader|hero|title\b/.test(text)) return 'header';
  if (/\bbody|content|section\b/.test(text)) return 'body';
  if (/\bcontrols?|toggle|switch|input\b/.test(text)) return 'controls';
  if (/\bcta|button|action\b/.test(text)) return 'cta_area';
  if (/\bglobe|map|marker|visualization|scene\b/.test(text)) return 'visualization';
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

function normalizeEffect(raw: string): DirectiveEffect {
  const effectRaw = raw.toLowerCase();
  if (['stand out', 'spotlight'].includes(effectRaw)) return 'highlight';
  if (['bigger', 'larger', 'size', 'dominant'].includes(effectRaw)) return 'scale';
  if (/animate|motion|stagger|orbit|parallax|spring|hover/.test(effectRaw)) return 'motion';
  if (/loading|disabled|selected|error|success|empty\s*state/.test(effectRaw)) return 'state';
  if (/glass|neumorphism|minimal|retro|theme/.test(effectRaw)) return 'theme';
  if (/sticky|hierarchy|priority|emphasis/.test(effectRaw)) return 'hierarchy';
  return effectRaw as DirectiveEffect;
}

export function extractDirectives(prompt: string): Directive[] {
  const lower = prompt.toLowerCase();
  const hits: Directive[] = [];
  const directiveRegex = /(final\s+card|premium|\d+(?:st|nd|rd|th)\s+card|named\s+\w+\s+plan|card|hero|header|cta|button|globe|map)?[^.\n,;]*(scale|size|glow|bevel|highlight|emphasis|stand out|bigger|larger|animate|motion|stagger|orbit|parallax|spring|hover|loading|disabled|selected|error|success|glass|neumorphism|minimal|theme|sticky|hierarchy|priority)[^.\n]*/gi;
  for (const m of prompt.matchAll(directiveRegex)) {
    const raw = (m[0] || '').trim();
    if (!raw) continue;
    const effect = normalizeEffect((m[2] || '').toLowerCase());
    const target = resolveTarget(raw.toLowerCase());
    const magnitude = parseMagnitude(raw.toLowerCase());
    const start = m.index || 0;
    hits.push({ raw, target, effect, magnitude, reason: 'directive_parser', span: { start, end: start + raw.length, text: raw, reason: 'directive_span', source: 'directive_parser' } });
  }
  if (/\bglow\b/.test(lower) && !hits.some((h) => h.effect === 'glow')) {
    const i = lower.indexOf('glow');
    hits.push({ raw: 'glow', target: 'unknown', effect: 'glow', magnitude: parseMagnitude(lower), reason: 'keyword_fallback', span: { start: i, end: i + 4, text: 'glow', reason: 'directive_span', source: 'directive_parser' } });
  }
  if (lower.includes('premium plan') && !hits.some((h) => h.target === 'premium_plan')) {
    const i = lower.indexOf('premium plan');
    hits.push({ raw: 'premium plan', target: 'premium_plan', effect: 'highlight', magnitude: 1, reason: 'entity_link', span: { start: i, end: i + 12, text: 'premium plan', reason: 'directive_span', source: 'directive_parser' } });
  }
  return hits;
}
