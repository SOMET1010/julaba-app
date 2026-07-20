import { Logger } from "@nestjs/common";

export interface ParsedEntities {
  produit?: string;
  quantite?: number;
  montant?: number;
  description?: string;
  categorie?: string;
  objectif?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ParsedIntent {
  intent: string;
  entities: ParsedEntities;
  missing: string[];
  validationErrors: ValidationError[];
  reponse: string;
  confirmation_requise: boolean;
  resume_action: string | null;
  navigate: string | null;
  raw?: Record<string, unknown>;
}

export class IntentParser {
  private static readonly logger = new Logger("IntentParser");

  private static readonly REQUIRED_FIELDS: Record<string, string[]> = {
    vendre:           ["produit", "montant"],
    depense:          ["montant", "description"],
    ajouter_stock:    ["produit", "quantite"],
    definir_objectif: ["objectif"],
  };

  static parse(groqRaw: Record<string, unknown>): ParsedIntent {
    const intent = (groqRaw.intent as string) || "conversation";
    const action = (groqRaw.action as Record<string, unknown>) || {};

    // Extraction entites
    const entities: ParsedEntities = {};
    if (action.produit && String(action.produit).trim())
      entities.produit = String(action.produit).trim().toLowerCase();
    if (action.quantite && Number(action.quantite) > 0)
      entities.quantite = Number(action.quantite);
    if (action.montant && Number(action.montant) > 0)
      entities.montant = Number(action.montant);
    if (action.description && String(action.description).trim())
      entities.description = String(action.description).trim();
    if (action.categorie && String(action.categorie).trim())
      entities.categorie = String(action.categorie).trim();
    if (action.objectif && Number(action.objectif) > 0)
      entities.objectif = Number(action.objectif);

    // Champs manquants
    const required = this.REQUIRED_FIELDS[intent] || [];
    const missing = required.filter(field => {
      const val = entities[field as keyof ParsedEntities];
      return val === undefined || val === null || val === "" || val === 0;
    });

    // Validation forte
    const validationErrors = this.validate(intent, entities);

    this.logger.log(
      `[INTENT] intent=${intent} entities=${JSON.stringify(entities)} missing=${JSON.stringify(missing)} errors=${JSON.stringify(validationErrors)}`
    );

    return {
      intent,
      entities,
      missing,
      validationErrors,
      reponse: (groqRaw.reponse as string) || "",
      confirmation_requise: missing.length === 0 && validationErrors.length === 0 && !!groqRaw.confirmation_requise,
      resume_action: (groqRaw.resume_action as string) || null,
      navigate: (groqRaw.navigate as string) || null,
      raw: groqRaw,
    };
  }

  private static validate(intent: string, entities: ParsedEntities): ValidationError[] {
    const errors: ValidationError[] = [];

    if (["vendre", "depense", "definir_objectif"].includes(intent)) {
      if (entities.montant !== undefined) {
        if (isNaN(entities.montant) || entities.montant <= 0) {
          errors.push({ field: "montant", message: "Le montant doit etre un nombre positif" });
        }
        if (entities.montant > 10_000_000) {
          errors.push({ field: "montant", message: "Montant trop eleve, verifie le chiffre" });
        }
      }
    }

    if (["vendre", "ajouter_stock"].includes(intent)) {
      if (entities.quantite !== undefined) {
        if (isNaN(entities.quantite) || entities.quantite <= 0) {
          errors.push({ field: "quantite", message: "La quantite doit etre positive" });
        }
      }
    }

    if (intent === "vendre" || intent === "ajouter_stock") {
      if (entities.produit !== undefined && entities.produit.length < 2) {
        errors.push({ field: "produit", message: "Nom de produit trop court" });
      }
    }

    this.logger.log(`[VALIDATION] intent=${intent} errors=${JSON.stringify(errors)}`);
    return errors;
  }

  // Question pour premier champ manquant (fallback)
  static buildMissingQuestion(parsed: ParsedIntent, genre: string): string {
    const addr = genre === "homme" ? "mon frère" : "ma chère";
    const firstMissing = parsed.missing[0];
    const questions: Record<string, string[]> = {
      produit:     [`C'est quoi le produit ${addr} ?`, `Quel produit ${addr} ?`],
      quantite:    [`Combien tu en as ${addr} ?`, `Quelle quantité ${addr} ?`],
      montant:     [`C'est combien ${addr} ?`, `Le montant c'est quoi ${addr} ?`],
      description: [`C'est pour quoi ${addr} ?`, `Tu as acheté quoi ${addr} ?`],
      objectif:    [`Ton objectif c'est combien ${addr} ?`],
    };
    const pool = questions[firstMissing] || [`Dis-moi ${firstMissing} ${addr}`];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
