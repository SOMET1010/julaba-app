import { CIV_DISTRICTS } from '../../../data/civ-geography';

/**
 * District « Lacs » (polygone GADM) : sous-régions métier utilisées dans les zones BO
 * (hors fichier CIV_DISTRICTS actuel, qui ne duplique pas ce district).
 */
const LACS_SUBREGIONS_BO = ['Iffou', "N'Zi"] as const;

/**
 * Correspondance libellé NAME_1 (GADM 4.1) vers clé de filtre = `nom` du district dans CIV_DISTRICTS,
 * ou « Lacs » pour le polygone sans entrée homonyme dans CIV_DISTRICTS.
 */
export const GADM_NAME1_TO_FILTER_KEY: Record<string, string> = {
  Abidjan: 'Abidjan',
  Yamoussoukro: 'Yamoussoukro',
  Lagunes: 'Lagunes',
  'Comoé': 'Comoe',
  'Denguélé': 'Denguele',
  'Gôh-Djiboua': 'Goh-Djiboua',
  Lacs: 'Lacs',
  Montagnes: 'Montagnes',
  'Sassandra-Marahoué': 'Sassandra-Marahoue',
  Savanes: 'Savanes',
  ValléeduBandama: 'Vallee du Bandama',
  Woroba: 'Woroba',
  'Bas-Sassandra': 'Bas-Sassandra',
  Zanzan: 'Zanzan',
};

export function civFilterKeyFromGadmName1(name1: string): string {
  const k = GADM_NAME1_TO_FILTER_KEY[name1];
  if (k) return k;
  const n = name1.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hit = Object.keys(GADM_NAME1_TO_FILTER_KEY).find(
    (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === n,
  );
  return hit ? GADM_NAME1_TO_FILTER_KEY[hit] : name1;
}

/** Sous-région (libellé zone) vers district parent (CIV_DISTRICTS.nom), si trouvé. */
export function civDistrictForSubregion(sub: string): string | null {
  for (const d of CIV_DISTRICTS) {
    if (d.regions.some((r) => r.nom === sub)) return d.nom;
  }
  return null;
}

/**
 * Étend la valeur du filtre « région » vers les libellés `groupeRegionLibelle` attendus en base.
 * Accepte soit un district (`nom` du district), soit une sous-région déjà fine.
 */
export function expandRegionFilterForZones(regionFilter: string | undefined): string[] | null {
  if (!regionFilter) return null;
  if (regionFilter === 'Lacs') return [...LACS_SUBREGIONS_BO];
  const d = CIV_DISTRICTS.find((x) => x.nom === regionFilter);
  if (d) return d.regions.map((r) => r.nom);
  return [regionFilter];
}
