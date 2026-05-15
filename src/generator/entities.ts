export type Span = { start: number; end: number; text: string; reason: string; source?: string };
export type Segment = { text: string; start: number; end: number; kind: 'sentence' | 'phrase' };
export type TokenSpan = { text: string; start: number; end: number };
export type EntityPack = { prices: Span[]; ctas: Span[]; sections: Span[]; metrics: Span[]; fields: Span[]; all: Span[] };

export type NormalizedPrompt = {
  original: string;
  normalized: string;
  segments: Segment[];
  tokens: TokenSpan[];
};

const CTA_FALLBACK = ['launch', 'save', 'send', 'purchase', 'book', 'continue', 'start', 'upgrade', 'try'];

export function normalizePrompt(prompt: string): NormalizedPrompt {
  const normalized = prompt.toLowerCase().replace(/\s+/g, ' ').trim();
  const segments: Segment[] = [];
  const sentenceRegex = /[^.!?]+[.!?]?/g;
  for (const m of prompt.matchAll(sentenceRegex)) {
    const text = (m[0] || '').trim();
    if (!text) continue;
    const start = m.index || 0;
    segments.push({ text, start, end: start + text.length, kind: 'sentence' });
    const phraseParts = text.split(/[;:]/).map((x) => x.trim()).filter(Boolean);
    let cursor = 0;
    for (const part of phraseParts) {
      const offset = text.indexOf(part, cursor);
      cursor = Math.max(cursor, offset + part.length);
      segments.push({ text: part, start: start + offset, end: start + offset + part.length, kind: 'phrase' });
    }
  }
  const tokens: TokenSpan[] = [];
  for (const m of prompt.matchAll(/\b[\w$%.\/x:+-]+\b/g)) {
    tokens.push({ text: m[0], start: m.index || 0, end: (m.index || 0) + m[0].length });
  }
  return { original: prompt, normalized, segments, tokens };
}

function extractPrices(prompt: string): Span[] {
  return [...prompt.matchAll(/\$\s?\d[\d,]*(?:\.\d+)?(?:\s?\/\s?(?:month|mo|year|yr|week|day))?/gi)].map((m) => ({
    start: m.index || 0,
    end: (m.index || 0) + m[0].length,
    text: m[0].replace(/\s+/g, ''),
    reason: 'price',
    source: 'currency_extractor'
  }));
}

function extractMetrics(prompt: string): Span[] {
  const matches = [...prompt.matchAll(/\b\d+(?:\.\d+)?%\b|\b\d+(?:\.\d+)?x\b|\b\d+\s*:\s*\d+\b|\b\d+\b/gi)].map((m) => ({
    start: m.index || 0,
    end: (m.index || 0) + m[0].length,
    text: m[0],
    reason: 'metric',
    source: 'metric_extractor'
  }));
  return matches.filter((m) => !m.text.startsWith('$'));
}

function extractCtas(prompt: string): Span[] {
  const verbPhrase = [...prompt.matchAll(/\b(?:launch|save|send|purchase|book|continue|start|upgrade|try)\b[^.,;]*/gi)].map((m) => ({
    start: m.index || 0,
    end: (m.index || 0) + m[0].length,
    text: m[0].trim(),
    reason: 'cta_verb_phrase',
    source: 'cta_extractor'
  }));
  if (verbPhrase.length) return verbPhrase;
  const lower = prompt.toLowerCase();
  return CTA_FALLBACK.flatMap((verb) => {
    const idx = lower.indexOf(verb);
    return idx >= 0 ? [{ start: idx, end: idx + verb.length, text: verb, reason: 'cta_fallback', source: 'cta_extractor' }] : [];
  });
}

function extractFieldsAndSections(prompt: string): { sections: Span[]; fields: Span[] } {
  const sections: Span[] = [];
  const fields: Span[] = [];
  for (const m of prompt.matchAll(/(?:^|[\s,])(\w[\w\s-]{1,40})\s*:\s*([^.;]+)/g)) {
    const key = m[1].trim();
    const value = m[2].trim();
    const keyStart = (m.index || 0) + m[0].indexOf(key);
    const valueStart = (m.index || 0) + m[0].indexOf(value);
    sections.push({ start: keyStart, end: keyStart + key.length, text: key, reason: 'section_colon_key', source: 'field_section_extractor' });
    value.split(/,|\band\b/gi).map((x) => x.trim()).filter(Boolean).forEach((item) => {
      const itemStart = prompt.toLowerCase().indexOf(item.toLowerCase(), valueStart);
      fields.push({ start: itemStart, end: itemStart + item.length, text: item, reason: 'field_colon_value', source: 'field_section_extractor' });
    });
  }
  const listMatch = prompt.match(/(?:with|including|plus)\s+([^.]*)/i)?.[1] || '';
  listMatch.replace(/\band\b/gi, ',').split(',').map((x) => x.trim()).filter(Boolean).forEach((item) => {
    const start = prompt.toLowerCase().indexOf(item.toLowerCase());
    fields.push({ start, end: start + item.length, text: item, reason: 'field_list', source: 'field_section_extractor' });
  });
  return { sections, fields };
}

export function extractEntities(prompt: string): EntityPack {
  const prices = extractPrices(prompt);
  const metrics = extractMetrics(prompt);
  const ctas = extractCtas(prompt);
  const { sections, fields } = extractFieldsAndSections(prompt);
  const all = [...prices, ...metrics, ...ctas, ...sections, ...fields].sort((a, b) => a.start - b.start);
  return { prices, ctas, sections, metrics, fields, all };
}
