import { extractEntities, normalizePrompt, type EntityPack, type Span } from './entities';
import { extractDirectives, type Directive } from './directives';
import { validateMappings } from './validate';
import { synthesizeCopy, synthesizePlanDescriptions } from './copy';
import type { CtaBehavior, Pattern, Plan, RequirementBucket, RequirementStatus, Schema } from '../types/schema';


type DetectedPattern = { pattern: Pattern; scores: Record<Pattern, number>; reasons: Span[] };
type ParseIR = ReturnType<typeof normalizePrompt> & { pattern: DetectedPattern; entities: EntityPack; directives: Directive[] };

const patternKeywords: Record<Pattern, string[]> = { pricing: ['pricing', 'price', 'plans', 'tiers', 'subscription', 'billing'], dashboard: ['dashboard', 'cockpit', 'analytics', 'metrics', 'kpi', 'revenue'], settings: ['settings', 'preferences', 'toggles', 'security'], checkout: ['checkout', 'cart', 'payment', 'purchase'], chat: ['chat', 'messages', 'inbox', 'support'], calendar: ['calendar', 'booking', 'schedule', 'slots'], custom: [] };
const title = (s: string) => s.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
const has = (t: string, list: string[]) => list.some((x) => t.includes(x));
const after = (s: string, p: string) => { const i = s.toLowerCase().indexOf(p); return i < 0 ? '' : s.slice(i + p.length).split(/[.,]/)[0].trim(); };

function detectPattern(prompt: string): DetectedPattern { const n = prompt.toLowerCase(); if (n.includes('custom')) return { pattern: 'custom', scores: { pricing: 0, dashboard: 0, settings: 0, checkout: 0, chat: 0, calendar: 0, custom: 10 }, reasons: [{ start: n.indexOf('custom'), end: n.indexOf('custom') + 6, text: 'custom', reason: 'keyword:custom', source: 'pattern_detector' }] };  const scores: Record<Pattern, number> = { pricing: 0, dashboard: 0, settings: 0, checkout: 0, chat: 0, calendar: 0, custom: 0 }; const reasons: Span[] = []; (Object.keys(patternKeywords) as Pattern[]).forEach((p) => { patternKeywords[p].forEach((kw) => { const idx = n.indexOf(kw); if (idx >= 0) { scores[p] += kw.length > 6 ? 2 : 1; reasons.push({ start: idx, end: idx + kw.length, text: kw, reason: `keyword:${p}`, source: 'pattern_detector' }); } }); }); const winner = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as Pattern) || 'custom'; return { pattern: scores[winner] > 0 ? winner : 'custom', scores, reasons }; }
function ctaBehaviorForPattern(p: Pattern): CtaBehavior {
  if (p === 'pricing') return 'select_plan';
  if (p === 'settings') return 'toggle_setting';
  if (p === 'chat') return 'send_chat';
  if (p === 'calendar') return 'select_slot';
  if (p === 'checkout') return 'checkout';
  return 'custom';
}
function product(p: string) { const c = after(p, 'called ') || after(p, 'named '); if (c) return title(c.split(' with ')[0].split(' for ')[0].split(' and ')[0]); return 'InterfaceForge'; }
function featuresFromIR(ir: ParseIR, prod: string) { const t = ir.normalized; const out: string[] = []; if (has(t, ['local', 'no backend', 'no api'])) out.push('Runs fully on-device'); if (t.includes('export')) out.push('Export-ready code package'); if (has(t, ['neural', 'glow'])) out.push('Neural glow states'); if (t.includes('interactive')) out.push('Interactive states'); ir.entities.fields.filter((x) => !x.text.startsWith('$') && x.text.length < 48).slice(0, 4).forEach((x) => out.push(title(x.text))); return [...new Set(out.length ? out : [`${prod} workflow`, 'Production JSX', 'Design tokens'])].slice(0, 8); }
export function makePlans(ir: ParseIR, prod: string, feats: string[]): Plan[] { const prices = [...new Set(ir.entities.prices.map((p) => p.text.replace(/\/mo\b/g, '/month').replace(/\/yr\b/g, '/year')))]; const count = Math.max(prices.length, 3); const names = ['Starter', 'Growth', 'Pro', 'Premium', 'Scale']; const lastPrice = prices[prices.length - 1]; const emphasizedPremium = ir.directives.some((d) => d.target === 'premium_plan' || d.target === 'final_card') || (Boolean(lastPrice) && ir.directives.some((d) => d.target === 'card') && ir.normalized.includes(lastPrice.toLowerCase()) && /stand out|highlight|glow|bevel|bigger|larger|scale/.test(ir.normalized)); const scaleDirective = [...ir.directives].reverse().find((d) => d.effect === 'scale'); const percentScale = ir.normalized.match(/(\d+(?:\.\d+)?)%/); const inferredScale = percentScale ? 1 + Number(percentScale[1]) / 100 : 1; const glowDirective = [...ir.directives].reverse().find((d) => d.effect === 'glow'); const inferredGlow = ir.normalized.includes('subtle glow') ? 'subtle' : 'none'; const bevelDirective = [...ir.directives].reverse().find((d) => d.effect === 'bevel'); const idx = emphasizedPremium ? count - 1 : Math.min(1, count - 1); return Array.from({ length: count }).map((_, i) => ({ name: names[i] || `Plan ${i + 1}`, price: prices[i] || `$${(i + 1) * 49}/month`, annual: prices[i]?.replace('/month', '/year') || `$${(i + 1) * 490}/year`, description: i === count - 1 ? 'The most complete package for high-volume teams.' : i === 0 ? `Essential tools to start with ${prod}.` : 'More polish, power, and export control.', features: [feats[i % feats.length], i % 2 ? 'Advanced export states' : 'Responsive card layout', i === count - 1 ? 'Premium CTA treatment' : 'Production-ready source'], visual: { featured: i === idx, scale: i === idx ? (typeof scaleDirective?.magnitude === 'number' ? scaleDirective.magnitude as number : inferredScale) : 1, glow: i === idx ? (ir.normalized.includes('subtle glow') ? 'subtle' : String(glowDirective?.magnitude || inferredGlow)) : 'none', bevel: i === idx ? (ir.normalized.includes('bevel') ? 'medium' : String(bevelDirective?.magnitude || 'none')) : 'none', badge: i === idx ? 'Premium pick' : undefined } })); }

export function buildSchema(prompt: string): Schema {
  const normalized = normalizePrompt(prompt);
  const ir: ParseIR = { ...normalized, pattern: detectPattern(prompt), entities: extractEntities(prompt), directives: extractDirectives(prompt) };
  const pat = ir.pattern.pattern;
  const prod = product(prompt);
  const feats = featuresFromIR(ir, prod);
  const plans = pat === 'pricing' ? synthesizePlanDescriptions(makePlans(ir, prod, feats), prod, ir.original) : [];
  const copy = synthesizeCopy({ ir, pattern: pat, product: prod, features: feats, plans });
  const cta = copy.action;

  const classifyBucket = (label: string, source: string): RequirementBucket => {
    const x = `${label} ${source}`.toLowerCase();
    if (x.includes('directive') || x.includes('glow') || x.includes('bevel') || x.includes('highlight') || x.includes('scale')) return 'visual_intent';
    if (x.includes('cta') || x.includes('action') || x.includes('purchase') || x.includes('launch') || x.includes('send')) return 'actions';
    if (x.includes('metric') || /\d/.test(label)) return 'metrics';
    if (x.includes('toggle') || x.includes('switch') || x.includes('control') || x.includes('field')) return 'controls';
    return 'content';
  };

  const baseRequirements = [
    ...ir.entities.fields.map((f) => ({ label: title(f.text), source: `field@${f.start}-${f.end}:${f.reason}:${f.source || 'n/a'}` })),
    ...ir.entities.sections.map((s) => ({ label: title(s.text), source: `section@${s.start}-${s.end}:${s.reason}:${s.source || 'n/a'}` })),
    ...ir.entities.metrics.map((v) => ({ label: v.text, source: `metric@${v.start}-${v.end}:${v.reason}:${v.source || 'n/a'}` })),
    ...ir.entities.prices.map((v) => ({ label: v.text, source: `value@${v.start}-${v.end}:${v.reason}:${v.source || 'n/a'}` })),
    ...ir.entities.ctas.map((c) => ({ label: title(c.text), source: `cta@${c.start}-${c.end}:${c.reason}:${c.source || 'n/a'}` })),
    ...ir.directives.map((d) => ({ label: `${d.target} ${d.effect} ${String(d.magnitude)}`, source: `directive@${d.span.start}-${d.span.end}:${d.reason}` })),
    { label: `${cta} CTA`, source: 'action' }
  ];

  const requirements = baseRequirements.map((r) => ({ ...r, bucket: classifyBucket(r.label, r.source), status: 'inspector' as RequirementStatus })).slice(0, 30);
  const density = requirements.length;
  const controlCount = requirements.filter((r) => r.bucket === 'controls').length;
  const customStrategy = controlCount > 4 ? 'panel-grid' : density > 12 ? 'split' : 'stacked';
  const custom = {
    header: requirements.filter((r) => r.bucket === 'content').slice(0, 3).map((r) => r.label),
    body: requirements.filter((r) => r.bucket === 'metrics' || r.bucket === 'content').slice(0, 8).map((r) => r.label),
    controls: requirements.filter((r) => r.bucket === 'controls').slice(0, 6).map((r) => r.label),
    ctas: [copy.sectionLabel, ...requirements.filter((r) => r.bucket === 'actions').slice(0, 2).map((r) => r.label)]
  };
  const renderedLabels = new Set([...custom.header, ...custom.body, ...custom.controls, ...custom.ctas, cta]);
  requirements.forEach((r) => { if (renderedLabels.has(r.label)) r.status = 'rendered'; });

  const schema: Schema = { pattern: pat, strategy: pat === 'pricing' ? 'grid' : pat === 'custom' ? customStrategy : 'composed', product: prod, headline: copy.headline, subhead: copy.subhead, action: cta, features: feats, plans, metrics: [{ label: 'Revenue', value: '$128k', delta: '+18%' }, { label: 'Users', value: '42k', delta: '+11%' }, { label: 'Health', value: '94%', delta: 'stable' }, { label: 'Exports', value: '212', delta: 'local' }], toggles: ir.entities.fields.length > 2 ? ir.entities.fields.slice(0, 6).map((f) => title(f.text)) : ['Private mode', 'Local exports', 'Telemetry off', 'Weekly digest'], messages: ['New request received', 'AI suggested reply prepared', 'Internal note ready'], slots: ['Tue 10:30', 'Wed 14:00', 'Thu 16:15', 'Fri 09:00'], lineItems: [{ label: prod, value: '$79.00' }, { label: 'Taxes and fees', value: '$8.20' }, { label: 'Total', value: '$87.20' }], requirements, directives: ir.directives.map((d) => `${d.target}:${d.effect}:${String(d.magnitude)}@${d.span.start}-${d.span.end}`), custom, interactive: { mode: pat === 'settings' ? 'multi' : 'single', ctaBehavior: ctaBehaviorForPattern(pat), localFeedbackMs: 1400, selectableItems: (pat === 'pricing' ? plans.map((p, i) => ({ id: `plan-${i}`, label: p.name, selected: Boolean(p.visual.featured), group: 'plans' })) : pat === 'settings' ? (ir.entities.fields.length > 2 ? ir.entities.fields.slice(0, 6).map((f, i) => ({ id: `toggle-${i}`, label: title(f.text), selected: i % 2 === 0, group: 'settings' })) : ['Private mode', 'Local exports', 'Telemetry off', 'Weekly digest'].map((t, i) => ({ id: `toggle-${i}`, label: t, selected: i % 2 === 0, group: 'settings' }))) : pat === 'calendar' ? ['Tue 10:30', 'Wed 14:00', 'Thu 16:15', 'Fri 09:00'].map((s, i) => ({ id: `slot-${i}`, label: s, selected: i === 0, group: 'slots' })) : pat === 'custom' ? custom.controls.map((control, i) => ({ id: `custom-control-${i}`, label: control, selected: i === 0, group: 'custom-controls' })) : []) } };

  const unmapped = validateMappings(ir.entities.all, schema);
  schema.requirements.push(...unmapped.map((u) => ({ label: `UNMAPPED ${u.label}`, source: `validation:${u.source}:${u.reason}`, bucket: classifyBucket(u.label, u.source), status: 'unmapped' as RequirementStatus })));
  return schema;
}
