import type { Schema } from '../types/schema';
import { buildSchema } from './parser';
import { applySafeRepairs, evaluateQuality, type QualityIssue } from './quality';
import type { PromptFixture } from './fixtures';

export type FixtureBenchmarkResult = {
  id: string;
  pass: boolean;
  initialScore: number;
  repairedScore?: number;
  repaired: boolean;
  schema: Schema;
  repairedSchema?: Schema;
  missingBlocks: string[];
  missingValues: string[];
  missingDirectives: string[];
  missingInteractions: string[];
  issues: QualityIssue[];
};

const includesAny = (haystack: string[], needle: string) => haystack.some((item) => item.toLowerCase().includes(needle.toLowerCase()));

export function runPromptBenchmark(fixtures: PromptFixture[]): FixtureBenchmarkResult[] {
  return fixtures.map((fixture) => {
    const schema = buildSchema(fixture.prompt);
    const initialReport = evaluateQuality(schema);
    let finalSchema = schema;
    let finalReport = initialReport;
    let repaired = false;

    if (initialReport.overallScore < fixture.minQualityScore) {
      finalSchema = applySafeRepairs(schema, initialReport);
      finalReport = evaluateQuality(finalSchema);
      repaired = true;
    }

    const blockTypes = finalSchema.blocks.map((b) => b.type);
    const searchableValues = [
      ...finalSchema.requirements.map((r) => `${r.label} ${r.source}`),
      ...finalSchema.valuesPricesMetrics,
      ...finalSchema.contentEntities,
      ...finalSchema.controlsInteractions,
      ...finalSchema.plans.flatMap((p) => [p.name, p.price, p.annual, p.description, ...p.features]),
      finalSchema.headline,
      finalSchema.subhead,
      finalSchema.action
    ];

    const missingBlocks = fixture.expectedBlocks.filter((b) => !blockTypes.includes(b as any));
    const missingValues = fixture.expectedValues.filter((v) => !includesAny(searchableValues, v));
    const missingDirectives = fixture.expectedDirectives.filter((d) => !includesAny(finalSchema.directives, d) && !includesAny(finalSchema.visualDirectives, d));
    const missingInteractions = fixture.expectedInteractions.filter((i) => finalSchema.interactive.ctaBehavior !== i && !includesAny(finalSchema.interactive.selectableItems.map((s) => s.label), i));

    const pass = finalReport.overallScore >= fixture.minQualityScore;
    return {
      id: fixture.id,
      pass,
      initialScore: initialReport.overallScore,
      repairedScore: repaired ? finalReport.overallScore : undefined,
      repaired,
      schema,
      repairedSchema: repaired ? finalSchema : undefined,
      missingBlocks,
      missingValues,
      missingDirectives,
      missingInteractions,
      issues: finalReport.issues
    };
  });
}

export function benchmarkSummary(results: FixtureBenchmarkResult[]): string {
  const total = results.length;
  const passedInitially = results.filter((r) => r.pass && !r.repaired).length;
  const passedAfterRepair = results.filter((r) => r.pass && r.repaired).length;
  const failed = results.filter((r) => !r.pass).length;
  const avgInitial = Math.round(results.reduce((sum, r) => sum + r.initialScore, 0) / Math.max(1, total));
  const avgRepaired = Math.round(results.reduce((sum, r) => sum + (r.repairedScore ?? r.initialScore), 0) / Math.max(1, total));

  return [
    'InterfaceForge Prompt Benchmark',
    `${total} fixtures`,
    `${passedInitially} passed initially`,
    `${passedAfterRepair} passed after repair`,
    `${failed} failed`,
    `Average initial score: ${avgInitial}`,
    `Average repaired score: ${avgRepaired}`
  ].join('\n');
}
