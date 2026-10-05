/**
 * CE QU'EST UN IDENTIFIANT DE PRODUIT — ARG-16.
 *
 * LE DÉFAUT, reproduit le 24/09 contre un PostgreSQL 16 réel :
 *
 *     ERROR:  invalid input syntax for type uuid: "libre-abc123"
 *
 * `POST /caisse/vente` décrémente le stock en visant l'identifiant du produit
 * quand la ligne en porte un (correctif du 18/09, `853dff7` : avant, il
 * décrémentait par NOM et confondait deux articles homonymes). La requête est :
 *
 *     SELECT id, stock, unite FROM produits
 *      WHERE marchand_id = $1::text AND id = $2 AND actif = true FOR UPDATE
 *
 * Or `produits.id` est de type `uuid`. Et le champ `productId` que l'écran
 * envoie ne porte PAS toujours un identifiant de catalogue : pour un article
 * libre — « Autre article » tapé au doigt (`POSCaisse.tsx:296`), ou un produit
 * dicté que l'appariement n'a pas reconnu (`vendreVocalUnifie.ts:312`,
 * `MicroVenteCaisse.tsx:211`) — l'écran y met un identifiant de LIGNE DE
 * PANIER, de la forme `libre-1758...`. C'est la même donnée avec deux sens.
 *
 * CE QUE ÇA COÛTAIT À LA MARCHANDE. La requête levait une erreur PostgreSQL
 * dans la transaction de la vente ; le `catch` faisait `rollbackTransaction()`
 * et relançait. L'API rendait un 500. Et côté écran, `doitEnfiler` classe tout
 * 5xx comme « transitoire » : la vente partait dans la file durable hors-ligne,
 * pour y être rejouée — et y échouer de nouveau, indéfiniment.
 *
 * Une vente contenant UN SEUL article libre n'était donc jamais enregistrée :
 * ni l'argent, ni le stock. Elle restait « en attente » pour toujours.
 *
 * LA RÈGLE. Un identifiant de produit est un UUID, ou il n'y en a pas. Tout ce
 * qui n'en est pas un rend `null` — c'est-à-dire « cette ligne n'a pas
 * d'identifiant de catalogue » — et la vente retombe alors sur le repli PAR NOM
 * déjà en place, celui d'avant le 18/09, prévu exactement pour ces lignes-là.
 *
 * ON NE CORRIGE PAS ÇA CÔTÉ ÉCRAN SEULEMENT : les ventes déjà bloquées dans la
 * file hors-ligne d'un téléphone rejouent leur payload TEL QUEL. Seul le
 * serveur peut les débloquer.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function identifiantProduit(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return UUID.test(t) ? t : null;
}
