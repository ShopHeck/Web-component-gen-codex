import type { BlockType, InterfaceBlock, Schema } from '../types/schema';

export type SchemaPatchOp =
  | { op: 'set_headline'; value: string }
  | { op: 'set_subhead'; value: string }
  | { op: 'set_action'; value: string }
  | { op: 'add_block'; blockType: BlockType; title?: string; items?: string[] }
  | { op: 'remove_block'; blockType: BlockType }
  | { op: 'set_token'; token: 'highlight' | 'radius' | 'buttonRadius' | 'fontScale'; value: string | number }
  | { op: 'set_layout'; layoutIntent: string }
  | { op: 'reorder_blocks'; order: BlockType[] }
  | { op: 'set_block_data'; blockType: BlockType; data: Record<string, unknown> }
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
    case 'noop':
      return s;
  }
}
