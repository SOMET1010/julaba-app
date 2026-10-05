/**
 * CE QUE L'ACCUEIL A LE DROIT D'AFFIRMER SUR LA CAISSE — ACC-01.
 *
 * Le banc terrain a relevé, écran 4 : « ZÉRO QUI MENT — l'écran a demandé au
 * serveur, n'a rien obtenu, et affirme quand même : "0 F" ». C'est l'écran que
 * toute marchande voit à chaque ouverture.
 *
 * Règle de Patrick, mot pour mot : inconnu / non chargé / erreur ≠ 0.
 */
import { readFileSync } from 'node:fs';
import { etatCaisseAccueil, caisseDigneDEtreDite, droitDeFermerLaJournee } from './etatCaisseAccueil.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nL\'accueil ne transforme pas une absence de réponse en zéro\n');

// ── 1. L'ÉCHEC DE LECTURE, SANS RIEN EN MÉMOIRE ────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'echec', lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(e.type === 'illisible', 'lecture échouée et rien en mémoire → « illisible », jamais « 0 »');
  ok(!('montant' in e), 'le montant N\'EXISTE PAS sur cette branche : rien à afficher par mégarde');
}

// ── 2. L'ÉCHEC APRÈS UNE LECTURE RÉUSSIE ───────────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'echec', lectureSession: 'lu', montant: 12500, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'partielle', 'échec APRÈS une lecture réussie → « partielle » : ces 12 500 ont existé');
  ok(e.type === 'partielle' && e.montant === 12500, 'on n\'efface pas un montant déjà lu — c\'est un plancher');
}

// ── 3. LE PREMIER RENDU, AVANT TOUTE RÉPONSE ───────────────────────────────
{
  for (const lecture of ['jamais', 'chargement'] as const) {
    const e = etatCaisseAccueil({ lecture, lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
    ok(e.type === 'attente', `« ${lecture} » → « attente » : on ne sait pas encore, on ne dit pas zéro`);
  }
}

// ── 4. LE SERVEUR A RÉPONDU ────────────────────────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'lu', montant: 0, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'connue' && e.montant === 0, 'serveur lu et vraiment zéro → « connue », montant 0 : ce zéro-là est VRAI');
  const f = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'lu', montant: 7000, aDesDonnees: true, ventesEnFile: 0 });
  ok(f.type === 'connue' && f.montant === 7000, 'serveur lu avec de l\'argent → « connue »');
}

// ── 5. LA FILE HORS LIGNE REND LE TOTAL INCOMPLET ──────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'lu', montant: 7000, aDesDonnees: true, ventesEnFile: 2 });
  ok(e.type === 'partielle', 'serveur lu MAIS 2 ventes dorment sur le téléphone → « partielle »');
  ok(e.type === 'partielle' && e.ventesEnFile === 2, 'le nombre de ventes en attente traverse');
  ok(e.type === 'partielle' && e.montant === 7000,
     'le montant reste celui du serveur : on ne l\'invente pas, on dit qu\'il est incomplet');
}

// ── 6. UN MONTANT QUI N'EST PAS UN NOMBRE N'EST PAS UN MONTANT ─────────────
{
  for (const mauvais of [NaN, Infinity, -Infinity]) {
    const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'lu', montant: mauvais, aDesDonnees: true, ventesEnFile: 0 });
    ok(e.type === 'illisible', `montant ${mauvais} → « illisible » : un non-nombre ne devient pas zéro`);
  }
}

// ── 7. LA FILE EST TOUJOURS UN ENTIER POSITIF ──────────────────────────────
{
  const e = etatCaisseAccueil({ lecture: 'echec', lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: -3 });
  ok(e.ventesEnFile === 0, 'une file négative est ramenée à 0 : on n\'affiche pas « -3 ventes en attente »');
  const f = etatCaisseAccueil({ lecture: 'echec', lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 2.7 });
  ok(f.ventesEnFile === 2, 'une file fractionnaire est tronquée : on ne compte pas 2,7 ventes');
}

// ── 8. LE POINT DE LA MISSION, ÉNONCÉ COMME UNE RÈGLE ──────────────────────
{
  const jamaisZeroParDefaut = (['jamais', 'chargement', 'echec'] as const).every(lecture =>
    !('montant' in etatCaisseAccueil({ lecture, lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 })));
  ok(jamaisZeroParDefaut,
     'AUCUN état issu d\'une lecture non aboutie ne porte de montant — inconnu ≠ 0');
}

console.log('\n── ACC-02 : on ne ferme pas une journée sur un chiffre qu\'on n\'a pas lu ──\n');
{
  const illisible = etatCaisseAccueil({ lecture: 'echec', lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  const d = droitDeFermerLaJournee(illisible);
  ok(d.permis === false && d.raison === 'illisible',
     'lecture échouée : la clôture est REFUSÉE — sinon l\'écart s\'écrit, daté et définitif');
}
{
  const attente = etatCaisseAccueil({ lecture: 'jamais', lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(droitDeFermerLaJournee(attente).permis === false,
     'avant toute réponse non plus : ne rien savoir n\'est pas savoir que c\'est zéro');
}
{
  const connue = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'lu', montant: 14000, aDesDonnees: true, ventesEnFile: 0 });
  const d = droitDeFermerLaJournee(connue);
  ok(d.permis === true && d.exact === true, 'serveur lu, rien en attente : on ferme, et l\'écart est un verdict');
}
{
  // LE CAS DU MARCHÉ SANS RÉSEAU. Le refuser interdirait de fermer la journée
  // NORMALE — celle où le réseau ne passe pas.
  const partielle = etatCaisseAccueil({ lecture: 'echec', lectureSession: 'lu', montant: 9000, aDesDonnees: true, ventesEnFile: 2 });
  const d = droitDeFermerLaJournee(partielle);
  ok(d.permis === true && d.exact === false,
     'chiffres incomplets mais RÉELS : on ferme, et l\'écart est annoncé comme un ordre de grandeur');
}
{
  const jamaisDeFermetureAveugle = (['jamais', 'chargement', 'echec'] as const).every(lecture =>
    droitDeFermerLaJournee(etatCaisseAccueil({ lecture, lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 })).permis === false);
  ok(jamaisDeFermetureAveugle,
     'AUCUNE lecture non aboutie n\'autorise une clôture — c\'est la règle, pas un cas');
}

// ── ACC-03 — LES VENTES SONT LÀ, LA JOURNÉE DE CAISSE NON ──────────────────
//
// TERRAIN 03/10/2026, APK `614c75e`. À l'ouverture, la voix annonce « Ta
// caisse aujourd'hui : zéro franc ». Six secondes plus tard, la même annonce
// donne 100 F. L'écran se corrigeait tout seul ; la phrase dite, non.
//
// `getTodayStats` vaut `(currentSession?.fondInitial || 0) + encaisse − cahier`
// : DEUX lectures réseau. `lecture` ne couvrait que les transactions. Entre
// les deux réponses, le fond initial manque et le calcul rend un zéro
// parfaitement formé — que l'accueil prenait pour une réponse.
{
  const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'chargement', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(e.type === 'attente',
     'ventes lues, journée de caisse PAS encore lue → « attente » : AVANT, c\'était « connue 0 F », et c\'est ce zéro-là qui s\'est dit');
  ok(!caisseDigneDEtreDite(e), 'et cet état ne se dit PAS — une phrase dite ne se reprend pas');
}
{
  const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'chargement', montant: 3150, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'partielle' && e.raison === 'chargement',
     'des ventes sont déjà là mais le fond manque → plancher « chargement », pas un total');
  ok(!caisseDigneDEtreDite(e), 'un chiffre encore en train de se faire ne se dit pas non plus');
}
{
  // L'ÉCHEC DE LA SESSION N'EFFACE PAS LES VENTES. Cet argent a existé.
  const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'echec', montant: 3150, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'partielle' && e.raison === 'echec' && e.montant === 3150,
     'journée de caisse illisible mais des ventes lues → plancher RÉEL de 3 150, pas un effacement');
  ok(caisseDigneDEtreDite(e), 'et celui-là SE DIT : se taire laisserait croire que tout va bien');
  const sansRien = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'echec', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(sansRien.type === 'illisible' && !('montant' in sansRien),
     'journée illisible ET rien en mémoire → « illisible » : pas de montant à afficher par mégarde');
}
{
  // LE VRAI ZÉRO N'EST PAS TOUCHÉ, et c'est la moitié du lot. La correction
  // paresseuse aurait été « on ne dit plus zéro » : elle n'a rien vendu, elle
  // a le droit de l'entendre. Deux réponses du serveur, pas deux silences.
  const e = etatCaisseAccueil({ lecture: 'lu', lectureSession: 'lu', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(e.type === 'connue' && e.montant === 0,
     'LES DEUX lectures ont répondu, rien vendu, journée non ouverte → « connue 0 » : ce zéro-là est une réponse');
  ok(caisseDigneDEtreDite(e), 'et il se dit — on n\'a pas remplacé un mensonge par un silence');
}
{
  // LA FORME DU TYPE EST LA GARANTIE : le champ est REQUIS, pas optionnel.
  // Un appelant qui l'oublie ne doit pas retomber silencieusement dans le
  // défaut — le compilateur le refuse avant le banc.
  const source = readFileSync(new URL('./etatCaisseAccueil.ts', import.meta.url), 'utf8');
  ok(/readonly lectureSession: LectureHistorique;/.test(source),
     '`lectureSession` est un champ REQUIS de FaitsCaisseAccueil, jamais optionnel');
  ok(!/lectureSession\?:/.test(source),
     'et il n\'a aucune valeur par défaut : un oubli de câblage ne peut pas passer en silence');
}

console.log(echecs === 0
  ? '\n✅ Inconnu, non chargé et erreur ne deviennent jamais zéro.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
