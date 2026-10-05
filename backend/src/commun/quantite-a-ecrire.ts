/**
 * CE QU'UNE MODIFICATION DE QUANTITÉ DOIT ÉCRIRE — STK-06.
 *
 * LE DÉFAUT, constaté sur le terrain le 24/09 : « en lieu et place d'ajout, il
 * a remis à zéro le stock ».
 *
 * `PATCH /stocks/:id` écrivait la quantité ainsi :
 *
 *     body.quantite != null ? Number(body.quantite) : null
 *
 * Or l'écran remet le champ à `''` quand la marchande l'efface
 * (`GestionStock.tsx:1072`). Et `'' != null` est VRAI, `Number('')` vaut
 * ZÉRO. La requête devenait `stock = COALESCE(0, stock)` — elle ÉCRIVAIT 0.
 *
 * Son stock était effacé en silence, sans erreur, sans un mot.
 *
 * C'EST STK-01d, SUR L'AUTRE ROUTE. La règle « la présence de la clé décide,
 * jamais la vérité de sa valeur » avait été posée en septembre sur
 * `PUT /caisse/produits/:id` (`nombreSaisi`), et jamais portée ici. Deux
 * routes écrivent la même ligne `produits` ; une seule avait reçu le
 * correctif. Deux chemins, deux règles — et celui-ci n'a jamais été repris.
 *
 * `null` veut dire « ne touche pas à cette colonne » : c'est ce que le
 * `COALESCE` de la requête attend. Un champ vidé n'est pas une décision de
 * mettre le stock à zéro — c'est un champ vidé, et on n'y touche pas.
 *
 * POUR METTRE VRAIMENT UNE QUANTITÉ À ZÉRO, elle tape « 0 ». C'est un geste,
 * pas un oubli, et il passe : seule la chaîne VIDE est écartée.
 */
export function quantiteAEcrire(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
