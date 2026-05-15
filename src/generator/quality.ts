import type { BlockType, InterfaceBlock, Requirement, Schema } from '../types/schema';

export type QualityIssueType =
  | 'requirement_unmapped'
  | 'requirement_inspector_only'
  | 'directive_unexecuted'
  | 'missing_block'
  | 'missing_interaction_model'
  | 'missing_responsive_intent'
  | 'weak_cta'
  | 'low_visual_specificity'
  | 'missing_export_metadata';

export type RepairSuggestionType =
  | 'add_missing_billing_toggle'
  | 'add_missing_comparison_matrix'
  | 'add_missing_enterprise_contact'
  | 'add_missing_cta_band'
  | 'add_custom_requirement_grid_for_unmapped'
  | 'move_requirement_to_inspector'
  | 'attach_directive_to_nearest_block'
  | 'add_selectable_items_for_calendar_slots';

export type QualityIssue = { type: QualityIssueType; message: string; requirementLabel?: string; source?: string; directive?: string };
export type RepairSuggestion = { type: RepairSuggestionType; reason: string };

export type QualityReport = {
  overallScore: number;
  promptCoverageScore: number;
  directiveExecutionScore: number;
  interactionScore: number;
  responsiveScore: number;
  exportReadinessScore: number;
  visualCompletenessScore: number;
  issues: QualityIssue[];
  suggestedRepairs: RepairSuggestion[];
};

const hasBlock = (schema: Schema, block: BlockType) => schema.blocks.some((b) => b.type === block);
const hasIntent = (schema: Schema, regex: RegExp) => regex.test(`${schema.requirements.map((r) => `${r.label} ${r.source}`).join(' ')} ${schema.directives.join(' ')}`.toLowerCase());

function directiveExecuted(schema: Schema, directive: string): boolean {
  const [target, effect] = directive.split(':');
  const lowered = directive.toLowerCase();
  const byRequirement = schema.requirements.some((r) => r.status === 'rendered' && (r.source.includes('directive@') || r.label.toLowerCase().includes(effect || '')));
  const byBlockTarget = schema.blocks.some((b) => (b.type === (target as BlockType)) || (target === 'card' && b.type === 'pricingCards'));
  const visuallyPresent = ['glow', 'bevel', 'scale', 'highlight'].some((token) => lowered.includes(token))
    ? schema.plans.some((p) => p.visual.glow !== 'none' || p.visual.bevel !== 'none' || p.visual.scale > 1 || p.visual.badge)
    : true;
  const inspectorVisible = schema.requirements.some((r) => r.status === 'inspector' && r.source.includes('directive@') && r.label.toLowerCase().includes(effect || ''));
  return (byRequirement && visuallyPresent) || byBlockTarget || inspectorVisible;
}

export function evaluateQuality(schema: Schema): QualityReport {
  const issues: QualityIssue[] = [];
  const suggestedRepairs: RepairSuggestion[] = [];

  const rendered = schema.requirements.filter((r) => r.status === 'rendered').length;
  const inspector = schema.requirements.filter((r) => r.status === 'inspector').length;
  const unmapped = schema.requirements.filter((r) => r.status === 'unmapped');
  const total = Math.max(1, schema.requirements.length);
  const promptCoverageScore = Math.round(((rendered + inspector * 0.5) / total) * 100);

  unmapped.forEach((r) => issues.push({ type: 'requirement_unmapped', message: `Requirement not mapped: ${r.label}`, requirementLabel: r.label, source: r.source }));
  schema.requirements.filter((r) => r.status === 'inspector').forEach((r) => issues.push({ type: 'requirement_inspector_only', message: `Requirement only visible in inspector: ${r.label}`, requirementLabel: r.label, source: r.source }));

  const unexecutedDirectives = schema.directives.filter((d) => !directiveExecuted(schema, d));
  unexecutedDirectives.forEach((d) => issues.push({ type: 'directive_unexecuted', message: `Directive not executed: ${d}`, directive: d }));
  const directiveExecutionScore = schema.directives.length ? Math.round(((schema.directives.length - unexecutedDirectives.length) / schema.directives.length) * 100) : 100;

  const interactionScore = schema.interactive.selectableItems.length > 0 ? 100 : 45;
  if (schema.interactive.selectableItems.length === 0) issues.push({ type: 'missing_interaction_model', message: 'No selectable interaction model items found.' });

  const responsiveScore = schema.responsiveIntent ? 100 : 40;
  if (!schema.responsiveIntent) issues.push({ type: 'missing_responsive_intent', message: 'Responsive intent is missing.' });

  const exportReadinessScore = schema.product && schema.blocks.length > 0 ? 100 : 50;
  if (!schema.product || schema.blocks.length === 0) issues.push({ type: 'missing_export_metadata', message: 'Export metadata is incomplete.' });

  const visualCompletenessScore = (schema.visualDirectives.length > 0 || schema.plans.some((p) => p.visual.glow !== 'none' || p.visual.bevel !== 'none')) ? 92 : 60;
  if (schema.visualDirectives.length === 0) issues.push({ type: 'low_visual_specificity', message: 'Visual directives are sparse.' });

  if (!hasBlock(schema, 'ctaBand')) { issues.push({ type: 'weak_cta', message: 'Missing CTA band block.' }); suggestedRepairs.push({ type: 'add_missing_cta_band', reason: 'Primary action needs explicit CTA surface.' }); }

  if (hasIntent(schema, /(monthly|annual|billing switch|billing)/) && !hasBlock(schema, 'billingToggle')) {
    issues.push({ type: 'missing_block', message: 'Billing intent detected but billingToggle block missing.' });
    suggestedRepairs.push({ type: 'add_missing_billing_toggle', reason: 'Prompt implies monthly/annual switching.' });
  }
  if (hasIntent(schema, /(comparison|compare|matrix)/) && !hasBlock(schema, 'comparisonMatrix')) {
    issues.push({ type: 'missing_block', message: 'Comparison intent detected but comparisonMatrix block missing.' });
    suggestedRepairs.push({ type: 'add_missing_comparison_matrix', reason: 'Prompt implies plan comparison table.' });
  }
  if (hasIntent(schema, /(enterprise|contact sales|custom plan)/) && !hasBlock(schema, 'enterpriseContact')) {
    issues.push({ type: 'missing_block', message: 'Enterprise intent detected but enterpriseContact block missing.' });
    suggestedRepairs.push({ type: 'add_missing_enterprise_contact', reason: 'Prompt implies sales-assisted plan path.' });
  }
  if (unmapped.length > 0) {
    suggestedRepairs.push({ type: 'add_custom_requirement_grid_for_unmapped', reason: 'Unmapped requirements can be surfaced in safe custom grid.' });
    suggestedRepairs.push({ type: 'move_requirement_to_inspector', reason: 'Keep unresolved requirements visible in inspector.' });
  }
  if (unexecutedDirectives.length > 0) suggestedRepairs.push({ type: 'attach_directive_to_nearest_block', reason: 'Attach directive metadata to nearest rendered block.' });
  if (hasIntent(schema, /(calendar|booking|slots)/) && schema.interactive.selectableItems.length === 0) suggestedRepairs.push({ type: 'add_selectable_items_for_calendar_slots', reason: 'Calendar prompts should expose slot selection items.' });

  const overallScore = Math.round((promptCoverageScore * 0.3) + (directiveExecutionScore * 0.2) + (interactionScore * 0.15) + (responsiveScore * 0.1) + (exportReadinessScore * 0.15) + (visualCompletenessScore * 0.1));

  return { overallScore, promptCoverageScore, directiveExecutionScore, interactionScore, responsiveScore, exportReadinessScore, visualCompletenessScore, issues, suggestedRepairs };
}

export function applySafeRepairs(schema: Schema, report: QualityReport): Schema {
  const repaired: Schema = { ...schema, blocks: [...schema.blocks], requirements: schema.requirements.map((r) => ({ ...r })), custom: { ...schema.custom, body: [...schema.custom.body] }, interactive: { ...schema.interactive, selectableItems: [...schema.interactive.selectableItems] } };
  const need = (type: RepairSuggestionType) => report.suggestedRepairs.some((s) => s.type === type);
  if (need('add_missing_cta_band') && !hasBlock(repaired, 'ctaBand')) repaired.blocks.push({ type: 'ctaBand', title: 'Primary action', items: [repaired.action] });
  if (need('add_missing_billing_toggle') && !hasBlock(repaired, 'billingToggle')) repaired.blocks.push({ type: 'billingToggle', title: 'Billing cadence', items: ['Monthly', 'Annual'] });
  if (need('add_missing_comparison_matrix') && !hasBlock(repaired, 'comparisonMatrix')) repaired.blocks.push({ type: 'comparisonMatrix', title: 'Comparison matrix', items: repaired.plans.map((p) => p.name) });
  if (need('add_missing_enterprise_contact') && !hasBlock(repaired, 'enterpriseContact')) repaired.blocks.push({ type: 'enterpriseContact', title: 'Enterprise contact', items: ['Talk to sales'] });
  if (need('add_custom_requirement_grid_for_unmapped') && !hasBlock(repaired, 'customRequirementGrid')) {
    const labels = repaired.requirements.filter((r) => r.status === 'unmapped').map((r) => r.label);
    repaired.blocks.push({ type: 'customRequirementGrid', title: 'Unmapped requirements', items: labels });
    repaired.custom.body.push(...labels);
  }
  repaired.requirements.forEach((r) => { if (r.status === 'unmapped') r.status = 'inspector'; });
  return repaired;
}
