export type Pattern = 'pricing' | 'dashboard' | 'settings' | 'checkout' | 'chat' | 'calendar' | 'custom';
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
export type Schema = { pattern: Pattern; strategy: string; product: string; headline: string; subhead: string; action: string; features: string[]; plans: Plan[]; metrics: { label: string; value: string; delta: string }[]; toggles: string[]; messages: string[]; slots: string[]; lineItems: { label: string; value: string }[]; requirements: { label: string; source: string; bucket: RequirementBucket; status: RequirementStatus }[]; directives: string[]; custom: { header: string[]; body: string[]; controls: string[]; ctas: string[] }; interactive: ControlModel };
export type Tokens = { text:string; muted:string; button:string; highlight:string; cardBg:string; cardBorder:string; radius:number; buttonRadius:number; fontScale:number };
export type Viewport = 'mobile' | 'tablet' | 'desktop' | 'fluid';
