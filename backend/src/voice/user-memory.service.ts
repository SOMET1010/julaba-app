import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserMemoryService {
  private readonly logger = new Logger(UserMemoryService.name);

  constructor(private dataSource: DataSource) {}

  // Récupérer toute la mémoire d un user
  async getMemory(userId: string): Promise<Record<string, string>> {
    try {
      const rows = await this.dataSource.query(
        `SELECT cle, valeur FROM user_memory WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId]
      );
      const memory: Record<string, string> = {};
      rows.forEach((r: any) => { memory[r.cle] = r.valeur; });
      return memory;
    } catch { return {}; }
  }

  // Sauvegarder une valeur en mémoire
  async setMemory(userId: string, cle: string, valeur: string, source = 'auto'): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO user_memory (user_id, cle, valeur, source, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, cle) DO UPDATE SET valeur = $3, source = $4, updated_at = NOW()`,
        [userId, cle, valeur, source]
      );
    } catch (e: any) {
      this.logger.warn(`[MEMORY] setMemory error: ${e.message}`);
    }
  }

  // Supprimer une clé
  async deleteMemory(userId: string, cle: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM user_memory WHERE user_id = $1 AND cle = $2`,
      [userId, cle]
    );
  }

  // Formater la mémoire pour le system prompt
  // Extraire automatiquement des infos depuis la réponse IA
  async extractAndSave(userId: string, text: string, intent: string, action: any): Promise<void> {
    try {
      // ── Vente ─────────────────────────────────────────────────
      if (intent === 'vendre' && action?.produit) {
        // Produit fréquent avec compteur
        const existing = await this.getMemory(userId);
        const key = `produit_frequent_${action.produit}`;
        const prev = existing[key] ? JSON.parse(existing[key]) : { produit: action.produit, count: 0 };
        prev.count = (prev.count || 0) + 1;
        prev.derniere_vente = new Date().toISOString().split('T')[0];
        if (action.montant) prev.dernier_prix = action.montant;
        await this.setMemory(userId, key, JSON.stringify(prev));

        // Prix unitaire habituel par produit
        if (action.montant && action.quantite && action.quantite > 0) {
          const prixUnitaire = Math.round(action.montant / action.quantite);
          await this.setMemory(userId, `prix_habituel_${action.produit}`, String(prixUnitaire));
        }

        // Dernier produit vendu (raccourci vocal)
        await this.setMemory(userId, 'dernier_produit_vendu', action.produit);
        if (action.quantite) await this.setMemory(userId, `derniere_quantite_${action.produit}`, String(action.quantite));
      }

      // ── Dépense ───────────────────────────────────────────────
      if (intent === 'depense' && action?.description && action?.montant) {
        await this.setMemory(userId, `depense_frequente_${action.description.toLowerCase().replace(/\s+/g,'_')}`,
          JSON.stringify({ description: action.description, montant_habituel: action.montant }));
      }

      // ── Objectif journalier ───────────────────────────────────
      if (intent === 'definir_objectif' && action?.montant) {
        await this.setMemory(userId, 'objectif_journalier', String(action.montant));
      }

      // ── Raccourcis vocaux fréquents ───────────────────────────
      if (intent === 'utiliser_raccourci' && action?.declencheur) {
        const key = `raccourci_frequent_${action.declencheur.replace(/\s+/g,'_')}`;
        const prev = await this.getMemory(userId);
        const count = prev[key] ? parseInt(prev[key]) + 1 : 1;
        await this.setMemory(userId, key, String(count));
        // Si utilisé 3+ fois → suggérer de le mémoriser
        if (count === 3) {
          await this.setMemory(userId, `suggestion_raccourci_${action.declencheur}`, 'true');
        }
      }

      // ── Heure d ouverture habituelle ──────────────────────────
      if (intent === 'ouvrir_journee') {
        const heure = new Date().getHours();
        await this.setMemory(userId, 'heure_ouverture_habituelle', String(heure) + 'h');
      }

      // ── Heure de fermeture habituelle ─────────────────────────
      if (intent === 'fermer_journee') {
        const heure = new Date().getHours();
        await this.setMemory(userId, 'heure_fermeture_habituelle', String(heure) + 'h');
      }

    } catch (e: any) {
      this.logger.warn(`[MEMORY] extractAndSave error: ${e.message}`);
    }
  }

  // Formater la mémoire de façon lisible pour le prompt IA
  formatForPrompt(memory: Record<string, string>): string {
    if (!Object.keys(memory).length) return 'Aucune information connue encore.';
    const lines: string[] = [];

    // Produits fréquents
    Object.entries(memory)
      .filter(([k]) => k.startsWith('produit_frequent_'))
      .forEach(([k, v]) => {
        try {
          const p = JSON.parse(v);
          lines.push(`- Vend souvent: ${p.produit} (${p.count} fois, dernier prix: ${p.dernier_prix || '?'} Francs)`);
        } catch (error) {
          this.logger.error('formatForPrompt parse failed', error instanceof Error ? error.stack : String(error));
        }
      });

    // Prix habituels
    Object.entries(memory)
      .filter(([k]) => k.startsWith('prix_habituel_'))
      .forEach(([k, v]) => {
        const produit = k.replace('prix_habituel_', '');
        lines.push(`- Prix habituel ${produit}: ${v} Francs/kg`);
      });

    // Quantités habituelles
    Object.entries(memory)
      .filter(([k]) => k.startsWith('derniere_quantite_'))
      .forEach(([k, v]) => {
        const produit = k.replace('derniere_quantite_', '');
        lines.push(`- Quantité habituelle ${produit}: ${v} kg`);
      });

    // Objectif
    if (memory['objectif_journalier']) {
      lines.push(`- Objectif journalier: ${parseInt(memory['objectif_journalier']).toLocaleString('fr-FR')} Francs`);
    }

    // Horaires
    if (memory['heure_ouverture_habituelle']) lines.push(`- Ouvre habituellement à: ${memory['heure_ouverture_habituelle']}`);
    if (memory['heure_fermeture_habituelle']) lines.push(`- Ferme habituellement à: ${memory['heure_fermeture_habituelle']}`);

    // Dernier produit
    if (memory['dernier_produit_vendu']) lines.push(`- Dernier produit vendu: ${memory['dernier_produit_vendu']}`);

    return lines.length ? lines.join('\n') : 'Aucune information connue encore.';
  }
}
