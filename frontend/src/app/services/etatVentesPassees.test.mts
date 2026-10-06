/**
 * « MES VENTES » NE DIT PLUS ZÉRO QUAND ELLE N'A PAS PU DEMANDER — HIST-01.
 * Lancer : npm run test:ventes-historique-etat   (tsx, sans DOM)
 *
 * LE FAIT. Patrick a fait des ventes. L'écran affichait 0 FCFA, 0 transaction,
 * 0 bénéfice et « Pas encore de ventes enregistrées ».
 *
 * LA CAUSE. `reloadTransactions` (contexts/AppContext.tsx) avalait l'échec :
 *   catch (e) { console.warn('[AppContext] reloadTransactions failed:', …); }
 * La liste restait vide, et l'écran présentait cette absence de réponse comme
 * une réponse. La même faute que celles qu'on ferme depuis deux jours, à
 * l'endroit le plus sensible : l'argent déjà gagné.
 *
 * LA BASE, MESURÉE. Lancé contre les fichiers de `0c20ed6` — la base de ce
 * lot — ce banc est ROUGE : la section [3] échoue sur les cinq points de
 * source (AppContext n'expose aucun état de lecture, VentesPassees rend
 * « Pas encore de ventes enregistrées » sans condition et pousse quatre
 * `toLocaleString` dans les compteurs sans savoir si le serveur a répondu).
 * Le nombre d'échecs est noté dans le commit qui introduit ce fichier.
 *
 * CE QU'IL NE PROUVE PAS. Il ne rend rien à l'écran et n'ouvre aucun réseau.
 * Il prouve la RÈGLE (module pur) et que le code la branche (lecture du
 * source) — pas la mise en page, qui se juge sur capture.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CHIFFRE_INCONNU,
  annonceEtat,
  annonceFile,
  annonceTotal,
  chiffresLisibles,
  etatVentesPassees,
  type LectureHistorique,
} from './etatVentesPassees.js';
import { entreeTts } from '../i18n/voice/catalog.js';
import { t } from '../i18n/voice/runtime.js';

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let echecs = 0;
function ok(cond: boolean, quoi: string) {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi); echecs++; }
}

// ───────────────────────────────────────────────────────────────────────────
console.log("\n[1] LES TROIS ÉTATS NE SE CONFONDENT JAMAIS");

{
  // 1. « Je n'ai pas pu demander » — la requête a échoué, rien en liste.
  const illisible = etatVentesPassees({ lecture: 'echec', nbVentes: 0, ventesEnFile: 0 });
  ok(illisible.type === 'illisible', "requête en échec, liste vide → « illisible », JAMAIS « vide »");
  ok(annonceEtat(illisible)?.cle === 'TATA_VENTES_PAS_LUES', "… et la phrase dit qu'on n'a pas pu lire");
  ok(annonceEtat(illisible)?.cle !== 'TATA_VENTES_AUCUNE', "… et surtout pas « tu n'as pas encore vendu »");

  // 2. « Tu n'as pas encore vendu » — le serveur a répondu, et il n'a rien.
  const vide = etatVentesPassees({ lecture: 'lu', nbVentes: 0, ventesEnFile: 0 });
  ok(vide.type === 'vide', 'serveur qui répond « rien » → « vide » : là seulement le message est vrai');
  ok(annonceEtat(vide)?.cle === 'TATA_VENTES_AUCUNE', '… et la phrase est celle de l’absence de vente');

  // 3. « Tu as vendu, mais ce n'est pas encore envoyé ».
  const enFile = etatVentesPassees({ lecture: 'lu', nbVentes: 0, ventesEnFile: 2 });
  ok(enFile.type === 'vide' && enFile.ventesEnFile === 2, 'serveur vide + deux ventes en file : les deux faits tiennent ensemble');
  ok(annonceFile(enFile)?.cle === 'TATA_VENTES_EN_ATTENTE_ENVOI', '… et la file a SA phrase, en plus de l’état');
  ok(annonceFile(enFile)?.variables.nombre === 2, '… avec le nombre de VENTES, pas d’opérations');
  const une = etatVentesPassees({ lecture: 'lu', nbVentes: 0, ventesEnFile: 1 });
  ok(annonceFile(une)?.cle === 'TATA_VENTE_EN_ATTENTE_ENVOI', 'une seule vente en file : la phrase est au singulier');
  ok(annonceFile(vide) === null, 'file vide : aucune phrase de file — on n’invente pas une attente');

  // La file ne remplace jamais l'état : un échec de lecture reste un échec.
  const echecAvecFile = etatVentesPassees({ lecture: 'echec', nbVentes: 0, ventesEnFile: 3 });
  ok(echecAvecFile.type === 'illisible' && annonceFile(echecAvecFile)?.variables.nombre === 3,
    'échec de lecture ET file pleine : les deux se disent, aucun n’efface l’autre');

  // Attente : ni zéro, ni « rien vendu ».
  const attente = etatVentesPassees({ lecture: 'jamais', nbVentes: 0, ventesEnFile: 0 });
  ok(attente.type === 'attente', 'avant toute requête → « attente », pas « vide »');
  ok(etatVentesPassees({ lecture: 'chargement', nbVentes: 0, ventesEnFile: 0 }).type === 'attente',
    'requête en vol → « attente »');

  // Une liste déjà lue ne s'efface pas sur un rafraîchissement raté.
  const listeApresEchec = etatVentesPassees({ lecture: 'echec', nbVentes: 4, ventesEnFile: 0 });
  ok(listeApresEchec.type === 'liste', 'rafraîchissement raté sur une liste déjà remplie : on garde les ventes');
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n[2] LES QUATRE COMPTEURS N’AFFICHENT JAMAIS ZÉRO SANS RÉPONSE');

{
  const lectures: LectureHistorique[] = ['jamais', 'chargement', 'echec'];
  for (const l of lectures) ok(!chiffresLisibles(l), `lecture « ${l} » → les compteurs se taisent`);
  ok(chiffresLisibles('lu'), 'lecture « lu » → les compteurs parlent : le serveur a répondu');
  ok(!/^0+$/.test(String(CHIFFRE_INCONNU).trim()) && String(CHIFFRE_INCONNU).trim().length > 0,
    `le compteur muet montre « ${CHIFFRE_INCONNU} », pas un zéro`);

  // La VOIX aussi — c'est le seul canal pour qui ne lit pas.
  const totalSurEchec = annonceTotal(etatVentesPassees({ lecture: 'echec', nbVentes: 0, ventesEnFile: 0 }), { total: 0, nombre: 0 });
  ok(totalSurEchec.cle === 'TATA_VENTES_PAS_LUES', '« Écouter le total » sur échec : ne dit pas « tu as vendu 0 francs »');
  const totalLu = annonceTotal(etatVentesPassees({ lecture: 'lu', nbVentes: 3, ventesEnFile: 0 }), { total: 7500, nombre: 3 });
  ok(totalLu.cle === 'TATA_TOTAL_VENTES' && totalLu.variables.total === 7500 && totalLu.variables.nombre === 3,
    '« Écouter le total » sur réponse : le vrai total et le vrai nombre');
  const totalUne = annonceTotal(etatVentesPassees({ lecture: 'lu', nbVentes: 1, ventesEnFile: 0 }), { total: 2500, nombre: 1 });
  ok(totalUne.cle === 'TATA_TOTAL_VENTE', 'une seule vente : la phrase est au singulier');
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n[3] LE CODE BRANCHE LA RÈGLE (lecture du source)');

{
  // L'observation est notée LÀ OÙ LE FAIT SE PRODUIT : la couche API. C'est
  // elle, et elle seule, qui sait si le serveur a répondu. (`AppContext` est
  // sous garde-fou d'empreinte VOICE-01 — scripts/test-voix-trace-source.mjs —
  // et n'accepte que des lignes de journal de voix : y ouvrir un passage en
  // régénérant la référence serait contourner le garde-fou, pas le respecter.)
  const api = sansCommentaires(lire('./api/caisse-api.ts'));
  const ecran = sansCommentaires(lire('../components/marchand/VentesPassees.tsx'));

  ok(/noterLectureHistorique/.test(api), "la couche API note l'issue de la lecture de l'historique");
  ok(/noterLectureHistorique\('echec'\)[\s\S]{0,60}throw/.test(api),
    "… « echec » quand la requête casse, ET l'erreur est RELANCÉE (aucun appelant ne change de comportement)");
  ok(/noterLectureHistorique\('lu'\)/.test(api), '… et « lu » quand le serveur a répondu, même sur zéro ligne');
  ok(/useLectureHistorique/.test(ecran), "« Mes ventes » lit cet état au lieu de déduire l'absence d'un tableau vide");
  ok(/etatVentesPassees|chiffresLisibles/.test(ecran), '… et passe par le module pur, pas par une condition écrite sur place');
  // Le message d'origine ne doit plus exister en dur : il affirmait l'absence
  // de vente sans savoir si le serveur avait répondu.
  ok(!/Pas encore de ventes enregistrées/.test(ecran),
    "« Pas encore de ventes enregistrées » n'est plus écrit en dur dans l'écran");
  ok(/etat\.type === 'illisible'/.test(ecran) && /etat\.type === 'attente'/.test(ecran),
    "… et le bloc « liste vide » se ramifie sur l'état, pas sur la longueur d'un tableau");
  // Et la voix ne construit plus « Tu as vendu X francs » à la main.
  ok(!/Tu as vendu \$\{/.test(ecran) && !/Tu n'as pas encore de vente/.test(ecran),
    "la voix passe par une clé : plus aucun total ni « pas encore de vente » assemblé dans l'écran");
  ok(/ventesEnAttenteEnvoi/.test(ecran), "… et l'écran sait combien de VENTES dorment dans la file hors ligne");
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n[4] LES PHRASES SONT DES CLÉS DE CATALOGUE, CRITIQUES ARGENT');

{
  const CLES = ['TATA_VENTES_PAS_LUES', 'TATA_VENTES_LECTURE_EN_COURS', 'TATA_VENTES_AUCUNE',
    'TATA_VENTE_EN_ATTENTE_ENVOI', 'TATA_VENTES_EN_ATTENTE_ENVOI', 'TATA_TOTAL_VENTE',
    'TATA_TOTAL_VENTES', 'TATA_VENTES_REESSAYER'];
  for (const cle of CLES) {
    const e = entreeTts(cle);
    ok(!!e, `${cle} est au catalogue`);
    ok(!!e && e.critiqueArgent, `${cle} est marquée critique argent`);
    ok(!!e && e.statut === 'migre', `${cle} est lue par le code (statut « migre »)`);
  }
  // Rendu réel : la clé se résout, et le nombre arrive dans la phrase.
  ok(/2/.test(t('TATA_VENTES_EN_ATTENTE_ENVOI', { nombre: 2 })), 'la phrase de file porte bien le nombre');
  ok(!/\{/.test(t('TATA_VENTES_PAS_LUES', {})), 'la phrase « pas lues » ne laisse aucune accolade visible');
  // Le mot qui ment ne doit pas revenir par la traduction.
  ok(!/pas encore/i.test(t('TATA_VENTES_PAS_LUES', {})), "« pas lues » ne dit pas « pas encore de vente »");
}

console.log(echecs === 0 ? '\nTous les tests sont verts ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs > 0) process.exit(1);
