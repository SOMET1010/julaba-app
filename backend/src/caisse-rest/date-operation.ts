/**
 * LA DATE D'UNE OPÉRATION FAITE HORS-LIGNE — bornée, jamais crue sur parole.
 *
 * LE DÉFAUT QU'ON FERME, audit du 18/09/2026. La file hors-ligne mémorisait
 * bien l'instant de la vente (`ts`), mais ne l'envoyait pas au rejeu : le
 * serveur horodatait au moment où il recevait. Une vente de 2 000 F faite à
 * 23h55 sans réseau, remontée à 00h05, basculait sur le jour suivant. Le total
 * global restait juste ; la JOURNÉE de la marchande — celle qu'elle compte le
 * soir en fermant sa caisse — était fausse des deux côtés.
 *
 * POURQUOI ON NE FAIT PAS SIMPLEMENT CONFIANCE AU CLIENT. Accepter une date
 * arbitraire, c'est accepter qu'on antidate une vente : on pourrait remplir un
 * mois passé, fausser un rapport hebdomadaire déjà lu, ou déplacer de l'argent
 * d'une journée close vers une autre. Trois bornes, donc :
 *
 *   - jamais dans le FUTUR (au-delà d'une petite tolérance d'horloge : les
 *     téléphones dérivent, surtout hors réseau) ;
 *   - jamais au-delà de la fenêtre de rejeu raisonnable (une file qui traîne
 *     depuis un mois n'est plus une vente d'aujourd'hui) ;
 *   - illisible ou hors bornes → on retombe sur « maintenant », comme avant.
 *     Refuser la vente serait pire : on perdrait de l'argent réel pour un
 *     problème d'horodatage.
 */

/** Une horloge de téléphone peut avancer de quelques minutes. */
export const TOLERANCE_FUTUR_MS = 10 * 60 * 1000;
/** Au-delà, ce n'est plus un rejeu : c'est une réécriture du passé. */
export const ANCIENNETE_MAX_MS = 14 * 24 * 60 * 60 * 1000;

export function dateOperationValide(
  brut: unknown,
  maintenant: number = Date.now(),
): Date | null {
  if (typeof brut !== 'string' || brut.trim() === '') return null;
  const t = Date.parse(brut);
  if (Number.isNaN(t)) return null;
  if (t > maintenant + TOLERANCE_FUTUR_MS) return null;
  if (t < maintenant - ANCIENNETE_MAX_MS) return null;
  return new Date(t);
}
