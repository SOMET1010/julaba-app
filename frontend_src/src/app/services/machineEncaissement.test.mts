/**
 * LA PORTE VERS L'ARGENT, MISE À L'ÉPREUVE — VOIX-01, lot C.
 * Lancer : npm run test:machine-encaissement   (tsx, sans DOM)
 *
 * LE CRITÈRE DE FERMETURE (Patrick, 20/09/2026) :
 *   « Aucune phrase vocale ne peut écrire de l'argent sans confirmer
 *     EXACTEMENT l'état financier qu'elle vient de relire. »
 *
 * LA BASE, MESURÉE SUR `cc26647` : ce module n'existait pas, et la voix ne
 * savait pas terminer une vente — « encaisse », « oui valide » et les autres
 * renvoyaient `null` à `intentLocal`. Ce test est donc rouge de fait sur cette
 * base. Il n'en est pas moins la seule preuve qui compte ici : que la porte
 * ne s'ouvre QUE sur une confirmation du compte relu, et jamais autrement.
 *
 * CE QU'ON COMPTE. Chaque scénario compte les effets `encaisser` émis : c'est
 * ce nombre, et lui seul, qui dit si de l'argent aurait été écrit. Les
 * phrases attendues ne sont jamais tapées à la main : `toLocaleString('fr-FR')`
 * produit des espaces insécables, on les recalcule avec la même fonction.
 *
 * LA PREUVE TRAVERSE (section [9]) : on énumère TOUTES les suites d'événements
 * courtes, sur des états financiers qui changent, et on vérifie sur chacune
 * qu'un `encaisser` n'apparaît qu'après une relecture de CE compte-là, sans
 * qu'il ait bougé entre-temps. Ce n'est pas une liste de cas heureux : c'est
 * l'espace entier des petites conversations.
 */
import {
  ETAT_INITIAL, empreintePanier, memeEmpreinte, phraseRelecture, reduire,
  type EffetEncaissement, type EtatEncaissement, type EtatFinancier, type EvenementEncaissement, type LigneFinanciere,
} from './machineEncaissement.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};
const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

/**
 * L'état financier tel que l'écran le calculerait — même règle que POSCaisse :
 * `suffisant` exige un reçu touché (> 0) qui couvre le total.
 */
function fin(lignes: LigneFinanciere[], recu: number): EtatFinancier {
  const total = lignes.reduce((s, l) => s + l.total, 0);
  return {
    panierVide: lignes.length === 0,
    total,
    recu,
    monnaie: Math.max(0, recu - total),
    suffisant: recu > 0 && recu >= total,
    empreinte: { total, recu, lignes: empreintePanier(lignes) },
  };
}

const TOMATES: LigneFinanciere = { productId: 'tomate', quantite: 4, total: 2000 };
const OIGNONS: LigneFinanciere = { productId: 'oignon', quantite: 2, total: 2000 };
const PIMENT: LigneFinanciere = { productId: 'piment', quantite: 1, total: 2000 };

/** Rejoue une conversation et rend la trace : états et effets, pas à pas. */
function jouer(etapes: Array<[EvenementEncaissement, EtatFinancier]>, depart: EtatEncaissement = ETAT_INITIAL) {
  let etat = depart;
  const effets: EffetEncaissement[] = [];
  for (const [ev, f] of etapes) {
    const r = reduire(etat, ev, f);
    etat = r.etat;
    effets.push(r.effet);
  }
  return { etat, effets, paiements: effets.filter(e => e.type === 'encaisser').length, dernier: effets[effets.length - 1] };
}
const dit = (e: EffetEncaissement | undefined) => (e && e.type !== 'rien' ? e.texte : '');

console.log('\n[1] « encaisse » prépare seulement — jamais de paiement au premier tour');
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', f]]);
  ok(r.paiements === 0, 'aucun effet encaisser');
  ok(r.etat.phase === 'attente_confirmation', 'la machine attend la seconde phrase');
  ok(dit(r.dernier) === phraseRelecture(f), `Tata relit le compte : « ${phraseRelecture(f)} »`);
  ok(phraseRelecture(f).includes(fr(4000)) && phraseRelecture(f).includes(fr(5000)) && phraseRelecture(f).includes(fr(1000)),
    'la relecture porte les trois nombres : total, reçu, monnaie');
}
{
  const f = fin([TOMATES, OIGNONS], 4000);
  ok(phraseRelecture(f).includes('Compte juste'), 'reçu = total → « Compte juste », pas « tu rends 0 »');
}
{
  const f = fin([TOMATES, OIGNONS], 0);
  const r = jouer([['encaisser', f]]);
  ok(r.paiements === 0 && r.etat.phase === 'preparation', 'sans billets touchés : préparation, pas de relecture');
  ok(dit(r.dernier).includes('Touche les billets'), 'Tata demande de toucher les billets');
}
{
  const f = fin([TOMATES, OIGNONS], 3000);
  const r = jouer([['encaisser', f]]);
  ok(r.paiements === 0 && r.etat.phase === 'preparation', 'reçu insuffisant : préparation, pas de relecture');
}
{
  const r = jouer([['encaisser', fin([], 0)]]);
  ok(r.paiements === 0 && r.etat.phase === 'repos', 'panier vide : rien à encaisser, on reste au repos');
  ok(dit(r.dernier).includes('panier est vide'), 'et Tata le dit');
}

console.log('\n[2] « combien elle doit ? » annonce le total, aucune écriture, état INCHANGÉ');
{
  const f = fin([TOMATES, OIGNONS], 0);
  const r = jouer([['combien_doit', f]]);
  ok(r.paiements === 0, 'aucun effet encaisser');
  ok(r.etat.phase === 'repos', 'état inchangé (repos)');
  ok(dit(r.dernier) === `Elle doit ${fr(4000)} francs.`, `« ${dit(r.dernier)} »`);
}
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const attente = jouer([['encaisser', f]]).etat;
  const r = jouer([['combien_doit', f]], attente);
  ok(r.paiements === 0, 'aucun effet encaisser');
  ok(r.etat.phase === 'attente_confirmation' && r.etat === attente, 'poser la question ne ferme pas la confirmation en cours');
  ok(dit(r.dernier) === `Elle doit ${fr(4000)} francs. Elle t'a donné ${fr(5000)}. Tu rends ${fr(1000)}.`, `« ${dit(r.dernier)} »`);
}
{
  const r = jouer([['combien_doit', fin([], 0)]]);
  ok(r.paiements === 0 && dit(r.dernier) === 'Ton panier est vide.', 'panier vide : « Ton panier est vide. »');
}

console.log('\n[3] « valide » au premier tour, « oui valide » sans confirmation en attente → JAMAIS de paiement');
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['oui_valide', f]]);
  ok(r.paiements === 0, 'au repos, « oui valide » ne paie pas — même avec un compte parfait');
  ok(r.etat.phase === 'attente_confirmation' && dit(r.dernier) === phraseRelecture(f), 'il déclenche une relecture, et c\'est tout');
}
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', fin([TOMATES, OIGNONS], 0)], ['oui_valide', f]]);
  ok(r.paiements === 0, 'depuis « preparation » (pas encore relu) : pas de paiement');
  ok(r.etat.phase === 'attente_confirmation', 'mais on passe en relecture du compte maintenant complet');
}

console.log('\n[4] Confirmation en attente + « oui valide » sur le MÊME compte → effet encaisser, une fois');
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', f], ['oui_valide', f]]);
  ok(r.paiements === 1, 'exactement un effet encaisser');
  ok(r.dernier?.type === 'encaisser', 'et c\'est le dernier effet');
  ok(r.etat.phase === 'repos', 'la machine revient au repos : la confirmation est consommée');
}
{
  // Même panier, ajouté dans un autre ordre : l'empreinte est triée, la
  // confirmation reste légitime.
  const a = fin([TOMATES, OIGNONS], 5000);
  const b = fin([OIGNONS, TOMATES], 5000);
  ok(memeEmpreinte(a.empreinte, b.empreinte), 'l\'ordre des lignes ne change pas l\'empreinte');
  ok(jouer([['encaisser', a], ['oui_valide', b]]).paiements === 1, 'même panier dans un autre ordre : confirmé');
}

console.log('\n[5] Panier modifié entre relecture et « oui valide » → ancienne confirmation REJETÉE');
{
  const relu = fin([TOMATES, OIGNONS], 5000);     // 4 000 / reçu 5 000
  const change = fin([TOMATES, OIGNONS, PIMENT], 5000); // 6 000 / reçu 5 000 : plus suffisant
  const r = jouer([['encaisser', relu], ['oui_valide', change]]);
  ok(r.paiements === 0, 'ZÉRO écriture : 6 000 n\'est pas le compte relu');
  ok(r.etat.phase === 'preparation', 'le reçu ne couvre plus : retour en préparation');
  ok(dit(r.dernier).startsWith('Le compte a changé.'), 'Tata dit que le compte a changé');
  ok(dit(r.dernier).includes(fr(6000)), 'et relit le NOUVEAU total');
}
{
  const relu = fin([TOMATES, OIGNONS], 10000);
  const change = fin([TOMATES, OIGNONS, PIMENT], 10000); // 6 000 / reçu 10 000 : toujours suffisant
  const r = jouer([['encaisser', relu], ['oui_valide', change]]);
  ok(r.paiements === 0, 'même quand le nouveau compte serait payable : on relit, on ne paie pas');
  ok(r.etat.phase === 'attente_confirmation' && r.etat.empreinte.lignes === change.empreinte.lignes,
    'la nouvelle attente porte la NOUVELLE empreinte');
  ok(dit(r.dernier) === `Le compte a changé. ${phraseRelecture(change)}`, 'relecture du nouveau compte');
  ok(jouer([['oui_valide', change]], r.etat).paiements === 1, 'un second « oui valide », sur ce nouveau compte relu, paie — une fois');
}
{
  const relu = fin([TOMATES, OIGNONS], 5000);
  const memeTotalAutrePanier = fin([{ productId: 'tomate', quantite: 2, total: 2000 }, OIGNONS], 5000);
  ok(relu.total === memeTotalAutrePanier.total, '(les deux paniers font le même total)');
  ok(jouer([['encaisser', relu], ['oui_valide', memeTotalAutrePanier]]).paiements === 0,
    'même total mais composition différente → rejeté : c\'est la vente qu\'on confirme, pas un chiffre');
}

console.log('\n[6] Montant reçu modifié entre relecture et confirmation → REJETÉE');
{
  const relu = fin([TOMATES, OIGNONS], 5000);
  const change = fin([TOMATES, OIGNONS], 10000);
  const r = jouer([['encaisser', relu], ['oui_valide', change]]);
  ok(r.paiements === 0, 'un billet touché entre-temps annule la confirmation');
  ok(dit(r.dernier) === `Le compte a changé. ${phraseRelecture(change)}`, 'et Tata relit avec le nouveau reçu');
}
{
  // Le chemin réel de l'écran : le changement arrive par `etat_financier_change`
  // (useEffect sur l'empreinte), AVANT la phrase suivante.
  const relu = fin([TOMATES, OIGNONS], 5000);
  const change = fin([TOMATES, OIGNONS], 10000);
  const r = jouer([['encaisser', relu], ['etat_financier_change', change], ['oui_valide', change]]);
  ok(r.effets[1].type === 'rien', 'le changement lui-même ne parle pas : elle manipule, elle n\'écoute pas');
  ok(r.paiements === 0, 'la confirmation relue est tombée : pas de paiement');
  ok(r.etat.phase === 'attente_confirmation', '« oui valide » rouvre une relecture sur le nouveau compte');
}
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', f], ['etat_financier_change', f], ['oui_valide', f]]);
  ok(r.paiements === 1, 'un `etat_financier_change` sans changement réel (re-render) ne casse pas une confirmation légitime');
}

console.log('\n[7] Double « oui valide » rapide → UN SEUL effet encaisser');
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', f], ['oui_valide', f], ['oui_valide', f]]);
  ok(r.paiements === 1, `un seul paiement (${r.paiements})`);
  ok(r.effets[2].type !== 'encaisser', 'le second est une relecture, pas un paiement');
}
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', f], ['oui_valide', f], ['oui_valide', f], ['oui_valide', f]]);
  ok(r.paiements === 2, 'trois « oui valide » : le 1er paie, le 2e relit, le 3e confirme la relecture — jamais deux de suite');
}

console.log('\n[8] « non, pas valide » → annulation, jamais de paiement');
{
  const f = fin([TOMATES, OIGNONS], 5000);
  const r = jouer([['encaisser', f], ['annuler_validation', f], ['oui_valide', f]]);
  ok(r.effets[1].type === 'dire' && r.effets[1].texte === "D'accord, je ne valide pas.", 'Tata confirme qu\'elle ne valide pas');
  ok(r.paiements === 0, 'un « oui valide » après l\'annulation ne paie pas : il faut tout relire');
}
{
  const r = jouer([['annuler_validation', fin([TOMATES], 5000)]]);
  ok(r.paiements === 0 && r.etat.phase === 'repos' && r.dernier?.type === 'rien', 'au repos, rien à annuler, on ne dit rien');
}
{
  // Annulation TACTILE : « Vider » vide le panier → l'écran envoie
  // etat_financier_change avec un panier vide.
  const f = fin([TOMATES, OIGNONS], 5000);
  const vide = fin([], 0);
  const r = jouer([['encaisser', f], ['etat_financier_change', vide], ['oui_valide', vide]]);
  ok(r.paiements === 0, '« Vider » puis « oui valide » : rien à payer');
  ok(r.etat.phase === 'repos' && dit(r.dernier).includes('panier est vide'), 'Tata dit que le panier est vide');
}

console.log('\n[9] LA PREUVE TRAVERSE — toutes les suites courtes d\'événements');
{
  const EVENEMENTS: EvenementEncaissement[] = ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation', 'etat_financier_change'];
  const FINS: EtatFinancier[] = [
    fin([], 0),
    fin([TOMATES], 0),
    fin([TOMATES], 1000),
    fin([TOMATES], 2000),
    fin([TOMATES], 5000),
    fin([TOMATES, OIGNONS], 5000),
    fin([TOMATES, OIGNONS, PIMENT], 5000),
    fin([TOMATES, OIGNONS, PIMENT], 10000),
  ];
  let suites = 0;
  let paiements = 0;
  let violations = 0;
  const PROFONDEUR = 4;
  // Chaque pas choisit un événement ET un état financier : c'est ainsi que le
  // panier ou le reçu peuvent bouger entre deux phrases, comme au marché.
  const explorer = (etat: EtatEncaissement, trace: Array<{ ev: EvenementEncaissement; f: EtatFinancier; effet: EffetEncaissement; apres: EtatEncaissement }>) => {
    if (trace.length === PROFONDEUR) { suites++; return; }
    for (const ev of EVENEMENTS) for (const f of FINS) {
      const r = reduire(etat, ev, f);
      const t = [...trace, { ev, f, effet: r.effet, apres: r.etat }];
      if (r.effet.type === 'encaisser') {
        paiements++;
        // (a) Seul « oui valide » peut payer.
        // (b) L'état d'AVANT était une attente ouverte sur exactement cette empreinte.
        // (c) Le compte est payable : panier non vide, reçu suffisant.
        // (d) Cette attente vient d'une RELECTURE (« Je valide ? ») de cette
        //     même empreinte, et aucun événement entre les deux ne l'a levée.
        const avant = etat;
        const bienGarde = ev === 'oui_valide'
          && avant.phase === 'attente_confirmation'
          && memeEmpreinte(avant.empreinte, f.empreinte)
          && !f.panierVide && f.suffisant && f.total > 0;
        let relu = false;
        for (let k = trace.length - 1; k >= 0; k--) {
          const pas = trace[k];
          if (pas.apres.phase !== 'attente_confirmation') break; // l'attente a été levée depuis
          if (pas.effet.type === 'dire' && pas.effet.texte.endsWith(phraseRelecture(pas.f)) && memeEmpreinte(pas.f.empreinte, f.empreinte)) { relu = true; break; }
        }
        if (!bienGarde || !relu) violations++;
      }
      explorer(r.etat, t);
    }
  };
  explorer(ETAT_INITIAL, []);
  ok(suites > 0 && paiements > 0, `${suites} conversations explorées, ${paiements} paiements émis`);
  ok(violations === 0, `aucun paiement sans relecture EXACTE du même compte juste avant (${violations} violation(s))`);
}

console.log(echecs === 0 ? '\nTous les tests de la machine passent.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
