/**
 * CE QUE L'ACCUEIL A LE DROIT D'AFFIRMER SUR LA CAISSE — ACC-01.
 *
 * Le banc terrain a relevé, écran 4 : « ZÉRO QUI MENT — l'écran a demandé au
 * serveur, n'a rien obtenu, et affirme quand même : "0 F" ». C'est l'écran que
 * toute marchande voit à chaque ouverture.
 *
 * Règle de Patrick, mot pour mot : inconnu / non chargé / erreur ≠ 0.
 */
import { etatCaisseAccueil } from './etatCaisseAccueil.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nL\'accueil ne transforme pas une absence de réponse en zéro\n');

// ── 1. L'ÉCHEC DE LECTURE, SANS RIEN EN MÉMOIRE ────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'echec', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(e.type === 'illisible', 'lecture échouée et rien en mémoire → « illisible », jamais « 0 »');
  ok(!('montant' in e), 'le montant N\'EXISTE PAS sur cette branche : rien à afficher par mégarde');
}

// ── 2. L'ÉCHEC APRÈS UNE LECTURE RÉUSSIE ───────────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'echec', montant: 12500, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'partielle', 'échec APRÈS une lecture réussie → « partielle » : ces 12 500 ont existé');
  ok(e.type === 'partielle' && e.montant === 12500, 'on n\'efface pas un montant déjà lu — c\'est un plancher');
}

// ── 3. LE PREMIER RENDU, AVANT TOUTE RÉPONSE ───────────────────────────────
{
  for (const lecture of ['jamais', 'chargement'] as const) {
    const e = etatCaisseAccueil({ lecture, montant: 0, aDesDonnees: false, ventesEnFile: 0 });
    ok(e.type === 'attente', `« ${lecture} » → « attente » : on ne sait pas encore, on ne dit pas zéro`);
  }
}

// ── 4. LE SERVEUR A RÉPONDU ────────────────────────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'lu', montant: 0, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'connue' && e.montant === 0, 'serveur lu et vraiment zéro → « connue », montant 0 : ce zéro-là est VRAI');
  const f = etatCaisseAccueil({ lecture: 'lu', montant: 7000, aDesDonnees: true, ventesEnFile: 0 });
  ok(f.type === 'connue' && f.montant === 7000, 'serveur lu avec de l\'argent → « connue »');
}

// ── 5. LA FILE HORS LIGNE REND LE TOTAL INCOMPLET ──────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'lu', montant: 7000, aDesDonnees: true, ventesEnFile: 2 });
  ok(e.type === 'partielle', 'serveur lu MAIS 2 ventes dorment sur le téléphone → « partielle »');
  ok(e.type === 'partielle' && e.ventesEnFile === 2, 'le nombre de ventes en attente traverse');
  ok(e.type === 'partielle' && e.montant === 7000,
     'le montant reste celui du serveur : on ne l\'invente pas, on dit qu\'il est incomplet');
}

// ── 6. UN MONTANT QUI N'EST PAS UN NOMBRE N'EST PAS UN MONTANT ─────────────
{
  for (const mauvais of [NaN, Infinity, -Infinity]) {
    const e = etatCaisseAccueil({ lecture: 'lu', montant: mauvais, aDesDonnees: true, ventesEnFile: 0 });
    ok(e.type === 'illisible', `montant ${mauvais} → « illisible » : un non-nombre ne devient pas zéro`);
  }
}

// ── 7. LA FILE EST TOUJOURS UN ENTIER POSITIF ──────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'echec', montant: 0, aDesDonnees: false, ventesEnFile: -3 });
  ok(e.ventesEnFile === 0, 'une file négative est ramenée à 0 : on n\'affiche pas « -3 ventes en attente »');
  const f = etatCaisseAccueil({ lecture: 'echec', montant: 0, aDesDonnees: false, ventesEnFile: 2.7 });
  ok(f.ventesEnFile === 2, 'une file fractionnaire est tronquée : on ne compte pas 2,7 ventes');
}

// ── 8. LE POINT DE LA MISSION, ÉNONCÉ COMME UNE RÈGLE ──────────────────────
{
  const jamaisZeroParDefaut = (['jamais', 'chargement', 'echec'] as const).every(lecture =>
    !('montant' in etatCaisseAccueil({ lecture, montant: 0, aDesDonnees: false, ventesEnFile: 0 })));
  ok(jamaisZeroParDefaut,
     'AUCUN état issu d\'une lecture non aboutie ne porte de montant — inconnu ≠ 0');
}

console.log(echecs === 0
  ? '\n✅ Inconnu, non chargé et erreur ne deviennent jamais zéro.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
