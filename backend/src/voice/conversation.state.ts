import { Injectable, Logger } from "@nestjs/common";

// ── Types ──────────────────────────────────────────────────

export type ConversationStateType =
  | "idle"
  | "creating_sale"
  | "awaiting_product"
  | "awaiting_quantity"
  | "awaiting_price"
  | "awaiting_depense_montant"
  | "awaiting_depense_description"
  | "awaiting_confirmation";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  timestamp: number;
}

export interface ConversationContext {
  state: ConversationStateType;
  history: ConversationTurn[];
  pendingIntent?: string;
  pendingEntities?: Record<string, unknown>;
  lastResponse?: string;
  lastIntent?: string;
}

// ── Service ────────────────────────────────────────────────

@Injectable()
export class ConversationStateService {
  private readonly logger = new Logger(ConversationStateService.name);
  private readonly store = new Map<string, ConversationContext>();
  private readonly MAX_HISTORY = 10;
  private readonly ENTRY_TTL_MS = 30 * 60 * 1000; // 30 minutes

  getContext(userId: string): ConversationContext {
    if (this.store.has(userId)) {
      const existing = this.store.get(userId)!;
      const lastTurn = existing.history[existing.history.length - 1];
      if (lastTurn && Date.now() - lastTurn.timestamp > this.ENTRY_TTL_MS) {
        this.store.delete(userId);
        this.logger.log(`[STATE] Purge TTL: ${userId}`);
      }
    }
    if (!this.store.has(userId)) {
      this.store.set(userId, {
        state: "idle",
        history: [],
      });
    }
    return this.store.get(userId)!;
  }

  updateContext(
    userId: string,
    updates: Partial<ConversationContext>
  ): void {
    const ctx = this.getContext(userId);
    this.store.set(userId, { ...ctx, ...updates });
  }

  addTurn(userId: string, turn: ConversationTurn): void {
    const ctx = this.getContext(userId);
    const history = [...ctx.history, turn].slice(-this.MAX_HISTORY);
    this.store.set(userId, { ...ctx, history });
  }

  transition(userId: string, intent: string, hasAllEntities: boolean): ConversationStateType {
    const ctx = this.getContext(userId);
    let nextState: ConversationStateType = "idle";

    switch (intent) {
      case "vendre":
        nextState = hasAllEntities ? "awaiting_confirmation" : "creating_sale";
        break;
      case "depense":
        nextState = hasAllEntities ? "awaiting_confirmation" : "awaiting_depense_montant";
        break;
      case "ajouter_stock":
        nextState = hasAllEntities ? "awaiting_confirmation" : "awaiting_product";
        break;
      default:
        nextState = "idle";
    }

    this.logger.log(
      `[STATE] ${userId}: ${ctx.state} → ${nextState} (intent: ${intent})`
    );

    this.updateContext(userId, { state: nextState });
    return nextState;
  }

  reset(userId: string): void {
    this.updateContext(userId, {
      state: "idle",
      pendingIntent: undefined,
      pendingEntities: undefined,
    });
  }

  getHistory(userId: string): ConversationTurn[] {
    return this.getContext(userId).history;
  }
}
