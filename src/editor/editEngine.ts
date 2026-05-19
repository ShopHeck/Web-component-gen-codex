import type { BlockType, InterfaceBlock, Schema, Tokens } from '../types/schema';

export type SchemaPatchOp =
  | { op: 'set_headline'; value: string }
  | { op: 'set_subhead'; value: string }
  | { op: 'set_action'; value: string }
  | { op: 'add_block'; blockType: BlockType; title?: string; items?: string[] }
  | { op: 'remove_block'; blockType: BlockType }
  | { op: 'set_token'; token: keyof Tokens; value: string | number }
  | { op: 'set_layout'; layoutIntent: string }
  | { op: 'reorder_blocks'; order: BlockType[] }
  | { op: 'set_block_data'; blockType: BlockType; data: Record<string, unknown> }
  | { op: 'update_plan'; planName: string; data: { price?: string; annual?: string; description?: string; featured?: boolean; badge?: string; glow?: string } }
  | { op: 'set_features'; features: string[] }
  | { op: 'add_feature'; feature: string; planName?: string }
  | { op: 'remove_feature'; feature: string; planName?: string }
  | { op: 'move_block'; blockType: BlockType; position: 'top' | 'bottom' }
  | { op: 'noop'; reason: string };

export type SchemaPatch = SchemaPatchOp;

const BLOCK_ALIASES: Record<string, BlockType> = {
  hero: 'hero', header: 'hero',
  'card grid': 'cardGrid', cards: 'cardGrid', grid: 'cardGrid',
  pricing: 'pricingCards', plans: 'pricingCards', 'pricing cards': 'pricingCards',
  comparison: 'comparisonMatrix', 'comparison matrix': 'comparisonMatrix', 'feature table': 'comparisonMatrix',
  billing: 'billingToggle', 'billing toggle': 'billingToggle',
  enterprise: 'enterpriseContact',
  metrics: 'metricGrid', 'metric grid': 'metricGrid', kpis: 'metricGrid',
  activity: 'activityFeed', 'activity feed': 'activityFeed', feed: 'activityFeed', events: 'activityFeed',
  settings: 'settingsControls', toggles: 'settingsControls', preferences: 'settingsControls',
  chat: 'chatThread', messages: 'chatThread', thread: 'chatThread',
  calendar: 'calendarSlots', slots: 'calendarSlots', schedule: 'calendarSlots',
  checkout: 'checkoutSummary', 'order summary': 'checkoutSummary',
  onboarding: 'onboardingSteps', steps: 'onboardingSteps',
  progress: 'onboardingProgress',
  proof: 'proofStrip', 'social proof': 'proofStrip', logos: 'proofStrip',
  cta: 'ctaBand', 'call to action': 'ctaBand',
  globe: 'globeVisualization', 'globe visualization': 'globeVisualization',
  map: 'mapVisualization', 'map visualization': 'mapVisualization',
  markers: 'geoMarkerLayer', 'marker layer': 'geoMarkerLayer',
  legend: 'markerLegend', 'marker legend': 'markerLegend',
  'animation controls': 'animationControls', rotation: 'animationControls',
  dataset: 'datasetNotice', notice: 'datasetNotice',
  kanban: 'kanbanBoard', board: 'kanbanBoard', tasks: 'kanbanBoard',
  editor: 'codeEditor', code: 'codeEditor',
  preview: 'codePreview', 'live preview': 'codePreview',
  trading: 'tradingControls', 'trading controls': 'tradingControls', execution: 'tradingControls',
  'order book': 'orderBook', orderbook: 'orderBook',
  candlestick: 'candlestickChart', chart: 'candlestickChart',
  ticker: 'tickerFeed', 'ticker feed': 'tickerFeed',
  'data visualization': 'dataVisualization', scatter: 'dataVisualization',
  timeline: 'timelineControls', 'timeline scrubber': 'timelineControls',
  'social feed': 'socialFeed', posts: 'socialFeed',
  'platform metrics': 'platformMetrics', platforms: 'platformMetrics',
  engagement: 'engagementChart', 'engagement chart': 'engagementChart',
  dm: 'dmInbox', inbox: 'dmInbox',
  pipeline: 'agentPipeline', 'agent pipeline': 'agentPipeline',
  'agent log': 'agentLogFeed', logs: 'agentLogFeed',
  'token cost': 'tokenCostGrid', cost: 'tokenCostGrid',
  'prompt editor': 'promptEditor',
  'health metrics': 'healthMetrics',
  'workout calendar': 'workoutCalendar',
  'health trend': 'healthTrend', trend: 'healthTrend',
  goals: 'goalTracker', 'goal tracker': 'goalTracker',
  tenants: 'tenantList', 'tenant list': 'tenantList',
  'feature flags': 'featureFlagPanel', flags: 'featureFlagPanel',
  billing_overview: 'billingOverview', 'billing overview': 'billingOverview',
  'audit log': 'auditLog', audit: 'auditLog',
  // Extra natural-language aliases for suggestion chips
  'region filter': 'geoMarkerLayer', 'continent filter': 'geoMarkerLayer', 'map filter': 'geoMarkerLayer',
  'date range filter': 'activityFeed', 'date range': 'activityFeed',
  'portfolio': 'metricGrid', 'p&l': 'metricGrid', 'pnl summary': 'metricGrid',
  'portfolio p&l': 'metricGrid',
  'trust badge': 'proofStrip', 'trust badges': 'proofStrip',
  'promo code': 'billingToggle', 'coupon': 'billingToggle',
  'typing indicator': 'chatThread', 'read receipts': 'chatThread',
  'sparkline': 'metricGrid', 'sparklines': 'metricGrid',
  'water intake': 'healthMetrics', 'streak counter': 'healthMetrics', 'mood': 'healthMetrics',
  'cost breakdown': 'tokenCostGrid', 'token burn': 'tokenCostGrid',
  'timezone': 'calendarSlots', 'next available': 'calendarSlots',
  'file explorer': 'codeEditor', 'terminal output': 'codeEditor',
  'mrr trend': 'billingOverview', 'csv export': 'auditLog',
};

function resolveBlockType(alias: string): BlockType | undefined {
  const lower = alias.toLowerCase().trim();
  if (BLOCK_ALIASES[lower]) return BLOCK_ALIASES[lower];
  // Try partial match
  const key = Object.keys(BLOCK_ALIASES).find((k) => lower.includes(k) || k.includes(lower));
  return key ? BLOCK_ALIASES[key] : undefined;
}

/** Parse a natural language edit instruction into a typed SchemaPatch. */
export function parseEditDirective(instruction: string, _schema: Schema): SchemaPatch {
  const raw = instruction.trim();
  const n = raw.toLowerCase();

  // set_headline: "make the headline: ..." | "change headline to ..."
  const headlineMatch = n.match(/(?:(?:make|set|change|update)\s+(?:the\s+)?headline(?:\s+to)?|headline:)\s*[:\-]?\s*(.+)/i);
  if (headlineMatch) {
    const value = raw.slice(raw.toLowerCase().indexOf(headlineMatch[1])).trim().replace(/^["']|["']$/g, '');
    return { op: 'set_headline', value };
  }

  // set_subhead / set_subheading
  const subheadMatch = n.match(/(?:(?:make|set|change|update)\s+(?:the\s+)?subhead(?:ing)?(?:\s+to)?|subhead:)\s*[:\-]?\s*(.+)/i);
  if (subheadMatch) {
    const value = raw.slice(raw.toLowerCase().indexOf(subheadMatch[1])).trim().replace(/^["']|["']$/g, '');
    return { op: 'set_subhead', value };
  }

  // set_action: "change button to ..." | "CTA: ..."
  const actionMatch = n.match(/(?:(?:make|set|change|update)\s+(?:the\s+)?(?:button|cta|action)(?:\s+to)?|cta:)\s*[:\-]?\s*(.+)/i);
  if (actionMatch) {
    const value = raw.slice(raw.toLowerCase().indexOf(actionMatch[1])).trim().replace(/^["']|["']$/g, '');
    return { op: 'set_action', value };
  }

  // add_block: "add a comparison matrix" | "include a ticker feed"
  const addMatch = n.match(/^(?:add|include|show|insert|append)\s+(?:a|an|the\s+)?(.*?)(?:\s+(?:block|section|panel|component))?$/i);
  if (addMatch) {
    const blockType = resolveBlockType(addMatch[1]);
    if (blockType) return { op: 'add_block', blockType, title: addMatch[1] };
  }

  // remove_block: "remove the dataset notice" | "hide the legend"
  const removeMatch = n.match(/^(?:remove|delete|hide|take out)\s+(?:the\s+)?(.*?)(?:\s+(?:block|section|panel))?$/i);
  if (removeMatch) {
    const blockType = resolveBlockType(removeMatch[1]);
    if (blockType) return { op: 'remove_block', blockType };
  }

  // set_token — color/radius: "make the highlight color blue" | "set radius to 20"
  if (/(?:highlight|accent)\s+color/.test(n) || /color.*(?:highlight|accent)/.test(n)) {
    const colorMatch = raw.match(/#[0-9a-fA-F]{3,6}|oklch\([^)]+\)|(?:blue|red|green|purple|orange|cyan|pink|yellow)/i);
    if (colorMatch) {
      const colorMap: Record<string, string> = { blue: '#3b82f6', red: '#ef4444', green: '#10b981', purple: '#8b5cf6', orange: '#f97316', cyan: '#22d3ee', pink: '#ec4899', yellow: '#eab308' };
      return { op: 'set_token', token: 'highlight', value: colorMap[colorMatch[0].toLowerCase()] || colorMatch[0] };
    }
  }
  if (/(?:card\s+)?radius/.test(n)) {
    const numMatch = raw.match(/\d+/);
    if (numMatch) return { op: 'set_token', token: 'radius', value: Number(numMatch[0]) };
  }

  // set_layout: "make the layout split" | "switch to immersive layout"
  const layoutMatch = n.match(/(?:layout|style)\s+(?:to\s+)?(split|stacked|immersive|compact|panel-grid)/i);
  if (layoutMatch) return { op: 'set_layout', layoutIntent: layoutMatch[1] };

  return { op: 'noop', reason: `Could not parse edit directive: "${raw}"` };
}

/** 
 * Simulated AI Endpoint for Iterative Editing
 * Routes natural language instructions into precise SchemaPatch operations 
 */
export async function parseEditDirectiveAI(instruction: string, schema: Schema): Promise<SchemaPatch> {
  // Simulate network latency for AI endpoint
  await new Promise((resolve) => setTimeout(resolve, 800));

  const raw = instruction.trim().toLowerCase();

  // 1. Structural / Layout AI Understanding
  if (raw.includes('3-column') || raw.includes('3 column') || raw.includes('three column')) {
    if (raw.includes('pricing') || raw.includes('plans')) {
      return { op: 'set_block_data', blockType: 'pricingCards', data: { columns: 3 } };
    }
    return { op: 'set_layout', layoutIntent: '3-column' };
  }

  if (raw.includes('grid layout') || raw.includes('masonry')) {
    return { op: 'set_layout', layoutIntent: 'masonry' };
  }

  if (raw.includes('make') && (raw.includes('large') || raw.includes('bigger')) && raw.includes('hero')) {
    return { op: 'set_block_data', blockType: 'hero', data: { size: 'large' } };
  }

  // 2. Visual / Styling AI Understanding
  if (raw.includes('dark mode') || raw.includes('black theme')) {
    return { op: 'set_token', token: 'cardBg', value: 'oklch(0.15 0.02 255 / 0.8)' };
  }

  if (raw.includes('glow') || raw.includes('neon')) {
    return { op: 'set_token', token: 'highlight', value: '#00f2fe' };
  }

  if (raw.includes('larger radius') || raw.includes('more rounded') || raw.includes('rounder')) {
    return { op: 'set_token', token: 'radius', value: 32 };
  }

  if (raw.includes('sharp') || raw.includes('square')) {
    return { op: 'set_token', token: 'radius', value: 4 };
  }

  // 3. Add/Remove Block AI Intent
  if (raw.startsWith('add') || raw.startsWith('insert') || raw.startsWith('include')) {
    const alias = Object.keys(BLOCK_ALIASES).find((k) => raw.includes(k));
    if (alias) {
      return { op: 'add_block', blockType: BLOCK_ALIASES[alias] };
    }
  }

  if (raw.startsWith('remove') || raw.startsWith('delete') || raw.startsWith('drop')) {
    const alias = Object.keys(BLOCK_ALIASES).find((k) => raw.includes(k));
    if (alias) {
      return { op: 'remove_block', blockType: BLOCK_ALIASES[alias] };
    }
  }

  // 4. Data Patching AI Intent
  if (raw.includes('change') && raw.includes('headline')) {
    const valueMatch = raw.match(/to\s+(.+)$/i);
    if (valueMatch) {
      return { op: 'set_headline', value: valueMatch[1].replace(/["']/g, '') };
    }
  }

  // A: Price Changes (e.g. "change price of startup plan to $29" or "set startup price to $29")
  const priceMatch = raw.match(/(?:change|set|make)\s+(?:the\s+)?(?:price\s+of\s+)?([a-zA-Z0-9\-\s]+?)\s+(?:price\s+)?to\s+([$€£\d]+(?:\/\w+)?)/i);
  if (priceMatch) {
    const planName = priceMatch[1].replace(/(?:plan|cards?)/gi, '').trim();
    const priceVal = priceMatch[2].trim();
    const exists = schema.plans.some(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()));
    if (exists) {
      const actualPlan = schema.plans.find(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()))!;
      return { op: 'update_plan', planName: actualPlan.name, data: { price: priceVal } };
    }
  }

  // B: Annual Price Changes (e.g. "set pro annual price to $290" or "change annual of startup to $190")
  const annualMatch = raw.match(/(?:change|set|make)\s+(?:the\s+)?(?:annual\s+price\s+of\s+)?([a-zA-Z0-9\-\s]+?)\s+annual(?:\s+price)?\s+to\s+([$€£\d]+(?:\/\w+)?)/i);
  if (annualMatch) {
    const planName = annualMatch[1].replace(/(?:plan|cards?)/gi, '').trim();
    const priceVal = annualMatch[2].trim();
    const exists = schema.plans.some(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()));
    if (exists) {
      const actualPlan = schema.plans.find(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()))!;
      return { op: 'update_plan', planName: actualPlan.name, data: { annual: priceVal } };
    }
  }

  // C: Featured Plan Selection (e.g. "make pro plan featured" or "feature basic")
  const featureMatch = raw.match(/^(?:make|set)\s+([a-zA-Z0-9\-\s]+?)(?:\s+plan)?\s+(?:as\s+)?featured$/i) || raw.match(/^feature\s+(?:the\s+)?([a-zA-Z0-9\-\s]+?)(?:\s+plan)?$/i);
  if (featureMatch) {
    const planName = featureMatch[1].replace(/(?:plan|cards?)/gi, '').trim();
    const exists = schema.plans.some(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()));
    if (exists) {
      const actualPlan = schema.plans.find(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()))!;
      return { op: 'update_plan', planName: actualPlan.name, data: { featured: true } };
    }
  }

  // D: Add Feature to Plan or Main Features
  const addFeaturePlanMatch = raw.match(/^add\s+(?:feature\s+)?(.+?)\s+to\s+([a-zA-Z0-9\-\s]+?)(?:\s+plan)?$/i);
  if (addFeaturePlanMatch) {
    const feature = addFeaturePlanMatch[1].trim();
    const planName = addFeaturePlanMatch[2].replace(/(?:plan|cards?)/gi, '').trim();
    const exists = schema.plans.some(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()));
    if (exists) {
      const actualPlan = schema.plans.find(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()))!;
      return { op: 'add_feature', feature, planName: actualPlan.name };
    }
  }

  const addFeatureMatch = raw.match(/^add\s+(?:feature\s+)?(.+?)$/i);
  if (addFeatureMatch && !raw.includes('to')) {
    return { op: 'add_feature', feature: addFeatureMatch[1].trim() };
  }

  // E: Remove Feature from Plan or Main Features
  const removeFeaturePlanMatch = raw.match(/^remove\s+(?:feature\s+)?(.+?)\s+from\s+([a-zA-Z0-9\-\s]+?)(?:\s+plan)?$/i);
  if (removeFeaturePlanMatch) {
    const feature = removeFeaturePlanMatch[1].trim();
    const planName = removeFeaturePlanMatch[2].replace(/(?:plan|cards?)/gi, '').trim();
    const exists = schema.plans.some(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()));
    if (exists) {
      const actualPlan = schema.plans.find(p => p.name.toLowerCase() === planName.toLowerCase() || p.name.toLowerCase().includes(planName.toLowerCase()))!;
      return { op: 'remove_feature', feature, planName: actualPlan.name };
    }
  }

  const removeFeatureMatch = raw.match(/^remove\s+(?:feature\s+)?(.+?)$/i);
  if (removeFeatureMatch && !raw.includes('from')) {
    return { op: 'remove_feature', feature: removeFeatureMatch[1].trim() };
  }

  // F: Block positioning (e.g. "move pricing to top" or "put metrics cards at the bottom")
  const moveMatch = raw.match(/move\s+(?:the\s+)?([a-zA-Z0-9\-\s]+?)(?:\s+(?:block|section))?\s+to\s+(top|bottom|first|last|start|end)/i) ||
                    raw.match(/put\s+(?:the\s+)?([a-zA-Z0-9\-\s]+?)(?:\s+(?:block|section))?\s+at\s+(?:the\s+)?(top|bottom|first|last|start|end)/i);
  if (moveMatch) {
    const blockAlias = moveMatch[1].trim();
    const pos = moveMatch[2].toLowerCase();
    const blockType = resolveBlockType(blockAlias);
    if (blockType) {
      const position: 'top' | 'bottom' = (pos === 'top' || pos === 'first' || pos === 'start') ? 'top' : 'bottom';
      return { op: 'move_block', blockType, position };
    }
  }

  // G: Font scale changes
  if (raw.includes('font scale') || raw.includes('text size') || raw.includes('font size')) {
    const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      return { op: 'set_token', token: 'fontScale', value: parseFloat(numMatch[1]) };
    } else if (raw.includes('larger') || raw.includes('increase') || raw.includes('bigger')) {
      return { op: 'set_token', token: 'fontScale', value: 1.15 };
    } else if (raw.includes('smaller') || raw.includes('decrease')) {
      return { op: 'set_token', token: 'fontScale', value: 0.85 };
    }
  }

  // Fallback to the strict regex parser
  return parseEditDirective(instruction, schema);
}

/** Apply a SchemaPatch to a Schema and return the updated Schema. */
export function applyPatch(schema: Schema, patch: SchemaPatch): Schema {
  const s = { ...schema, blocks: [...schema.blocks] };

  switch (patch.op) {
    case 'set_headline':
      return { ...s, headline: patch.value };
    case 'set_subhead':
      return { ...s, subhead: patch.value };
    case 'set_action':
      return { ...s, action: patch.value };
    case 'add_block': {
      if (s.blocks.some((b) => b.type === patch.blockType)) return s; // already present
      const newBlock: InterfaceBlock = { type: patch.blockType, title: patch.title, items: patch.items };
      // Insert before ctaBand if present, otherwise append
      const ctaIdx = s.blocks.findIndex((b) => b.type === 'ctaBand');
      if (ctaIdx >= 0) {
        s.blocks.splice(ctaIdx, 0, newBlock);
      } else {
        s.blocks.push(newBlock);
      }
      return { ...s, blocks: s.blocks };
    }
    case 'remove_block':
      return { ...s, blocks: s.blocks.filter((b) => b.type !== patch.blockType) };
    case 'set_token': {
      // Store mutation as a pending design patch on the schema so App can lift it to design state
      return {
        ...s,
        generationMeta: {
          ...s.generationMeta,
          originalPrompt: s.generationMeta?.originalPrompt,
          _pendingDesignPatch: { token: patch.token, value: patch.value },
        },
      };
    }
    case 'set_layout':
      return { ...s, layoutIntent: patch.layoutIntent };
    case 'reorder_blocks': {
      const ordered = patch.order
        .map((t) => s.blocks.find((b) => b.type === t))
        .filter((b): b is InterfaceBlock => Boolean(b));
      const rest = s.blocks.filter((b) => !patch.order.includes(b.type));
      return { ...s, blocks: [...ordered, ...rest] };
    }
    case 'set_block_data': {
      return {
        ...s,
        blocks: s.blocks.map((b) =>
          b.type === patch.blockType ? { ...b, data: { ...b.data, ...patch.data } } : b
        ),
      };
    }
    case 'update_plan': {
      return {
        ...s,
        plans: s.plans.map((p) => {
          if (p.name.toLowerCase() === patch.planName.toLowerCase()) {
            const { featured, badge, glow, ...rest } = patch.data;
            const newVisual = { ...p.visual };
            if (featured !== undefined) newVisual.featured = featured;
            if (badge !== undefined) newVisual.badge = badge;
            if (glow !== undefined) newVisual.glow = glow;
            return {
              ...p,
              ...rest,
              visual: newVisual,
            };
          }
          if (patch.data.featured && p.name.toLowerCase() !== patch.planName.toLowerCase()) {
            return { ...p, visual: { ...p.visual, featured: false } };
          }
          return p;
        }),
      };
    }
    case 'set_features':
      return { ...s, features: patch.features };
    case 'add_feature': {
      if (patch.planName) {
        return {
          ...s,
          plans: s.plans.map((p) => {
            if (p.name.toLowerCase() === patch.planName!.toLowerCase()) {
              if (p.features.includes(patch.feature)) return p;
              return { ...p, features: [...p.features, patch.feature] };
            }
            return p;
          }),
        };
      } else {
        if (s.features.includes(patch.feature)) return s;
        return { ...s, features: [...s.features, patch.feature] };
      }
    }
    case 'remove_feature': {
      if (patch.planName) {
        return {
          ...s,
          plans: s.plans.map((p) => {
            if (p.name.toLowerCase() === patch.planName!.toLowerCase()) {
              return { ...p, features: p.features.filter((f) => f.toLowerCase() !== patch.feature.toLowerCase()) };
            }
            return p;
          }),
        };
      } else {
        return {
          ...s,
          features: s.features.filter((f) => f.toLowerCase() !== patch.feature.toLowerCase()),
        };
      }
    }
    case 'move_block': {
      const targetBlock = s.blocks.find((b) => b.type === patch.blockType);
      if (!targetBlock) return s;
      const filtered = s.blocks.filter((b) => b.type !== patch.blockType);
      if (patch.position === 'top') {
        return { ...s, blocks: [targetBlock, ...filtered] };
      } else {
        return { ...s, blocks: [...filtered, targetBlock] };
      }
    }
    case 'noop':
      return s;
  }
}
