export type EtatGuidageMarchand = "idle" | "listening" | "processing" | "thinking" | "speaking" | "confirming" | "error";

export interface ContexteGuidageMarchand {
  etat: EtatGuidageMarchand;
  estEnLigne: boolean;
  journeeOuverte: boolean;
  enAttente: number;
}

export interface ProchaineEtapeMarchand {
  pictogramme: string;
  titre: string;
  detail: string;
}

/**
 * Une seule consigne à la fois : la marchande ne doit jamais avoir à deviner
 * quoi faire ensuite, même lorsque le réseau est absent.
 */
export function prochaineEtapeMarchand(contexte: ContexteGuidageMarchand): ProchaineEtapeMarchand {
  if (!contexte.estEnLigne && contexte.enAttente > 0) {
    return {
      pictogramme: "📶",
      titre: "Tu peux continuer sans réseau",
      detail: `${contexte.enAttente} opération${contexte.enAttente > 1 ? "s" : ""} sera synchronisée quand le réseau revient.`,
    };
  }

  if (!contexte.journeeOuverte) {
    return {
      pictogramme: "☀️",
      titre: "Commence par ouvrir ta journée",
      detail: "Avant d’enregistrer une vente, ouvre la caisse du jour.",
    };
  }

  if (contexte.etat === "confirming") {
    return {
      pictogramme: "✅",
      titre: "Vérifie puis confirme",
      detail: "Regarde le montant et appuie sur Oui seulement si c’est juste.",
    };
  }

  if (contexte.etat === "listening") {
    return {
      pictogramme: "🎙️",
      titre: "Dis le produit, la quantité et le prix",
      detail: "Exemple : j’ai vendu 3 tomates à 500 francs.",
    };
  }

  if (contexte.etat === "processing" || contexte.etat === "thinking" || contexte.etat === "speaking") {
    return {
      pictogramme: "⏳",
      titre: "Attends un instant",
      detail: "Tata prépare la confirmation de ta vente.",
    };
  }

  if (contexte.etat === "error") {
    return {
      pictogramme: "↻",
      titre: "Réessaie tranquillement",
      detail: "Appuie sur Tata et parle lentement en donnant le produit et le prix.",
    };
  }

  return {
    pictogramme: "👆",
    titre: "Appuie sur Tata pour commencer",
    detail: "Tu peux aussi choisir une phrase d’exemple ou saisir sans parler.",
  };
}
