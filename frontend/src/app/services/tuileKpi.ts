/**
 * Les propriétés d'une tuile `UniversalKPI` depuis un compteur — module pur,
 * séparé de `etatLectureBO.ts` (qui dit l'état d'une lecture).
 */
import { explicationDuKpi, motDuKpi, nombreDuKpi, type AffichageKpi } from './etatLectureBO';

/**
 * CE QU'UNE TUILE REÇOIT — BO-01 (partagé : BODashboard, accueil institution).
 *
 * Un compteur rend l'un de TROIS états, et la tuile les sert différemment :
 *
 *   nombre        → `animatedTarget`, le compteur animé d'avant. ZÉRO COMPRIS :
 *                   un zéro lu est une réponse, et il s'affiche comme telle.
 *   chargement    → le mot « Lecture… », et AUCUN nombre. Pas de zéro qui
 *                   clignote en attendant la réponse.
 *   indisponible  → le mot « Indisponible », et la RAISON dans l'explication
 *                   (la tuile s'ouvre au clic) : l'agent doit pouvoir décider
 *                   quoi faire, pas seulement constater qu'il manque un chiffre.
 *
 * `animatedTarget` est laissé à `undefined` hors du cas « nombre » : c'est lui
 * qui, dans `UniversalKPI`, décide d'afficher un compteur plutôt qu'un texte.
 * Le laisser à `0` remettrait exactement le faux zéro qu'on ferme ici.
 */
export function kpiTuile(
  kpi: AffichageKpi,
  format?: (n: number) => string,
  unites?: { readonly prefix?: string; readonly suffix?: string },
) {
  const n = nombreDuKpi(kpi);
  const mot = motDuKpi(kpi);
  return {
    animatedTarget: format ? undefined : n,
    value: format && n !== undefined ? format(n) : (mot ?? undefined),
    explication: explicationDuKpi(kpi),
    // L'unité ne s'écrit qu'à côté d'un nombre : jamais « Indisponible % ».
    ...(kpi.type === 'nombre' ? unites : {}),
  };
}

/** « + » devant une variation POSITIVE seulement : jamais « +-12 % », ni « +0 % ». */
export function prefixeDeSigne(kpi: AffichageKpi): string | undefined {
  return kpi.type === 'nombre' && kpi.valeur > 0 ? '+' : undefined;
}
