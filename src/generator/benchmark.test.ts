import { describe, expect, it } from 'vitest';
import { promptFixtures } from './fixtures';
import { benchmarkSummary, runPromptBenchmark } from './benchmark';

const bannedLeakFragments = [
  'create ',
  'build ',
  'design '
];

describe('prompt benchmark fixture suite', () => {
  it('has 26 realistic fixtures', () => {
    expect(promptFixtures).toHaveLength(26);
  });

  it('meets quality and extraction expectations across fixtures', () => {
    const results = runPromptBenchmark(promptFixtures);

    for (const fixture of promptFixtures) {
      const result = results.find((r) => r.id === fixture.id);
      expect(result, `missing result for ${fixture.id}`).toBeDefined();
      if (!result) continue;

      const finalSchema = result.repairedSchema ?? result.schema;
      const finalScore = result.repairedScore ?? result.initialScore;

      expect(finalScore, `${fixture.id} score`).toBeGreaterThanOrEqual(fixture.minQualityScore);
      expect(finalSchema.pattern, `${fixture.id} pattern`).toBe(fixture.expectedPattern);

      for (const block of fixture.expectedBlocks) expect(result.missingBlocks, `${fixture.id} missing block ${block}`).not.toContain(block);
      for (const value of fixture.expectedValues) expect(result.missingValues, `${fixture.id} missing value ${value}`).not.toContain(value);
      for (const directive of fixture.expectedDirectives) expect(result.missingDirectives, `${fixture.id} missing directive ${directive}`).not.toContain(directive);
      for (const interaction of fixture.expectedInteractions) expect(result.missingInteractions, `${fixture.id} missing interaction ${interaction}`).not.toContain(interaction);

      const visibleCopy = [
        finalSchema.headline,
        finalSchema.subhead,
        finalSchema.action,
        ...finalSchema.plans.map((plan) => plan.description)
      ].join(' ').toLowerCase();

      for (const fragment of bannedLeakFragments) {
        expect(visibleCopy.includes(`${fragment}${fixture.prompt.toLowerCase().slice(0, 24)}`), `${fixture.id} should not leak prompt text`).toBe(false);
      }
    }
  });

  it('produces benchmark summary output', () => {
    const summary = benchmarkSummary(runPromptBenchmark(promptFixtures));
    expect(summary).toContain('InterfaceForge Prompt Benchmark');
    expect(summary).toContain('26 fixtures');
  });
});
