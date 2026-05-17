export type MilitaryBase = { id: string; name: string; branch: 'Army' | 'Navy' | 'Air Force' | 'Marine Corps' | 'Space Force' | 'Coast Guard'; state: string; latitude: number; longitude: number };

export const usMilitaryBasesSample: MilitaryBase[] = [
  { id: 'fort-bragg', name: 'Fort Bragg', branch: 'Army', state: 'NC', latitude: 35.1417, longitude: -79.0060 },
  { id: 'camp-pendleton', name: 'Camp Pendleton', branch: 'Marine Corps', state: 'CA', latitude: 33.3040, longitude: -117.3066 },
  { id: 'naval-station-norfolk', name: 'Naval Station Norfolk', branch: 'Navy', state: 'VA', latitude: 36.9468, longitude: -76.3313 },
  { id: 'joint-base-san-antonio', name: 'Joint Base San Antonio', branch: 'Air Force', state: 'TX', latitude: 29.3842, longitude: -98.5811 },
  { id: 'peterson-sfb', name: 'Peterson Space Force Base', branch: 'Space Force', state: 'CO', latitude: 38.8138, longitude: -104.7008 },
  { id: 'coast-guard-alameda', name: 'Coast Guard Base Alameda', branch: 'Coast Guard', state: 'CA', latitude: 37.7726, longitude: -122.3008 }
];

export const usMilitaryBasesDatasetNotice = 'Showing bundled public sample dataset. Replace dataset for complete coverage.';
