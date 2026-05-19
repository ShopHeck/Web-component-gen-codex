import { describe, expect, it } from 'vitest';
import { optimizePrompt } from './promptOptimizer';

describe('promptOptimizer detailed specs', () => {
  it('extracts pricing components, layouts, and styles successfully', () => {
    const prompt = 'Create a sleek and modern pricing 4 card pricing display with $79/month $129/month $189/month and $229/month pricing cards with neural glow, export-ready code, and a launch CTA. Make the $229/month pricing card stand out by increasing size 20% and adding a subtle glow and 3d bevel effect.';
    const result = optimizePrompt(prompt);
    
    expect(result.original).toBe(prompt);
    expect(result.optimized).toContain('=== OPTIMIZED COMPONENT BRIEF ===');
    expect(result.optimized).toContain('[BLOCK STRUCTURE DIRECTIVES]');
    expect(result.optimized).toContain('[VISUAL STYLING DIRECTIVES]');
    expect(result.optimized).toContain('[INTERACTION SCHEME]');
    
    // Check pricing block structures
    expect(result.optimized).toContain('[Block: pricingCards]');
    
    // Check visual styles extracted
    expect(result.optimized).toContain('[Style: active-glow]');
    expect(result.optimized).toContain('[Style: 3d-bevel-borders]');
    expect(result.optimized).toContain('[Style: featured-scale-effect]');
  });

  it('extracts globe and geographic visualization directives successfully', () => {
    const prompt = 'Create an interactive neural globe visualization with glowing markers, marker legend, pause/resume control, dataset notice, and data coverage badge for US military bases.';
    const result = optimizePrompt(prompt);

    expect(result.optimized).toContain('[Block: globeVisualization]');
    expect(result.optimized).toContain('[Block: geoMarkerLayer]');
    expect(result.optimized).toContain('[Block: markerLegend]');
    expect(result.optimized).toContain('[Block: animationControls]');
    expect(result.optimized).toContain('[Block: datasetNotice]');
    expect(result.optimized).toContain('[Block: dataCoverageBadge]');
  });
});
