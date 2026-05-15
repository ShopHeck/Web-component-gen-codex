import type { Span } from './entities';
type SchemaLike = { headline:string; subhead:string; action:string; features:string[]; toggles:string[]; requirements:{label:string}[]; directives:string[] };

export type ValidationIssue = { label: string; source: string; reason: string };

export function validateMappings(required: Span[], schema: SchemaLike): ValidationIssue[] {
  const haystack = [
    schema.headline,
    schema.subhead,
    schema.action,
    ...schema.features,
    ...schema.toggles,
    ...schema.requirements.map((r) => r.label),
    ...schema.directives
  ].join(' ').toLowerCase();

  return required
    .filter((token) => token.text.trim().length > 1)
    .filter((token) => !haystack.includes(token.text.toLowerCase()))
    .map((token) => ({ label: token.text, source: `${token.start}-${token.end}`, reason: 'detected_token_unmapped' }));
}
