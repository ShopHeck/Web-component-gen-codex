export type TemplateTier = 'baseline' | 'studio' | 'cinematic';
export type TemplateCategory = 'pricing' | 'dashboard' | 'settings' | 'checkout' | 'chat' | 'calendar' | 'visualization' | 'marketing' | 'table' | 'onboarding';

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
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
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
    }
  },
  {
    id: 'globe-ops-board',
    name: 'Globe Operations Board',
    category: 'visualization',
    description: 'Interactive globe/map visualization with markers and animation controls.',
    promptSeed: 'Create an interactive {{style}} globe visualization for {{subject}} with marker legend, slow rotation controls, and data coverage notice.',
    variables: ['style', 'subject'],
    expectedBlocks: ['globeVisualization', 'geoMarkerLayer', 'animationControls', 'datasetNotice'],
    interactionExpectations: ['pause rotation', 'explore markers']
  },
  {
    id: 'onboarding-command-center',
    name: 'Onboarding Command Center',
    category: 'onboarding',
    description: 'Step-driven onboarding with progress feedback and next-best action CTA.',
    promptSeed: 'Design a {{tone}} onboarding component for {{audience}} with setup steps, progress states, and one-click next action.',
    variables: ['tone', 'audience'],
    expectedBlocks: ['hero', 'onboardingSteps', 'ctaBand'],
    interactionExpectations: ['select step', 'advance action']
  }
];

export function resolveTemplatePrompt(templateId: string, vars: Record<string, string>, tier: TemplateTier = 'baseline'): string | null {
  const template = PROMPT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  const seed = `${template.promptSeed} ${template.tierOverrides?.[tier] || ''}`.trim();
  return seed.replace(/\{\{(.*?)\}\}/g, (_, key: string) => vars[key.trim()] || key.trim());
}
