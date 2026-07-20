export type RegionCenter = {
  name: string;
  lat: number;
  lng: number;
};

export const CIV_REGIONS_CENTERS: Record<string, RegionCenter> = {
  Abidjan: { name: 'Abidjan', lat: 5.345, lng: -4.0083 },
  Yamoussoukro: { name: 'Yamoussoukro', lat: 6.8276, lng: -5.2893 },
  Bouake: { name: 'Bouake', lat: 7.6906, lng: -5.0303 },
  Daloa: { name: 'Daloa', lat: 6.8773, lng: -6.4503 },
  'San-Pedro': { name: 'San-Pedro', lat: 4.7485, lng: -6.6363 },
  Korhogo: { name: 'Korhogo', lat: 9.4581, lng: -5.6294 },
  Man: { name: 'Man', lat: 7.4002, lng: -7.5544 },
  Gagnoa: { name: 'Gagnoa', lat: 6.1314, lng: -5.9506 },
  Abengourou: { name: 'Abengourou', lat: 6.7297, lng: -3.4961 },
  Divo: { name: 'Divo', lat: 5.8378, lng: -5.3572 },
  Soubre: { name: 'Soubre', lat: 5.7833, lng: -6.6 },
  Odienne: { name: 'Odienne', lat: 9.5028, lng: -7.5648 },
  Bondoukou: { name: 'Bondoukou', lat: 8.0402, lng: -2.7997 },
  Seguela: { name: 'Seguela', lat: 7.9606, lng: -6.6739 },
};

export const CIV_NATIONAL_CENTER: { lat: number; lng: number; zoom: number } = {
  lat: 7.54,
  lng: -5.55,
  zoom: 7,
};

function normalizeRegionName(regionName: string): string {
  return regionName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getRegionCenter(regionName: string | null | undefined): RegionCenter | null {
  if (!regionName) return null;
  const normalized = normalizeRegionName(regionName);

  const match = Object.entries(CIV_REGIONS_CENTERS).find(([key]) => {
    const normalizedKey = normalizeRegionName(key);
    return normalizedKey === normalized || normalizedKey.includes(normalized) || normalized.includes(normalizedKey);
  });

  return match ? match[1] : null;
}
