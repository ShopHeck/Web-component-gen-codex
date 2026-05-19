import { buildSchema } from '../generator/parser';
import { evaluateQuality } from '../generator/quality';
import type { BlockType, InterfaceBlock, Schema, RequirementBucket } from '../types/schema';

export type AIAssistMode = 'mock' | 'provider' | 'hybrid';
export type GenerateInterfaceOptions = { mode?: AIAssistMode; provider?: InterfaceProvider; forceSlowPath?: boolean; timeoutMs?: number; providerNote?: string };
export type AISchemaContract = {
  title: string;
  description?: string;
  intent: string;
  blocks: InterfaceBlock[];
  layout?: { type: 'single' | 'two-column' | 'three-column' | 'board' | 'timeline'; density?: 'compact' | 'comfortable' };
  components: string[];
  interactions: string[];
  designTokens?: string[];
  styleDirectives: string[];
  requirements: string[];
  warnings: string[];
  limitations?: string[];
};
export type GenerateInterfaceResult = { schema: Schema; contract: AISchemaContract; warnings: string[]; provider: string };
export type InterfaceProvider = { id: string; generateFromPrompt: (prompt: string) => Promise<AISchemaContract> };
export type RemoteProviderConfig = { enabled: boolean; endpoint?: string; apiKey?: string };

// Expand to support all valid block types in the generation pipeline
export const SUPPORTED_BLOCKS = new Set<BlockType>([
  'hero', 'cardGrid', 'pricingCards', 'comparisonMatrix', 'billingToggle', 
  'enterpriseContact', 'metricGrid', 'activityFeed', 'settingsControls', 
  'chatThread', 'calendarSlots', 'checkoutSummary', 'onboardingSteps', 
  'proofStrip', 'ctaBand', 'customRequirementGrid', 'globeVisualization', 
  'mapVisualization', 'geoMarkerLayer', 'markerLegend', 'visualControls', 
  'animationControls', 'datasetNotice', 'dataCoverageBadge', 'kanbanBoard',
  'codeEditor', 'codePreview', 'onboardingProgress', 'tradingControls',
  'orderBook', 'candlestickChart', 'tickerFeed', 'controlsInteractions',
  'dataVisualization', 'timelineControls', 'socialFeed', 'platformMetrics',
  'engagementChart', 'dmInbox', 'agentPipeline', 'agentLogFeed', 'tokenCostGrid',
  'promptEditor', 'healthMetrics', 'workoutCalendar', 'healthTrend', 'goalTracker',
  'tenantList', 'featureFlagPanel', 'billingOverview', 'auditLog',
  'audioVisualizer3D', 'frequencyControls', 'threatRadar'
]);

export const AI_PROMPT_CONTRACT = 'Return strict JSON only with: title, description, intent, blocks, layout, components, interactions, designTokens, styleDirectives, requirements, warnings, limitations.';

function extractProductName(prompt: string): string {
  const match = prompt.match(/(?:for a|called|named)\s+([a-zA-Z0-9_\-\s]{2,20})(?:\s+with|\s+and|\s+that|\s+for|\.|$)/i);
  if (match) {
    const name = match[1].trim();
    if (name.length > 2 && !/sleek|modern|pricing|globe|board|chat|calendar|onboarding/i.test(name)) {
      return name;
    }
  }
  return 'InterfaceForge';
}

function generateDynamicContract(prompt: string): AISchemaContract {
  const p = prompt.toLowerCase();
  const prod = extractProductName(prompt);

  // 3D Spatial Audio Workspace
  if (p.includes('audio') || p.includes('sound') || p.includes('spatial') || p.includes('frequency') || p.includes('equalizer') || p.includes('synth') || p.includes('waveform') || p.includes('decibel')) {
    return {
      title: `${prod} Spatial Audio Workspace`,
      intent: 'Skeuomorphic sound mixing console featuring a 2D coordinates spatial audio node grid, tactile Low/Mid/High frequency knobs, dynamic level meters, and timeline transport controls.',
      blocks: [
        { type: 'hero', title: `${prod} Spatial Studio`, items: ['Tactile audio node positioning and frequency spectral shaping.'] },
        { type: 'audioVisualizer3D', title: 'Spatial Audio Nodes (X/Y Panner Grid)', items: ['Node A (Vocals) · (45, -20)', 'Node B (Drums) · (-60, 10)', 'Node C (Synth) · (10, 80)'] },
        { type: 'frequencyControls', title: 'Equalizer Modulation Controls', items: ['Low Modulation: 0dB', 'Mid Modulation: -3dB', 'High Modulation: +4dB'] },
        { type: 'timelineControls', title: 'Timeline & Decibel Playback Meter', items: ['Playing · 01:24 / 03:00', 'L-Ch Meter: -12dB', 'R-Ch Meter: -10dB'] },
        { type: 'ctaBand', title: 'Export Master Mix', items: ['Compile master wav/mp3 stream'] }
      ],
      components: ['spatial-audio-panner', 'frequency-equalizer', 'waveform-visualizer', 'timeline-scrubber', 'decibel-meter'],
      interactions: ['panning audio nodes', 'modulate low mid high frequency frequencies', 'scrub timeline duration', 'play audio waveform'],
      styleDirectives: ['audio:spatial:skeuomorphic', 'knobs:physical:brushed', 'frequencies:glow:luminous'],
      requirements: ['interactive 3D spatial coordinate panning grid', 'brushed physical frequency equalizer controls', 'log-scale spatial panning nodes', 'play pause timeline duration scrubber'],
      warnings: []
    };
  }

  // Cybersecurity Threat Intel Control Room
  if (p.includes('cybersecurity') || p.includes('threat') || p.includes('intel') || p.includes('security') || p.includes('intrusion') || p.includes('firewall') || p.includes('noc')) {
    return {
      title: `${prod} Threat Command Center`,
      intent: 'Tactical security dashboard showing real-time intrusion attack vectors on a pulsing sweep radar grid, glow-in-the-dark defensive posture switches, and dynamic threat classification audit feeds.',
      blocks: [
        { type: 'hero', title: `${prod} Operations Board`, items: ['Cyber intrusion telemetry tracking and security sweep.'] },
        { type: 'threatRadar', title: 'Tactical Threat Radar Sweep', items: ['Intrusion Vector Sector 4 · Hostile', 'Intrusion Vector Sector 1 · Warning', 'Intrusion Vector Sector 9 · Isolated'] },
        { type: 'metricGrid', title: 'Intrusion Telemetry Metrics', items: ['Attack rate: 14/min', 'Active intrusions: 2', 'Firewall posture: Strict Posture Enabled', 'Node isolation: Operational'] },
        { type: 'activityFeed', title: 'Threat Classification Log Feed', items: ['System: DEFCON 3 status initiated', 'Firewall: Automatic node isolation active', 'Audit: Intrusion sweep successfully completed'] },
        { type: 'ctaBand', title: 'Acknowledge Threat Levels', items: ['Initiate global lockdown protocols'] }
      ],
      components: ['intrusion-radar-grid', 'defensive-posture-toggle', 'threat-classification-feed', 'firewall-status', 'network-isolation'],
      interactions: ['toggle active defensive posture', 'simulate intrusion attacks', 'filter threat classification logs', 'isolate network nodes'],
      styleDirectives: ['radar:sweep:pulsing', 'theme:cyberpunk:neon', 'alerts:glow:glow-in-the-dark'],
      requirements: ['pulsing security threat radar sweep grid', 'neon defensive posture toggle', 'glow-in-the-dark network isolation control', 'streaming real-time intrusion attack vector logs'],
      warnings: []
    };
  }

  // 1. KANBAN board
  if (p.includes('kanban') || (p.includes('board') && p.includes('task'))) {
    return {
      title: `${prod} Task Kanban Board`,
      intent: 'High-fidelity sprint planning board with visual columns, card selection, and interactive task movement.',
      blocks: [
        { type: 'hero', title: `${prod} Board`, items: ['Plan, track, and complete tasks with status columns'] },
        { 
          type: 'customRequirementGrid', 
          title: 'kanban', 
          data: { 
            widget: 'kanban', 
            activeGlow: 'subtle', 
            columns: [
              { id: 'todo', title: 'Backlog', cards: ['Wire export flow', 'Define card schema'] },
              { id: 'doing', title: 'In Progress', cards: ['Build kanban board widget'] },
              { id: 'review', title: 'Review', cards: ['Validate column state transitions'] },
              { id: 'done', title: 'Done', cards: ['Create initial generation mockup'] }
            ] 
          } 
        },
        { type: 'ctaBand', title: 'Export Code', items: ['Download Production Package'] }
      ],
      components: ['kanban', 'columns', 'cards', 'badge', 'button'],
      interactions: ['select_card', 'move_card', 'add_card'],
      styleDirectives: ['kanban:glow:subtle', 'cards:hover:elevate'],
      requirements: ['interactive status columns', 'draggable task cards', 'active glow animation', 'quick action buttons'],
      warnings: []
    };
  }

  // 2. PRICING plans
  if (p.includes('pricing') || p.includes('price') || p.includes('plans') || p.includes('tiers') || p.includes('subscription') || p.includes('billing')) {
    // Determine cards configuration
    let cardCount = 3;
    if (p.includes('4 card') || p.includes('four card')) cardCount = 4;
    else if (p.includes('2 card') || p.includes('two card')) cardCount = 2;
    else if (p.includes('5 card') || p.includes('five card')) cardCount = 5;

    // Determine prices
    const priceMatches = prompt.match(/\$\d+(?:\/(?:month|year|mo|yr|week))?/g) || [];
    const extractedPrices = priceMatches.map(pm => pm.replace(/mo\b/i, 'month').replace(/yr\b/i, 'year'));
    
    const baseNames = ['Starter', 'Growth', 'Pro', 'Enterprise', 'Scale'];
    const pricesList: string[] = [];
    for (let i = 0; i < cardCount; i++) {
      if (extractedPrices[i]) {
        pricesList.push(extractedPrices[i]);
      } else {
        const val = (i + 1) * 49;
        pricesList.push(`$${val}/month`);
      }
    }

    const plans = Array.from({ length: cardCount }).map((_, i) => {
      const name = baseNames[i] || `Plan ${i + 1}`;
      const price = pricesList[i];
      // Check if this card should stand out
      const isStandout = (price.includes('229') && p.includes('229')) || 
                         (i === cardCount - 1 && p.includes('final')) || 
                         (i === Math.floor(cardCount / 2) && p.includes('middle')) ||
                         ((p.includes('stand out') || p.includes('highlight') || p.includes('featured')) && i === cardCount - 1);
      
      const glow = isStandout ? (p.includes('subtle glow') ? 'subtle' : 'medium') : 'none';
      const bevel = isStandout ? (p.includes('bevel') ? 'medium' : 'none') : 'none';
      const scale = isStandout ? (p.includes('20%') ? 1.2 : 1.1) : 1.0;

      return {
        name,
        price,
        annual: price.replace('/month', '/year').replace(/\$(\d+)/, (_, num) => `$${Number(num) * 10}`),
        description: i === cardCount - 1 ? 'Complete toolset for high-volume enterprise operations.' : 'Essential primitives to launch and scale.',
        features: ['Production export ready', 'Neural design customizer', i === cardCount - 1 ? 'Dedicated support channels' : 'Community integrations'],
        visual: { featured: isStandout, scale, glow, bevel, badge: isStandout ? 'Premium pick' : undefined }
      };
    });

    // Custom pricing directives
    const styleDirectives = ['pricing:cards:animated'];
    plans.forEach((pl) => {
      if (pl.visual.featured) {
        styleDirectives.push(`pricing:featured:${pl.name.toLowerCase()}`);
        if (pl.visual.scale > 1) styleDirectives.push(`pricing:scale:${pl.visual.scale}`);
        if (pl.visual.glow !== 'none') styleDirectives.push(`pricing:glow:${pl.visual.glow}`);
        if (pl.visual.bevel !== 'none') styleDirectives.push(`pricing:bevel:${pl.visual.bevel}`);
      }
    });

    const blocks: InterfaceBlock[] = [
      { type: 'hero', title: `Premium pricing for ${prod}`, items: ['Select the ideal suite to match your development cadence.'] }
    ];

    if (p.includes('toggle') || p.includes('monthly') || p.includes('annual')) {
      blocks.push({ type: 'billingToggle', title: 'Billing cadence', items: ['Monthly billing', 'Annual billing (save 20%)'] });
    }

    blocks.push({ type: 'pricingCards', title: 'Select Plan', items: plans.map(pl => `${pl.name} - ${pl.price}`) });

    if (p.includes('compare') || p.includes('matrix') || p.includes('table')) {
      blocks.push({ type: 'comparisonMatrix', title: 'Features Comparison Matrix', items: plans.map(pl => pl.name) });
    }

    if (p.includes('sales') || p.includes('contact') || p.includes('enterprise')) {
      blocks.push({ type: 'enterpriseContact', title: 'Custom Requirements', items: ['Talk to sales'] });
    }

    blocks.push({ type: 'ctaBand', title: 'Primary Action', items: ['Get started instantly'] });

    return {
      title: `${prod} Tier Custom Suite`,
      intent: `Vibrant pricing page with ${cardCount} plans, customized billing toggles, and standout highlight effects.`,
      blocks,
      components: ['pricing-grid', 'billing-toggle', 'pricing-card', 'features-matrix', 'cta-block'],
      interactions: ['select_plan', 'toggle_cadence', 'trigger_checkout'],
      styleDirectives,
      requirements: [`${cardCount} pricing tiers`, 'featured tier layout scaling', 'monthly annual toggle'],
      warnings: []
    };
  }

  // 3. GLOBE or Map Geographic Visualization
  if (p.includes('globe') || p.includes('map') || p.includes('marker') || p.includes('location') || p.includes('geography') || p.includes('latitude') || p.includes('longitude') || p.includes('visualization')) {
    const isMap = p.includes('map') && !p.includes('globe');
    
    const markerSubject = p.includes('military') ? 'US military bases' : (p.includes('weather') ? 'Weather stations' : 'Global data centers');
    const datasetNotice = 'Showing public sample dataset. Replace with real-time API feed.';
    const coverageBadge = '98.4% Live';

    const blocks: InterfaceBlock[] = [
      { type: 'hero', title: `${prod} Global Ops Control`, items: ['Real-time geo-spatial intelligence and active marker metrics.'] }
    ];

    if (isMap) {
      blocks.push({ type: 'mapVisualization', title: 'Operations Map', items: ['Active map layer with dynamic project markers'] });
    } else {
      blocks.push({ type: 'globeVisualization', title: 'Operations Globe', items: ['Interactive 3D spinning globe'] });
    }

    blocks.push({ type: 'geoMarkerLayer', title: 'Active marker layer', items: [markerSubject] });
    blocks.push({ type: 'markerLegend', title: 'Marker Categories', items: ['Critical alert', 'Warning', 'Healthy'] });
    blocks.push({ type: 'animationControls', title: 'Animation Controls', items: ['Pause rotation', 'Resume rotation'] });
    blocks.push({ type: 'datasetNotice', title: 'Notice', items: [datasetNotice] });
    blocks.push({ type: 'dataCoverageBadge', title: 'Coverage', items: [coverageBadge] });
    blocks.push({ type: 'ctaBand', title: 'Trigger Event Response', items: ['Initiate site sweep'] });

    return {
      title: `${prod} Dynamic Operations Board`,
      intent: `Interactive ${isMap ? 'map' : 'globe'} geolocation suite with glowing markers, categories legend, and play/pause controls.`,
      blocks,
      components: [isMap ? 'interactive-map' : 'spinning-globe', 'marker-layer', 'controls-panel', 'legend', 'badge'],
      interactions: ['toggle_rotation', 'select_marker', 'zoom_scene', 'filter_marker_type'],
      styleDirectives: ['globe:glow:luminous', 'markers:pulse:active', 'borders:glassmorphism'],
      requirements: [`interactive ${isMap ? 'map' : 'globe'} widget`, 'glowing geo markers', 'pause resume animation controls', 'dataset coverage badge'],
      warnings: []
    };
  }

  // 4. CHAT messenger
  if (p.includes('chat') || p.includes('messages') || p.includes('inbox') || p.includes('support') || p.includes('messenger')) {
    return {
      title: `${prod} Live Chat Command Center`,
      intent: 'Simulated real-time chat dashboard with interactive log stream and message inputs.',
      blocks: [
        { type: 'hero', title: `${prod} Live Support`, items: ['Connect with active client sessions and team workflows.'] },
        { type: 'chatThread', title: 'Active Chat Session', items: ['Hello! Welcome to support.', 'How can I configure my project?', 'Use the top-right export button.'] },
        { type: 'controlsInteractions', title: 'Quick Responses', items: ['General FAQ', 'Pricing Inquiry', 'Custom Implementation'] },
        { type: 'ctaBand', title: 'Launch Agent Workspace', items: ['Open Dashboard'] }
      ],
      components: ['chat-log', 'composer-input', 'quick-response-chips', 'status-indicator'],
      interactions: ['send_message', 'select_quick_chip', 'clear_history'],
      styleDirectives: ['chat:glassmorphism', 'thread:scroll:smooth'],
      requirements: ['interactive message stream', 'composer with send action', 'quick reply chips'],
      warnings: []
    };
  }

  // 5. CALENDAR schedule
  if (p.includes('calendar') || p.includes('booking') || p.includes('schedule') || p.includes('slots')) {
    return {
      title: `${prod} Appointment Planner`,
      intent: 'Interactive calendar scheduling workspace with active slot picker and booking CTA.',
      blocks: [
        { type: 'hero', title: 'Book Session', items: ['Pick a time with our senior system architects.'] },
        { type: 'calendarSlots', title: 'Available Slots', items: ['09:00 AM - Active', '10:00 AM - Active', '11:00 AM - Selected', '01:30 PM - Active', '03:00 PM - Active'] },
        { type: 'ctaBand', title: 'Book Now', items: ['Confirm appointment booking'] }
      ],
      components: ['calendar-view', 'slot-picker-grid', 'details-card', 'booking-button'],
      interactions: ['select_time_slot', 'toggle_view_mode'],
      styleDirectives: ['calendar:glow:primary', 'slots:rounded:full'],
      requirements: ['interactive slot selection grid', 'visual selection outline state', 'instant confirm button'],
      warnings: []
    };
  }

  // 6. ONBOARDING setup
  if (p.includes('onboarding') || p.includes('wizard') || p.includes('step') || p.includes('setup') || p.includes('welcome')) {
    return {
      title: `${prod} Onboarding System`,
      intent: 'Multi-step setup flow tracker with dynamic checkboxes and teammate invite CTAs.',
      blocks: [
        { type: 'hero', title: `Welcome to ${prod}`, items: ['Complete the steps below to initialize your project.'] },
        { type: 'onboardingSteps', title: 'Initial Checklist', items: ['Create secure database workspace', 'Configure primary API credentials', 'Invite development team members', 'Export final client packages'] },
        { type: 'onboardingProgress', title: 'Overall Setup Progress', items: ['Step 2 of 4 - Active'] },
        { type: 'ctaBand', title: 'Finish Onboarding', items: ['Launch product console'] }
      ],
      components: ['step-wizard-check', 'horizontal-progress-meter', 'invite-button', 'complete-action'],
      interactions: ['toggle_step_status', 'invite_collaborators', 'skip_wizard'],
      styleDirectives: ['wizard:theme:emerald', 'progress:glow:active'],
      requirements: ['setup checklist tracker', 'active progress bar metric', 'invite colleagues control'],
      warnings: []
    };
  }

  // 7. DASHBOARD analytics
  if (p.includes('dashboard') || p.includes('cockpit') || p.includes('analytics') || p.includes('metrics') || p.includes('kpi') || p.includes('revenue')) {
    return {
      title: `${prod} Operational Cockpit`,
      intent: 'Studio grade analytics dashboard with critical KPI metrics grid and live events feed.',
      blocks: [
        { type: 'hero', title: `${prod} Diagnostics`, items: ['Real-time performance and usage metrics.'] },
        { type: 'metricGrid', title: 'Primary Metrics', items: ['Daily active developer: 14.8k', 'API success response: 99.98%', 'Average bundle latency: 240ms', 'Monthly contract rate: $184k'] },
        { type: 'activityFeed', title: 'Audit Event Log', items: ['Zip bundle exported successfully', 'Custom theme cyberpunk resolved', 'AI Assist generator resolved'] },
        { type: 'ctaBand', title: 'Refresh System', items: ['Re-query telemetry metrics'] }
      ],
      components: ['metrics-grid-kpi', 'audit-activity-timeline', 'telemetry-header', 'cta-trigger'],
      interactions: ['refresh_metrics', 'select_metric_card', 'filter_activity_log'],
      styleDirectives: ['dashboard:glassmorphism', 'kpi:glow:active'],
      requirements: ['analytics KPI grid', 'live activity timeline', 'query refresh button'],
      warnings: []
    };
  }

  // 8. General ADAPTIVE fallback
  const requirements = prompt.split(',').map(s => s.trim().replace(/\.$/, '')).filter(s => s.length > 3);
  return {
    title: `${prod} Adaptive Component`,
    intent: `Tailored high-fidelity interface optimized directly for: "${prompt.slice(0, 50)}...".`,
    blocks: [
      { type: 'hero', title: prod, items: [prompt] },
      { type: 'cardGrid', title: 'Key Features & Capabilities', items: requirements.length ? requirements : ['Modular structure', 'Premium aesthetic', 'Local interactions ready'] },
      { type: 'ctaBand', title: 'Primary Call to Action', items: ['Start integrating now'] }
    ],
    components: ['grid', 'cards', 'hero', 'cta-button'],
    interactions: ['interact_elements', 'trigger_main_cta'],
    styleDirectives: ['layout:glassmorphism', 'cards:glow:subtle'],
    requirements: requirements.length ? requirements : ['adaptive cards list', 'responsive layout', 'primary CTA button'],
    warnings: []
  };
}

export const mockProvider: InterfaceProvider = {
  id: 'mock',
  async generateFromPrompt(prompt) {
    return generateDynamicContract(prompt);
  }
};

export function createRemoteProvider(config: RemoteProviderConfig): InterfaceProvider {
  return {
    id: 'remote',
    async generateFromPrompt() {
      if (!config.enabled) throw new Error('remote provider disabled');
      if (!config.endpoint || !config.apiKey) throw new Error('remote provider missing configuration');
      throw new Error('remote provider not implemented');
    }
  };
}

export function validateAISchemaContract(payload: AISchemaContract): string[] {
  const warnings: string[] = [];
  if (!payload.title) warnings.push('Missing title');
  if (!payload.intent) warnings.push('Missing intent');
  if (!Array.isArray(payload.blocks)) {
    warnings.push('Missing blocks array');
    return warnings;
  }
  payload.blocks.forEach((block) => { 
    if (!SUPPORTED_BLOCKS.has(block.type)) {
      warnings.push(`Unsupported block sanitized: ${block.type}`); 
    }
  });
  if (!Array.isArray(payload.interactions) || payload.interactions.length === 0) {
    warnings.push('missing_required_interaction');
  }
  return warnings;
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('provider timeout')), timeoutMs);
    p.then((v) => { clearTimeout(id); resolve(v); }).catch((e) => { clearTimeout(id); reject(e); });
  });
}

function mapContractToSchema(prompt: string, contract: AISchemaContract): Schema {
  const base = buildSchema(prompt);
  const blocks = contract.blocks.filter((b) => SUPPORTED_BLOCKS.has(b.type));
  
  // Dynamically resolve pattern for specific widgets and standard renderers
  let pattern = base.pattern;
  if (pattern !== 'custom') {
    if (contract.blocks.some((b) => b.type === 'customRequirementGrid' && b.data?.widget === 'kanban')) {
      pattern = 'custom';
    } else if (contract.blocks.some((b) => b.type === 'kanbanBoard')) {
      pattern = 'kanban';
    } else if (contract.blocks.some((b) => b.type === 'pricingCards')) {
      pattern = 'pricing';
    } else if (contract.blocks.some((b) => b.type === 'audioVisualizer3D' || b.type === 'frequencyControls')) {
      pattern = 'visualization';
    } else if (contract.blocks.some((b) => b.type === 'threatRadar')) {
      pattern = 'dashboard';
    } else if (contract.blocks.some((b) => b.type === 'globeVisualization' || b.type === 'mapVisualization')) {
      pattern = 'visualization';
    } else if (contract.blocks.some((b) => b.type === 'chatThread')) {
      pattern = 'chat';
    } else if (contract.blocks.some((b) => b.type === 'calendarSlots')) {
      pattern = 'calendar';
    } else if (contract.blocks.some((b) => b.type === 'onboardingSteps')) {
      pattern = 'onboarding';
    } else if (contract.blocks.some((b) => b.type === 'metricGrid')) {
      pattern = 'dashboard';
    }
  }

  // Handle plan descriptions and custom settings mapping
  let plans = base.plans;
  if (pattern === 'pricing') {
    const extractedPlans: any[] = [];
    const baseNames = ['Starter', 'Growth', 'Pro', 'Enterprise', 'Scale'];
    const p = prompt.toLowerCase();
    
    // Check if we have dynamic pricing block content
    const pricingBlock = contract.blocks.find(b => b.type === 'pricingCards');
    if (pricingBlock && Array.isArray(pricingBlock.items)) {
      pricingBlock.items.forEach((item, i) => {
        const parts = item.split(' - ');
        const name = parts[0] || baseNames[i] || `Plan ${i + 1}`;
        const price = parts[1] || `$${(i + 1) * 49}/month`;
        const isStandout = (price.includes('229') && p.includes('229')) || 
                           (i === pricingBlock.items!.length - 1 && p.includes('final')) || 
                           (i === Math.floor(pricingBlock.items!.length / 2) && p.includes('middle')) ||
                           ((p.includes('stand out') || p.includes('highlight') || p.includes('featured')) && i === pricingBlock.items!.length - 1);
        
        extractedPlans.push({
          name,
          price,
          annual: price.replace('/month', '/year').replace(/\$(\d+)/, (_, num) => `$${Number(num) * 10}`),
          description: i === pricingBlock.items!.length - 1 ? 'Complete toolset for high-volume enterprise operations.' : 'Essential primitives to launch and scale.',
          features: ['Production export ready', 'Neural design customizer', i === pricingBlock.items!.length - 1 ? 'Dedicated support channels' : 'Community integrations'],
          visual: {
            featured: isStandout,
            scale: isStandout ? (p.includes('20%') ? 1.2 : 1.1) : 1.0,
            glow: isStandout ? (p.includes('subtle glow') ? 'subtle' : 'medium') : 'none',
            bevel: isStandout ? (p.includes('bevel') ? 'medium' : 'none') : 'none',
            badge: isStandout ? 'Premium pick' : undefined
          }
        });
      });
    }
    if (extractedPlans.length > 0) {
      plans = extractedPlans;
    }
  }

  // Handle geographic globe/map visualization details
  let visualization = base.visualization;
  if (pattern === 'visualization') {
    const isMap = prompt.toLowerCase().includes('map') && !prompt.toLowerCase().includes('globe');
    visualization = {
      visualObject: isMap ? 'map' : 'globe',
      animation: 'rotate-y',
      markerStyle: 'glowing-pulse',
      markerSubject: prompt.toLowerCase().includes('military') ? 'US military bases' : 'Global data centers',
      geographyScope: 'world',
      dataCompletenessIntent: 'high',
      interactionIntent: 'hover-click',
      datasetSource: 'bundled public sample dataset',
      datasetCompleteness: 'sample'
    };
  }

  return {
    ...base,
    pattern,
    strategy: 'ai-assisted',
    headline: contract.title,
    subhead: contract.intent,
    blocks: blocks.length ? blocks : base.blocks,
    directives: contract.styleDirectives.length ? contract.styleDirectives : base.directives,
    controlsInteractions: contract.interactions.length ? contract.interactions : base.controlsInteractions,
    requiredSections: blocks.map((b) => b.type),
    plans,
    visualization,
    requirements: [...base.requirements, ...contract.requirements.map((label) => ({ label, source: 'ai-contract', bucket: 'content' as const, status: 'rendered' as const }))],
    generationMeta: { ...(base.generationMeta ?? {}), originalPrompt: prompt, optimizedPrompt: prompt, matchedTemplateId: 'ai-assist' }
  };
}

export async function generateInterfaceFromPrompt(prompt: string, options: GenerateInterfaceOptions = {}): Promise<GenerateInterfaceResult> {
  const mode = options.mode ?? 'mock';
  const timeoutMs = options.timeoutMs ?? 1800;
  const provider = options.provider ?? mockProvider;
  const useProvider = provider.id !== 'mock' && mode !== 'mock';

  if (mode === 'hybrid') {
    // 1. Run fast deterministic parser first to detect pattern
    const fastSchema = buildSchema(prompt);

    // 2. Decide path based on detected pattern complexity (Fast-Path if standard template pattern found, Slow-Path if custom)
    if (fastSchema.pattern !== 'custom' && !options.forceSlowPath) {
      // Fast-Path (Deterministic Template Engine)
      const mockContract: AISchemaContract = {
        title: fastSchema.headline || 'Deterministic Layout',
        intent: `Deterministic Template Mapper for pattern: ${fastSchema.pattern}`,
        blocks: fastSchema.blocks || [],
        components: (fastSchema.blocks || []).map(b => b.type),
        interactions: fastSchema.controlsInteractions || [],
        styleDirectives: [
          `pattern:${fastSchema.pattern}`,
          `mode:deterministic-hybrid`,
          ...((fastSchema.blocks && fastSchema.blocks.length > 0) ? [`layout:${fastSchema.blocks[0].type}`] : [])
        ],
        requirements: fastSchema.requirements?.map(r => r.label) ?? [],
        warnings: ['Instant Fast-Path matched. Bypassed LLM latency.']
      };

      return {
        schema: fastSchema,
        contract: mockContract,
        warnings: mockContract.warnings,
        provider: 'hybrid-fastpath (Deterministic Template Engine)'
      };
    }

    // Slow-Path (AI Agent Orchestrator)
    try {
      const contract = await withTimeout(useProvider ? provider.generateFromPrompt(prompt) : mockProvider.generateFromPrompt(prompt), timeoutMs);
      const warnings = [...validateAISchemaContract(contract), ...contract.warnings];
      const schema = mapContractToSchema(prompt, contract);
      const quality = evaluateQuality(schema);
      if (quality.promptCoverageScore < 70) warnings.push('Schema misses part of prompt intent.');
      if (warnings.some((w) => w.includes('Unsupported block'))) warnings.push('unsupported_ai_block');
      if (warnings.some((w) => w.includes('missing_required_interaction'))) warnings.push('missing_required_interaction');
      return {
        schema,
        contract,
        warnings,
        provider: `hybrid-slowpath (AI Agent Orchestrator: ${useProvider ? provider.id : 'mock'})`
      };
    } catch {
      const fallback = buildSchema(prompt);
      return {
        schema: { ...fallback, generationMeta: { ...(fallback.generationMeta ?? {}), aiFallbackUsed: true } as any },
        contract: { title: fallback.headline, intent: fallback.subhead, blocks: fallback.blocks, components: [], interactions: fallback.controlsInteractions, styleDirectives: fallback.directives, requirements: fallback.requirements.map((r) => r.label), warnings: ['fallback_used'], description: 'Fallback deterministic schema' },
        warnings: ['invalid_ai_schema', 'fallback_used'],
        provider: 'hybrid-fallback-local'
      };
    }
  }
  try {
    const contract = await withTimeout(useProvider ? provider.generateFromPrompt(prompt) : mockProvider.generateFromPrompt(prompt), timeoutMs);
    const warnings = [...validateAISchemaContract(contract), ...contract.warnings];
    const schema = mapContractToSchema(prompt, contract);
    const quality = evaluateQuality(schema);
    if (quality.promptCoverageScore < 70) warnings.push('Schema misses part of prompt intent.');
    if (warnings.some((w) => w.includes('Unsupported block'))) warnings.push('unsupported_ai_block');
    if (warnings.some((w) => w.includes('missing_required_interaction'))) warnings.push('missing_required_interaction');
    const noteWarnings = options.providerNote ? [...warnings, options.providerNote] : warnings;
    return { schema, contract, warnings: noteWarnings, provider: useProvider ? provider.id : 'mock' };
  } catch {
    const fallback = buildSchema(prompt);
    return {
      schema: { ...fallback, generationMeta: { ...(fallback.generationMeta ?? {}), aiFallbackUsed: true } as any },
      contract: { title: fallback.headline, intent: fallback.subhead, blocks: fallback.blocks, components: [], interactions: fallback.controlsInteractions, styleDirectives: fallback.directives, requirements: fallback.requirements.map((r) => r.label), warnings: ['fallback_used'], description: 'Fallback deterministic schema' },
      warnings: ['invalid_ai_schema', 'fallback_used'],
      provider: 'local-fallback'
    };
  }
}
