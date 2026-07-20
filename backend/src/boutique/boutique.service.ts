import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BoutiqueMouvement } from "./boutique-mouvement.entity";
import { MouvementDto } from "./dto/sync-mouvements.dto";

@Injectable()
export class BoutiqueService {
  private readonly logger = new Logger(BoutiqueService.name);

  constructor(
    @InjectRepository(BoutiqueMouvement) private repo: Repository<BoutiqueMouvement>,
  ) {}

  /**
   * Remontee (telephone -> serveur). Insere chaque mouvement de facon idempotente
   * (ON CONFLICT DO NOTHING sur l'id genere par l'appareil). Un rejeu en double
   * n'a aucun effet. Renvoie la liste des ids acquittes (tout le lot).
   */
  async sync(marchandId: string, mouvements: MouvementDto[]): Promise<{ acquittes: string[]; recus: number }> {
    const acquittes: string[] = [];
    for (const m of mouvements) {
      await this.repo.query(
        `INSERT INTO boutique_mouvements
           (id, marchand_id, device, type, produit, quantite, montant, transcription, ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          m.id,
          marchandId,
          m.device,
          m.type,
          m.produit ?? null,
          m.quantite ?? null,
          m.montant ?? null,
          m.transcription ?? null,
          String(m.ts),
        ],
      );
      acquittes.push(m.id);
    }
    this.logger.log(`[BOUTIQUE] sync marchand=${marchandId} recus=${mouvements.length}`);
    return { acquittes, recus: mouvements.length };
  }

  /**
   * Etat recalcule par rejeu du journal (jamais stocke). Meme logique que le banc :
   *   vente   : stock -quantite, caisse +montant
   *   depense : stock +quantite (si produit), caisse -montant
   *   reappro : stock +quantite
   */
  async etat(marchandId: string): Promise<{ stock: Record<string, number>; caisse: number; nbMouvements: number }> {
    const rows = await this.repo.find({ where: { marchand_id: marchandId } });
    rows.sort((a, b) => Number(a.ts) - Number(b.ts));

    const stock: Record<string, number> = {};
    let caisse = 0;
    for (const m of rows) {
      const q = Number(m.quantite) || 0;
      const montant = Number(m.montant) || 0;
      if (m.type === "vente") {
        if (m.produit) stock[m.produit] = (stock[m.produit] ?? 0) - q;
        caisse += montant;
      } else if (m.type === "depense") {
        if (m.produit) stock[m.produit] = (stock[m.produit] ?? 0) + q;
        caisse -= montant;
      } else if (m.type === "reappro") {
        if (m.produit) stock[m.produit] = (stock[m.produit] ?? 0) + q;
      }
    }
    return { stock, caisse, nbMouvements: rows.length };
  }
}
