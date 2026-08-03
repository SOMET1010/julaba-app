// Test du post-filtre vocal anti-hallucination. Rejouable : `npm run test:voix`
// (via tsx). Cas VALIDES acceptés + cas HALLUCINATION/incomplets rejetés.
import { validerOperationVocale } from './validationVocale.ts';

const ACCEPTER: [string, string, number][] = [
  ['je vends trois tomates à deux mille cinq cents', 'vente', 2500],
  ['dépense mille francs pour le transport', 'depense', 1000],
  ['vendu pour cinq mille francs', 'vente', 5000],
];
const REJETER: [string, string][] = [
  ['je vends mille deux cent trente trois', 'nombre nu sans marqueur'],
  ['je vends trois tomates', 'pas de montant'],
  ['à deux mille cinq cents francs', "pas d'intention"],
  ['', 'vide'],
  ['euh bonjour', 'garbled'],
  ['vends à cent trois francs', 'montant non multiple de 5 (103)'],
  ['vends neuf mille neuf cent quatre vingt dix neuf', 'nombre nu, non multiple de 5'],
];

let ko = 0;
console.log('── DOIT ACCEPTER ──');
for (const [txt, intent, montant] of ACCEPTER) {
  const r = validerOperationVocale(txt);
  const ok = !!r && r.intention === intent && r.montant === montant;
  console.log(`  ${ok ? '✅' : '❌'} "${txt}" -> ${r ? `${r.intention} ${r.montant}` : 'REJETÉ'}`);
  if (!ok) ko++;
}
console.log('── DOIT REJETER (hallucination / incomplet) ──');
for (const [txt, why] of REJETER) {
  const r = validerOperationVocale(txt);
  const ok = r === null;
  console.log(`  ${ok ? '✅' : '❌'} "${txt}" (${why}) -> ${r ? `ACCEPTÉ À TORT ${r.montant}` : 'rejeté'}`);
  if (!ok) ko++;
}
console.log(`\n${ko === 0 ? '✅ TOUS LES CAS PASSENT' : `❌ ${ko} cas en échec`}`);
process.exit(ko === 0 ? 0 : 1);
