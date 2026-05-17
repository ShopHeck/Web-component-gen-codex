import { describe, expect, it } from 'vitest';
import { isVisible, latLonToSpherePoint, markerDepthOpacity, projectSpherePointTo2D } from './globeProjection';

describe('globe projection', () => {
  it('projects different lat/lon points to separated coordinates', () => {
    const a = projectSpherePointTo2D(latLonToSpherePoint(35, -79, 12), 100, { x: 160, y: 160 });
    const b = projectSpherePointTo2D(latLonToSpherePoint(33, -117, 12), 100, { x: 160, y: 160 });
    expect(a.x).not.toBeCloseTo(b.x, 1);
    expect(a.y).not.toBeCloseTo(b.y, 1);
  });

  it('detects far-side visibility and depth opacity', () => {
    const front = latLonToSpherePoint(0, 0, 0);
    const far = latLonToSpherePoint(0, 180, 0);
    expect(isVisible(front)).toBe(true);
    expect(isVisible(far)).toBe(false);
    expect(markerDepthOpacity(front).opacity).toBeGreaterThan(markerDepthOpacity(far).opacity);
  });
});
