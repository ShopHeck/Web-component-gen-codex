export type SpherePoint = { x: number; y: number; z: number };

export function latLonToSpherePoint(lat: number, lon: number, rotationDeg = 0): SpherePoint {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon + rotationDeg) * Math.PI) / 180;
  const x = Math.cos(latRad) * Math.sin(lonRad);
  const y = Math.sin(latRad);
  const z = Math.cos(latRad) * Math.cos(lonRad);
  return { x, y, z };
}

export function projectSpherePointTo2D(point: SpherePoint, radius: number, center: { x: number; y: number }) {
  return { x: center.x + point.x * radius, y: center.y - point.y * radius };
}

export function isVisible(point: SpherePoint) {
  return point.z >= 0;
}

export function markerDepthOpacity(point: SpherePoint) {
  const depth = Math.max(0, Math.min(1, (point.z + 1) / 2));
  return { opacity: 0.2 + depth * 0.8, scale: 0.65 + depth * 0.55 };
}
