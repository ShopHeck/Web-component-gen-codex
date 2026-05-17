import { describe, expect, it } from 'vitest';
import { extractDirectives } from './directives';

describe('directive normalization', () => {
  it('keeps emphasis as emphasis effect', () => {
    const directives = extractDirectives('Make the premium plan card emphasis with stronger visual weight.');
    expect(directives.some((d) => d.effect === 'emphasis')).toBe(true);
  });
});
