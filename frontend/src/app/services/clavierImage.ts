// ──────────────────────────────────────────────────────────────────────────
// Clavier imagé — Variante A (« mot de passe imagé », doc de conception du
// 18/08/2026). Module PUR : une correspondance FIXE et PUBLIQUE chiffre → image,
// identique pour tout le monde (contrairement à la variante B, personnelle et
// non affichée — hors périmètre de ce lot).
//
// Le PIN reste exactement 4 CHIFFRES côté appareil et serveur. Ce module ne
// change QUE le glyphe affiché sur chaque touche du pavé déjà existant — la
// valeur envoyée à handleKeyPress()/à l'API ne change jamais.
//
// Choix des images : des produits déjà familiers de l'écran de vente (elle les
// reconnaît déjà), pas de nouvel apprentissage.
// ──────────────────────────────────────────────────────────────────────────

export const IMAGE_PAR_CHIFFRE: Readonly<Record<string, string>> = Object.freeze({
  '0': '🍚', '1': '🍅', '2': '🌽', '3': '🍆', '4': '🌶️',
  '5': '🧅', '6': '🍌', '7': '🥭', '8': '🍍', '9': '🥑',
});

/** Glyphe à afficher sur la touche : l'image si le mode est actif, sinon le chiffre tel quel. */
export function glyphePourChiffre(chiffre: string, modeImage: boolean): string {
  if (!modeImage) return chiffre;
  return IMAGE_PAR_CHIFFRE[chiffre] ?? chiffre;
}
