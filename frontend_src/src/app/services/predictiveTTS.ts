/**
 * predictiveTTS.ts - Pre-generation intelligente TTS
 * Genere en arriere-plan les reponses probables avant qu elles soient demandees
 * Priorite dynamique par contexte + annulation si non utilisees
 */

import { fetchTTS } from "./elevenlabs";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type AppModule =
  | "dashboard" | "pos" | "marche" | "historique"
  | "cotisations" | "produits" | "profil" | "cahier"
  | "caisse" | "stock" | "commandes" | "wallet" | "general";

export interface PredictiveContext {
  module: AppModule;
  sessionOpen?: boolean;
  hasVentes?: boolean;
  hasStock?: boolean;
  prenom?: string;
  recentIntents?: string[];  // derniers intents detectes
}

interface PredictiveJob {
  text: string;
  priority: number;        // 1 (haute) a 10 (basse)
  controller: AbortController;
  signal: AbortSignal;
  promise: Promise<void>;
  used: boolean;
  module: AppModule;
}

// ─────────────────────────────────────────────────────────────────
// PHRASES PREDITES PAR MODULE + CONTEXTE
// ─────────────────────────────────────────────────────────────────

const MODULE_PHRASES: Record<AppModule, string[]> = {
  dashboard: [
    "Bonjour ma chère ! Comment puis-je t aider aujourd'hui ?",
    "Tu as bien travaillé aujourd'hui ma chère !",
    "Ta journée est ouverte, bonne vente ma chère !",
    "Ton solde de caisse est pret.",
    "Tu veux ouvrir ta journée ma chère ?",
    "Bonne journée ma chère, on fait quoi aujourd'hui ?",
    "Je t ecoute, dis-moi ce que tu veux faire !",
    "Quoi de neuf ma chère, je suis la !",
  ],
  pos: [
    "Je t ecoute, dis-moi ce que tu as vendu !",
    "Vente enregistrée avec succès ma chère !",
    "Tu veux vendre quoi exactement ma chère ?",
    "C'est combien ma chère ?",
    "Confirme la vente ma chère ?",
    "C'est fait ! Vente enregistrée.",
    "Quel produit tu as vendu ma chère ?",
    "Combien tu en as vendu ma chère ?",
    "D accord, j annule la vente !",
    "Bien reçu ma chère, vente notée !",
  ],
  caisse: [
    "Je t ecoute, dis-moi ce que tu as vendu !",
    "C'est fait ma chère !",
    "Tu veux noter une dépense ma chère ?",
    "C'est combien ma chère ?",
    "Vente enregistrée avec succès !",
    "Depense notée ma chère !",
    "Confirme l'action ma chère ?",
    "J enregistre !",
    "D accord, j annule !",
    "Quel produit ma chère ?",
    "Combien tu as vendu ma chère ?",
    "C'est bien ca ma chère ?",
    "Bien recu, je note ca !",
    "Ta vente est bien dans le systeme ma chère !",
  ],
  marche: [
    "Je cherche les meilleures offres pour toi ma chère !",
    "Voici les prix du marché aujourd'hui.",
    "Tu veux publier une annonce ma chère ?",
    "Je charge les produits disponibles ma chère !",
    "Tu cherches quoi au marché ma chère ?",
    "Voici ce qui est disponible pres de toi ma chère !",
    "Ta publication est en ligne ma chère !",
    "Tu veux acheter ce produit ma chère ?",
    "Je vérifie les offres disponibles ma chère !",
  ],
  stock: [
    "Je vérifie ton stock ma chère !",
    "Stock mis à jour avec succès !",
    "Tu veux ajouter du stock ma chère ?",
    "Attention, certains produits sont en stock faible !",
    "Quel produit tu veux ajouter ma chère ?",
    "Combien de kilos ma chère ?",
    "Stock enregistre avec succès ma chère !",
    "Ton stock est bien a jour ma chère !",
  ],
  commandes: [
    "Je charge tes commandes ma chère !",
    "Nouvelle commande recue !",
    "Commande confirmée avec succès !",
    "Tu veux confirmer cette commande ma chère ?",
    "Je vérifie le statut de ta commande ma chère !",
    "Ta commande est en cours de traitement ma chère !",
    "Commande annulée avec succès ma chère !",
    "Tu veux voir tes commandes en cours ma chère ?",
    "Voici le détail de ta commande ma chère !",
  ],
  wallet: [
    "Je vérifie ton solde Keiwa ma chère !",
    "Transaction effectuée avec succès !",
    "Tu veux faire un retrait ma chère ?",
    "Ton solde Keiwa est disponible ma chère !",
    "Combien tu veux retirer ma chère ?",
    "Retrait effectue avec succès ma chère !",
    "Ton Keiwa est bien crédité ma chère !",
    "Je charge ton historique de transactions ma chère !",
    "Tu veux envoyer de l'argent ma chère ?",
  ],
  historique: [
    "Voici ton historique de ventes ma chère.",
    "Je charge tes transactions...",
    "Voici tes dernières ventes ma chère !",
    "Tes transactions sont chargées ma chère !",
    "Tu veux filtrer par date ma chère ?",
    "Voici tes ventes du mois ma chère !",
    "Je calcule ton chiffre d'affaires ma chère !",
    "Tu veux voir les ventes  d'hier ma chère ?",
  ],
  cotisations: [
    "Voici tes cotisations du mois ma chère.",
    "Ta cotisation CNPS est a jour.",
    "Je charge tes cotisations ma chère !",
    "Tu veux payer ta cotisation ma chère ?",
    "Ta cotisation est bien enregistrée ma chère !",
    "Voici le détail de tes cotisations ma chère !",
    "Tu es à jour dans tes paiements ma chère !",
    "Je vérifie ton statut de cotisation ma chère !",
  ],
  produits: [
    "Je charge tes produits ma chère !",
    "Produit ajoute avec succès !",
    "Tu veux modifier ce produit ma chère ?",
    "Quel produit tu veux ajouter ma chère ?",
    "Produit mis à jour avec succès ma chère !",
    "Produit supprime avec succès ma chère !",
    "Tu veux voir tous tes produits ma chère ?",
    "Quel est le prix de ce produit ma chère ?",
    "Produit bien enregistre dans ton catalogue ma chère !",
  ],
  profil: [
    "Voici ton profil ma chère.",
    "Profil mis à jour avec succès !",
    "Tu veux modifier tes informations ma chère ?",
    "Ton profil est bien complète ma chère !",
    "Je met à jour tes informations ma chère !",
    "Tu veux changer ta photo de profil ma chère ?",
    "Tes informations sont bien sauvegardées ma chère !",
    "Tu veux modifier ton numéro de téléphone ma chère ?",
  ],
  cahier: [
    "Je charge ton cahier de dépenses ma chère.",
    "Depense notée ma chère !",
    "C'est combien cette dépense ma chère ?",
    "Pour quoi cette dépense ma chère ?",
    "Ta dépense est bien notée ma chère !",
    "Tu as dépense combien ma chère ?",
    "Je calcule tes dépenses du jour ma chère !",
    "Tu veux voir toutes tes dépenses ma chère ?",
    "Ta dépense a bien ete enregistrée ma chère !",
  ],
  general: [
    "Je t ecoute...",
    "Un instant ma chère...",
    "Je reflechis...",
    "C'est fait ma chère !",
    "D accord !",
    "Dis encore ma chère !",
    "Je suis la ma chère !",
    "Je t'écoute bien ma chère !",
    "Vas-y ma chère, je t'écoute !",
    "Tu veux faire quoi ma chère ?",
  ],
};

// Phrases supplementaires selon le contexte dynamique
function getContextualPhrases(ctx: PredictiveContext): string[] {
  const extra: string[] = [];
  const prenom = ctx.prenom || "ma chère";

  if (!ctx.sessionOpen && (ctx.module === "dashboard" || ctx.module === "caisse")) {
    extra.push(`Ouvre ta journee pour commencer a travailler ${prenom} !`);
  }
  if (ctx.sessionOpen && ctx.module === "dashboard") {
    extra.push(`Ta journee est bien ouverte ${prenom}, bonne vente !`);
  }
  if (ctx.hasStock === false && ctx.module === "stock") {
    extra.push(`Ton stock est vide ${prenom}, ajoute des produits !`);
  }
  if (ctx.recentIntents?.includes("vendre")) {
    extra.push("Tu as bien vendu aujourd'hui ma chère !");
    extra.push("Encore une vente ? Je t'écoute ma chère !");
  }
  if (ctx.recentIntents?.includes("depense")) {
    extra.push("Tu veux noter une autre dépense ma chère ?");
  }
  if (ctx.recentIntents?.includes("inconnu")) {
    extra.push("Excuse-moi ma chère, répète s'il te plait !");
    extra.push("Je n'ai pas bien compris, essaie autrement ma chère !");
  }

  return extra;
}

// ─────────────────────────────────────────────────────────────────
// MOTEUR PREDICTIF
// ─────────────────────────────────────────────────────────────────

class PredictiveTTSEngine {
  private jobs = new Map<string, PredictiveJob>();
  private currentModule: AppModule = "general";
  private preloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly CONCURRENCY = 2; // max requetes paralleles en arriere-plan
  private running = 0;

  // Calculer la priorite d une phrase selon le contexte
  private getPriority(text: string, module: AppModule, recentIntents: string[]): number {
    const t = text.toLowerCase();
    // Priorite haute (1-3) : phrases d action immediate
    if (t.includes("j enregistre") || t.includes("c est fait") || t.includes("j ecoute")) return 1;
    if (t.includes("confirme") || t.includes("annule") || t.includes("vendu")) return 2;
    if (t.includes("vente") || t.includes("depense")) return 3;
    // Priorite moyenne (4-6) : phrases contextuelles
    if (recentIntents.some(i => t.includes(i))) return 4;
    if (MODULE_PHRASES[module]?.some(p => p === text)) return 5;
    // Priorite basse (7-10) : phrases generiques
    return 7;
  }

  // Precharger les phrases d un contexte donne
  async preload(ctx: PredictiveContext): Promise<void> {
    // Annuler les jobs non utilises de l ancien module
    if (ctx.module !== this.currentModule) {
      this.cancelUnused(this.currentModule);
      this.currentModule = ctx.module;
    }

    const phrases = [
      ...(MODULE_PHRASES[ctx.module] || []),
      ...getContextualPhrases(ctx),
    ];

    // Dedup + trier par priorite
    const unique = [...new Set(phrases)];
    const sorted = unique.sort((a, b) =>
      this.getPriority(a, ctx.module, ctx.recentIntents || []) -
      this.getPriority(b, ctx.module, ctx.recentIntents || [])
    );

    // Lancer les jobs par batch selon concurrence max
    for (const text of sorted) {
      const key = text.toLowerCase().trim();
      if (this.jobs.has(key)) continue; // deja en cours ou fait

      const controller = new AbortController();
      const signal = controller.signal;
      const priority = this.getPriority(text, ctx.module, ctx.recentIntents || []);

      const promise = this.runWithConcurrency(text, signal);
      const keyForCleanup = key;

      this.jobs.set(key, {
        text, priority, controller, signal, promise,
        used: false, module: ctx.module,
      });
      promise.finally(() => {
        this.jobs.delete(keyForCleanup);
      });
    }
  }

  private async runWithConcurrency(text: string, signal: AbortSignal): Promise<void> {
    // Attendre un slot disponible
    while (this.running >= this.CONCURRENCY) {
      await new Promise((r) => setTimeout(r, 150));
      if (signal.aborted) return;
    }
    if (signal.aborted) return;
    this.running++;
    try {
      await fetchTTS(text, signal);
    } finally {
      this.running--;
    }
  }

  // Marquer une phrase comme utilisee (evite annulation)
  markUsed(text: string): void {
    const key = text.toLowerCase().trim();
    const job = this.jobs.get(key);
    if (job) job.used = true;
  }

  // Annuler les jobs non utilises d un module
  cancelUnused(module: AppModule): void {
    for (const [key, job] of this.jobs.entries()) {
      if (job.module === module && !job.used) {
        job.controller.abort();
        this.jobs.delete(key);
      }
    }
  }

  // Mise a jour du contexte (appele a chaque changement d ecran ou action)
  scheduleUpdate(ctx: PredictiveContext, delayMs = 800): void {
    // Debounce : evite de spammer si plusieurs changements rapides
    if (this.preloadTimer) clearTimeout(this.preloadTimer);
    this.preloadTimer = setTimeout(() => {
      this.preload(ctx).catch(() => {});
    }, delayMs);
  }

  // Stats debug
  getStats(): { jobs: number; running: number; module: AppModule } {
    return { jobs: this.jobs.size, running: this.running, module: this.currentModule };
  }

  // Reset complet
  reset(): void {
    if (this.preloadTimer) clearTimeout(this.preloadTimer);
    for (const job of this.jobs.values()) job.controller.abort();
    this.jobs.clear();
    this.running = 0;
  }
}

// Singleton global
export const predictiveTTS = new PredictiveTTSEngine();

// ─────────────────────────────────────────────────────────────────
// HOOK REACT - a utiliser dans les composants/contexts
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

export function usePredictiveTTS(ctx: PredictiveContext): void {
  const prevModule = useRef<AppModule | null>(null);
  const prevIntentsRef = useRef<string>("[]");
  const moduleRef = useRef<AppModule>(ctx.module);

  useEffect(() => {
    moduleRef.current = ctx.module;
  }, [ctx.module]);

  useEffect(() => {
    // Declencher si module change ou contexte change
    const currentIntents = JSON.stringify(ctx.recentIntents ?? []);
    const hasChanged =
      prevModule.current !== ctx.module ||
      currentIntents !== prevIntentsRef.current;

    if (hasChanged || prevModule.current === null) {
      prevModule.current = ctx.module;
      prevIntentsRef.current = currentIntents;
      predictiveTTS.scheduleUpdate(ctx, 600);
    }
  }, [ctx.module, ctx.sessionOpen, ctx.hasVentes, ctx.hasStock,
      JSON.stringify(ctx.recentIntents ?? [])]);

  useEffect(() => {
    return () => { predictiveTTS.cancelUnused(moduleRef.current); };
  }, []);
}
