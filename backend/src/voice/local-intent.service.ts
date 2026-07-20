import { Injectable, Logger } from "@nestjs/common";

// ──────────────────────────────────────────────────────────────────────────
// Classifieur d'intention LOCAL (offline-first) — sans LLM ni reseau.
//
// Objectif V2 : le transactionnel (~80 % des usages : vendre, depenser, stock,
// point du jour) est reconnu sur l'appareil / le serveur sans appel a GPT-4o.
// Seules les questions ouvertes (intent "conversation") retombent sur le LLM.
//
// Portage de la logique eprouvee du banc vocal (banc-vosk-julaba) : parseur de
// nombres francais (y compris l'ellipse marche "mille cinq" = 1500), grammaire
// fermee de produits, table d'intentions. Verifie sur jeu d'essai.
//
// classify() renvoie un objet au MEME format que le LLM
//   { intent, action:{produit,quantite,montant,description}, reponse, navigate }
// ou null si l'intention n'est pas reconnue avec assez de confiance
// (dans ce cas, l'orchestrateur retombe sur le LLM, comportement inchange).
// ──────────────────────────────────────────────────────────────────────────

type IntentLocal = "vendre" | "depense" | "consulter_solde" | "ajouter_stock";

const PRODUITS_FORMES: Record<string, string> = {
  tomate: "tomate", tomates: "tomate", piment: "piment", piments: "piment",
  gombo: "gombo", gombos: "gombo", attieke: "attieke", "attiéké": "attieke",
  banane: "banane", bananes: "banane", plantain: "banane plantain",
  igname: "igname", ignames: "igname", manioc: "manioc",
  aubergine: "aubergine", aubergines: "aubergine", oignon: "oignon", oignons: "oignon",
  ail: "ail", poisson: "poisson", poissons: "poisson", viande: "viande",
  poulet: "poulet", poulets: "poulet", huile: "huile", sel: "sel", sucre: "sucre",
  riz: "riz", haricot: "haricot", haricots: "haricot", "maïs": "maïs", mais: "maïs",
  foutou: "foutou", orange: "orange", oranges: "orange",
  // Produits courants entendus au marche (transcriptions terrain)
  savon: "savon", savons: "savon", farine: "farine", jus: "jus",
  "bière": "bière", biere: "bière", "bières": "bière", biscuit: "biscuit",
  biscuits: "biscuit", lait: "lait",
};

const INTENTIONS_MAP: Record<string, IntentLocal> = {
  vendu: "vendre", vendue: "vendre", vendus: "vendre", vendues: "vendre",
  vente: "vendre", vends: "vendre", vendre: "vendre",
  acheté: "depense", achete: "depense", achetée: "depense", achetee: "depense",
  achète: "depense", achete2: "depense", acheter: "depense",
  dépensé: "depense", depense: "depense", "dépense": "depense", dépenser: "depense",
  payé: "depense", paye: "depense", payer: "depense",
  pris: "depense", prise: "depense",
  solde: "consulter_solde", reste: "consulter_solde",
  stock: "ajouter_stock", ajouter: "ajouter_stock", ajoute: "ajouter_stock",
  reappro: "ajouter_stock", approvisionner: "ajouter_stock",
};

const UNITES: Record<string, number> = {
  zéro: 0, zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19,
};
const DIZAINES: Record<string, number> = {
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  "soixante-dix": 70, "quatre-vingt": 80, "quatre-vingts": 80, "quatre-vingt-dix": 90,
};
const MOTS_UNITE = new Set([
  "tas", "sac", "sacs", "kilo", "kilos", "bidon", "bidons", "botte", "bottes",
  "sachet", "sachets", "boite", "boites", "paquet", "paquets",
  "carton", "cartons", "caisse", "caisses", "bouteille", "bouteilles",
  "panier", "paniers", "régime", "regime", "régimes", "regimes",
  "litre", "litres", "morceau", "morceaux", "de",
]);

function isNumberWord(w: string): boolean {
  return w in UNITES || w in DIZAINES || w === "cent" || w === "cents" || w === "mille" || w === "et";
}

function parseSequence(tokens: string[]): number {
  const toks = tokens.filter((t) => t !== "et");
  let result = 0, courant = 0, sawMille = false, courantHasCent = false, courantSingleUnit = false;
  for (const tok of toks) {
    if (tok in UNITES) {
      courant += UNITES[tok];
      courantSingleUnit = !courantHasCent && courant === UNITES[tok] && UNITES[tok] >= 1 && UNITES[tok] <= 9;
    } else if (tok in DIZAINES) {
      courant += DIZAINES[tok]; courantSingleUnit = false;
    } else if (tok === "cent" || tok === "cents") {
      courant = courant > 0 ? courant * 100 : 100; courantHasCent = true; courantSingleUnit = false;
    } else if (tok === "mille") {
      result += courant > 0 ? courant * 1000 : 1000;
      courant = 0; courantHasCent = false; courantSingleUnit = false; sawMille = true;
    }
  }
  // Ellipse marche : "mille cinq" = 1500 (chiffre 1-9 isole apres "mille", sans "cent").
  if (sawMille && courantSingleUnit) courant = courant * 100;
  return result + courant;
}

interface NumTok { value: number; start: number; end: number; }

function extractNumbers(mots: string[]): NumTok[] {
  const out: NumTok[] = [];
  let i = 0;
  while (i < mots.length) {
    if (isNumberWord(mots[i]) && mots[i] !== "et") {
      const start = i; const seq: string[] = [];
      while (i < mots.length && isNumberWord(mots[i])) { seq.push(mots[i]); i++; }
      if (seq.some((t) => t !== "et")) out.push({ value: parseSequence(seq), start, end: i - 1 });
    } else {
      if (/^\d+$/.test(mots[i])) out.push({ value: parseInt(mots[i], 10), start: i, end: i });
      i++;
    }
  }
  return out;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/j'ai\b/g, "j' ai")
    .replace(/\bd'/g, "de ")
    .replace(/\bl'/g, "le ")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface LocalIntentResult {
  intent: IntentLocal;
  action: { produit?: string; quantite?: number; montant?: number; description?: string };
  reponse: string;
  navigate: null;
}

@Injectable()
export class LocalIntentService {
  private readonly logger = new Logger(LocalIntentService.name);

  /**
   * Reconnait une intention transactionnelle a partir du texte. Renvoie null si
   * l'intention n'est pas reconnue avec assez de confiance (-> repli LLM).
   */
  classify(texte: string): LocalIntentResult | null {
    if (!texte || !texte.trim()) return null;
    const mots = normalise(texte).split(" ").filter(Boolean);

    // 1. Intention (premier mot-cle)
    let intent: IntentLocal | null = null;
    for (const mot of mots) {
      if (mot in INTENTIONS_MAP) { intent = INTENTIONS_MAP[mot]; break; }
    }
    if (!intent) return null;

    // 2. Produit (bigrammes puis unigrammes)
    let produit: string | null = null;
    let produitStart = -1;
    for (let i = 0; i < mots.length - 1; i++) {
      const bi = `${mots[i]} ${mots[i + 1]}`;
      if (bi in PRODUITS_FORMES) { produit = PRODUITS_FORMES[bi]; produitStart = i; break; }
    }
    if (!produit) {
      for (let i = 0; i < mots.length; i++) {
        if (mots[i] in PRODUITS_FORMES) { produit = PRODUITS_FORMES[mots[i]]; produitStart = i; break; }
      }
    }

    // 3. Nombres : quantite (avant le produit) vs montant (marque "à"/"pour"/"francs")
    const nums = extractNumbers(mots);
    let quantite: number | null = null;
    let montant: number | null = null;

    const marqueAvant = new Set(["à", "a", "pour"]);
    const marqueApres = new Set(["francs", "franc"]);
    const marqueMontant = new Set<number>();
    const marqueQuantite = new Set<number>();

    nums.forEach((t, idx) => {
      const avant = mots[t.start - 1];
      const apres = mots[t.end + 1];
      if ((avant && marqueAvant.has(avant)) || (apres && marqueApres.has(apres))) marqueMontant.add(idx);
    });
    if (produitStart >= 0) {
      nums.forEach((t, idx) => {
        if (marqueMontant.has(idx)) return;
        if (t.end < produitStart) {
          let ok = true;
          for (let k = t.end + 1; k < produitStart; k++) if (!MOTS_UNITE.has(mots[k])) { ok = false; break; }
          if (ok) marqueQuantite.add(idx);
        }
      });
    }
    if (marqueMontant.size > 0) montant = nums[Math.max(...marqueMontant)].value;
    if (marqueQuantite.size > 0) quantite = nums[Math.min(...marqueQuantite)].value;

    const assignes = new Set([...marqueMontant, ...marqueQuantite]);
    const libres = nums.map((t, idx) => ({ t, idx })).filter((x) => !assignes.has(x.idx)).map((x) => x.t);
    if (montant === null && quantite === null && libres.length) {
      const sorted = [...libres].sort((a, b) => b.value - a.value);
      montant = sorted[0].value;
      if (sorted.length >= 2) quantite = sorted[1].value;
    } else if (montant !== null && quantite === null) {
      const autre = libres.find((t) => t.value !== montant);
      if (autre) quantite = autre.value;
    } else if (montant === null && quantite !== null) {
      const autre = libres.find((t) => t.value !== quantite);
      if (autre) montant = autre.value;
    }
    if (intent === "consulter_solde") { montant = null; quantite = null; }
    if (intent === "ajouter_stock" && quantite === null && montant !== null) { quantite = montant; montant = null; }

    // 4. Seuil de confiance : ne pas court-circuiter le LLM sur une phrase floue.
    const confiant =
      (intent === "vendre" && !!montant) ||
      (intent === "depense" && !!montant) ||
      (intent === "ajouter_stock" && !!produit && !!quantite) ||
      intent === "consulter_solde";
    if (!confiant) return null;

    const action: LocalIntentResult["action"] = {};
    if (produit) action.produit = produit;
    if (quantite != null) action.quantite = quantite;
    if (montant != null) action.montant = montant;
    if (intent === "depense" && produit) action.description = produit;

    const reponse = this.baseReponse(intent, produit, quantite, montant);
    this.logger.log(`[LOCAL] intent=${intent} produit=${produit ?? "-"} q=${quantite ?? "-"} m=${montant ?? "-"}`);
    return { intent, action, reponse, navigate: null };
  }

  private baseReponse(intent: IntentLocal, produit: string | null, quantite: number | null, montant: number | null): string {
    const fmt = (n: number) => n.toLocaleString("fr-FR");
    switch (intent) {
      case "vendre":
        return `Vente ${quantite ?? ""} ${produit ?? ""}${montant ? ` pour ${fmt(montant)} Francs` : ""}`.replace(/\s+/g, " ").trim();
      case "depense":
        return `Dépense ${montant ? `${fmt(montant)} Francs` : ""}${produit ? ` pour ${produit}` : ""}`.replace(/\s+/g, " ").trim();
      case "ajouter_stock":
        return `Ajout de ${quantite ?? ""} ${produit ?? ""} au stock`.replace(/\s+/g, " ").trim();
      case "consulter_solde":
        return produit ? `Point sur le stock de ${produit}` : "Point de la caisse";
    }
  }
}
