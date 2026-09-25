/**
 * Une alerte de stock se relit au stock d'AUJOURD'HUI.
 * Lancer : npm run test:alerte-vivante
 *
 * Agent de test, 25/09 : « Stock bas pour gombo : il te reste 1 tas » affiché
 * alors qu'il y en avait 24. Le chiffre n'était pas faux — il était VRAI HIER.
 * Le serveur fige le texte à la création, l'écran le réaffiche des jours plus
 * tard. Une information de stock qui se périme dans une chaîne de caractères.
 *
 * Arbitrage de Patrick : recalculer à l'affichage, et fermer l'alerte toute
 * seule si le stock est remonté au-dessus du seuil.
 */
import { messageAlerteStock } from './alerteStockVivante.js';

let failures = 0;
const eq = (a: unknown, b: unknown, label: string) => {
  if (a === b) console.log("  ✅", label);
  else { console.log("  ❌", label, `\n     attendu: ${JSON.stringify(b)}\n     obtenu : ${JSON.stringify(a)}`); failures++; }
};

const gombo = { id: 'p1', nom: 'gombo', stock: 24, unite: 'tas', seuilAlerte: 5 };
const gomboBas = { ...gombo, stock: 3 };
const gomboVide = { ...gombo, stock: 0 };

console.log("\n[1] LE DÉFAUT EXACT : le stock est remonté, l'alerte se ferme");
eq(messageAlerteStock({ reference: 'p1', produit: 'gombo' }, [gombo]), null,
   "24 en stock, seuil 5 → plus d'alerte (avant : « il te reste 1 tas »)");

console.log("\n[2] le stock est vraiment bas : le chiffre est celui d'aujourd'hui");
eq(messageAlerteStock({ reference: 'p1' }, [gomboBas]), "Il te reste 3 tas de gombo.",
   "3 tas → « Il te reste 3 tas de gombo. »");
eq(messageAlerteStock({ reference: 'p1' }, [gomboVide]), "Plus de gombo !",
   "0 → « Plus de gombo ! »");

console.log("\n[3] on vise l'identifiant, le nom n'est qu'un repli");
const homonymes = [
  { id: 'p1', nom: 'Piment', stock: 15, unite: 'tas', seuilAlerte: 5 },
  { id: 'p2', nom: 'Piment', stock: 2, unite: 'tas', seuilAlerte: 5 },
];
eq(messageAlerteStock({ reference: 'p2', produit: 'Piment' }, homonymes), "Il te reste 2 tas de Piment.",
   "deux homonymes : l'identifiant désigne le BON");
eq(messageAlerteStock({ produit: 'gombo' }, [gomboBas]), "Il te reste 3 tas de gombo.",
   "alerte ancienne sans identifiant → repli par nom");

console.log("\n[4] ce qu'on ne sait plus dire, on ne le dit pas");
eq(messageAlerteStock({ reference: 'parti' }, [gombo]), null, "produit supprimé → alerte fermée");
eq(messageAlerteStock({}, [gombo]), null, "ni identifiant ni nom → alerte fermée");
eq(messageAlerteStock({ reference: 'p1' }, []), null, "étal vide (cache froid) → on n'invente rien");
eq(messageAlerteStock({ reference: 'p1' }, [{ ...gombo, stock: NaN }]), null,
   "stock illisible → on se tait plutôt que d'afficher un chiffre faux");

console.log("\n[5] sans unité, on n'en invente pas");
eq(messageAlerteStock({ reference: 'p1' }, [{ ...gomboBas, unite: null }]), "Il te reste 3 de gombo.",
   "pas d'unité connue → pas d'« unités » inventé");

console.log("\n[6] sans seuil déclaré, le défaut de l'étal s'applique (10)");
eq(messageAlerteStock({ reference: 'p1' }, [{ ...gombo, stock: 8, seuilAlerte: null }]),
   "Il te reste 8 tas de gombo.", "8 sous le défaut 10 → alerte");
eq(messageAlerteStock({ reference: 'p1' }, [{ ...gombo, stock: 12, seuilAlerte: null }]), null,
   "12 au-dessus du défaut 10 → fermée");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nUne alerte de stock ne ment plus sur le stock ✅");
