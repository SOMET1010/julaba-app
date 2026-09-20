/**
 * DIRE « 3 TAS », PAS « 3 × » — arbitrage de Patrick, 19/09/2026.
 *
 * LE DÉFAUT QU'ON FERME (audit Odoo, constat 1 — le seul qui détruisait de
 * l'information de façon irréversible). Un reçu disait « 3 × Tomate ».
 * Trois quoi ? L'unité ne vivait que dans `produits.unite`, que la marchande
 * peut changer à tout moment : le jour où elle passe la tomate du tas au kilo,
 * TOUTES ses ventes passées se relisaient au kilo. Rien ne permettait de le
 * savoir, rien ne permettait de reconstituer.
 *
 * L'unité est désormais figée sur la LIGNE de vente, au moment où elle est
 * faite — comme le prix d'achat, pour que la marge d'hier ne bouge pas quand
 * le fournisseur change de tarif. Ce module la met en mots.
 *
 * Module PUR : aucune dépendance, testable sans écran.
 */

/**
 * Unités qui n'apportent RIEN à l'oral ni à l'écrit. « unité » est la valeur
 * par défaut posée sur un article libre : écrire « 3 unité » ajoute du bruit
 * là où « 3 » suffit. On ne range PAS « pièce » ici — « 3 pièces de banane »
 * dit quelque chose de vrai, et une marchande le dit ainsi.
 */
const UNITES_NEUTRES = new Set(['unite', 'unité', 'unites', 'unités', '']);

/** Abréviations de mesure : jamais de pluriel (« 3 kg », pas « 3 kgs »). */
const ABREVIATIONS = new Set(['kg', 'g', 'l', 'ml', 'cl', 'm', 'cm']);

const sansAccents = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Accorde une unité à la quantité. Prudent par construction : on n'ajoute un
 * « s » que si le mot ne finit pas déjà par « s » ou « x » et n'est pas une
 * abréviation. « tas » reste « tas », « sac » devient « sacs », « kg » reste
 * « kg ». On préfère un pluriel manquant à un mot inventé.
 */
export function accorderUnite(unite: string, quantite: number): string {
  const u = unite.trim();
  if (!u) return '';
  if (quantite <= 1) return u;
  if (ABREVIATIONS.has(sansAccents(u))) return u;
  if (/[sx]$/i.test(u)) return u;
  return `${u}s`;
}

/**
 * « 3 tas », « 2 kg », « 1 sac » — ou « 3 » quand l'unité n'apprend rien.
 * C'est ce qu'une marchande dirait à sa cliente.
 */
export function quantiteAvecUnite(quantite: number, unite?: string | null): string {
  const q = Number.isFinite(quantite) ? quantite : 1;
  const nombre = q.toLocaleString('fr-FR');
  if (!unite || UNITES_NEUTRES.has(sansAccents(String(unite)))) return nombre;
  return `${nombre} ${accorderUnite(String(unite), q)}`;
}

/**
 * L'UNITÉ SEULE — « tas », « kg », « pièces » — pour les endroits où la
 * quantité est déjà affichée à part (un champ qu'on modifie, par exemple) et
 * où recomposer « 3 tas » en une seule chaîne n'est pas possible.
 *
 * Renvoie '' quand l'unité n'apprend rien (« unité »), exactement comme
 * `quantiteAvecUnite` : « × 3 unités » est du bruit là où « × 3 » suffit.
 * L'accord suit la quantité, sinon on écrirait « 3 tas » et « 2 sac ».
 */
export function uniteSeule(quantite: number, unite?: string | null): string {
  if (!unite || UNITES_NEUTRES.has(sansAccents(String(unite)))) return '';
  const q = Number.isFinite(quantite) ? quantite : 1;
  return accorderUnite(String(unite), q);
}

/**
 * Une ligne de vente telle qu'elle se lit sur un reçu : « 3 tas de Tomate ».
 * Le « de » disparaît quand il n'y a pas d'unité — « 3 de Tomate » ne se dit
 * pas — et on retombe alors sur la forme historique « 3 × Tomate ».
 */
export function ligneLisible(quantite: number, nom: string, unite?: string | null): string {
  const q = Number.isFinite(quantite) ? quantite : 1;
  if (!unite || UNITES_NEUTRES.has(sansAccents(String(unite)))) {
    return `${q.toLocaleString('fr-FR')} × ${nom}`;
  }
  return `${quantiteAvecUnite(q, unite)} de ${nom}`;
}
