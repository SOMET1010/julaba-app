/**
 * Garde-fou : la barre de recherche de la caisse doit être TOUCHABLE EN ENTIER.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR, relevé par Patrick le 18/09 sur appareil
 * réel : il a tapé « banane » et l'écran a continué d'afficher l'oignon. Le
 * filtre n'était pas en cause — le texte n'arrivait jamais dans le champ. La
 * barre était une <div> : seul le rectangle exact de l'<input> prenait le
 * focus. La loupe, la marge, la bordure avaient l'air d'une barre de recherche
 * et ne répondaient pas.
 *
 * Pour une marchande qui ne lit pas, viser la loupe est le geste NATUREL. Si ce
 * geste ne fait rien, elle ne trouve aucun produit — donc elle ne peut pas
 * vendre. Ce n'est pas un détail d'ergonomie, c'est un blocage de vente.
 *
 * Ce que ce test vérifie, et pourquoi c'est textuel : rien ici ne se voit dans
 * un test de logique. Un <label> qui ENTOURE son input est du comportement
 * fourni par le navigateur — il n'y a pas de fonction à appeler, donc rien à
 * éprouver autrement qu'en lisant le balisage.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const FICHIER = join(ICI, '..', 'src', 'app', 'components', 'marchand', 'POSCaisse.tsx');
const source = readFileSync(FICHIER, 'utf8');
const lignes = source.split('\n');

/** Hauteur minimale d'une cible tactile, en pixels — même règle que les billets. */
const CIBLE_MIN = 44;
/** Hauteur approximative du texte dans la barre, pour déduire la marge requise. */
const HAUTEUR_TEXTE = 18;

let echecs = 0;
const rate = (quoi) => { console.log(`  ✗ ${quoi}`); echecs++; };
const passe = (quoi) => console.log(`  ✓ ${quoi}`);

const iChamp = lignes.findIndex((l) => l.includes('placeholder="Chercher un produit…"'));
if (iChamp === -1) {
  console.log('\n✗ champ de recherche introuvable — le placeholder a changé ?');
  console.log('  Si c’est volontaire, mets ce test à jour AVANT de fusionner.');
  process.exit(1);
}

// L'ÉLÉMENT QUI ENTOURE LE CHAMP. On remonte ligne à ligne en tenant la
// profondeur : chaque balise fermante rencontrée en remontant correspond à un
// élément FRÈRE, dont on doit sauter l'ouverture. La première balise ouvrante
// qui reste quand la profondeur est nulle est le vrai parent. (Naïvement, on
// tomberait sur le <span> de la loupe, qui est un frère.)
const OUVRANTE = /<(label|div|span|motion\.\w+)\b/;
const FERMANTE = /<\/(label|div|span|motion\.\w+)>/g;
let iParent = -1;
let profondeur = 0;
for (let i = iChamp - 1; i >= 0 && i > iChamp - 60; i--) {
  const l = lignes[i];
  profondeur += [...l.matchAll(FERMANTE)].length;
  if (OUVRANTE.test(l) && !l.includes('/>')) {
    if (profondeur === 0) { iParent = i; break; }
    profondeur--;
  }
}

if (iParent === -1) {
  rate('impossible de trouver l’élément qui entoure le champ');
} else if (!lignes[iParent].trim().startsWith('<label ')) {
  rate(`le champ est entouré d’une ${lignes[iParent].trim().slice(0, 12)}… et non d’une <label> :`);
  console.log('    seul le rectangle exact de l’input prendrait le focus.');
} else {
  passe('le champ est entouré d’une <label> — toute la barre donne le focus');

  const marge = /padding:\s*'(\d+)px/.exec(lignes[iParent]);
  if (!marge) {
    rate('marge verticale de la barre illisible');
  } else {
    const hauteur = Number(marge[1]) * 2 + HAUTEUR_TEXTE;
    if (hauteur >= CIBLE_MIN) {
      passe(`la barre fait ~${hauteur} px de haut (minimum ${CIBLE_MIN})`);
    } else {
      rate(`la barre ne fait que ~${hauteur} px — en dessous de la cible tactile de ${CIBLE_MIN} px`);
    }
  }
}

if (source.includes('</label>') === false) {
  rate('aucune </label> fermante — le balisage est cassé');
}

console.log('\nCartes produit et encaissement inclusifs');
if (/<motion\.button key=\{p\.id\} type="button"/.test(source) && /onClick=\{\(\) => ajouterAuPanier\(p\)/.test(source)) {
  passe('toute la carte produit ajoute l’article, pas seulement un petit bouton');
} else {
  rate('la carte produit entière n’est pas une cible de sélection');
}

if ((source.match(/minHeight:'var\(--caisse-cible-tactile\)'/g) || []).length >= 2) {
  passe('les champs prix et quantité négociés atteignent 44 px');
} else {
  rate('les champs financiers de négoce restent sous 44 px');
}

if (/PaveMontant/.test(source) && /saisieEspeces/.test(source)) {
  passe('le montant reçu dispose du pavé XXL et du choix coupures');
} else {
  rate('le montant reçu dépend encore d’un petit champ système');
}

if (/montantRecuManquant/.test(source) && /Entre le montant reçu/.test(source)) {
  passe('une vente espèces sans montant reçu est bloquée et expliquée');
} else {
  rate('la caisse peut encore confirmer sans montant reçu explicite');
}

if (/fallbackSrc=\{getPictogrammeByNom\(p\.nom\)\}/.test(source)) {
  passe('les photos produit ont un repli pictographique local');
} else {
  rate('les photos produit n’ont pas de repli pictographique spécifique hors ligne');
}

if (echecs > 0) {
  console.log('\n✗ cible tactile — échec');
  process.exit(1);
}
console.log('\n✓ cible tactile — la barre de recherche répond sur toute sa surface');
