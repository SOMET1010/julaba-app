/**
 * Contours administratifs niveau 1 (14 districts) : fichier `civ-regions.geo.json`
 * issu de GADM 4.1 (UC Davis, https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_CIV_1.json),
 * licence GADM (usage non commercial / académique selon conditions GADM).
 *
 * Les propriétés affichées / filtre utilisent les clés du découpage métier (CIV_DISTRICTS + « Lacs »).
 */
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import raw from './civ-regions.geo.json';
import { civFilterKeyFromGadmName1 } from './civ-gadm-district-mapping';

export interface CIVRegionProperties {
  name: string;
  code?: string;
  gadmName1: string;
}

type RawFeat = {
  type: 'Feature';
  properties: { NAME_1?: string; ISO_1?: string };
  geometry: Polygon | MultiPolygon;
};

const rawFc = raw as unknown as { type: 'FeatureCollection'; features: RawFeat[] };

export const CIV_REGIONS_GEOJSON: FeatureCollection<Polygon | MultiPolygon, CIVRegionProperties> = {
  type: 'FeatureCollection',
  features: rawFc.features.map((f) => {
    const name1 = String(f.properties.NAME_1 ?? '');
    const iso = f.properties.ISO_1;
    return {
      type: 'Feature' as const,
      properties: {
        name: civFilterKeyFromGadmName1(name1),
        code: iso && iso !== 'NA' ? String(iso) : undefined,
        gadmName1: name1,
      },
      geometry: f.geometry,
    };
  }),
};
