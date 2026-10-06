/**
 * L'ACCORD FRANÇAIS, À UN SEUL ENDROIT — VOIX-07, 27/09/2026.
 *
 * Module PUR : il n'importe rien, et c'est ce qui fait sa valeur. Les deux
 * modules qui accordent des noms de produits ne pouvaient pas partager leur
 * règle — `dialoguesTata` importe le catalogue i18n, `ecouteCaisse` revendique
 * de n'importer rien. Chacun avait donc la sienne, ou pas de règle du tout.
 *
 * LE DÉFAUT QUE ÇA FERME. Sur la même vente, au même instant, la voix disait
 * « Vente de 2 piments » et l'aperçu de l'écran affichait « 2 piment ». Elle
 * entend une chose, elle en lit une autre, et elle ne peut vérifier ni l'une
 * ni l'autre — c'est précisément à elle qu'on demande de confirmer.
 *
 * CE MODULE EST FRANÇAIS, ET SON NOM LE DIT. Aucune langue locale n'hérite de
 * cette règle : une langue qui accorde autrement fournit sa propre
 * composition. C'est pour ça qu'il ne s'appelle pas `accord.ts`.
 */

/** Pluriel français simple : +s sauf si le mot finit déjà par s, x ou z. */
export function pluriel(mot: string): string {
  return /[sxz]$/i.test(mot) ? mot : `${mot}s`;
}

/** Abréviations d'unité invariables (« 2 kg », pas « 2 kgs »). */
export const UNITES_INVARIABLES: ReadonlySet<string> =
  new Set(['kg', 'g', 'mg', 'l', 'cl', 'ml', 'dl', 'm', 'cm', 'mm', 'km']);

export function plurielUnite(u: string): string {
  return UNITES_INVARIABLES.has(u.toLowerCase()) ? u : pluriel(u);
}

/**
 * Pluralise le DERNIER mot d'un libellé (« banane plantain » → « banane
 * plantains »). C'est le dernier mot qui porte le nombre en français, pas le
 * premier : « banane plantain » désigne une variété, pas une banane.
 */
export function plurielNom(nom: string): string {
  const mots = nom.trim().split(' ');
  if (mots.length === 0) return nom;
  mots[mots.length - 1] = pluriel(mots[mots.length - 1]);
  return mots.join(' ');
}
