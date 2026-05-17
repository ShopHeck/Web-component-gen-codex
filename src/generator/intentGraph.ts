export type IntentNode = { id: string; kind: 'primary' | 'secondary' | 'constraint' | 'journey'; label: string; confidence: number };
export type IntentGraph = { primaryIntent: string; nodes: IntentNode[] };

export function buildIntentGraph(prompt: string): IntentGraph {
  const text = prompt.toLowerCase();
  const nodes: IntentNode[] = [];
  const push = (id: string, kind: IntentNode['kind'], label: string, confidence: number) => nodes.push({ id, kind, label, confidence });
  if (/pricing|plan|billing/.test(text)) push('primary-pricing', 'primary', 'pricing', 0.9);
  else if (/dashboard|metrics|kpi/.test(text)) push('primary-dashboard', 'primary', 'dashboard', 0.85);
  else if (/globe|map|visualization/.test(text)) push('primary-visualization', 'primary', 'visualization', 0.9);
  else push('primary-custom', 'primary', 'custom', 0.7);

  if (/interactive|select|toggle|filter|expand/.test(text)) push('secondary-interaction', 'secondary', 'rich interaction', 0.8);
  if (/animate|motion|orbit|stagger|hover/.test(text)) push('secondary-motion', 'secondary', 'motion choreography', 0.75);
  if (/a11y|accessible|keyboard|contrast/.test(text)) push('constraint-a11y', 'constraint', 'accessibility coverage', 0.7);
  if (/mobile|responsive/.test(text)) push('constraint-responsive', 'constraint', 'responsive-first', 0.85);
  if (/compare|evaluate|choose|purchase/.test(text)) push('journey-evaluate', 'journey', 'evaluate options then act', 0.8);

  const primary = nodes.find((n) => n.kind === 'primary')?.label || 'custom';
  return { primaryIntent: primary, nodes };
}
