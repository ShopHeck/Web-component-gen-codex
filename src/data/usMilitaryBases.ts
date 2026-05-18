export type MilitaryBase = { id: string; name: string; branch: 'Army' | 'Navy' | 'Air Force' | 'Marine Corps' | 'Space Force' | 'Coast Guard'; state: string; latitude: number; longitude: number };

export const usMilitaryBasesSample: MilitaryBase[] = [
  { id: 'fort-bragg', name: 'Fort Bragg', branch: 'Army', state: 'NC', latitude: 35.1417, longitude: -79.0060 },
  { id: 'camp-pendleton', name: 'Camp Pendleton', branch: 'Marine Corps', state: 'CA', latitude: 33.3040, longitude: -117.3066 },
  { id: 'ramstein-air-base', name: 'Ramstein Air Base', branch: 'Air Force', state: 'Germany', latitude: 49.4367, longitude: 7.6000 },
  { id: 'nsa-naples', name: 'Naval Support Activity Naples', branch: 'Navy', state: 'Italy', latitude: 40.8860, longitude: 14.2905 },
  { id: 'camp-humphreys', name: 'Camp Humphreys', branch: 'Army', state: 'South Korea', latitude: 36.9614, longitude: 127.0314 },
  { id: 'yokota-air-base', name: 'Yokota Air Base', branch: 'Air Force', state: 'Japan', latitude: 35.7486, longitude: 139.3486 },
  { id: 'andersen-afb', name: 'Andersen Air Force Base', branch: 'Air Force', state: 'Guam', latitude: 13.5833, longitude: 144.9167 },
  { id: 'nsf-diego-garcia', name: 'Naval Support Facility Diego Garcia', branch: 'Navy', state: 'Indian Ocean', latitude: -7.3133, longitude: 72.4111 },
  { id: 'pituffik-space-base', name: 'Pituffik Space Base', branch: 'Space Force', state: 'Greenland', latitude: 76.5312, longitude: -68.7031 },
  { id: 'camp-lemonnier', name: 'Camp Lemonnier', branch: 'Navy', state: 'Djibouti', latitude: 11.5461, longitude: 43.1581 }
];

export const usMilitaryBasesDatasetNotice = 'Showing bundled public sample dataset. Replace dataset for complete coverage.';
