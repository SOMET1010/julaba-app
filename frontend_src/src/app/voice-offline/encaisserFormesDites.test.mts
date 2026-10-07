/**
 * A3 — « DIS ENCAISSER » SANS EFFET (retour terrain PIE du 07/10).
 * Lancer : npm run test:encaisser-formes-dites
 *
 * Elle dit « encaisser », rien ne se passe. La grammaire (INT_ENCAISSER,
 * `i18n/voice/locales/fr-ci/intents.ts`) ne connaissait que la forme COLLÉE.
 * Or la reconnaissance vocale rend souvent le mot COUPÉ ou approché :
 * « en caisser », « en caissé », « on caisse », « in caisser », « encaissez ».
 *
 * LA PREUVE TRAVERSE : phrase → `intentLocal` (et `intentLocalCaisse`, la
 * porte de la caisse) → `estIntentionEncaissement` (le routage du micro) →
 * `reduire` (la machine d'argent) → un effet `dire` NON VIDE. Une grammaire
 * qui reconnaît sans que la machine parle laisserait la marchande dans le
 * même silence.
 *
 * ET LA PORTE RESTE BORNÉE. « en caisse » est aussi un LIEU de l'argent :
 * « combien il me reste en caisse », « j'ai mis en caisse ». Seul, ou après
 * « on » / « je », c'est la commande ; ailleurs, ce n'en est pas une.
 */
import { readFileSync } from 'node:fs';
import { intentLocal, intentLocalCaisse } from './localIntent.js';
import { detecterEncaissement, estIntentionEncaissement } from './grammaireEncaissement.js';
import { reduire, empreintePanier, type EtatFinancier } from '../services/machineEncaissement.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };

// Le panier du terrain : une ligne, 1 500 F, aucun billet touché.
const fin: EtatFinancier = {
  total: 1500, recu: 0, panierVide: false, monnaie: 0, suffisant: false,
  empreinte: { total: 1500, recu: 0, lignes: empreintePanier([{ ligneId: 'l1', quantite: 1, total: 1500 }]) },
};

console.log('\n[A3] Les formes COUPÉES de « encaisser » traversent jusqu\'à la machine\n');
const POSITIVES = ['en caisser', 'en caissé', 'En caissé !', 'on caisse', 'on caisser', 'in caisser',
  'encaissez', 'en caisse', 'en caisse.', 'on en caisse', 'je en caisse',
  // Les formes déjà reconnues ne régressent pas.
  'encaisser', 'encaisse', 'on encaisse'];
for (const f of POSITIVES) {
  for (const [porte, lire] of [['intentLocal', intentLocal], ['intentLocalCaisse', intentLocalCaisse]] as const) {
    const type = lire(f)?.action?.type ?? '';
    const route = estIntentionEncaissement(type) && type === 'encaisser';
    const { effet } = route ? reduire({ phase: 'repos' }, 'encaisser', fin) : { effet: { type: 'rien' as const } };
    const dit = effet.type === 'dire' ? effet.texte : '';
    ok(route && dit.trim().length > 0,
       `« ${f} » → ${porte} : ${type || 'null'} → machine : ${dit ? JSON.stringify(dit) : 'SILENCE'}`);
  }
}

console.log('\n[A3] Ce qui n\'est PAS « encaisser » ne le devient pas\n');
const NEGATIVES = ['combien il me reste en caisse', "j'ai mis en caisse", 'caisse', 'la caisse',
  'ma caisse', 'ouvre la caisse', 'ferme la caisse', 'il y a combien en caisse',
  "c'est en caisse", 'mets ça en caisse'];
for (const f of NEGATIVES) {
  ok(detecterEncaissement(f) !== 'encaisser' && intentLocal(f)?.action?.type !== 'encaisser'
     && intentLocalCaisse(f)?.action?.type !== 'encaisser',
     `« ${f} » n'est pas un encaissement`);
}

console.log('\n[A3] L\'écran dit QUAND le dire\n');
{
  const micro = readFileSync(new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf-8');
  ok(/Dis <strong>« encaisser »<\/strong> quand elle paie/.test(micro),
     'le rappel dit « Dis « encaisser » quand elle paie » — le moment, pas « pour terminer »');
  ok(!/<\/strong> pour terminer/.test(micro), 'et l\'ancien « pour terminer » a disparu');
}

console.log(echecs === 0 ? '\n✅ « Encaisser », même coupé, fait parler la caisse.\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
