export type TemplateTier = 'baseline' | 'studio' | 'cinematic';
export type TemplateCategory = 'pricing' | 'dashboard' | 'settings' | 'checkout' | 'chat' | 'calendar' | 'visualization' | 'marketing' | 'table' | 'onboarding' | 'editor' | 'kanban' | 'terminal' | 'social' | 'orchestrator' | 'health' | 'admin';

export type PromptTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  promptSeed: string;
  variables: string[];
  expectedBlocks: string[];
  interactionExpectations: string[];
  tierOverrides?: Partial<Record<TemplateTier, string>>;
  preview?: string;
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'saas-analytics-dashboard',
    name: 'SaaS Analytics Dashboard',
    category: 'dashboard',
    description: 'A modern, data-dense metrics dashboard with interactive widgets and real-time feel.',
    promptSeed: 'Build a {{tone}} analytics dashboard for {{product}} with key performance metrics, activity feed, and responsive data widgets.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'metricGrid', 'activityFeed', 'ctaBand'],
    interactionExpectations: ['hover data points', 'filter date range'],
    tierOverrides: {
      studio: 'Include glassy micro-interactions, subtle entrance animations, and detailed sparklines.',
      cinematic: 'Add rich 3D chart elements, dynamic ambient lighting, and fluid layout transitions.'
    },
    preview: 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
  },
  {
    id: 'conversational-llm-chat',
    name: 'Conversational LLM Interface',
    category: 'chat',
    description: 'An AI chat interface resembling ChatGPT or Claude, featuring threaded messages and input controls.',
    promptSeed: 'Design a {{tone}} AI chat interface for {{audience}} with threaded message history, typing indicators, and a floating prompt input.',
    variables: ['tone', 'audience'],
    expectedBlocks: ['hero', 'chatThread', 'controlsInteractions', 'ctaBand'],
    interactionExpectations: ['submit prompt', 'copy response', 'toggle parameters'],
    preview: 'linear-gradient(135deg, #14b8a6, #0f766e)'
  },
  {
    id: 'ecommerce-checkout-flow',
    name: 'E-Commerce Checkout Flow',
    category: 'checkout',
    description: 'A frictionless, high-converting shopping cart and checkout pipeline.',
    promptSeed: 'Create a {{tone}} checkout flow for {{product}} with an order summary, payment method selector, and a high-contrast purchase button.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'checkoutSummary', 'billingToggle', 'ctaBand'],
    interactionExpectations: ['select payment method', 'adjust quantities', 'submit order'],
    preview: 'linear-gradient(135deg, #f59e0b, #ea580c)'
  },
  {
    id: 'interactive-calendar-booking',
    name: 'Interactive Calendar Booking',
    category: 'calendar',
    description: 'A sleek scheduling interface for booking appointments and managing time slots.',
    promptSeed: 'Develop a {{tone}} scheduling component for {{product}} allowing {{audience}} to pick a date, select available time slots, and confirm booking.',
    variables: ['tone', 'product', 'audience'],
    expectedBlocks: ['hero', 'calendarSlots', 'ctaBand'],
    interactionExpectations: ['select date', 'choose slot', 'confirm booking'],
    tierOverrides: {
      studio: 'Add smooth slide transitions for week changes and visually highlighted available slots.'
    },
    preview: 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
  },
  {
    id: 'pricing-ai-studio',
    name: 'AI Pricing Studio',
    category: 'pricing',
    description: 'High-conversion pricing layout with billing toggle and featured plan treatment.',
    promptSeed: 'Build a {{tone}} pricing component for {{product}} with monthly and annual billing, interactive comparison, and a premium featured plan.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'billingToggle', 'pricingCards', 'comparisonMatrix', 'ctaBand'],
    interactionExpectations: ['select plan', 'toggle billing'],
    tierOverrides: {
      studio: 'Use micro-interactions, confidence-building proof strip, and enterprise contact pathway.',
      cinematic: 'Add dramatic visual hierarchy, motion-forward CTA emphasis, and animated featured plan focus.'
    },
    preview: 'linear-gradient(135deg, #ec4899, #be185d)'
  },
  {
    id: 'kanban-project-board',
    name: 'Kanban Project Board',
    category: 'kanban',
    description: 'An agile project management board with drag-and-drop columns and detailed task cards.',
    promptSeed: 'Design a {{tone}} Kanban project board for {{product}} with columns for backlog, in progress, and done, featuring interactive task cards.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'kanbanBoard', 'ctaBand'],
    interactionExpectations: ['drag task', 'open task details', 'add new column'],
    tierOverrides: {
      studio: 'Add smooth drag-and-drop animations, card hover states with quick actions, and visual priority indicators.',
      cinematic: 'Implement physics-based drag interactions, dynamic column width adjustment, and celebratory completion effects.'
    },
    preview: 'linear-gradient(135deg, #10b981, #047857)'
  },
  {
    id: 'multi-step-onboarding',
    name: 'Multi-step Onboarding',
    category: 'onboarding',
    description: 'A guided user setup wizard with progress tracking and sequential data collection.',
    promptSeed: 'Build a {{tone}} multi-step onboarding wizard for {{audience}} using {{product}} that collects profile info, sets preferences, and connects accounts.',
    variables: ['tone', 'audience', 'product'],
    expectedBlocks: ['hero', 'onboardingProgress', 'onboardingSteps', 'ctaBand'],
    interactionExpectations: ['next step', 'previous step', 'save progress'],
    tierOverrides: {
      studio: 'Include animated progress bars, fluid step transitions, and inline validation feedback.'
    },
    preview: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
  },
  {
    id: 'code-editor-playground',
    name: 'Code Editor Playground',
    category: 'editor',
    description: 'An IDE-like interface for writing, previewing, and debugging code.',
    promptSeed: 'Create a {{tone}} code editor playground for {{audience}} with a file explorer, syntax-highlighted editor pane, and a live preview window.',
    variables: ['tone', 'audience'],
    expectedBlocks: ['hero', 'codeEditor', 'codePreview', 'ctaBand'],
    interactionExpectations: ['type code', 'toggle preview', 'switch files'],
    tierOverrides: {
      studio: 'Add glowing syntax highlighting, resizable split panes, and integrated terminal output.'
    },
    preview: 'linear-gradient(135deg, #6366f1, #4338ca)'
  },
  {
    id: 'financial-trading-terminal',
    name: 'Financial Trading Terminal',
    category: 'terminal',
    description: 'A dense, professional-grade trading terminal with live tick data and complex order controls.',
    promptSeed: 'Design a {{tone}} financial trading terminal for {{audience}} featuring a live candlestick chart, order book depth, execution controls, and a streaming ticker feed.',
    variables: ['tone', 'audience'],
    expectedBlocks: ['hero', 'metricGrid', 'settingsControls', 'activityFeed', 'ctaBand'],
    interactionExpectations: ['place limit order', 'cancel order', 'zoom chart'],
    tierOverrides: {
      studio: 'Implement real-time flash indicators on tick changes, glassy order panels, and ultra-crisp monospace typography.',
      cinematic: 'Use volumetric lighting on chart peaks, 3D depth for order books, and haptic-style micro-animations on trade execution.'
    },
    preview: 'linear-gradient(135deg, #f43f5e, #be123c)'
  },
  {
    id: '3d-data-visualization',
    name: 'Interactive 3D Data Visualization',
    category: 'visualization',
    description: 'A 3D spatial data visualization dashboard featuring scatter matrices, depth layers, live data points, and interactive timeline scrubbing.',
    promptSeed: 'Build a {{tone}} interactive 3D data visualization for {{product}} showing multi-dimensional metrics across scatter matrices, depth layers, and live data points, with interactive timeline scrubbing controls.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'dataVisualization', 'timelineControls', 'ctaBand'],
    interactionExpectations: ['change year', 'explore depth layers', 'scrub timeline'],
    tierOverrides: {
      studio: 'Add glowing 3D-perspective grid systems, volumetric ambient glows behind active metrics, and responsive coordinate details.',
      cinematic: 'Implement dynamic floating particles, animated depth sweeps on dataset transition, and fully keyframed fluid micro-interactions.'
    },
    preview: 'linear-gradient(135deg, #8b5cf6, #c026d3)'
  },
  {
    id: 'social-media-command-center',
    name: 'Social Media Command Center',
    category: 'social',
    description: 'A cross-platform social media hub with follower analytics, post performance, engagement trends, and DM inbox.',
    promptSeed: 'Build a {{tone}} social media command center for {{product}} showing follower growth, post performance metrics, engagement trend chart, and a recent DM inbox with quick reply.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'platformMetrics', 'socialFeed', 'engagementChart', 'dmInbox', 'ctaBand'],
    interactionExpectations: ['filter by platform', 'boost post', 'reply to DM', 'view trend'],
    tierOverrides: {
      studio: 'Add platform color-coded metric cards, animated follower delta badges, and inline DM reply with character counter.',
      cinematic: 'Implement real-time pulse indicators on follower counts, cinematic engagement wave charts, and haptic-style send animations.'
    },
    preview: 'linear-gradient(135deg, #f472b6, #9333ea)'
  },
  {
    id: 'ai-agent-orchestrator',
    name: 'AI Agent Workflow Orchestrator',
    category: 'orchestrator',
    description: 'A mission-control dashboard for managing AI agent pipelines, costs, token usage, and a real-time log feed.',
    promptSeed: 'Design a {{tone}} AI agent orchestration dashboard for {{audience}} showing active agent pipelines, per-run token cost, success/failure rates, a streaming agent log feed, and an inline prompt editor.',
    variables: ['tone', 'audience'],
    expectedBlocks: ['hero', 'tokenCostGrid', 'agentPipeline', 'agentLogFeed', 'promptEditor', 'ctaBand'],
    interactionExpectations: ['pause agent', 'retry failed step', 'edit system prompt', 'view cost breakdown'],
    tierOverrides: {
      studio: 'Use glassy pipeline stage cards with live status badges, animated token burn rate sparklines, and inline diff for prompt edits.',
      cinematic: 'Add volumetric depth on pipeline cards, cinematic log stream with syntax coloring, and physics-spring stage transitions.'
    },
    preview: 'linear-gradient(135deg, #22d3ee, #2563eb)'
  },
  {
    id: 'health-fitness-tracker',
    name: 'Health & Fitness Tracker',
    category: 'health',
    description: 'A personal health dashboard with daily metrics, a workout calendar, trend visualization, and goal tracking.',
    promptSeed: 'Create a {{tone}} personal health dashboard for {{audience}} tracking daily calories, steps, and HRV, with a weekly workout calendar, activity trend chart, and goal completion tracker.',
    variables: ['tone', 'audience'],
    expectedBlocks: ['hero', 'healthMetrics', 'workoutCalendar', 'healthTrend', 'goalTracker', 'ctaBand'],
    interactionExpectations: ['log workout', 'view weekly trend', 'adjust goal target', 'select calendar day'],
    tierOverrides: {
      studio: 'Add animated ring progress for goals, smooth week-change transitions on the calendar, and color-coded metric deltas.',
      cinematic: 'Use fluid SVG morphing for goal rings, soft particle burst on goal completion, and a full-bleed trend gradient backdrop.'
    },
    preview: 'linear-gradient(135deg, #10b981, #0891b2)'
  },
  {
    id: 'multi-tenant-admin-panel',
    name: 'Multi-Tenant SaaS Admin Panel',
    category: 'admin',
    description: 'A power-user admin panel for SaaS platforms with tenant management, feature flags, billing summary, and audit log.',
    promptSeed: 'Build a {{tone}} multi-tenant SaaS admin panel for {{product}} with a searchable tenant list, per-tenant feature flag controls, a billing MRR overview, and a security audit log with export.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'metricGrid', 'tenantList', 'featureFlagPanel', 'billingOverview', 'auditLog', 'ctaBand'],
    interactionExpectations: ['search tenants', 'toggle feature per tenant', 'suspend account', 'export audit log'],
    tierOverrides: {
      studio: 'Add inline tenant status badges, animated MRR delta sparklines, and confirm-before-action dialogs for destructive operations.',
      cinematic: 'Implement glassmorphic tenant cards with depth shadows, animated billing trend fills, and ultra-dense audit log typography.'
    },
    preview: 'linear-gradient(135deg, #f43f5e, #7c3aed)'
  },
  {
    id: '3d-audio-workspace',
    name: '3D Spatial Audio Workspace',
    category: 'visualization',
    description: 'An immersive spatial audio mixing command desk featuring interactive particle waveforms, dynamic spatial panner coordinates, and physical frequency controls.',
    promptSeed: 'Design a {{tone}} 3D spatial audio workspace for {{product}} with a reactive waveform visualizer, three-dimensional audio node positioning coordinates, and frequency equalizer controls.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'audioVisualizer3D', 'frequencyControls', 'timelineControls', 'ctaBand'],
    interactionExpectations: ['panning audio nodes', 'modulate low mid high frequency frequencies', 'scrub timeline duration', 'play audio waveform'],
    tierOverrides: {
      studio: 'Add glowing particle frequencies, smooth log-scale spatial sound coordinates, and precise decibel meter ticks.',
      cinematic: 'Use realistic fluid 3D particle ripples, interactive floating spatial node soundfields, and premium glassmorphic audio knobs.'
    },
    preview: 'linear-gradient(135deg, #a855f7, #6366f1)'
  },
  {
    id: 'cybersecurity-threat-intel',
    name: 'Cybersecurity Threat Intel Control Room',
    category: 'dashboard',
    description: 'A high-security network operation center dashboard with geographical threat markers, defensive posture controls, and streaming cyber attack logs.',
    promptSeed: 'Build a {{tone}} cybersecurity threat intelligence control room for {{product}} showing live intrusion cyber attack vectors, defensive posture toggles, threat maps, and a real-time event audit feed.',
    variables: ['tone', 'product'],
    expectedBlocks: ['hero', 'threatRadar', 'metricGrid', 'activityFeed', 'ctaBand'],
    interactionExpectations: ['toggle active defensive posture', 'simulate intrusion attacks', 'filter threat classification logs', 'isolate network nodes'],
    tierOverrides: {
      studio: 'Include pulsing security radar grids, glow-in-the-dark threat alerts, and automated firewall isolation workflows.',
      cinematic: 'Add volumetric threat sweep radars, dynamic laser vector intrusion lines, and rich haptic status indicator animations.'
    },
    preview: 'linear-gradient(135deg, #ef4444, #7f1d1d)'
  }
];

export function resolveTemplatePrompt(templateId: string, vars: Record<string, string>, tier: TemplateTier = 'baseline'): string | null {
  const template = PROMPT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  const seed = `${template.promptSeed} ${template.tierOverrides?.[tier] || ''}`.trim();
  return seed.replace(/\{\{(.*?)\}\}/g, (_, key: string) => vars[key.trim()] || key.trim());
}
