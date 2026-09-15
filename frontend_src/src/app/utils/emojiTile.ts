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
