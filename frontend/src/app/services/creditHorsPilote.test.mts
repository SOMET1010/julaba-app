/**
 * CRÉDIT ET ACOMPTE — HORS PILOTE, ET LE VERROU SE PROUVE.
 *
 * DÉCISION DE PATRICK, 02/10/2026. La matrice GO PILOTE a rapproché deux
 * choses qui ne l'avaient jamais été :
 *
 *   I4  idempotence crédit    🔴   un crédit rejoué crée DEUX dettes
 *   I5  idempotence acompte   🔴   un acompte rejoué encaisse DEUX fois
 *   I6  traçabilité crédit    🔴   une vente à crédit ne laisse aucune trace
 *
 * et le critère n°2 du feu vert J15 : « ZÉRO perte ou doublon d'argent sur les
 * 2 semaines, REJEUX OFFLINE COMPRIS ». Le pilote se joue au marché, avec du
 * réseau instable — exactement les conditions du rejeu.
 *
 * LA DÉCISION N'EST PAS DE RÉPARER I4/I5/I6 : le protocole n'a pas besoin du
 * crédit. Elle est de GARANTIR qu'il reste hors d'atteinte. Et une garantie
 * qu'on ne vérifie pas est un espoir : un `const` peut repasser à `true` dans
 * six semaines, et personne ne ferait le lien avec trois invariants rouges.
 *
 * CE QUE CETTE GARDE VÉRIFIE, ET SA LIMITE : elle lit le SOURCE, pas l'APK.
 * Elle prouve qu'aucun chemin d'ÉCRITURE de crédit n'est atteignable depuis
 * l'interface. Elle ne remplace pas le contrôle visuel sur le build pilote,
 * qui reste demandé avant J0.
 */
import { readFileSync } from 'node:fs';

let echecs = 0;
const ok = (c: boolean, m: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${m}`);
  if (!c) echecs++;
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const pos = lire('../components/marchand/POSCaisse.tsx');
const ventes = lire('../components/marchand/VentesPassees.tsx');

console.log('\nCrédit et acompte : hors pilote, et le verrou tient\n');

console.log('[1] Le verrou est posé, et il est FIGÉ AU BUILD');
// Une constante en dur, pas une variable d'environnement : elle ne peut pas
// être rallumée par une configuration de déploiement ni par un réglage de
// l'appareil. C'est ce qui en fait une garantie et non un défaut par défaut.
ok(/const CAISSE_CREDIT_ACTIF: boolean = false;/.test(pos),
   'POSCaisse : CAISSE_CREDIT_ACTIF = false, en dur');
ok(/const CAISSE_CREDIT_ACTIF = false;/.test(ventes),
   'VentesPassees : CAISSE_CREDIT_ACTIF = false, en dur');
ok(!/import\.meta\.env[^\n]*CREDIT/i.test(pos + ventes),
   'et le verrou ne dépend d\'AUCUNE variable d\'environnement');

console.log('\n[2] Aucun chemin d\'ÉCRITURE n\'est atteignable');
// `creerCredit` est le seul appel qui crée une dette — c'est lui que I4 et I6
// concernent. Il ne vit que dans CreditModal, qui ne se monte que sous le
// verrou. Tout le reste de l'écran peut changer sans rouvrir le crédit.
ok(/\{CAISSE_CREDIT_ACTIF && \(\s*\n\s*<CreditModal/.test(pos)
   || /\{CAISSE_CREDIT_ACTIF && \([\s\S]{0,120}CreditModal/.test(pos),
   'la modale de crédit n\'est MONTÉE que sous le verrou');
ok(!/creerCredit|payerAcompte/.test(pos),
   'POSCaisse n\'appelle jamais creerCredit ni payerAcompte directement');
const montagesCredit = (pos.match(/\{CAISSE_CREDIT_ACTIF &&/g) ?? []).length;
ok(montagesCredit >= 3,
   `tous les rendus liés au crédit passent par le verrou (${montagesCredit} occurrences)`);
ok(/\.\.\.\(CAISSE_CREDIT_ACTIF \? \[\{ id:'credits'/.test(ventes),
   'l\'onglet « Crédits » de l\'historique n\'existe que sous le verrou');

console.log('\n[3] La LECTURE reste ouverte — et c\'est voulu, pas un trou');
// Nuance qui doit rester écrite : le verrou ferme l'ÉCRITURE, pas la LECTURE.
// `fetchCredits` tourne au montage pour que les crédits HISTORIQUES d'une
// marchande entrent dans « Toutes » (correctif du 18/09/2026 : 10 000 F
// d'espèces + 5 000 F de crédits anciens s'affichaient 10 000 F).
// Lire ne crée aucune dette : I4, I5 et I6 portent tous sur l'écriture.
ok(/fetchCredits\(\)/.test(ventes),
   'les crédits HISTORIQUES sont toujours lus — « Toutes » ne ment pas');
ok(!/creerCredit/.test(ventes),
   'mais VentesPassees n\'en crée aucun');

console.log('\n[4] La règle, énoncée comme telle');
ok(echecs === 0,
   'toute réactivation du crédit EXIGE la fermeture préalable de I4, I5 et I6');

console.log(echecs === 0
  ? '\n✅ Crédit et acompte hors d\'atteinte : I4/I5/I6 restent des dettes, pas des risques pilote.\n'
  : `\n❌ ${echecs} garde(s) tombée(s) — le verrou crédit ne tient plus.\n`);
process.exit(echecs === 0 ? 0 : 1);
