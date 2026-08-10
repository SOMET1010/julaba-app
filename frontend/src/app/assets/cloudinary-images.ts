/**
 * Centralisation des URLs Cloudinary externes utilisees dans le module Marchand.
 * Evite la duplication entre MarchandAccueil, MarchandDepenses, DepenseForm.
 * 
 * Les URLs pointent vers res.cloudinary.com qui fait du fetch optimise vers postimg.cc.
 */

const CLOUDINARY_BASE = 'https://res.cloudinary.com/dco5i2v0n/image/fetch/f_webp,q_auto:good,w_600,c_limit/https://i.postimg.cc';

export const TATA_LOU_BLEU = `${CLOUDINARY_BASE}/hGNkhd7V/tata-lou-icone-bleu.png`;
export const TATA_LOU_ORANGE = `${CLOUDINARY_BASE}/5tDhjCFB/tata-lou-icone-orange.png`;

// Images des raccourcis MarchandAccueil
export const RACC_IMG = {
  marchandise: `${CLOUDINARY_BASE}/x1pDD7jX/Marchandise.png`,
  bilan: `${CLOUDINARY_BASE}/mrcxbwhC/Bilan.png`,
  cahier: `${CLOUDINARY_BASE}/L8QKK749/Cahier.png`,
  keiwa: `${CLOUDINARY_BASE}/Sx1FF5Qj/Keiwa.png`,
  rapport: `${CLOUDINARY_BASE}/Gp6W9ysY/Rapport.png`,
  commandes: `${CLOUDINARY_BASE}/vZ2FFj8B/Commandes.png`,
  score: `${CLOUDINARY_BASE}/RZp558CN/Mes-Points.png`,
  raccourcis: `${CLOUDINARY_BASE}/Zq9kTc0j/Raccourcis.png`,
  academy: `${CLOUDINARY_BASE}/Zq9kTc0j/Raccourcis.png`,
} as const;

// Images des categories depenses DepenseForm
export const DEPENSE_IMG = {
  transport: `${CLOUDINARY_BASE}/WzjBjcQk/Transport.png`,
  nourriture: `${CLOUDINARY_BASE}/0jxTx1LB/Nouriture.png`,
  taxe_mairie: `${CLOUDINARY_BASE}/rm66nrjb/Mairie.png`,
} as const;
