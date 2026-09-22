/**
 * CE QUE L'ACCUEIL A LE DROIT D'AFFIRMER SUR LA CAISSE — ACC-01.
 *
 * Le banc terrain a relevé, écran 4 : « ZÉRO QUI MENT — l'écran a demandé au
 * serveur, n'a rien obtenu, et affirme quand même : "0 F" ». C'est l'écran que
 * toute marchande voit à chaque ouverture.
 *
 * Règle de Patrick, mot pour mot : inconnu / non chargé / erreur ≠ 0.
 */
import { etatCaisseAccueil, droitDeFermerLaJournee } from './etatCaisseAccueil.js';

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

console.log('\n── ACC-02 : on ne ferme pas une journée sur un chiffre qu\'on n\'a pas lu ──\n');
{
  const illisible = etatCaisseAccueil({ lecture: 'echec', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  const d = droitDeFermerLaJournee(illisible);
  ok(d.permis === false && d.raison === 'illisible',
     'lecture échouée : la clôture est REFUSÉE — sinon l\'écart s\'écrit, daté et définitif');
}
{
  const attente = etatCaisseAccueil({ lecture: 'jamais', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(droitDeFermerLaJournee(attente).permis === false,
     'avant toute réponse non plus : ne rien savoir n\'est pas savoir que c\'est zéro');
}
{
  const connue = etatCaisseAccueil({ lecture: 'lu', montant: 14000, aDesDonnees: true, ventesEnFile: 0 });
  const d = droitDeFermerLaJournee(connue);
  ok(d.permis === true && d.exact === true, 'serveur lu, rien en attente : on ferme, et l\'écart est un verdict');
}
{
  // LE CAS DU MARCHÉ SANS RÉSEAU. Le refuser interdirait de fermer la journée
  // NORMALE — celle où le réseau ne passe pas.
  const partielle = etatCaisseAccueil({ lecture: 'echec', montant: 9000, aDesDonnees: true, ventesEnFile: 2 });
  const d = droitDeFermerLaJournee(partielle);
  ok(d.permis === true && d.exact === false,
     'chiffres incomplets mais RÉELS : on ferme, et l\'écart est annoncé comme un ordre de grandeur');
}
{
  const jamaisDeFermetureAveugle = (['jamais', 'chargement', 'echec'] as const).every(lecture =>
    droitDeFermerLaJournee(etatCaisseAccueil({ lecture, montant: 0, aDesDonnees: false, ventesEnFile: 0 })).permis === false);
  ok(jamaisDeFermetureAveugle,
     'AUCUNE lecture non aboutie n\'autorise une clôture — c\'est la règle, pas un cas');
}

console.log(echecs === 0
  ? '\n✅ Inconnu, non chargé et erreur ne deviennent jamais zéro.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
