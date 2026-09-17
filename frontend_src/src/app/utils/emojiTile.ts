/**
 * Vignette LOCALE à partir d'un emoji — aucune requête réseau.
 *
 * Jùlaba est hors-ligne d'abord : au marché, le réseau va et vient. Une
 * illustration servie par un hébergeur distant devient une image cassée, et
 * une marchande qui ne lit pas se retrouve devant des cases vides qu'elle ne
 * peut plus distinguer. C'est le défaut réparé une première fois sur les
 * tuiles de l'accueil (#157).
 *
 * Un emoji dessiné dans un SVG en data-URI ne dépend de rien : il est dans la
 * page. Et il se reconnaît d'un coup d'œil — une carotte 🥕, un citron 🍋.
 *
 * Extrait de data/catalogue-produits.ts, où il était défini en privé, pour
 * que les dépenses s'en servent aussi sans le recopier.
 */
export function emojiTile(emoji: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>" +
    "<rect width='96' height='96' fill='#FBEEE1'/>" +
    "<text x='48' y='52' font-size='54' text-anchor='middle' dominant-baseline='central'>" + emoji + "</text></svg>"
  );
}

/**
 * Emoji reconnaissable pour un produit vivrier, d'après son nom.
 *
 * Sert de REPLI aux photos du catalogue, qui sont servies par un hébergeur
 * distant : au marché le réseau va et vient, et une photo qui ne charge pas
 * laisse une case vide — or c'est précisément l'image qui permet à une
 * marchande qui ne lit pas de reconnaître son produit.
 *
 * On ne remplace pas la photo : on la garde quand elle arrive, et on retombe
 * ici quand elle n'arrive pas (décision Patrick, 15/09/2026).
 */
const EMOJIS_PRODUITS: ReadonlyArray<readonly [RegExp, string]> = [
  [/plantain|alloco/i, '\u{1F34C}'],
  [/banane/i, '\u{1F34C}'],
  [/riz/i, '\u{1F35A}'],
  [/tomate/i, '\u{1F345}'],
  [/aubergine/i, '\u{1F346}'],
  [/piment/i, '\u{1F336}\u{FE0F}'],
  [/gombo/i, '\u{1FAD8}'],
  [/manioc|attieke|atti\u00e9k\u00e9/i, '\u{1F954}'],
  [/igname/i, '\u{1F360}'],
  [/ma\u00efs|mais/i, '\u{1F33D}'],
  [/oignon/i, '\u{1F9C5}'],
  [/avocat/i, '\u{1F951}'],
  [/huile/i, '\u{1FAD7}'],
  [/mangue/i, '\u{1F96D}'],
  [/ananas/i, '\u{1F34D}'],
  [/arachide|cacahu\u00e8te/i, '\u{1F95C}'],
  [/orange|mandarine/i, '\u{1F34A}'],
  [/citron/i, '\u{1F34B}'],
  [/papaye|melon|past\u00e8que/i, '\u{1F348}'],
  [/poisson/i, '\u{1F41F}'],
  [/viande|boeuf|b\u0153uf/i, '\u{1F356}'],
  [/poulet|volaille/i, '\u{1F357}'],
  [/oeuf|\u0153uf/i, '\u{1F95A}'],
  [/pain/i, '\u{1F956}'],
  [/lait/i, '\u{1F95B}'],
  [/sucre|sel|farine/i, '\u{1F9C2}'],
];

/** Vignette locale pour un produit : son emoji, ou un panier à défaut. */
export function vignetteProduit(nom?: string | null): string {
  const n = (nom || '').trim();
  for (const [motif, emoji] of EMOJIS_PRODUITS) {
    if (motif.test(n)) return emojiTile(emoji);
  }
  return emojiTile('\u{1F9FA}');
}
