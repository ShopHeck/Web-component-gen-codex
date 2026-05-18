import { describe, expect, it } from 'vitest';
import { markerDepthOpacity, projectMarker } from './globeProjection';
import { usMilitaryBasesSample } from '../data/usMilitaryBases';

describe('globe projection', () => {
  it('projects different lat/lon points to separated coordinates', () => {
    const a = projectMarker(35.1417, -79.0060, 12, 100, 160, 160);
    const b = projectMarker(32.6765, -117.1211, 12, 100, 160, 160);
    const c = projectMarker(47.1009, -122.5870, 12, 100, 160, 160);
    expect(a.x).not.toBeCloseTo(b.x, 1);
    expect(a.y).not.toBeCloseTo(b.y, 1);
    expect(c.x).not.toBeCloseTo(b.x, 1);
  });

  it('ensures most visible markers have unique rounded coordinates', () => {
    const projected = usMilitaryBasesSample.map((base) => projectMarker(base.latitude, base.longitude, 0, 118, 160, 160)).filter((m) => m.visible);
    const unique = new Set(projected.map((m) => `${Math.round(m.x)}:${Math.round(m.y)}`));
    expect(unique.size / projected.length).toBeGreaterThanOrEqual(0.8);
  });

  it('rotation changes projected positions and depth opacity differs front/back', () => {
    const stationary = projectMarker(35.1417, -79.0060, 0, 118, 160, 160);
    const rotated = projectMarker(35.1417, -79.0060, 55, 118, 160, 160);
    expect(stationary.x).not.toBeCloseTo(rotated.x, 3);
    const front = projectMarker(0, 0, 0, 100, 160, 160);
    const back = projectMarker(0, 180, 0, 100, 160, 160);
    expect(front.visible).toBe(true);
    expect(back.visible).toBe(false);
    expect(markerDepthOpacity(front.cartesian).opacity).toBeGreaterThan(markerDepthOpacity(back.cartesian).opacity);
  });
});
