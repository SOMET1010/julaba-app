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
    "Bonjour ma chere ! Comment puis-je t aider aujourd hui ?",
    "Tu as bien travaille aujourd hui ma chere !",
    "Ta journee est ouverte, bonne vente ma chere !",
    "Ton solde de caisse est pret.",
    "Tu veux ouvrir ta journee ma chere ?",
    "Bonne journee ma chere, on fait quoi aujourd hui ?",
    "Je t ecoute, dis-moi ce que tu veux faire !",
    "Quoi de neuf ma chere, je suis la !",
  ],
  pos: [
    "Je t ecoute, dis-moi ce que tu as vendu !",
    "Vente enregistree avec succes ma chere !",
    "Tu veux vendre quoi exactement ma chere ?",
    "C est combien ma chere ?",
    "Confirme la vente ma chere ?",
    "C est fait ! Vente enregistree.",
    "Quel produit tu as vendu ma chere ?",
    "Combien tu en as vendu ma chere ?",
    "D accord, j annule la vente !",
    "Bien recu ma chere, vente notee !",
  ],
  caisse: [
    "Je t ecoute, dis-moi ce que tu as vendu !",
    "C est fait ma chere !",
    "Tu veux noter une depense ma chere ?",
    "C est combien ma chere ?",
    "Vente enregistree avec succes !",
    "Depense notee ma chere !",
    "Confirme l action ma chere ?",
    "J enregistre !",
    "D accord, j annule !",
    "Quel produit ma chere ?",
    "Combien tu as vendu ma chere ?",
    "C est bien ca ma chere ?",
    "Bien recu, je note ca !",
    "Ta vente est bien dans le systeme ma chere !",
  ],
  marche: [
    "Je cherche les meilleures offres pour toi ma chere !",
    "Voici les prix du marche aujourd hui.",
    "Tu veux publier une annonce ma chere ?",
    "Je charge les produits disponibles ma chere !",
    "Tu cherches quoi au marche ma chere ?",
    "Voici ce qui est disponible pres de toi ma chere !",
    "Ta publication est en ligne ma chere !",
    "Tu veux acheter ce produit ma chere ?",
    "Je verifie les offres disponibles ma chere !",
  ],
  stock: [
    "Je verifie ton stock ma chere !",
    "Stock mis a jour avec succes !",
    "Tu veux ajouter du stock ma chere ?",
    "Attention, certains produits sont en stock faible !",
    "Quel produit tu veux ajouter ma chere ?",
    "Combien de kilos ma chere ?",
    "Stock enregistre avec succes ma chere !",
    "Ton stock est bien a jour ma chere !",
  ],
  commandes: [
    "Je charge tes commandes ma chere !",
    "Nouvelle commande recue !",
    "Commande confirmee avec succes !",
    "Tu veux confirmer cette commande ma chere ?",
    "Je verifie le statut de ta commande ma chere !",
    "Ta commande est en cours de traitement ma chere !",
    "Commande annulee avec succes ma chere !",
    "Tu veux voir tes commandes en cours ma chere ?",
    "Voici le detail de ta commande ma chere !",
  ],
  wallet: [
    "Je verifie ton solde Keiwa ma chere !",
    "Transaction effectuee avec succes !",
    "Tu veux faire un retrait ma chere ?",
    "Ton solde Keiwa est disponible ma chere !",
    "Combien tu veux retirer ma chere ?",
    "Retrait effectue avec succes ma chere !",
    "Ton Keiwa est bien credite ma chere !",
    "Je charge ton historique de transactions ma chere !",
    "Tu veux envoyer de l argent ma chere ?",
  ],
  historique: [
    "Voici ton historique de ventes ma chere.",
    "Je charge tes transactions...",
    "Voici tes dernieres ventes ma chere !",
    "Tes transactions sont chargees ma chere !",
    "Tu veux filtrer par date ma chere ?",
    "Voici tes ventes du mois ma chere !",
    "Je calcule ton chiffre d affaires ma chere !",
    "Tu veux voir les ventes d hier ma chere ?",
  ],
  cotisations: [
    "Voici tes cotisations du mois ma chere.",
    "Ta cotisation CNPS est a jour.",
    "Je charge tes cotisations ma chere !",
    "Tu veux payer ta cotisation ma chere ?",
    "Ta cotisation est bien enregistree ma chere !",
    "Voici le detail de tes cotisations ma chere !",
    "Tu es a jour dans tes paiements ma chere !",
    "Je verifie ton statut de cotisation ma chere !",
  ],
  produits: [
    "Je charge tes produits ma chere !",
    "Produit ajoute avec succes !",
    "Tu veux modifier ce produit ma chere ?",
    "Quel produit tu veux ajouter ma chere ?",
    "Produit mis a jour avec succes ma chere !",
    "Produit supprime avec succes ma chere !",
    "Tu veux voir tous tes produits ma chere ?",
    "Quel est le prix de ce produit ma chere ?",
    "Produit bien enregistre dans ton catalogue ma chere !",
  ],
  profil: [
    "Voici ton profil ma chere.",
    "Profil mis a jour avec succes !",
    "Tu veux modifier tes informations ma chere ?",
    "Ton profil est bien complete ma chere !",
    "Je mets a jour tes informations ma chere !",
    "Tu veux changer ta photo de profil ma chere ?",
    "Tes informations sont bien sauvegardees ma chere !",
    "Tu veux modifier ton numero de telephone ma chere ?",
  ],
  cahier: [
    "Je charge ton cahier de depenses ma chere.",
    "Depense notee ma chere !",
    "C est combien cette depense ma chere ?",
    "Pour quoi cette depense ma chere ?",
    "Ta depense est bien notee ma chere !",
    "Tu as depense combien ma chere ?",
    "Je calcule tes depenses du jour ma chere !",
    "Tu veux voir toutes tes depenses ma chere ?",
    "Ta depense a bien ete enregistree ma chere !",
  ],
  general: [
    "Je t ecoute...",
    "Un instant ma chere...",
    "Je reflechis...",
    "C est fait ma chere !",
    "D accord !",
    "Dis encore ma chere !",
    "Je suis la ma chere !",
    "Je t ecoute bien ma chere !",
    "Vas-y ma chere, je t ecoute !",
    "Tu veux faire quoi ma chere ?",
  ],
};

// Phrases supplementaires selon le contexte dynamique
function getContextualPhrases(ctx: PredictiveContext): string[] {
  const extra: string[] = [];
  const prenom = ctx.prenom || "ma chere";

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
    extra.push("Tu as bien vendu aujourd hui ma chere !");
    extra.push("Encore une vente ? Je t ecoute ma chere !");
  }
  if (ctx.recentIntents?.includes("depense")) {
    extra.push("Tu veux noter une autre depense ma chere ?");
  }
  if (ctx.recentIntents?.includes("inconnu")) {
    extra.push("Excuse-moi ma chere, repete s il te plait !");
    extra.push("Je n ai pas bien compris, essaie autrement ma chere !");
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
