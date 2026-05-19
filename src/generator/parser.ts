import { extractEntities, normalizePrompt, type EntityPack, type Span } from './entities';
import { extractDirectives, type Directive } from './directives';
import { validateMappings, validateSchema } from './validate';
import { optimizePrompt } from './promptOptimizer';
import { buildIntentGraph } from './intentGraph';
import { synthesizeCopy, synthesizePlanDescriptions } from './copy';
import type { BlockType, ComponentAST, CtaBehavior, InterfaceBlock, Pattern, Plan, Requirement, RequirementBucket, RequirementStatus, Schema } from '../types/schema';


type DetectedPattern = { pattern: Pattern; scores: Record<Pattern, number>; reasons: Span[] };
type ParseIR = ReturnType<typeof normalizePrompt> & { pattern: DetectedPattern; entities: EntityPack; directives: Directive[] };

const patternKeywords: Record<Pattern, string[]> = { pricing: ['pricing', 'price', 'plans', 'tiers', 'subscription', 'billing'], dashboard: ['dashboard', 'cockpit', 'analytics', 'metrics', 'kpi', 'revenue', 'security', 'threat', 'cyber', 'attack', 'intrusion', 'firewall', 'radar'], settings: ['settings', 'preferences', 'toggles', 'security'], checkout: ['checkout', 'cart', 'payment', 'purchase'], chat: ['chat', 'messages', 'inbox', 'support'], calendar: ['calendar', 'booking', 'schedule', 'slots'], visualization: ['globe','map','marker','location','base','country','city','spinning','rotating','orbit','3d','geographic','latitude','longitude','visualization','diagram','timeline','audio','sound','spatial','frequency','hertz','decibel','waveform','synth','equalizer'], kanban: ['kanban', 'board', 'sprint', 'agile', 'tasks', 'columns'], onboarding: ['onboarding', 'wizard', 'step', 'setup', 'welcome'], editor: ['editor', 'code', 'ide', 'playground'], terminal: ['trading', 'terminal', 'crypto', 'stocks', 'exchange', 'ticker', 'candlestick'], social: ['social', 'instagram', 'twitter', 'tiktok', 'follower', 'engagement', 'post', 'dm', 'reach', 'impressions'], orchestrator: ['agent', 'pipeline', 'orchestrator', 'workflow', 'llm', 'token', 'prompt', 'automation', 'run', 'crew'], health: ['health', 'fitness', 'workout', 'calories', 'steps', 'hrv', 'exercise', 'goal', 'wellness'], admin: ['admin', 'tenant', 'multi-tenant', 'feature flag', 'mrr', 'audit', 'saas admin', 'user management'], custom: [] };
const title = (s: string) => s.split(' ').filter(Boolean).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsKeyword = (text: string, keyword: string) => new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i').test(text);
const has = (t: string, list: string[]) => list.some((x) => containsKeyword(t, x));
const after = (s: string, p: string) => { const i = s.toLowerCase().indexOf(p); return i < 0 ? '' : s.slice(i + p.length).split(/[.,]/)[0].trim(); };

function detectPattern(prompt: string): DetectedPattern { const n = prompt.toLowerCase(); if (n.includes('custom')) return { pattern: 'custom', scores: { pricing: 0, dashboard: 0, settings: 0, checkout: 0, chat: 0, calendar: 0, visualization: 0, kanban: 0, onboarding: 0, editor: 0, terminal: 0, social: 0, orchestrator: 0, health: 0, admin: 0, custom: 10 }, reasons: [{ start: n.indexOf('custom'), end: n.indexOf('custom') + 6, text: 'custom', reason: 'keyword:custom', source: 'pattern_detector' }] };  const scores: Record<Pattern, number> = { pricing: 0, dashboard: 0, settings: 0, checkout: 0, chat: 0, calendar: 0, visualization: 0, kanban: 0, onboarding: 0, editor: 0, terminal: 0, social: 0, orchestrator: 0, health: 0, admin: 0, custom: 0 }; const reasons: Span[] = []; (Object.keys(patternKeywords) as Pattern[]).forEach((p) => { patternKeywords[p].forEach((kw) => { const match = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'g').exec(n); if (match) { const idx = match.index; scores[p] += kw.length > 6 ? 2 : 1; reasons.push({ start: idx, end: idx + kw.length, text: kw, reason: `keyword:${p}`, source: 'pattern_detector' }); } }); }); const winner = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as Pattern) || 'custom'; return { pattern: scores[winner] > 0 ? winner : 'custom', scores, reasons }; }
function ctaBehaviorForPattern(p: Pattern): CtaBehavior {
  if (p === 'pricing') return 'select_plan';
  if (p === 'settings' || p === 'admin') return 'toggle_setting';
  if (p === 'chat' || p === 'social') return 'send_chat';
  if (p === 'calendar') return 'select_slot';
  if (p === 'checkout') return 'checkout';
  return 'custom';
}

function detectAudience(text: string){ if(/enterprise|b2b|team|admin/.test(text)) return 'teams'; if(/developer|engineer/.test(text)) return 'developers'; return 'general'; }
function detectTone(text: string){ if(/sleek|modern|minimal|clean/.test(text)) return 'modern'; if(/playful|fun/.test(text)) return 'playful'; return 'professional'; }
function detectLayoutIntent(pattern: Pattern, text: string){ if(/split/.test(text)) return 'split'; if(pattern==='pricing') return 'comparison-first'; if(pattern==='visualization') return 'immersive'; return 'stacked'; }
function block(type: BlockType, title?: string, items?: string[], data?: Record<string, unknown>): InterfaceBlock { return { type, title, items, data }; }


function visualizationMeta(text: string) {
  if (!/globe|map|marker|geographic|orbit|latitude|longitude|spinning|rotating/.test(text)) return undefined;
  return {
    visualObject: /globe/.test(text) ? 'globe' : /map/.test(text) ? 'map' : 'interactive visual object',
    animation: /slow spinning/.test(text) ? 'slow spinning' : /spinning|rotating|orbit/.test(text) ? 'rotating' : undefined,
    markerStyle: /glowing/.test(text) ? 'glowing' : undefined,
    markerSubject: /military base/.test(text) ? 'USA military bases' : /office locations/.test(text) ? 'office locations' : 'location markers',
    geographyScope: /usa|united states/.test(text) ? 'United States / USA' : /world/.test(text) ? 'World' : 'Regional',
    dataCompletenessIntent: /every|all|complete/.test(text) ? 'every existing base' : 'sample coverage',
    interactionIntent: /interactive/.test(text) ? 'interactive' : 'view only',
    datasetSource: 'bundled/static/local',
    datasetCompleteness: (/every|all|complete/.test(text) ? 'curated' : 'sample') as 'curated' | 'sample'
  };
}

function product(p: string) { const c = after(p, 'called ') || after(p, 'named '); if (c) return title(c.split(' with ')[0].split(' for ')[0].split(' and ')[0]); return 'InterfaceForge'; }
function featuresFromIR(ir: ParseIR, prod: string) { const t = ir.normalized; const out: string[] = []; if (has(t, ['local', 'no backend', 'no api'])) out.push('Runs fully on-device'); if (t.includes('export')) out.push('Export-ready code package'); if (has(t, ['neural', 'glow'])) out.push('Neural glow states'); if (t.includes('interactive')) out.push('Interactive states'); ir.entities.fields.filter((x) => !x.text.startsWith('$') && x.text.length < 48).slice(0, 4).forEach((x) => out.push(title(x.text))); return [...new Set(out.length ? out : [`${prod} workflow`, 'Production JSX', 'Design tokens'])].slice(0, 8); }
export function makePlans(ir: ParseIR, prod: string, feats: string[]): Plan[] {
  const prices = [...new Set(ir.entities.prices.map((p) => p.text.replace(/\/mo\b/g, '/month').replace(/\/yr\b/g, '/year')))];
  const count = Math.max(prices.length, 3);
  
  const defaultNames = ['Starter', 'Growth', 'Pro', 'Premium', 'Scale'];
  const extractedNames: string[] = [];

  // Words that are ignored when scanning text before a price for a plan name
  const ignored = new Set([
    'for', 'and', 'a', 'an', 'the', 'at', 'with', 'or', 'of', 'to', 'is', 'are',
    'pricing', 'called', 'named', 'plan', 'plans',
    // Time-unit words that appear inside or right after price strings
    'month', 'year', 'week', 'mo', 'yr',
    // Common adjectives that are never plan names
    'card', 'cards', 'tier', 'tiers', 'display', 'create', 'make', 'add',
    'sleek', 'modern', 'clean', 'local', 'first', 'interactive', 'premium',
  ]);

  // Sort prices by their position in the prompt to ensure correct mapping
  const sortedPrices = [...ir.entities.prices].sort((a, b) => a.start - b.start);

  sortedPrices.forEach((p) => {
    // Look at the 40 chars before the price token for a candidate name word
    const sub = ir.original.slice(Math.max(0, p.start - 40), p.start);
    const words = sub.replace(/[^a-zA-Z0-9]/g, ' ').split(/\s+/).map(w => w.trim()).filter(Boolean);

    // Only keep words that could plausibly be a plan name:
    //  - not in ignore list
    //  - not a pure number (e.g. "79", "129")
    //  - starts with an uppercase letter in the *original* substring (user explicitly capitalised it)
    const planNameWords = words.filter(w => {
      const lower = w.toLowerCase();
      if (ignored.has(lower)) return false;
      if (/^\d+$/.test(w)) return false;          // pure number
      // Must start with uppercase in the original to qualify as a proper name
      if (!/^[A-Z]/.test(w)) return false;
      return true;
    });

    if (planNameWords.length > 0) {
      const name = planNameWords[planNameWords.length - 1];
      if (name && !extractedNames.includes(name)) {
        extractedNames.push(name);
      }
    }
  });

  // Only use extracted names if we got a meaningful set (≥ half the plans named).
  // A partial extraction (e.g. 1 name out of 4 plans) would mix real names with
  // defaults in confusing ways — better to fall back to all defaults.
  const useExtractedNames = extractedNames.length >= Math.ceil(count / 2);

  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    if (useExtractedNames && extractedNames[i]) {
      names.push(extractedNames[i]);
    } else {
      const unusedDefault = defaultNames.find(dn => !names.includes(dn));
      names.push(unusedDefault || `Plan ${i + 1}`);
    }
  }

  const lastPrice = prices[prices.length - 1];
  const emphasizedPremium = ir.directives.some((d) => d.target === 'premium_plan' || d.target === 'final_card') || (Boolean(lastPrice) && ir.directives.some((d) => d.target === 'card') && ir.normalized.includes(lastPrice.toLowerCase()) && /stand out|highlight|glow|bevel|bigger|larger|scale/.test(ir.normalized));
  const scaleDirective = [...ir.directives].reverse().find((d) => d.effect === 'scale');
  const percentScale = ir.normalized.match(/(\d+(?:\.\d+)?)%/);
  const inferredScale = percentScale ? 1 + Number(percentScale[1]) / 100 : 1;
  const glowDirective = [...ir.directives].reverse().find((d) => d.effect === 'glow');
  const inferredGlow = ir.normalized.includes('subtle glow') ? 'subtle' : 'none';
  const bevelDirective = [...ir.directives].reverse().find((d) => d.effect === 'bevel');
  const idx = emphasizedPremium ? count - 1 : Math.min(1, count - 1);

  return Array.from({ length: count }).map((_, i) => ({
    name: names[i] || `Plan ${i + 1}`,
    price: prices[i] || `$${(i + 1) * 49}/month`,
    annual: prices[i]?.replace('/month', '/year') || `$${(i + 1) * 490}/year`,
    description: i === count - 1 ? 'The most complete package for high-volume teams.' : i === 0 ? `Essential tools to start with ${prod}.` : 'More polish, power, and export control.',
    features: [feats[i % feats.length], i % 2 ? 'Advanced export states' : 'Responsive card layout', i === count - 1 ? 'Premium CTA treatment' : 'Production-ready source'],
    visual: {
      featured: i === idx,
      scale: i === idx ? (typeof scaleDirective?.magnitude === 'number' ? scaleDirective.magnitude as number : inferredScale) : 1,
      glow: i === idx ? (ir.normalized.includes('subtle glow') ? 'subtle' : String(glowDirective?.magnitude || inferredGlow)) : 'none',
      bevel: i === idx ? (ir.normalized.includes('bevel') ? 'medium' : String(bevelDirective?.magnitude || 'none')) : 'none',
      badge: i === idx ? 'Premium pick' : undefined
    }
  }));
}


export function buildSchema(prompt: string): Schema {
  const optimization = optimizePrompt(prompt);
  const graph = buildIntentGraph(prompt);

  // Intentionally normalize the raw user prompt, not optimized output,
  // to avoid injecting synthetic tokens into downstream intent/feature detection.
  const normalized = normalizePrompt(prompt);

  const ir: ParseIR = { ...normalized, pattern: detectPattern(prompt), entities: extractEntities(prompt), directives: extractDirectives(prompt) };
  const pat = ir.pattern.pattern;
  const prod = product(prompt);
  const feats = featuresFromIR(ir, prod);
  const plans = pat === 'pricing' ? synthesizePlanDescriptions(makePlans(ir, prod, feats), prod, ir.original) : [];
  const copy = synthesizeCopy({ ir, pattern: pat, product: prod, features: feats, plans });
  const cta = copy.action;
  const visMeta = visualizationMeta(ir.normalized);

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

  const requirements: Requirement[] = baseRequirements.map((r) => ({ ...r, bucket: classifyBucket(r.label, r.source), status: 'inspector' as RequirementStatus })).slice(0, 30);
  const density = requirements.length;
  const controlCount = requirements.filter((r) => r.bucket === 'controls').length;
  const customStrategy = controlCount > 4 ? 'panel-grid' : density > 12 ? 'split' : 'stacked';
  const custom = {
    header: requirements.filter((r) => r.bucket === 'content').slice(0, 3).map((r) => r.label),
    body: requirements.filter((r) => r.bucket === 'metrics' || r.bucket === 'content').slice(0, 8).map((r) => r.label),
    controls: requirements.filter((r) => r.bucket === 'controls').slice(0, 6).map((r) => r.label),
    ctas: [copy.sectionLabel, ...requirements.filter((r) => r.bucket === 'actions').slice(0, 2).map((r) => r.label)]
  };
  const blocks: InterfaceBlock[] = [block('hero', 'Hero', [copy.headline, copy.subhead])];
  if (pat === 'pricing') {
    if (/monthly|annual|yearly|billing/.test(ir.normalized)) blocks.push(block('billingToggle', 'Billing cadence', ['Monthly', 'Annual']));
    blocks.push(block('pricingCards', 'Plan cards', plans.map((p) => `${p.name} ${p.price}`)));
    if (/compare|comparison|matrix|feature table/.test(ir.normalized)) blocks.push(block('comparisonMatrix', 'Comparison matrix', plans.map((p) => p.name)));
    if (/enterprise|contact sales|sales/.test(ir.normalized)) blocks.push(block('enterpriseContact', 'Enterprise contact', ['Talk to sales']));
    if (plans.some((p) => p.visual.featured)) blocks.push(block('proofStrip', 'Featured plan', plans.filter((p) => p.visual.featured).map((p) => p.name)));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'dashboard') {
    if (/cyber|threat|security|intrusion|firewall|noc/i.test(ir.normalized)) {
      blocks.push(block('threatRadar', 'Tactical Threat Radar Sweep', ['Intrusion Vector Sector 4 · Hostile', 'Intrusion Vector Sector 1 · Warning', 'Intrusion Vector Sector 9 · Isolated']));
      blocks.push(block('metricGrid', 'Intrusion Telemetry Metrics', ['Attack rate: 14/min', 'Active intrusions: 2', 'Firewall posture: Strict Posture Enabled', 'Node isolation: Operational']));
      blocks.push(block('activityFeed', 'Threat Classification Log Feed', ['System: DEFCON 3 status initiated', 'Firewall: Automatic node isolation active', 'Audit: Intrusion sweep successfully completed']));
    } else {
      blocks.push(block('metricGrid', 'Metrics', custom.body));
      blocks.push(block('activityFeed', 'Activity', ['Recent events']));
    }
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'chat') {
    blocks.push(block('chatThread', 'Chat Thread', ['Message history']));
    blocks.push(block('controlsInteractions', 'Input Controls', custom.controls));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'checkout') {
    blocks.push(block('checkoutSummary', 'Order Summary', ['Item 1', 'Item 2']));
    blocks.push(block('billingToggle', 'Payment Method', ['Credit Card', 'PayPal']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'calendar') {
    blocks.push(block('calendarSlots', 'Time Slots', ['9:00 AM', '10:00 AM', '11:00 AM']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'visualization') {
    if (visMeta) {
      // Geographic/globe visualization path
      if ((visMeta?.visualObject || '').includes('globe')) blocks.push(block('globeVisualization', 'Globe visualization', ['Local rotating globe']));
      if ((visMeta?.visualObject || '').includes('map')) blocks.push(block('mapVisualization', 'Map visualization', ['Local map scene']));
      blocks.push(block('geoMarkerLayer', 'Geo marker layer', [visMeta?.markerSubject || 'Markers']));
      blocks.push(block('markerLegend', 'Marker legend', ['Marker styles by category']));
      blocks.push(block('animationControls', 'Animation controls', ['Pause rotation', 'Resume rotation']));
      blocks.push(block('datasetNotice', 'Dataset notice', ['Showing bundled public sample dataset. Replace dataset for complete coverage.']));
      blocks.push(block('dataCoverageBadge', 'Data coverage', [visMeta?.datasetCompleteness || 'sample']));
    } else if (/audio|sound|spatial|frequency|equalizer|synth|waveform|decibel/i.test(ir.normalized)) {
      // Override hero copy for spatial audio
      blocks[0] = block('hero', 'Hero', [`${prod} Spatial Audio Workspace`, 'Tactile audio node positioning, frequency spectral shaping, and transport controls.']);
      blocks.push(block('audioVisualizer3D', 'Spatial Audio Nodes (X/Y Panner Grid)', ['Node A (Vocals) · (45, -20)', 'Node B (Drums) · (-60, 10)', 'Node C (Synth) · (10, 80)']));
      blocks.push(block('frequencyControls', 'Equalizer Modulation Controls', ['Low Modulation: 0dB', 'Mid Modulation: -3dB', 'High Modulation: +4dB']));
      blocks.push(block('timelineControls', 'Timeline & Decibel Playback Meter', ['Playing · 01:24 / 03:00', 'L-Ch Meter: -12dB', 'R-Ch Meter: -10dB']));
    } else {
      // Abstract 3D data visualization path (non-geographic)
      blocks.push(block('dataVisualization', '3D Data Visualization', ['Scatter Matrix', 'Depth Layers', 'Live Data Points']));
      blocks.push(block('timelineControls', 'Timeline Scrubber', ['2020', '2021', '2022', '2023', '2024']));
    }
    blocks.push(block('ctaBand', 'Visualization action', [cta]));
  }
  if (pat === 'kanban') {
    blocks.push(block('kanbanBoard', 'Project Board', ['Backlog', 'In Progress', 'Done']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'terminal') {
    blocks.push(block('candlestickChart', 'Price Chart', ['BTC/USD', '1H']));
    blocks.push(block('orderBook', 'Order Book', ['Bids', 'Asks']));
    blocks.push(block('tradingControls', 'Execution', ['Buy', 'Sell']));
    blocks.push(block('tickerFeed', 'Live Ticker', ['Market updates']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'onboarding') {
    blocks.push(block('onboardingProgress', 'Progress', ['Step 1', 'Step 2', 'Step 3']));
    blocks.push(block('onboardingSteps', 'Onboarding Steps', ['Profile', 'Preferences', 'Connect']));
    blocks.push(block('ctaBand', 'Complete Onboarding', [cta]));
  }
  if (pat === 'editor') {
    blocks.push(block('codeEditor', 'Editor Pane', ['main.js', 'styles.css']));
    blocks.push(block('codePreview', 'Live Preview', ['Preview Window']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'social') {
    blocks.push(block('platformMetrics', 'Platform Metrics', ['Instagram +2.4k', 'Twitter +891', 'TikTok +5.1k', 'LinkedIn +312']));
    blocks.push(block('engagementChart', 'Engagement Trend', ['Likes', 'Comments', 'Shares', 'Saves']));
    blocks.push(block('socialFeed', 'Recent Posts', ['Latest post', 'Trending post', 'Scheduled post']));
    blocks.push(block('dmInbox', 'DM Inbox', ['New message from @user', 'Partnership inquiry', 'Collab request']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'orchestrator') {
    blocks.push(block('tokenCostGrid', 'Cost & Usage', ['$0.042 / run', '12,400 tokens', '94% success rate', '3 active agents']));
    blocks.push(block('agentPipeline', 'Agent Pipeline', ['Scrape → Analyze → Summarize → Post', 'Classify → Route → Respond', 'Monitor → Alert → Escalate']));
    blocks.push(block('agentLogFeed', 'Live Agent Log', ['[scraper] Fetched 48 pages', '[analyzer] Confidence: 0.91', '[summarizer] Output ready']));
    blocks.push(block('promptEditor', 'System Prompt Editor', ['You are a helpful agent...']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'health') {
    blocks.push(block('healthMetrics', 'Daily Metrics', ['2,150 cal', '8,742 steps', 'HRV 68ms', '7h 20m sleep']));
    blocks.push(block('workoutCalendar', 'Workout Schedule', ['Mon: Upper body', 'Wed: Cardio', 'Fri: Lower body', 'Sun: Active recovery']));
    blocks.push(block('healthTrend', 'Activity Trend', ['Steps', 'Calories', 'HRV', 'Weight']));
    blocks.push(block('goalTracker', 'Goal Tracker', ['10k steps · 87%', 'Weight target · 62%', 'Sleep 8h · 91%']));
    blocks.push(block('ctaBand', 'Log workout', [cta]));
  }
  if (pat === 'admin') {
    blocks.push(block('metricGrid', 'Platform Overview', ['MRR $42,800', 'Active Tenants 128', 'Churn 1.2%', 'Support Tickets 14']));
    blocks.push(block('tenantList', 'Tenants', ['Acme Corp · Pro · Active', 'Globex Inc · Enterprise · Active', 'Initech · Starter · Suspended']));
    blocks.push(block('featureFlagPanel', 'Feature Flags', ['AI Copilot', 'SSO Login', 'Advanced Export', 'Beta Dashboard']));
    blocks.push(block('billingOverview', 'Billing', ['MRR $42,800', 'Upcoming renewals 18', 'Failed payments 2']));
    blocks.push(block('auditLog', 'Audit Log', ['Admin login from 198.x.x.x', 'Feature flag toggled: AI Copilot', 'Tenant Acme suspended']));
    blocks.push(block('ctaBand', 'Primary action', [cta]));
  }
  if (pat === 'custom') {
    if (/onboarding|step/.test(ir.normalized)) blocks.push(block('onboardingSteps', 'Onboarding', requirements.filter((r) => /step|onboarding|setup|import/.test(r.label.toLowerCase())).map((r) => r.label)));
    else if (/console|dashboard|control/.test(ir.normalized)) { blocks.push(block('metricGrid', 'Metrics', custom.body)); blocks.push(block('settingsControls', 'Controls', custom.controls)); blocks.push(block('activityFeed', 'Activity', ['Recent events'])); }
    else blocks.push(block('customRequirementGrid', 'Requirement grid', custom.body));
    blocks.push(block('proofStrip', 'Proof', requirements.filter((r) => r.bucket === 'visual_intent').map((r) => r.label)));
    blocks.push(block('ctaBand', 'CTA', custom.ctas));
  }

  const renderedLabels = new Set([...custom.header, ...custom.body, ...custom.controls, ...custom.ctas, cta]);
  requirements.forEach((r) => { const hit = blocks.find((b) => (b.items || []).some((x) => x.toLowerCase().includes(r.label.toLowerCase()) || r.label.toLowerCase().includes(x.toLowerCase()))); if (hit) { r.status = 'rendered'; r.targetBlock = hit.type; return; } if (pat === 'pricing' && r.bucket === 'visual_intent') { r.status = 'rendered'; r.targetBlock = 'pricingCards'; } });

  const dynamicAST = buildDynamicAST(prompt, pat);

  const hasMotionIntent = graph.nodes.some(n => n.id === 'secondary-motion');
  const motionConfig = {
    preset: ir.directives.some(d => d.effect === 'spring') ? 'spring' : ir.directives.some(d => d.effect === 'parallax') ? 'parallax' : ir.directives.some(d => d.effect === 'fade') ? 'fade' : ir.directives.some(d => d.effect === 'slide') ? 'slide' : (hasMotionIntent ? 'fade' : 'default'),
    staggerMs: ir.directives.some(d => d.effect === 'stagger') ? (typeof ir.directives.find(d => d.effect === 'stagger')?.magnitude === 'number' ? ir.directives.find(d => d.effect === 'stagger')!.magnitude as number * 100 : 100) : (hasMotionIntent ? 50 : 0),
    springBounciness: ir.directives.some(d => d.effect === 'spring') ? 0.6 : (hasMotionIntent ? 0.3 : 0)
  };

  const schema: Schema = { pattern: pat, strategy: pat === 'pricing' ? 'grid' : pat === 'custom' ? customStrategy : 'composed', product: prod, audience: detectAudience(ir.normalized), toneStyle: detectTone(ir.normalized), layoutIntent: detectLayoutIntent(pat, ir.normalized), responsiveIntent: /mobile/.test(ir.normalized) || graph.nodes.some(n => n.id === 'constraint-responsive') ? 'mobile-first' : 'fluid', requirementMappingStatus: 'tracked', contentEntities: [...ir.entities.sections, ...ir.entities.fields].map((s) => s.text), valuesPricesMetrics: [...ir.entities.prices, ...ir.entities.metrics].map((s) => s.text), controlsInteractions: [...ir.entities.ctas, ...ir.entities.fields.filter((f) => /toggle|switch|control|setting/.test(f.text.toLowerCase()))].map((s) => s.text), visualDirectives: ir.directives.map((d) => `${d.target}:${d.effect}`), requiredSections: blocks.map((b) => b.type), blocks, headline: copy.headline, subhead: copy.subhead, action: cta, features: feats, plans, metrics: [{ label: 'Revenue', value: '$128k', delta: '+18%' }, { label: 'Users', value: '42k', delta: '+11%' }, { label: 'Health', value: '94%', delta: 'stable' }, { label: 'Exports', value: '212', delta: 'local' }], toggles: ir.entities.fields.length > 2 ? ir.entities.fields.slice(0, 6).map((f) => title(f.text)) : ['Private mode', 'Local exports', 'Telemetry off', 'Weekly digest'], messages: ['New request received', 'AI suggested reply prepared', 'Internal note ready'], slots: ['Tue 10:30', 'Wed 14:00', 'Thu 16:15', 'Fri 09:00'], lineItems: [{ label: prod, value: '$79.00' }, { label: 'Taxes and fees', value: '$8.20' }, { label: 'Total', value: '$87.20' }], requirements, directives: ir.directives.map((d) => `${d.target}:${d.effect}:${String(d.magnitude)}@${d.span.start}-${d.span.end}`), custom, interactive: { mode: pat === 'settings' ? 'multi' : 'single', ctaBehavior: ctaBehaviorForPattern(pat), localFeedbackMs: 1400, selectableItems: (pat === 'pricing' ? plans.map((p, i) => ({ id: `plan-${i}`, label: p.name, selected: Boolean(p.visual.featured), group: 'plans' })) : pat === 'settings' ? (ir.entities.fields.length > 2 ? ir.entities.fields.slice(0, 6).map((f, i) => ({ id: `toggle-${i}`, label: title(f.text), selected: i % 2 === 0, group: 'settings' })) : ['Private mode', 'Local exports', 'Telemetry off', 'Weekly digest'].map((t, i) => ({ id: `toggle-${i}`, label: t, selected: i % 2 === 0, group: 'settings' }))) : pat === 'calendar' ? ['Tue 10:30', 'Wed 14:00', 'Thu 16:15', 'Fri 09:00'].map((s, i) => ({ id: `slot-${i}`, label: s, selected: i === 0, group: 'slots' })) : pat === 'custom' ? custom.controls.map((control, i) => ({ id: `custom-control-${i}`, label: control, selected: i === 0, group: 'custom-controls' })) : pat === 'visualization' ? ['Pause rotation','Explore markers','Dataset notice'].map((label, i) => ({ id: `viz-control-${i}`, label, selected: i===0, group: 'visualization-controls' })) : []) }, visualization: visMeta, dynamicAST, motionConfig, generationMeta: { originalPrompt: optimization.original, optimizedPrompt: optimization.optimized, confidence: optimization.confidence, clarificationQuestions: optimization.clarificationQuestions, matchedTemplateId: optimization.matchedTemplateId, intentGraph: { primaryIntent: graph.primaryIntent, nodeCount: graph.nodes.length, secondaryIntents: graph.nodes.filter(n => n.kind === 'secondary').map(n => n.label) } }, };

  // Override headline/subhead for audio visualization path
  if (pat === 'visualization' && !visMeta && /audio|sound|spatial|frequency|equalizer|synth|waveform|decibel/i.test(ir.normalized)) {
    schema.headline = `${prod} Spatial Audio Workspace`;
    schema.subhead = 'Tactile audio node positioning, frequency spectral shaping, and transport controls.';
    schema.action = 'Export Master Mix';
  }

  const unmapped = validateMappings(ir.entities.all, schema);
  schema.requirements.push(...unmapped.map((u) => ({ label: `UNMAPPED ${u.label}`, source: `validation:${u.source}:${u.reason}`, bucket: classifyBucket(u.label, u.source), status: 'unmapped' as RequirementStatus })));
  
  validateSchema(schema);
  
  return schema;
}

function buildDynamicAST(prompt: string, pattern: Pattern): ComponentAST | undefined {
  const normalized = prompt.toLowerCase();
  const isCalculator = /calculator|formula|interest|loan|mortgage|amortization|investment|savings|compound|bmi|calorie|fitness|tip|split/.test(normalized);
  if (!isCalculator && pattern !== 'custom' && pattern !== 'kanban') return undefined;

  // Kanban Board
  if (pattern === 'kanban') {
    return {
      state: {
        columns: [
          { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research competitors' }, { id: 'c2', title: 'Design system' }] },
          { id: 'in-progress', title: 'In Progress', cards: [{ id: 'c3', title: 'Setup database' }] },
          { id: 'done', title: 'Done', cards: [{ id: 'c4', title: 'Initial commit' }] }
        ],
        activeCard: null
      },
      formulas: {},
      root: {
        type: 'kanban-board',
        className: 'w-full h-full'
      }
    };
  }
  // 1. Mortgage / Loan Calculator
  if (/mortgage|loan|amortization|payment/.test(normalized) || (!normalized.includes('interest') && !normalized.includes('bmi') && /calculator/.test(normalized))) {
    return {
      state: {
        principal: 300000,
        rate: 5.5,
        years: 30
      },
      formulas: {
        monthlyRate: "rate / 100 / 12",
        totalMonths: "years * 12",
        monthlyPayment: "(principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)",
        totalPayment: "monthlyPayment * totalMonths",
        totalInterest: "totalPayment - principal"
      },
      root: {
        type: 'div',
        className: 'dynamic-calculator bg-slate-950 text-slate-100 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-8 max-w-4xl mx-auto',
        children: [
          {
            type: 'div',
            className: 'flex flex-col gap-2 border-b border-slate-800 pb-6 text-left',
            children: [
              { type: 'h2', className: 'text-2xl font-bold text-teal-400', text: 'Smart Mortgage Calculator' },
              { type: 'p', className: 'text-slate-400 text-sm', text: 'Interactive on-device sandbox with dynamic reactive sliders & real-time formula evaluation.' }
            ]
          },
          {
            type: 'div',
            className: 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start',
            children: [
              // Left: Sliders
              {
                type: 'div',
                className: 'flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 text-left',
                children: [
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Loan Amount (Principal)' },
                          { type: 'span', className: 'text-teal-400 font-mono', text: '${{principal}}' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'principal',
                        props: { type: 'range', min: '50000', max: '1000000', step: '10000' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Annual Interest Rate' },
                          { type: 'span', className: 'text-teal-400 font-mono', text: '{{rate}}%' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'rate',
                        props: { type: 'range', min: '1', max: '15', step: '0.1' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Loan Term' },
                          { type: 'span', className: 'text-teal-400 font-mono', text: '{{years}} Years' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'years',
                        props: { type: 'range', min: '5', max: '40', step: '1' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500'
                      }
                    ]
                  }
                ]
              },
              // Right: Output Displays
              {
                type: 'div',
                className: 'flex flex-col gap-6 text-left',
                children: [
                  {
                    type: 'div',
                    className: 'bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-6 rounded-2xl border border-teal-500/20 shadow-lg flex flex-col gap-2 items-center text-center',
                    children: [
                      { type: 'span', className: 'text-slate-400 text-xs uppercase tracking-wider font-semibold', text: 'Monthly Payment' },
                      { type: 'span', className: 'text-4xl font-extrabold text-teal-400 font-mono', text: '${{monthlyPayment}}' }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'grid grid-cols-2 gap-4',
                    children: [
                      {
                        type: 'div',
                        className: 'bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-1',
                        children: [
                          { type: 'span', className: 'text-slate-400 text-xs', text: 'Total Interest' },
                          { type: 'span', className: 'text-lg font-bold text-slate-200 font-mono', text: '${{totalInterest}}' }
                        ]
                      },
                      {
                        type: 'div',
                        className: 'bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-1',
                        children: [
                          { type: 'span', className: 'text-slate-400 text-xs', text: 'Total Principal + Int' },
                          { type: 'span', className: 'text-lg font-bold text-slate-200 font-mono', text: '${{totalPayment}}' }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'div',
            className: 'flex justify-end gap-4 border-t border-slate-800 pt-6',
            children: [
              {
                type: 'button',
                action: 'reset',
                className: 'px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition',
                text: 'Reset Fields'
              }
            ]
          }
        ]
      }
    };
  }

  // 2. Compounding Savings Sandbox
  if (/compound|interest|savings|investment/.test(normalized)) {
    return {
      state: {
        principal: 10000,
        rate: 7,
        years: 15,
        contribution: 250
      },
      formulas: {
        r: "rate / 100",
        n: "12",
        totalContribution: "contribution * years * 12",
        totalPrincipal: "principal + totalContribution",
        futureValue: "principal * Math.pow(1 + r/n, n*years) + contribution * ((Math.pow(1 + r/n, n*years) - 1) / (r/n))",
        interestEarned: "futureValue - totalPrincipal"
      },
      root: {
        type: 'div',
        className: 'dynamic-calculator bg-slate-950 text-slate-100 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-8 max-w-4xl mx-auto',
        children: [
          {
            type: 'div',
            className: 'flex flex-col gap-2 border-b border-slate-800 pb-6 text-left',
            children: [
              { type: 'h2', className: 'text-2xl font-bold text-emerald-400', text: 'Compounding Investment Sandbox' },
              { type: 'p', className: 'text-slate-400 text-sm', text: 'Explore the compounding impact of initial deposits, yearly rates, and ongoing monthly additions.' }
            ]
          },
          {
            type: 'div',
            className: 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start',
            children: [
              {
                type: 'div',
                className: 'flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 text-left',
                children: [
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Initial Deposit' },
                          { type: 'span', className: 'text-emerald-400 font-mono', text: '${{principal}}' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'principal',
                        props: { type: 'range', min: '1000', max: '100000', step: '1000' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Monthly Contribution' },
                          { type: 'span', className: 'text-emerald-400 font-mono', text: '${{contribution}}/mo' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'contribution',
                        props: { type: 'range', min: '0', max: '2000', step: '50' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Annual Growth Rate' },
                          { type: 'span', className: 'text-emerald-400 font-mono', text: '{{rate}}%' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'rate',
                        props: { type: 'range', min: '1', max: '20', step: '0.5' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Compounding Term' },
                          { type: 'span', className: 'text-emerald-400 font-mono', text: '{{years}} Years' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'years',
                        props: { type: 'range', min: '1', max: '40', step: '1' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500'
                      }
                    ]
                  }
                ]
              },
              {
                type: 'div',
                className: 'flex flex-col gap-6 text-left',
                children: [
                  {
                    type: 'div',
                    className: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-6 rounded-2xl border border-emerald-500/20 shadow-lg flex flex-col gap-2 items-center text-center',
                    children: [
                      { type: 'span', className: 'text-slate-400 text-xs uppercase tracking-wider font-semibold', text: 'Projected Future Balance' },
                      { type: 'span', className: 'text-4xl font-extrabold text-emerald-400 font-mono', text: '${{futureValue}}' }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'grid grid-cols-2 gap-4',
                    children: [
                      {
                        type: 'div',
                        className: 'bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-1',
                        children: [
                          { type: 'span', className: 'text-slate-400 text-xs', text: 'Total Contributions' },
                          { type: 'span', className: 'text-lg font-bold text-slate-200 font-mono', text: '${{totalContribution}}' }
                        ]
                      },
                      {
                        type: 'div',
                        className: 'bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-1',
                        children: [
                          { type: 'span', className: 'text-slate-400 text-xs', text: 'Compound Interest' },
                          { type: 'span', className: 'text-lg font-bold text-slate-200 font-mono', text: '${{interestEarned}}' }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'div',
            className: 'flex justify-end gap-4 border-t border-slate-800 pt-6',
            children: [
              {
                type: 'button',
                action: 'reset',
                className: 'px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition',
                text: 'Reset Fields'
              }
            ]
          }
        ]
      }
    };
  }

  // 3. BMI & Calorie Calculator
  if (/bmi|calorie|fitness|health/.test(normalized)) {
    return {
      state: {
        weight: 70,
        height: 175,
        activity: 1.375
      },
      formulas: {
        bmi: "weight / Math.pow(height / 100, 2)",
        bmr: "10 * weight + 6.25 * height - 5 * 25 + 5",
        maintenanceCalories: "bmr * activity"
      },
      root: {
        type: 'div',
        className: 'dynamic-calculator bg-slate-950 text-slate-100 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-8 max-w-4xl mx-auto',
        children: [
          {
            type: 'div',
            className: 'flex flex-col gap-2 border-b border-slate-800 pb-6 text-left',
            children: [
              { type: 'h2', className: 'text-2xl font-bold text-orange-400', text: 'Interactive Fitness Calorie Engine' },
              { type: 'p', className: 'text-slate-400 text-sm', text: 'Real-time metabolic rate tracking, body mass indexing, and maintenance intake tuning.' }
            ]
          },
          {
            type: 'div',
            className: 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start',
            children: [
              {
                type: 'div',
                className: 'flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 text-left',
                children: [
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Body Weight' },
                          { type: 'span', className: 'text-orange-400 font-mono', text: '{{weight}} kg' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'weight',
                        props: { type: 'range', min: '40', max: '150', step: '1' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      {
                        type: 'div',
                        className: 'flex justify-between text-sm font-semibold',
                        children: [
                          { type: 'span', className: 'text-slate-300', text: 'Body Height' },
                          { type: 'span', className: 'text-orange-400 font-mono', text: '{{height}} cm' }
                        ]
                      },
                      {
                        type: 'input',
                        stateBinding: 'height',
                        props: { type: 'range', min: '120', max: '220', step: '1' },
                        className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500'
                      }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'flex flex-col gap-2',
                    children: [
                      { type: 'span', className: 'text-sm font-semibold text-slate-300', text: 'Daily Activity Level' },
                      {
                        type: 'select',
                        stateBinding: 'activity',
                        className: 'w-full p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl focus:border-orange-500 outline-none',
                        children: [
                          { type: 'option', props: { value: '1.2' }, text: 'Sedentary (desk job, no exercise)' },
                          { type: 'option', props: { value: '1.375' }, text: 'Lightly Active (light exercise 1-3 days/wk)' },
                          { type: 'option', props: { value: '1.55' }, text: 'Moderately Active (exercise 3-5 days/wk)' },
                          { type: 'option', props: { value: '1.725' }, text: 'Very Active (heavy exercise 6-7 days/wk)' }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                type: 'div',
                className: 'flex flex-col gap-6 text-left',
                children: [
                  {
                    type: 'div',
                    className: 'bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-6 rounded-2xl border border-orange-500/20 shadow-lg flex flex-col gap-2 items-center text-center',
                    children: [
                      { type: 'span', className: 'text-slate-400 text-xs uppercase tracking-wider font-semibold', text: 'Maintenance Intake' },
                      { type: 'span', className: 'text-4xl font-extrabold text-orange-400 font-mono', text: '{{maintenanceCalories}} kcal' },
                      { type: 'span', className: 'text-[10px] text-slate-500', text: 'Calculated using Harris-Benedict formulas' }
                    ]
                  },
                  {
                    type: 'div',
                    className: 'bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col gap-2 items-center text-center',
                    children: [
                      { type: 'span', className: 'text-slate-400 text-xs', text: 'Body Mass Index (BMI)' },
                      { type: 'span', className: 'text-2xl font-extrabold text-slate-200 font-mono', text: '{{bmi}}' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'div',
            className: 'flex justify-end gap-4 border-t border-slate-800 pt-6',
            children: [
              {
                type: 'button',
                action: 'reset',
                className: 'px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition',
                text: 'Reset Fields'
              }
            ]
          }
        ]
      }
    };
  }

  // 4. Default Custom interactive sandbox for custom pattern
  return {
    state: {
      factorA: 50,
      factorB: 5
    },
    formulas: {
      totalYield: "factorA * factorB * 12.8",
      efficiencyScore: "(factorA / 100) * (factorB * 15)"
    },
    root: {
      type: 'div',
      className: 'dynamic-calculator bg-slate-950 text-slate-100 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-8 max-w-4xl mx-auto',
      children: [
        {
          type: 'div',
          className: 'flex flex-col gap-2 border-b border-slate-800 pb-6 text-left',
          children: [
            { type: 'h2', className: 'text-2xl font-bold text-violet-400', text: 'Interactive Yield Estimator' },
            { type: 'p', className: 'text-slate-400 text-sm', text: 'Adjust key system variables to visualize continuous throughput and efficiency factors instantly.' }
          ]
        },
        {
          type: 'div',
          className: 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start',
          children: [
            {
              type: 'div',
              className: 'flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 text-left',
              children: [
                {
                  type: 'div',
                  className: 'flex flex-col gap-2',
                  children: [
                    {
                      type: 'div',
                      className: 'flex justify-between text-sm font-semibold',
                      children: [
                        { type: 'span', className: 'text-slate-300', text: 'Capacity Factor A' },
                        { type: 'span', className: 'text-violet-400 font-mono', text: '{{factorA}} units' }
                      ]
                    },
                    {
                      type: 'input',
                      stateBinding: 'factorA',
                      props: { type: 'range', min: '10', max: '200', step: '5' },
                      className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500'
                    }
                  ]
                },
                {
                  type: 'div',
                  className: 'flex flex-col gap-2',
                  children: [
                    {
                      type: 'div',
                      className: 'flex justify-between text-sm font-semibold',
                      children: [
                        { type: 'span', className: 'text-slate-300', text: 'Multiplier B' },
                        { type: 'span', className: 'text-violet-400 font-mono', text: '{{factorB}}x' }
                      ]
                    },
                    {
                      type: 'input',
                      stateBinding: 'factorB',
                      props: { type: 'range', min: '1', max: '10', step: '0.5' },
                      className: 'w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500'
                    }
                  ]
                }
              ]
            },
            {
              type: 'div',
              className: 'flex flex-col gap-6 text-left',
              children: [
                {
                  type: 'div',
                  className: 'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6 rounded-2xl border border-violet-500/20 shadow-lg flex flex-col gap-2 items-center text-center',
                  children: [
                    { type: 'span', className: 'text-slate-400 text-xs uppercase tracking-wider font-semibold', text: 'Estimated System Yield' },
                    { type: 'span', className: 'text-4xl font-extrabold text-violet-400 font-mono', text: '{{totalYield}} units' }
                  ]
                },
                {
                  type: 'div',
                  className: 'bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col gap-2 items-center text-center',
                  children: [
                    { type: 'span', className: 'text-slate-400 text-xs', text: 'Relative System Efficiency' },
                    { type: 'span', className: 'text-2xl font-extrabold text-slate-200 font-mono', text: '{{efficiencyScore}}%' }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'div',
          className: 'flex justify-end gap-4 border-t border-slate-800 pt-6',
          children: [
            {
              type: 'button',
              action: 'reset',
              className: 'px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition',
              text: 'Reset Fields'
            }
          ]
        }
      ]
    }
  };
}

