import { Logger } from "@nestjs/common";
import { ParsedIntent } from "./intent.parser";

export type SpeechType = "success" | "question" | "error" | "confirmation" | "cancel";

export interface SpeechResult {
  type: SpeechType;
  text: string;
  data: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface SpeechContext {
  genre: string;
  prenom: string;
  lastResponses?: string[];
}

export class SpeechBuilder {
  private static readonly logger = new Logger("SpeechBuilder");

  private static readonly POOL: Record<string, string[]> = {
    success_vente: [
      "C est note {addr} ! {quantite} {produit} pour {montant} Francs.",
      "Voila {addr}, ta vente de {montant} Francs est bien enregistree !",
      "Ca marche {addr} ! {produit} vendu pour {montant} Francs.",
      "Top {addr} ! J ai note {montant} Francs pour {produit}.",
      "C est fait {addr} ! Vente de {produit} a {montant} Francs enregistree.",
    ],
    success_depense: [
      "Ok {addr} ! Depense de {montant} Francs notee dans le cahier.",
      "C est note {addr} ! {montant} Francs pour {description}.",
      "Voila {addr}, ta depense est dans le cahier.",
      "Ca marche {addr} ! {montant} Francs de {description} enregistre.",
      "J ai note {addr} ! Depense de {montant} Francs.",
    ],
    success_stock: [
      "C est fait {addr} ! Stock de {produit} mis a jour.",
      "Ok {addr} ! J ai ajoute {quantite} {produit} au stock.",
      "Voila {addr}, le stock de {produit} est mis a jour.",
      "Ca marche {addr} ! {quantite} {produit} ajoute au stock.",
    ],
    success_generic: [
      "C est fait {addr} !",
      "Voila {addr} !",
      "Ca marche {addr} !",
      "D accord {addr} !",
      "C est enregistre {addr} !",
    ],
    question_produit: [
      "Tu vends quoi comme produit {addr} ?",
      "C est quoi le produit {addr} ?",
      "Quel produit tu as vendu {addr} ?",
      "Dis-moi le produit {addr} ?",
    ],
    question_quantite: [
      "C est combien de kilos {addr} ?",
      "Quelle quantite {addr} ?",
      "Combien tu en as vendu {addr} ?",
      "Tu as vendu combien {addr} ?",
    ],
    question_montant: [
      "C est combien {addr} ?",
      "Le montant c est quoi {addr} ?",
      "Tu as vendu a quel prix {addr} ?",
      "C est a combien {addr} ?",
    ],
    question_depense_montant: [
      "Tu as depense combien {addr} ?",
      "C est combien cette depense {addr} ?",
      "Le montant c est quoi {addr} ?",
      "Combien tu as sorti {addr} ?",
    ],
    question_depense_description: [
      "C est pour quoi cette depense {addr} ?",
      "Tu as achete quoi {addr} ?",
      "Depense pour quoi {addr} ?",
      "C est quoi cette depense {addr} ?",
    ],
    confirmation_oui: [
      "C est note {addr} ! C est bien enregistre.",
      "Voila {addr} ! C est fait.",
      "Ok {addr} ! J ai bien enregistre ca.",
      "Ca marche {addr} ! C est dans le systeme.",
      "Parfait {addr} ! C est enregistre.",
    ],
    confirmation_non: [
      "D accord {addr}, j annule ca !",
      "Ok {addr}, on laisse tomber !",
      "Pas de probleme {addr}, j annule !",
      "Ca marche {addr}, j efface ca !",
    ],
    error_validation: [
      "Ah {addr}, le montant doit etre un nombre valide !",
      "Ce montant ne va pas {addr}, dis-moi un vrai chiffre !",
      "Le montant est incorrect {addr}, recommence !",
    ],
    error_incoherence: [
      "Je n ai pas bien suivi {addr}, on recommence !",
      "Ah {addr}, j ai perdu le fil, dis-moi encore !",
      "Je suis perdue {addr}, recommence depuis le debut !",
    ],
    error_generic: [
      "Ah dis encore {addr}, j ai pas saisi !",
      "Repete un peu {addr}, j entends pas bien !",
      "Je t ai pas bien entendu {addr}, dis encore !",
      "Un souci {addr}, repete s il te plait !",
    ],
  };

  static build(
    type: SpeechType,
    parsed: ParsedIntent,
    ctx: SpeechContext,
    overrideText?: string
  ): SpeechResult {
    const addr = ctx.genre === "homme" ? "mon frere" : "ma chere";
    let poolKey = "";
    let text = overrideText || "";

    if (!text) {
      if (type === "success") {
        if (parsed.intent === "vendre") poolKey = "success_vente";
        else if (parsed.intent === "depense") poolKey = "success_depense";
        else if (parsed.intent === "ajouter_stock") poolKey = "success_stock";
        else poolKey = "success_generic";
      } else if (type === "question") {
        const firstMissing = parsed.missing[0];
        if (firstMissing === "produit") poolKey = "question_produit";
        else if (firstMissing === "quantite") poolKey = "question_quantite";
        else if (firstMissing === "montant" && parsed.intent === "vendre") poolKey = "question_montant";
        else if (firstMissing === "montant" && parsed.intent === "depense") poolKey = "question_depense_montant";
        else if (firstMissing === "description") poolKey = "question_depense_description";
        else poolKey = "error_generic";
      } else if (type === "confirmation") {
        poolKey = "confirmation_oui";
      } else if (type === "cancel") {
        poolKey = "confirmation_non";
      } else {
        poolKey = "error_generic";
      }
      text = this.pickVaried(this.POOL[poolKey] || this.POOL.error_generic, ctx.lastResponses);
    }

    // Substitution variables
    const result = text
      .replace(/{addr}/g, addr)
      .replace(/{prenom}/g, ctx.prenom)
      .replace(/{montant}/g, String(parsed.entities.montant?.toLocaleString("fr-FR") || ""))
      .replace(/{produit}/g, parsed.entities.produit || "")
      .replace(/{quantite}/g, String(parsed.entities.quantite || ""))
      .replace(/{description}/g, parsed.entities.description || "");

    this.logger.log(`[SPEECH] type=${type} text="${result.slice(0, 80)}"`);

    return {
      type,
      text: result,
      data: { ...parsed.entities },
      context: { genre: ctx.genre, prenom: ctx.prenom },
    };
  }

  // Questions contextuelles enrichies
  static buildContextualQuestion(
    parsed: ParsedIntent,
    ctx: SpeechContext
  ): string {
    const addr = ctx.genre === "homme" ? "mon frere" : "ma chere";
    const e = parsed.entities;
    const firstMissing = parsed.missing[0];

    // Utiliser les entites deja connues pour poser une question plus precise
    if (firstMissing === "montant" && e.produit && e.quantite) {
      const pool = [
        `${e.quantite} ${e.produit}, c est combien ${addr} ?`,
        `Tu vends ${e.produit} a quel prix ${addr} ?`,
        `C est combien les ${e.quantite} ${e.produit} ${addr} ?`,
      ];
      return this.pickVaried(pool, ctx.lastResponses);
    }
    if (firstMissing === "montant" && e.produit) {
      const pool = [
        `${e.produit} c est a combien ${addr} ?`,
        `Tu vends ${e.produit} a quel prix ${addr} ?`,
        `C est combien pour ${e.produit} ${addr} ?`,
      ];
      return this.pickVaried(pool, ctx.lastResponses);
    }
    if (firstMissing === "quantite" && e.produit) {
      const pool = [
        `Tu as vendu combien de ${e.produit} ${addr} ?`,
        `C est combien de kilos de ${e.produit} ${addr} ?`,
        `Quelle quantite de ${e.produit} ${addr} ?`,
      ];
      return this.pickVaried(pool, ctx.lastResponses);
    }
    if (firstMissing === "description" && e.montant) {
      const pool = [
        `${e.montant?.toLocaleString("fr-FR")} Francs pour quoi ${addr} ?`,
        `C est pour quoi ces ${e.montant?.toLocaleString("fr-FR")} Francs ${addr} ?`,
        `Tu as achete quoi pour ${e.montant?.toLocaleString("fr-FR")} Francs ${addr} ?`,
      ];
      return this.pickVaried(pool, ctx.lastResponses);
    }

    // Fallback question generique
    const speech = this.build("question", parsed, ctx);
    return speech.text;
  }

  private static pickVaried(pool: string[], lastResponses?: string[]): string {
    const last2 = lastResponses?.slice(-2) || [];
    const available = pool.filter(p => !last2.includes(p));
    const source = available.length > 0 ? available : pool;
    return source[Math.floor(Math.random() * source.length)];
  }
}
