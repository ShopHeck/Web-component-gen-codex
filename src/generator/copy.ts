import type { Directive } from './directives';
import type { EntityPack, NormalizedPrompt, Span } from './entities';
import type { Pattern, Plan } from './parser';

export type ActionIntent = 'launch' | 'save' | 'send' | 'purchase' | 'book' | 'choose_plan' | 'continue';

type ParseLike = NormalizedPrompt & { pattern: { pattern: Pattern }; entities: EntityPack; directives: Directive[] };

type CopyTemplates = {
  headline: string;
  subhead: string;
  sectionLabel: string;
  button: string;
};

const COPY_TEMPLATES: Record<Pattern, CopyTemplates> = {
  pricing: {
    headline: '{product} pricing for focused teams',
    subhead: '{tierCount} plans from {firstPrice} with {featureBlend}.',
    sectionLabel: 'Plans and packaging',
    button: 'Choose plan'
  },
  dashboard: {
    headline: '{product} performance at a glance',
    subhead: 'Track {metricFocus} and keep every update actionable.',
    sectionLabel: 'Live performance',
    button: 'View details'
  },
  settings: {
    headline: '{product} controls for reliable operations',
    subhead: 'Tune {controlFocus} with safe defaults and fast feedback.',
    sectionLabel: 'Configuration',
    button: 'Save settings'
  },
  checkout: {
    headline: '{product} checkout with clear confirmation',
    subhead: 'Review items, totals, and trust signals before finishing.',
    sectionLabel: 'Order summary',
    button: 'Complete purchase'
  },
  chat: {
    headline: '{product} inbox for faster support replies',
    subhead: 'Prioritize conversations and respond with context.',
    sectionLabel: 'Conversations',
    button: 'Send reply'
  },
  calendar: {
    headline: '{product} scheduling with fewer conflicts',
    subhead: 'Offer available slots and confirm sessions in one flow.',
    sectionLabel: 'Available times',
    button: 'Book session'
  },
  custom: {
    headline: '{product} interface blueprint',
    subhead: 'Assemble sections, controls, and actions into one clear flow.',
    sectionLabel: 'Highlights',
    button: 'Continue'
  }
};

const INTENT_TEXT: Record<ActionIntent, string> = {
  launch: 'Launch now',
  save: 'Save settings',
  send: 'Send reply',
  purchase: 'Complete purchase',
  book: 'Book session',
  choose_plan: 'Choose plan',
  continue: 'Continue'
};

const normalizeCase = (text: string) => text.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const titleCase = (text: string) => normalizeCase(text).split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');

function ngrams(text: string, size = 4): Set<string> {
  const cleaned = normalizeCase(text).replace(/[^a-z0-9 ]/g, '');
  const grams = new Set<string>();
  if (cleaned.length <= size) {
    grams.add(cleaned);
    return grams;
  }
  for (let i = 0; i <= cleaned.length - size; i += 1) grams.add(cleaned.slice(i, i + size));
  return grams;
}

function similarity(a: string, b: string): number {
  const ga = ngrams(a);
  const gb = ngrams(b);
  const intersect = [...ga].filter((x) => gb.has(x)).length;
  const union = new Set([...ga, ...gb]).size;
  return union === 0 ? 0 : intersect / union;
}

function isTooCloseToPrompt(text: string, prompt: string): boolean {
  const cleaned = normalizeCase(text);
  if (cleaned.length >= 36 && normalizeCase(prompt).includes(cleaned)) return true;
  return similarity(cleaned, prompt) >= 0.78;
}

function sanitizeVisible(text: string, prompt: string, fallback: string): string {
  const cleaned = text.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (isTooCloseToPrompt(cleaned, prompt)) return fallback;
  return cleaned;
}

function inferIntent(spans: Span[], pattern: Pattern): ActionIntent {
  const raw = spans.map((s) => normalizeCase(s.text)).join(' ');
  if (raw.includes('launch') || raw.includes('start')) return 'launch';
  if (raw.includes('save')) return 'save';
  if (raw.includes('send') || raw.includes('reply')) return 'send';
  if (raw.includes('purchase') || raw.includes('checkout') || raw.includes('buy')) return 'purchase';
  if (raw.includes('book') || raw.includes('schedule')) return 'book';
  if (pattern === 'pricing') return 'choose_plan';
  return 'continue';
}

export function synthesizeCopy(args: {
  ir: ParseLike;
  product: string;
  pattern: Pattern;
  features: string[];
  plans: Plan[];
}): { headline: string; subhead: string; action: string; sectionLabel: string; intent: ActionIntent } {
  const { ir, pattern, product, plans, features } = args;
  const template = COPY_TEMPLATES[pattern];
  const intent = inferIntent(ir.entities.ctas, pattern);

  const metricFocus = titleCase(ir.entities.metrics[0]?.text || 'key metrics');
  const controlFocus = titleCase(ir.entities.fields[0]?.text || 'critical preferences');
  const featureBlend = features.slice(0, 2).map((f) => normalizeCase(f)).join(' and ') || 'clear packaging';
  const firstPrice = ir.entities.prices[0]?.text.replace('/mo', '/month').replace('/yr', '/year') || '$49/month';

  const rawHeadline = template.headline.replace('{product}', titleCase(product));
  const rawSubhead = template.subhead
    .replace('{tierCount}', String(plans.length || 3))
    .replace('{firstPrice}', firstPrice)
    .replace('{featureBlend}', featureBlend)
    .replace('{metricFocus}', metricFocus)
    .replace('{controlFocus}', controlFocus)
    .replace('{product}', titleCase(product));

  const actionFromIntent = INTENT_TEXT[intent] || template.button;
  return {
    headline: sanitizeVisible(rawHeadline, ir.original, `${titleCase(product)} interface`),
    subhead: sanitizeVisible(rawSubhead, ir.original, 'Designed for clarity, confidence, and fast decisions.'),
    action: sanitizeVisible(actionFromIntent, ir.original, template.button),
    sectionLabel: sanitizeVisible(template.sectionLabel, ir.original, 'Overview'),
    intent
  };
}

export function synthesizePlanDescriptions(plans: Plan[], product: string, prompt: string): Plan[] {
  return plans.map((plan, idx) => {
    const template = idx === plans.length - 1
      ? `Built for scaling ${titleCase(product)} across high-volume teams.`
      : idx === 0
        ? `Start quickly with essential ${titleCase(product)} capabilities.`
        : `Add more automation and control for growing teams.`;
    return { ...plan, description: sanitizeVisible(template, prompt, 'Balanced features for modern teams.') };
  });
}
