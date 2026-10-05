/**
 * AUCUN MONTANT NE PART BRUT À LA VOIX — VOIX-09.
 * Lancer : npm run test:objectif-dit
 *
 * LE DÉFAUT QU'ON FERME, et c'était le DERNIER site du #4 relevé au terrain
 * le 23/09 : « 2 000 francs » prononcé « 2 zéro zéro zéro ».
 *
 * `toLocaleString('fr-FR')` glisse une espace fine insécable (U+202F) dans
 * « 2 000 ». La synthèse reçoit un nombre coupé en deux et l'épelle. Pour une
 * marchande qui ne lit pas, LA VOIX EST LE MONTANT : elle n'a aucun autre
 * moyen de savoir ce qu'on lui annonce.
 *
 * Le catalogue portait déjà la bonne réponse — il rend une forme ÉCRAN (« 2 000
 * francs », lisible) et une forme PARLÉE (« deux mille francs »). Il suffisait
 * de passer par lui. `ObjectifContext` composait sa phrase à la main.
 *
 * CE QUE CETTE GARDE TIENT : que ce site ne recompose plus de montant, et
 * qu'aucun autre ne s'y remette — c'est un balayage, pas un test d'un fichier.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resoudreMessage } from '../i18n/voice/runtime.js';

const ici = dirname(fileURLToPath(import.meta.url));
const SRC = join(ici, '..');

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

console.log('\n[1] la phrase de l\'objectif a DEUX formes, et la parlée dit les mots');
for (const [montant, mots] of [[2000, 'deux mille'], [500, 'cinq cents'], [15000, 'quinze mille']] as const) {
  const m = resoudreMessage('OBJECTIF_FIXE', { montant }) as unknown as Record<string, string>;
  const parle = m.parle ?? m.texteParle ?? '';
  ok(parle.includes(mots), `${montant} → « ${mots} » à l'oreille`, `parlé : « ${parle} »`);
  ok(!/ | /.test(parle), `${montant} : aucune espace insécable dans la forme parlée`,
     'c\'est elle qui coupe le nombre en deux et le fait épeler');
}

console.log('\n[2] la forme ÉCRAN reste lisible — on ne l\'a pas sacrifiée');
{
  const m = resoudreMessage('OBJECTIF_FIXE', { montant: 2000 });
  ok(/2\s?000/.test(m.texte), 'l\'écran montre bien « 2 000 »', `écran : « ${m.texte}" »`);
}

console.log('\n[3] le site d\'origine ne compose plus de montant à la main');
{
  const ctx = readFileSync(join(ici, 'ObjectifContext.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  ok(!/toLocaleString/.test(ctx), '`ObjectifContext` n\'appelle plus `toLocaleString`');
  ok(/OBJECTIF_FIXE/.test(ctx), 'il passe par la clé du catalogue');
  // Le canal d'origine est conservé : changer la priorité n'était pas demandé.
  ok(/priority: 'user'/.test(ctx), 'et garde la priorité « user » d\'origine',
     'passer par le speak applicatif aurait changé le canal sans qu\'on le demande');
}

console.log('\n[4] BALAYAGE — plus aucun montant brut envoyé à la voix');
// Le vrai risque n'est pas ce fichier : c'est le prochain qui recomposera un
// montant à la main. On balaie tout le code applicatif.
{
  const fichiers: string[] = [];
  const lister = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) lister(p);
      else if (/\.(ts|tsx)$/.test(n) && !/\.test\.|\.spec\./.test(n)) fichiers.push(p);
    }
  };
  lister(SRC);
  const coupables: string[] = [];
  for (const f of fichiers) {
    const src = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
    // Un appel qui PARLE et qui contient un toLocaleString dans son argument.
    if (/\b(speak|dire|parle|ttsSpeak)\s*\([^;]{0,400}?toLocaleString/s.test(src)) {
      coupables.push(f.replace(SRC + '/', ''));
    }
  }
  /**
   * UN CLIQUET, PAS UNE PROMESSE TENUE.
   *
   * Mon bilan du 27/09 annonçait « un seul résidu ». Le balayage en a trouvé
   * DIX : mon grep d'alors ne franchissait pas les sauts de ligne. C'est la
   * mesure qui corrige l'annonce, pas l'inverse.
   *
   * Les trois du périmètre MARCHANDE sont fermés (ObjectifContext ×2,
   * MarchandDepenses ×2 sites d'une même phrase). Les huit qui restent sont
   * hors pilote — coopérative, producteur, et Keiwa qui est consigné hors
   * pilote. Les corriger maintenant, ce serait travailler là où personne ne
   * teste, pendant que le parcours de la marchande attend.
   *
   * Le plafond ne ferme donc rien : il empêche d'EN AJOUTER. Documenter une
   * dette ne la ferme pas ; un cliquet, au moins, l'empêche de grossir. Il ne
   * descend que quand un fichier est réellement corrigé.
   */
  const PLAFOND = 8;
  const ATTENDUS = [
    'components/cooperative/FinancesCooperative.tsx',
    'components/cooperative/TresorerieCooperative.tsx',
    'components/producteur/CommandesProducteurPage.tsx',
    'components/producteur/MesRecoltesPage.tsx',
    'components/producteur/Revenus.tsx',
    'components/producteur/Stocks.tsx',
    'components/wallet/RechargeWalletModal.tsx',
    'components/wallet/WithdrawWalletModal.tsx',
  ];
  ok(coupables.length <= PLAFOND,
     `${coupables.length} site(s) hors pilote, plafond ${PLAFOND} (${fichiers.length} fichiers balayés)`,
     `coupables : ${coupables.join(', ')}`);
  const nouveaux = coupables.filter((c) => !ATTENDUS.includes(c));
  ok(nouveaux.length === 0, 'aucun NOUVEAU site ne compose un montant pour la voix',
     `nouveaux : ${nouveaux.join(', ')} — le périmètre marchande doit rester net`);
  const marchande = coupables.filter((c) => /\/(marchand|contexts)\//.test(c));
  ok(marchande.length === 0,
     'le périmètre MARCHANDE est net — c\'est celui du pilote',
     `restant : ${marchande.join(', ')}`);
}

console.log('\n[5] l\'objectif est sous le régime de l\'argent');
{
  const cat = readFileSync(join(SRC, 'i18n/voice/catalog.ts'), 'utf8');
  ok(/id: 'OBJECTIF_FIXE'[^}]*critiqueArgent: true/.test(cat),
     'OBJECTIF_FIXE porte critiqueArgent: true',
     'sans ça, le niveau de voix pourrait la taire comme une phrase de confort');
}

console.log(failures === 0
  ? '\nAucun montant ne part plus en chiffres à l\'oreille ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
