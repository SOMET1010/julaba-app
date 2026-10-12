#!/usr/bin/env node
/**
 * « N AFFICHÉS SUR … » COMPTE LA LISTE, PAS LA PAGE — démo 12/10/2026.
 *
 * LE DÉFAUT CÔTÉ FRONT. L'écran Acteurs du back-office écrivait
 * « X affichés sur {acteurs.length} » : la taille de la PAGE chargée (50 au
 * plus), présentée comme un total. Le total que le serveur annonce pour la
 * liste (`acteursTotal`, `meta.total` de GET /users) est la seule base juste.
 *
 * CE QUE CE BANC NE COUVRE PAS — et c'est la plus grosse part de l'écart
 * « 6 affichés sur 6 » / « Tous 16 » : les onglets lisent
 * GET /users/counts-by-role, qui compte TOUTES les lignes `users` par rôle,
 * alors que GET /users exclut les supprimés (`status = 'supprime'`,
 * `deleted_at`) et les marchands / producteurs / coopérateurs sans
 * identification. Deux définitions d'« acteur » côté API : à corriger dans
 * `backend/src/users/users.service.ts` (countByRole doit reprendre la clause
 * de buildActeursListWhereClause).
 *
 * Lancer : npm run test:compteurs-acteurs-bo
 */
import { readFileSync } from 'node:fs';

let echecs = 0;
const ok = (c, quoi) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const code = readFileSync(new URL('../src/app/components/backoffice/BOActeurs.tsx', import.meta.url), 'utf8');

console.log('\nActeurs BO : le « sur N » est le total du serveur\n');
ok(!/\bsur \{acteurs\.length\}/.test(code), 'aucun « sur {acteurs.length} » (taille de page présentée comme total)');
ok((code.match(/\bsur \{acteursTotal\}/g) ?? []).length === 2, 'les deux compteurs « sur » lisent acteursTotal');

console.log(echecs === 0 ? '\n✓ compteur juste côté front\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
