export type Pattern = 'pricing'|'dashboard'|'settings'|'checkout'|'chat'|'calendar'|'custom';

export type DirectiveEffect = 'scale'|'glow'|'bevel'|'highlight';

export type Span={start:number;end:number;text:string;reason:string};
export type Directive={target:string;effect:DirectiveEffect;magnitude:string;span:Span};

export type Plan = { name:string; price:string; annual:string; description:string; features:string[]; visual:{featured:boolean;scale:number;glow:string;bevel:string;badge?:string} };

export type Requirement = {label:string;source:string};

export type Schema = { pattern:Pattern; strategy:string; product:string; headline:string; subhead:string; action:string; features:string[]; plans:Plan[]; metrics:{label:string;value:string;delta:string}[]; toggles:string[]; messages:string[]; slots:string[]; lineItems:{label:string;value:string}[]; requirements:Requirement[]; directives:string[] };

export type Viewport = 'mobile' | 'tablet' | 'desktop' | 'fluid';
export type Tokens = { text:string; muted:string; button:string; highlight:string; cardBg:string; cardBorder:string; radius:number; buttonRadius:number; fontScale:number };
