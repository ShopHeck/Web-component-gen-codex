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
  | 'missing_export_metadata'
  | 'visualization_mismatch'
  | 'shallow_interaction'
  | 'missing_state_coverage'
  | 'accessibility_intent_missing'
  | 'weak_narrative_flow'
  | 'requested_visual_object_missing'
  | 'marker_layer_missing'
  | 'animation_controls_missing'
  | 'dataset_notice_missing'
  | 'visualization_renderer_missing'
  | 'generic_copy_mismatch'
  | 'weak_renderer_fidelity'
  | 'marker_projection_missing'
  | 'marker_overlap_excessive'
  | 'missing_spatial_distribution'
  | 'placeholder_visualization'
  | 'excessive_layout_overflow'
  | 'oversized_generated_typography'
  | 'missing_core_visual_object'
  | 'missing_requested_data_display'
  | 'missing_visible_interaction';

export type RepairSuggestionType =
  | 'add_missing_billing_toggle'
  | 'add_missing_comparison_matrix'
  | 'add_missing_enterprise_contact'
  | 'add_missing_cta_band'
  | 'add_custom_requirement_grid_for_unmapped'
  | 'move_requirement_to_inspector'
  | 'attach_directive_to_nearest_block'
  | 'add_selectable_items_for_calendar_slots'
  | 'add_missing_globe_visualization'
  | 'add_missing_geo_marker_layer'
  | 'add_missing_animation_controls'
  | 'add_missing_dataset_notice'
  | 'add_missing_empty_state'
  | 'add_missing_loading_skeleton'
  | 'add_accessibility_hints';

export type QualityIssue = { type: QualityIssueType; message: string; requirementLabel?: string; source?: string; directive?: string };
export type RepairSuggestion = { type: RepairSuggestionType; reason: string };

export type QualityReport = {
  overallScore: number;
  interactionDepthScore: number;
  stateCoverageScore: number;
  accessibilityScore: number;
  narrativeFlowScore: number;
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

  let visualCompletenessScore = (schema.visualDirectives.length > 0 || schema.plans.some((p) => p.visual.glow !== 'none' || p.visual.bevel !== 'none')) ? 92 : 60;
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
  if (schema.pattern === 'visualization' || hasIntent(schema, /(globe|map|marker|geographic|latitude|longitude|spinning|rotating|orbit)/)) {
    if (!hasBlock(schema, 'globeVisualization') && hasIntent(schema, /(globe|spinning|rotating|orbit)/)) { issues.push({ type: 'visualization_mismatch', message: 'Requested globe visualization missing.' }); suggestedRepairs.push({ type: 'add_missing_globe_visualization', reason: 'Prompt requests a globe visual object.' }); }
    if (!hasBlock(schema, 'geoMarkerLayer') && hasIntent(schema, /(marker|location|base|latitude|longitude)/)) { issues.push({ type: 'visualization_mismatch', message: 'Requested geographic marker layer missing.' }); suggestedRepairs.push({ type: 'add_missing_geo_marker_layer', reason: 'Prompt requests marker/location layer.' }); }
    if (!hasBlock(schema, 'animationControls') && hasIntent(schema, /(spinning|rotating|orbit|animation)/)) { issues.push({ type: 'visualization_mismatch', message: 'Requested animation controls missing.' }); suggestedRepairs.push({ type: 'add_missing_animation_controls', reason: 'Prompt requests spinning/rotating controls.' }); }
    if (!hasBlock(schema, 'datasetNotice') && hasIntent(schema, /(every|all|complete|existing)/)) { issues.push({ type: 'visualization_mismatch', message: 'Dataset completeness notice missing.' }); suggestedRepairs.push({ type: 'add_missing_dataset_notice', reason: 'Comprehensive data request requires local dataset notice.' }); }
  }



  if (schema.pattern === 'pricing') {
    const hasPrice = schema.plans.some((p) => /\$/i.test(`${p.price} ${p.annual}`));
    if (!hasPrice) issues.push({ type: 'missing_requested_data_display', message: 'Pricing cards are missing visible prices.' });
    if (hasIntent(schema, /(comparison|matrix|compare)/) && !hasBlock(schema, 'comparisonMatrix')) issues.push({ type: 'weak_renderer_fidelity', message: 'Comparison was requested but comparison matrix block is missing.' });
  }
  if (schema.pattern === 'visualization') {
    if (hasIntent(schema, /(globe|spinning|rotating|orbit)/) && !hasBlock(schema, 'globeVisualization')) issues.push({ type: 'requested_visual_object_missing', message: 'Requested globe visual object missing.' });
    if (hasIntent(schema, /(marker|location|base|latitude|longitude)/) && !hasBlock(schema, 'geoMarkerLayer')) issues.push({ type: 'marker_layer_missing', message: 'Marker layer missing for requested geo markers.' });
    if (hasIntent(schema, /(spinning|rotating|orbit|animation)/) && !hasBlock(schema, 'animationControls')) issues.push({ type: 'animation_controls_missing', message: 'Animation controls missing.' });
    if (hasIntent(schema, /(every|all|complete|existing)/) && !hasBlock(schema, 'datasetNotice')) issues.push({ type: 'dataset_notice_missing', message: 'Dataset limitation notice missing.' });
    if (!schema.blocks.some((b) => ['globeVisualization','mapVisualization','geoMarkerLayer'].includes(b.type))) issues.push({ type: 'visualization_renderer_missing', message: 'Visualization renderer blocks missing.' });
    if (!/interfaceforge/i.test(schema.generationMeta?.originalPrompt || '') && /interfaceforge globe|interface blueprint/i.test(`${schema.headline} ${schema.subhead}`)) issues.push({ type: 'generic_copy_mismatch', message: 'Generic copy mismatch for visualization prompt.' });
    const hasStrongVisualObject = hasBlock(schema, 'globeVisualization') || hasBlock(schema, 'mapVisualization');
    const hasCoreVisualizationControls = hasBlock(schema, 'geoMarkerLayer') && hasBlock(schema, 'animationControls') && hasBlock(schema, 'datasetNotice');
    if (!hasStrongVisualObject || !hasCoreVisualizationControls) { visualCompletenessScore = Math.min(visualCompletenessScore, 48); issues.push({ type: 'missing_core_visual_object', message: 'Core visualization object or controls are not fully represented.' }); }
    if (!hasBlock(schema, 'geoMarkerLayer')) issues.push({ type: 'placeholder_visualization', message: 'Visualization relies on placeholder output without spatial marker layer.' });
  }

  const interactionDepthScore = Math.min(100, 40 + (schema.interactive.selectableItems.length * 12));
  if (hasIntent(schema, /(toggle|switch|select|pause|resume|composer|booking|checkout|send)/) && schema.interactive.selectableItems.length === 0) issues.push({ type: 'missing_visible_interaction', message: 'Prompt asks for interaction but visible interactive controls are weak.' });
  if (interactionDepthScore < 64) issues.push({ type: 'shallow_interaction', message: 'Interaction depth is shallow for studio-grade quality.' });

  const hasStateIntent = hasIntent(schema, /(loading|empty|error|success|disabled|selected|state)/);
  const hasStateSurface = schema.requirements.some((r) => /(loading|empty|error|success|disabled|selected)/i.test(r.label)) || schema.directives.some((d) => /(state|loading|error|success|disabled|selected)/i.test(d));
  const stateCoverageScore = hasStateIntent ? (hasStateSurface ? 90 : 45) : 80;
  if (hasStateIntent && !hasStateSurface) {
    issues.push({ type: 'missing_state_coverage', message: 'Prompt includes state intent but schema lacks explicit state surfaces.' });
    suggestedRepairs.push({ type: 'add_missing_empty_state', reason: 'Include explicit empty state to satisfy prompt state coverage.' });
    suggestedRepairs.push({ type: 'add_missing_loading_skeleton', reason: 'Include explicit loading skeleton for state coverage.' });
  }

  const hasA11yIntent = hasIntent(schema, /(a11y|accessible|keyboard|contrast|screen reader|focus)/);
  const hasA11ySurface = schema.requirements.some((r) => /(a11y|accessible|keyboard|contrast|screen reader|focus)/i.test(r.label))
    || schema.directives.some((d) => /(a11y|accessible|keyboard|contrast|screen reader|focus)/i.test(d))
    || schema.custom.body.some((line) => /(keyboard|focus|contrast|screen reader|aria)/i.test(line));
  const accessibilityScore = hasA11yIntent ? (hasA11ySurface ? 90 : 70) : 82;
  if (hasA11yIntent && !hasA11ySurface) {
    issues.push({ type: 'accessibility_intent_missing', message: 'Accessibility intent detected; add explicit a11y hints.' });
    suggestedRepairs.push({ type: 'add_accessibility_hints', reason: 'Prompt requests accessibility-oriented behavior.' });
  }

  const hasNarrative = hasBlock(schema, 'hero') && hasBlock(schema, 'ctaBand');
  const narrativeFlowScore = hasNarrative ? 90 : 55;
  if (!hasNarrative) issues.push({ type: 'weak_narrative_flow', message: 'Narrative flow should include hero and CTA progression.' });

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

  
  const hasGlobe = hasBlock(schema, 'globeVisualization');
  const hasMarkers = hasBlock(schema, 'geoMarkerLayer');
  const hasControls = hasBlock(schema, 'animationControls');
  const hasNotice = hasBlock(schema, 'datasetNotice') || hasBlock(schema, 'dataCoverageBadge');
  if (schema.pattern === 'visualization' && hasIntent(schema, /(globe|map|marker|visualization)/)) {
    if (!hasGlobe) issues.push({ type: 'weak_renderer_fidelity', message: 'Visualization renderer fidelity is weak without globe surface.' });
    if (!hasMarkers) issues.push({ type: 'marker_projection_missing', message: 'Spatial marker projection layer is missing.' });
    if (hasGlobe && !hasControls) issues.push({ type: 'missing_spatial_distribution', message: 'Interactive globe should include rotation controls for spatial context.' });
    if (!hasNotice) issues.push({ type: 'placeholder_visualization', message: 'Visualization should include sample dataset notice.' });
  }
  if (schema.pattern === 'pricing' && schema.headline.length > 42) issues.push({ type: 'oversized_generated_typography', message: 'Headline likely oversized for compact previews.' });
const visualizationPenalty = issues.filter((i)=>['requested_visual_object_missing','marker_layer_missing','animation_controls_missing','dataset_notice_missing','visualization_renderer_missing','generic_copy_mismatch','visualization_mismatch'].includes(i.type)).length * 11;
  const overallScore = Math.max(0, Math.round((promptCoverageScore * 0.22) + (directiveExecutionScore * 0.15) + (interactionScore * 0.1) + (responsiveScore * 0.08) + (exportReadinessScore * 0.1) + (visualCompletenessScore * 0.1) + (interactionDepthScore * 0.1) + (stateCoverageScore * 0.07) + (accessibilityScore * 0.04) + (narrativeFlowScore * 0.04)) - visualizationPenalty);

  return { overallScore, promptCoverageScore, directiveExecutionScore, interactionScore, responsiveScore, exportReadinessScore, visualCompletenessScore, interactionDepthScore, stateCoverageScore, accessibilityScore, narrativeFlowScore, issues, suggestedRepairs };
}

export function applySafeRepairs(schema: Schema, report: QualityReport): Schema {
  const repaired: Schema = { ...schema, blocks: [...schema.blocks], requirements: schema.requirements.map((r) => ({ ...r })), custom: { ...schema.custom, body: [...schema.custom.body] }, interactive: { ...schema.interactive, selectableItems: [...schema.interactive.selectableItems] } };
  const need = (type: RepairSuggestionType) => report.suggestedRepairs.some((s) => s.type === type);
  if (need('add_missing_cta_band') && !hasBlock(repaired, 'ctaBand')) repaired.blocks.push({ type: 'ctaBand', title: 'Primary action', items: [repaired.action] });
  if (need('add_missing_billing_toggle') && !hasBlock(repaired, 'billingToggle')) repaired.blocks.push({ type: 'billingToggle', title: 'Billing cadence', items: ['Monthly', 'Annual'] });
  if (need('add_missing_comparison_matrix') && !hasBlock(repaired, 'comparisonMatrix')) repaired.blocks.push({ type: 'comparisonMatrix', title: 'Comparison matrix', items: repaired.plans.map((p) => p.name) });
  if (need('add_missing_enterprise_contact') && !hasBlock(repaired, 'enterpriseContact')) repaired.blocks.push({ type: 'enterpriseContact', title: 'Enterprise contact', items: ['Talk to sales'] });
  if (need('add_missing_globe_visualization') && !hasBlock(repaired, 'globeVisualization')) repaired.blocks.push({ type: 'globeVisualization', title: 'Globe visualization', items: ['Local rotating globe'] });
  if (need('add_missing_geo_marker_layer') && !hasBlock(repaired, 'geoMarkerLayer')) repaired.blocks.push({ type: 'geoMarkerLayer', title: 'Geo marker layer', items: ['Location markers'] });
  if (need('add_missing_animation_controls') && !hasBlock(repaired, 'animationControls')) repaired.blocks.push({ type: 'animationControls', title: 'Animation controls', items: ['Pause rotation', 'Resume rotation'] });
  if (need('add_missing_dataset_notice') && !hasBlock(repaired, 'datasetNotice')) repaired.blocks.push({ type: 'datasetNotice', title: 'Dataset notice', items: ['Showing bundled public sample dataset. Replace dataset for complete coverage.'] });
  if (need('add_missing_empty_state')) {
    if (!repaired.custom.body.includes('Empty state guidance')) repaired.custom.body.push('Empty state guidance');
    if (!repaired.requirements.some((r) => /empty state/i.test(r.label))) repaired.requirements.push({ label: 'Empty state guidance', source: 'repair@state', bucket: 'content', status: 'inspector' });
  }
  if (need('add_missing_loading_skeleton')) {
    if (!repaired.custom.body.includes('Loading skeleton state')) repaired.custom.body.push('Loading skeleton state');
    if (!repaired.requirements.some((r) => /loading skeleton/i.test(r.label))) repaired.requirements.push({ label: 'Loading skeleton state', source: 'repair@state', bucket: 'content', status: 'inspector' });
  }
  if (need('add_accessibility_hints') && !repaired.custom.body.includes('Keyboard and focus hints')) repaired.custom.body.push('Keyboard and focus hints');
  if (need('add_custom_requirement_grid_for_unmapped') && !hasBlock(repaired, 'customRequirementGrid')) {
    const labels = repaired.requirements.filter((r) => r.status === 'unmapped').map((r) => r.label);
    repaired.blocks.push({ type: 'customRequirementGrid', title: 'Unmapped requirements', items: labels });
    repaired.custom.body.push(...labels);
  }
  repaired.requirements.forEach((r) => { if (r.status === 'unmapped') r.status = 'inspector'; });
  return repaired;
}
