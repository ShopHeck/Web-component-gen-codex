export type Pattern = 'pricing' | 'dashboard' | 'settings' | 'checkout' | 'chat' | 'calendar' | 'custom' | 'visualization';
export type CtaBehavior = 'select_plan' | 'toggle_setting' | 'send_chat' | 'select_slot' | 'checkout' | 'custom';
export type SelectableItem = { id: string; label: string; selected: boolean; group: string };
export type ControlModel = {
  mode: 'single' | 'multi';
  ctaBehavior: CtaBehavior;
  selectableItems: SelectableItem[];
  localFeedbackMs: number;
};
export type Plan = { name: string; price: string; annual: string; description: string; features: string[]; visual: { featured: boolean; scale: number; glow: string; bevel: string; badge?: string } };
export type RequirementBucket = 'content' | 'controls' | 'metrics' | 'actions' | 'visual_intent';
export type RequirementStatus = 'rendered' | 'inspector' | 'unmapped';
export type BlockType = 'hero' | 'cardGrid' | 'pricingCards' | 'comparisonMatrix' | 'billingToggle' | 'enterpriseContact' | 'metricGrid' | 'activityFeed' | 'settingsControls' | 'chatThread' | 'calendarSlots' | 'checkoutSummary' | 'onboardingSteps' | 'proofStrip' | 'ctaBand' | 'customRequirementGrid' | 'globeVisualization' | 'mapVisualization' | 'geoMarkerLayer' | 'markerLegend' | 'visualControls' | 'animationControls' | 'datasetNotice' | 'dataCoverageBadge';
export type Requirement = { label: string; source: string; bucket: RequirementBucket; status: RequirementStatus; targetBlock?: BlockType; sourceReason?: string };
export type InterfaceBlock = { type: BlockType; title?: string; items?: string[]; target?: string; data?: Record<string, unknown> };
export type Schema = { pattern: Pattern; strategy: string; product: string; audience: string; toneStyle: string; layoutIntent: string; responsiveIntent: string; requirementMappingStatus: string; contentEntities: string[]; valuesPricesMetrics: string[]; controlsInteractions: string[]; visualDirectives: string[]; requiredSections: string[]; blocks: InterfaceBlock[]; headline: string; subhead: string; action: string; features: string[]; plans: Plan[]; metrics: { label: string; value: string; delta: string }[]; toggles: string[]; messages: string[]; slots: string[]; lineItems: { label: string; value: string }[]; requirements: Requirement[]; directives: string[]; custom: { header: string[]; body: string[]; controls: string[]; ctas: string[] }; interactive: ControlModel; visualization?: VisualizationMeta; generationMeta?: { originalPrompt?: string; optimizedPrompt?: string; confidence?: number; clarificationQuestions?: string[]; matchedTemplateId?: string; intentGraph?: { primaryIntent: string; nodeCount: number } } };
export type VisualizationMeta = { visualObject?: string; animation?: string; markerStyle?: string; markerSubject?: string; geographyScope?: string; dataCompletenessIntent?: string; interactionIntent?: string; datasetSource?: string; datasetCompleteness?: 'sample' | 'curated' | 'complete-known-static' | 'unknown' };
export type Tokens = { text:string; muted:string; button:string; highlight:string; cardBg:string; cardBorder:string; radius:number; buttonRadius:number; fontScale:number };
export type Viewport = 'mobile' | 'tablet' | 'desktop' | 'fluid';
