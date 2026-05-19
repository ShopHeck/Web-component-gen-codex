import { PROMPT_TEMPLATES } from './templates';

export type OptimizedPrompt = {
  original: string;
  optimized: string;
  confidence: number;
  clarificationQuestions: string[];
  matchedTemplateId?: string;
};

function scoreTemplateFit(prompt: string, seed: string): number {
  const p = prompt.toLowerCase();
  const tokens = seed.toLowerCase().split(/\W+/).filter((x) => x.length > 4);
  const matches = tokens.filter((t) => p.includes(t)).length;
  return tokens.length ? matches / tokens.length : 0;
}

export function optimizePrompt(prompt: string): OptimizedPrompt {
  const best = PROMPT_TEMPLATES
    .map((t) => ({ id: t.id, score: scoreTemplateFit(prompt, t.promptSeed), seed: t.promptSeed }))
    .sort((a, b) => b.score - a.score)[0];

  const confidence = Math.min(1, Math.max(0.4, best?.score || 0.4));
  
  const p = prompt.toLowerCase();
  
  // Extract tone
  const toneMatch = prompt.match(/(modern|minimal|playful|sleek|dark|light|professional|corporate|cyberpunk|retro)/i);
  const tone = toneMatch ? toneMatch[0].toLowerCase() : 'modern';
  
  // Extract audience
  const audienceMatch = prompt.match(/for ([\w\s\-]+?)(?:with|and|\.|,|$)/i);
  const audience = audienceMatch ? audienceMatch[1].trim() : 'general developers';

  // 1. Structural directiveness extraction
  const blocksList: string[] = [];
  if (p.includes('pricing') || p.includes('price') || p.includes('plans') || p.includes('tiers') || p.includes('billing')) {
    if (p.includes('toggle') || p.includes('monthly') || p.includes('annual')) {
      blocksList.push(`- [Block: billingToggle]: Cadence toggle switcher between monthly & annual billing.`);
    }
    blocksList.push(`- [Block: pricingCards]: Premium tiered cards grid displaying specific pricing plans.`);
    if (p.includes('compare') || p.includes('matrix') || p.includes('table')) {
      blocksList.push(`- [Block: comparisonMatrix]: Deep features matrix mapping capabilities across plans.`);
    }
    if (p.includes('sales') || p.includes('contact') || p.includes('enterprise')) {
      blocksList.push(`- [Block: enterpriseContact]: High-intent custom contract contact panel.`);
    }
    blocksList.push(`- [Block: ctaBand]: Primary action band triggering selected plan checkout.`);
  } else if (p.includes('globe') || p.includes('map') || p.includes('marker') || p.includes('location') || p.includes('geography')) {
    blocksList.push(`- [Block: globeVisualization]: High-performance orthographic WebGL canvas visualization.`);
    blocksList.push(`- [Block: geoMarkerLayer]: Dynamic coordinates plotting layer with glowing markers.`);
    if (p.includes('legend') || p.includes('marker legend')) {
      blocksList.push(`- [Block: markerLegend]: Interactive legend card indicating marker status keys.`);
    }
    if (p.includes('pause') || p.includes('resume') || p.includes('control') || p.includes('spin') || p.includes('rotation')) {
      blocksList.push(`- [Block: animationControls]: Dynamic control triggers for active rotational physics.`);
    }
    if (p.includes('dataset') || p.includes('notice') || p.includes('warning') || p.includes('simulated')) {
      blocksList.push(`- [Block: datasetNotice]: High-impact indicator alert for simulation contexts.`);
    }
    if (p.includes('badge') || p.includes('live') || p.includes('coverage') || p.includes('telemetry')) {
      blocksList.push(`- [Block: dataCoverageBadge]: Sleek metrics badge for live coverage telemetry.`);
    }
  } else {
    // Diagnostics / Dashboards or General fallback
    if (p.includes('dashboard') || p.includes('analytics') || p.includes('metrics') || p.includes('kpi') || p.includes('diagnostics') || p.includes('log') || p.includes('editor')) {
      blocksList.push(`- [Block: hero]: Context-appropriate diagnostics title band.`);
      blocksList.push(`- [Block: metricGrid]: High-fidelity KPI stats grid displaying system state counters.`);
      blocksList.push(`- [Block: activityFeed]: Real-time timeline log detailing system audits.`);
      if (p.includes('editor') || p.includes('prompt')) {
        blocksList.push(`- [Block: promptEditor]: Sandbox environment system prompt text field editor.`);
      }
      if (p.includes('log') || p.includes('console') || p.includes('agent')) {
        blocksList.push(`- [Block: agentLogFeed]: Detailed terminal-style live streaming log window.`);
      }
    } else {
      blocksList.push(`- [Block: hero]: Engaging header with product tagline.`);
      blocksList.push(`- [Block: cardGrid]: Structured responsive feature cards.`);
      blocksList.push(`- [Block: ctaBand]: Primary call-to-action button panel.`);
    }
  }

  // 2. Visual styling directives extraction
  const stylingList: string[] = [];
  if (p.includes('glow') || p.includes('neon') || p.includes('cyber') || p.includes('vibrant')) {
    stylingList.push(`- [Style: active-glow]: Rich neon highlight drop shadows and outer glow maps.`);
  }
  if (p.includes('bevel') || p.includes('3d') || p.includes('depth')) {
    stylingList.push(`- [Style: 3d-bevel-borders]: Dimensional border strokes with dynamic gradients simulating light refraction.`);
  }
  if (p.includes('glassmorphism') || p.includes('backdrop') || p.includes('blur')) {
    stylingList.push(`- [Style: backdrop-blur-glass]: High-fidelity glassmorphism with backdrop filters and translucent cards.`);
  }
  if (p.includes('scale') || p.includes('stand out') || p.includes('featured') || p.includes('20%')) {
    stylingList.push(`- [Style: featured-scale-effect]: Scale highlighted items by 1.1x or 1.2x to establish solid visual hierarchy.`);
  }
  if (p.includes('dark') || p.includes('cyberpunk') || p.includes('night') || p.includes('sleek')) {
    stylingList.push(`- [Style: deep-dark-theme]: Use extremely premium dark background spaces with tailored highlights.`);
  } else {
    stylingList.push(`- [Style: minimal-sleek]: Modern, high-contrast visual hierarchy with precise padding.`);
  }

  // 3. System interaction directives extraction
  const interactionsList: string[] = [];
  if (p.includes('toggle') || p.includes('cadence')) {
    interactionsList.push(`- [Interaction: Cadence Switch]: Swap annual/monthly billing prices dynamically.`);
  }
  if (p.includes('select') || p.includes('pricing') || p.includes('plans')) {
    interactionsList.push(`- [Interaction: Plan selection]: Highlight current plan on click/hover states.`);
  }
  if (p.includes('pause') || p.includes('resume') || p.includes('spin') || p.includes('rotation')) {
    interactionsList.push(`- [Interaction: Animation Control]: Pause or restart globe rotation with speed adjustment.`);
  }
  if (p.includes('editor') || p.includes('prompt')) {
    interactionsList.push(`- [Interaction: Prompt Override]: Save edits made in the system prompt editor to refresh the runtime schema.`);
  }
  interactionsList.push(`- [Interaction: Hover triggers]: Micro-animations and light reflection highlights on card hover.`);

  const structured = [
    `=== OPTIMIZED COMPONENT BRIEF ===`,
    `Goal: Render a high-fidelity ${tone} system for ${audience} based on: "${prompt}"`,
    ``,
    `[BLOCK STRUCTURE DIRECTIVES]`,
    blocksList.join('\n'),
    ``,
    `[VISUAL STYLING DIRECTIVES]`,
    stylingList.join('\n'),
    ``,
    `[INTERACTION SCHEME]`,
    interactionsList.join('\n'),
    ``,
    `[CONSTRAINTS & COMPLIANCE]`,
    `- No remote dependencies or API calls. Complete local-first execution.`,
    `- High-fidelity micro-interactions and smooth transitions.`,
    `- Interactive status indicators and robust state variables.`
  ].join('\n');

  const clarificationQuestions: string[] = [];
  if (!/cta|button|action|submit|select/i.test(prompt)) clarificationQuestions.push('What primary action should users take first?');
  if (!/style|tone|modern|minimal|playful|sleek/i.test(prompt)) clarificationQuestions.push('Which visual style should the component emphasize?');
  if (!/mobile|desktop|responsive/i.test(prompt)) clarificationQuestions.push('Should this prioritize mobile-first or desktop-first layout behavior?');

  return {
    original: prompt,
    optimized: structured,
    confidence,
    clarificationQuestions: confidence < 0.55 ? clarificationQuestions.slice(0, 3) : [],
    matchedTemplateId: best?.score > 0.45 ? best.id : undefined
  };
}

