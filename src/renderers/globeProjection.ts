export type SpherePoint = { x: number; y: number; z: number };

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function latLonToCartesian(lat: number, lon: number, rotationDeg = 0): SpherePoint {
  const latRad = degToRad(lat);
  const lonRad = degToRad(lon + rotationDeg);
  const x = Math.cos(latRad) * Math.sin(lonRad);
  const y = Math.sin(latRad);
  const z = Math.cos(latRad) * Math.cos(lonRad);
  return { x, y, z };
}

export function projectCartesianTo2D(point: SpherePoint, radius: number, centerX: number, centerY: number) {
  return { x: centerX + point.x * radius, y: centerY - point.y * radius };
}

export function markerVisible(point: SpherePoint) {
  return point.z >= 0;
}

export function markerDepthOpacity(point: SpherePoint) {
  const depth = Math.max(0, Math.min(1, (point.z + 1) / 2));
  return { opacity: 0.2 + depth * 0.8, scale: 0.65 + depth * 0.55 };
}

export function projectMarker(lat: number, lon: number, rotationDeg: number, radius: number, centerX: number, centerY: number) {
  const cartesian = latLonToCartesian(lat, lon, rotationDeg);
  const projected = projectCartesianTo2D(cartesian, radius, centerX, centerY);
  return { ...projected, z: cartesian.z, visible: markerVisible(cartesian), depth: markerDepthOpacity(cartesian), cartesian };
}
