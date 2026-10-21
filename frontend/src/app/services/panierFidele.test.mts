/**
 * LE PANIER SURVIT À UN REDÉMARRAGE SANS RIEN PERDRE — PAN-01.
 * Lancer : npm run test:panier-fidele
 *
 * LE DÉFAUT QU'ON FERME, reproduit avant d'être corrigé.
 *
 * `CartItem` porte huit champs. `PersistedCartItem` n'en écrit que QUATRE :
 * `productId`, `nom`, `prix`, `quantite`. Les quatre autres sont écartés à
 * l'écriture — pas perdus à la lecture, pas corrompus : jamais écrits.
 *
 * Une marchande ferme l'application et la rouvre. Mesuré :
 *
 *   · `prix_achat` → 0, DONC LA MARGE DEVIENT LE PRIX DE VENTE ENTIER.
 *     Un sac de riz acheté 15 000 et revendu 20 000 affiche 20 000 F de
 *     bénéfice au lieu de 5 000. Trois cents pour cent de trop, sur une
 *     seule ligne. C'est le défaut que le commentaire de `CartItem`
 *     annonçait déjà — le champ avait été ajouté au modèle VIVANT, pas à
 *     la persistance.
 *   · `unite` → « 1 sac de Riz » redevient « 1 × Riz ». Un sac ? un kilo ?
 *     C'est le défaut du 19/09, rouvert par un simple redémarrage.
 *   · `totalExact` → le total repart à `prix × quantité`. En FCFA, un
 *     montant négocié ne retombe pas juste : « 6 régimes pour 5 000 »
 *     redevient 4 998. Petit, mais faux, et sur son argent.
 *   · `origine` → sa vente dictée ne se retrouve plus dans « Par la voix ».
 *
 * CE QUE CETTE GARDE TIENT : les huit champs traversent une fermeture, un
 * ancien panier v1 se recharge sans rien perdre de ce qu'il portait, et
 * `totalExact` n'est JAMAIS recalculé — ni à l'écriture, ni à la migration.
 */
import * as cs from './cartStorage.js';

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

const store = () => {
  const d: Record<string, string> = {};
  return { d, getItem: (k: string) => (k in d ? d[k] : null),
           setItem: (k: string, v: string) => { d[k] = v; },
           removeItem: (k: string) => { delete d[k]; } };
};
const ISO = '2026-09-27T10:00:00.000Z';
/** Écrit puis relit : exactement ce que fait une fermeture d'application. */
const allerRetour = (items: unknown[]) => {
  const s = store();
  cs.saveCart(s as never, 'u1', items as never, ISO);
  return (cs.loadCart(s as never, 'u1', Date.parse(ISO))?.items ?? []) as unknown as Record<string, unknown>[];
};

console.log('\n[1] LA MARGE — le champ dont la perte coûte le plus cher');
{
  // Elle achète le sac 15 000, le revend 20 000. Marge réelle : 5 000.
  const [l] = allerRetour([{ productId: 'p1', nom: 'Riz', prix: 20000, quantite: 1, prix_achat: 15000 }]);
  ok(l?.prix_achat === 15000, 'prix_achat traverse le redémarrage',
     `obtenu : ${l?.prix_achat} — à 0, la marge affichée devient 20 000 F au lieu de 5 000`);
}

console.log('\n[2] L\'UNITÉ — sans elle, « 3 × Tomate » ne veut rien dire');
{
  const [l] = allerRetour([{ productId: 'p1', nom: 'Tomate', prix: 500, quantite: 3, unite: 'tas' }]);
  ok(l?.unite === 'tas', 'unite traverse le redémarrage', `obtenu : ${JSON.stringify(l?.unite)}`);
}

console.log('\n[3] LE TOTAL NÉGOCIÉ — et il n\'est JAMAIS recalculé');
for (const [q, total] of [[3, 1000], [7, 20000], [3, 500], [6, 5000]] as const) {
  const prix = Math.round(total / q);
  const [l] = allerRetour([{ productId: 'p', nom: 'X', prix, quantite: q, totalExact: total }]);
  ok(l?.totalExact === total, `${q} pour ${total} F : totalExact rendu à l'identique`,
     `obtenu : ${l?.totalExact} — recalculé, on aurait ${prix * q} F`);
}

console.log('\n[4] L\'ORIGINE VOCALE — sa vente doit rester dans « Par la voix »');
{
  const [l] = allerRetour([{ productId: 'p1', nom: 'Riz', prix: 100, quantite: 1, origine: 'vocal' }]);
  ok(l?.origine === 'vocal', 'origine traverse le redémarrage', `obtenu : ${JSON.stringify(l?.origine)}`);
}

console.log('\n[5] UN ANCIEN PANIER v1 NE PERD RIEN DE CE QU\'IL PORTAIT');
// Le cas qui compte au déploiement : un panier déjà sur le téléphone, écrit
// AVANT ce lot. Il n'a que quatre champs — ses quatre champs doivent survivre,
// et on n'invente pas les autres.
{
  const s = store();
  s.setItem('julaba_cart_u1', JSON.stringify({
    v: 1, updatedAt: ISO,
    items: [{ productId: 'vieux-1', nom: 'Gombo', prix: 300, quantite: 2 }],
  }));
  const relu = cs.loadCart(s as never, 'u1', Date.parse(ISO));
  const l = relu?.items[0] as unknown as Record<string, unknown> | undefined;
  ok(!!l, 'un panier v1 se recharge — il n\'est pas jeté',
     'le vider au déploiement ferait disparaître ses articles en plein marché');
  ok(l?.productId === 'vieux-1' && l?.nom === 'Gombo' && l?.prix === 300 && l?.quantite === 2,
     'ses quatre champs historiques sont intacts', JSON.stringify(l));
  ok(l?.unite === undefined && l?.totalExact === undefined,
     'et on n\'invente PAS les champs qu\'il n\'avait pas',
     'fabriquer une unité qu\'elle n\'a jamais dite serait pire que de ne rien savoir');
}

console.log('\n[6] UN ARTICLE LIBRE RESTE UN ARTICLE LIBRE');
{
  const [l] = allerRetour([{ productId: 'libre-1758712345678-42', nom: 'Autre article',
                             prix: 800, quantite: 1, unite: 'unité' }]);
  ok(l?.productId === 'libre-1758712345678-42', 'son identifiant de ligne est conservé');
  ok(l?.nom === 'Autre article' && l?.prix === 800, 'et ce qu\'elle a tapé aussi');
}

console.log('\n[7] LE PANIER COMPLET D\'UNE VRAIE VENTE DICTÉE');
// « 3 tas de tomates pour 1 000 », achetées 250 le tas.
{
  const avant = { productId: 'aaaa-1', nom: 'Tomate', prix: 333, quantite: 3,
                  prix_achat: 250, unite: 'tas', totalExact: 1000, origine: 'vocal' };
  const [apres] = allerRetour([avant]);
  for (const champ of Object.keys(avant) as (keyof typeof avant)[]) {
    ok(apres?.[champ] === avant[champ], `${champ} : ${JSON.stringify(avant[champ])}`,
       `obtenu : ${JSON.stringify(apres?.[champ])}`);
  }
  const totalApres = (apres?.totalExact as number) ?? (apres?.prix as number) * (apres?.quantite as number);
  ok(totalApres === 1000, 'le total qu\'elle a négocié est celui qu\'on relit',
     `obtenu : ${totalApres} F — recalculé, ce serait ${333 * 3} F`);
}

console.log('\n[8] RIEN DE CE QUI EXISTAIT N\'EST CASSÉ');
{
  const s = store();
  ok(cs.loadCart(s as never, 'u1', Date.now()) === null, 'aucun panier → null, comme avant');
  cs.saveCart(s as never, 'u1', [] as never, ISO);
  ok(cs.loadCart(s as never, 'u1', Date.parse(ISO)) === null, 'un panier vide efface la clé, comme avant');
  ok(cs.parseCart('n\'importe quoi') === null, 'un contenu corrompu rend null, sans lever');
}

console.log('\n[9] UNE VERSION INCONNUE EST REFUSÉE');
// Ajouté après contre-essai : la protection existait dans le code, aucune
// assertion ne la tenait. Une garde qui ne peut pas rougir n'en est pas une.
// Mieux vaut repartir d'un panier vide que deviner la forme d'une donnée
// d'argent écrite par une version qu'on ne connaît pas.
// P0.1 (27/09) : `3` est devenue la version courante — retiré de cette liste,
// exactement comme `2` l'avait été de celle de `cartStorage.test.mts`. On garde
// des valeurs qu'aucun lot futur ne rattrapera de sitôt.
for (const v of [0, 42, 99, '2', null, undefined]) {
  const brut = JSON.stringify({ v, updatedAt: ISO, items: [{ productId: 'p', nom: 'X', prix: 1, quantite: 1 }] });
  ok(cs.parseCart(brut) === null, `version ${JSON.stringify(v)} → refusée`,
     "accepter une forme inconnue, c'est deviner ce qu'elle contient");
}
{
  // Et les deux versions connues passent, elles.
  for (const v of [1, 2, 3]) {
    const brut = JSON.stringify({ v, updatedAt: ISO, items: [{ productId: 'p', nom: 'X', prix: 1, quantite: 1 }] });
    const env = cs.parseCart(brut);
    ok(env !== null, `version ${v} → lue`);
    ok(env?.v === 3, `version ${v} → rendue en version courante (déjà migrée pour l'appelant)`);
  }
}

console.log(failures === 0
  ? '\nLe panier traverse un redémarrage sans rien perdre ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
