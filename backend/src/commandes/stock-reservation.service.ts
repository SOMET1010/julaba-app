import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

interface ReservationCible {
  commandeId: string;
  publicationId: string | null;
  quantite: number;
}

/**
 * Reservation de stock B2 (marche virtuel), sans aucun mouvement d'argent.
 *
 * Modele : le disponible reel d'une publication est porte par
 * publications.quantite_disponible. Reserver le reduit tout de suite (le stock
 * disparait du marche des la commande en_attente) et journalise la reservation
 * dans stock_reservations. Convertir la finalise (vente ferme + decrement des
 * recoltes). Liberer la restitue.
 *
 * Toutes les operations :
 *  - s'executent dans la transaction de l'appelant (EntityManager fourni),
 *  - verrouillent la ligne publication en FOR UPDATE (serialise les concurrents,
 *    invariant I1 : atomicite stock),
 *  - sont idempotentes par commande_id (invariant I2 : rejeu sans double effet).
 *
 * Seule la RESERVATION bloque en cas de stock insuffisant (on ne reserve pas ce
 * qui n'existe pas). La conversion, elle, ne bloque jamais : elle finalise une
 * commande deja actee et borne le disponible a 0 (trace, esprit I3).
 */
@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  /**
   * Reserve la quantite d'une commande en_attente contre sa publication.
   * Bloque (409) si le disponible est insuffisant. No-op si pas de publication
   * ou si une reservation existe deja pour cette commande (idempotent).
   */
  async reserver(manager: EntityManager, cible: ReservationCible): Promise<void> {
    const { commandeId, publicationId, quantite } = cible;
    if (!publicationId) return;
    const q = Number(quantite);
    if (!(q > 0)) return;

    const deja = await manager.query(
      `SELECT id FROM stock_reservations WHERE commande_id = $1`,
      [commandeId],
    );
    if (deja.length > 0) return; // idempotent

    const pub = await manager.query(
      `SELECT quantite_disponible FROM publications WHERE id = $1 FOR UPDATE`,
      [publicationId],
    );
    if (pub.length === 0) {
      throw new NotFoundException('Publication introuvable pour la reservation de stock');
    }
    const disponible = Number(pub[0].quantite_disponible);
    if (q > disponible) {
      throw new ConflictException(
        `Stock insuffisant : ${disponible} disponible, ${q} demande`,
      );
    }

    await manager.query(
      `UPDATE publications SET quantite_disponible = quantite_disponible - $1, updated_at = NOW() WHERE id = $2`,
      [q, publicationId],
    );
    await manager.query(
      `INSERT INTO stock_reservations (commande_id, publication_id, quantite, statut)
       VALUES ($1, $2, $3, 'active')`,
      [commandeId, publicationId, q],
    );
  }

  /**
   * Convertit la reservation d'une commande en vente ferme (confirmation).
   * - Reservation active : marquee convertie ; le disponible a deja ete reduit
   *   a la reservation, on ne le retouche pas.
   * - Aucune reservation prealable (commande creee directement confirmee) :
   *   decrement ferme du disponible, borne a 0, et ligne 'convertie' d'audit.
   * Puis decrement des recoltes liees et passage a 'epuise' si disponible = 0.
   * Idempotent : no-op si deja convertie. Ne bloque jamais.
   */
  async convertir(manager: EntityManager, cible: ReservationCible): Promise<void> {
    const { commandeId, publicationId, quantite } = cible;
    if (!publicationId) return;
    const q = Number(quantite);

    // Verrou publication (serialise avec reserve/liberer concurrents).
    const pub = await manager.query(
      `SELECT id FROM publications WHERE id = $1 FOR UPDATE`,
      [publicationId],
    );
    if (pub.length === 0) return;

    const res = await manager.query(
      `SELECT quantite, statut FROM stock_reservations WHERE commande_id = $1 FOR UPDATE`,
      [commandeId],
    );

    if (res.length > 0) {
      const statut = res[0].statut as string;
      if (statut === 'convertie') return; // idempotent
      if (statut === 'liberee') {
        // Commande annulee puis confirmee : incoherent, on ne re-decremente pas.
        this.logger.warn(
          `convertir: reservation deja liberee pour commande ${commandeId}, conversion ignoree`,
        );
        return;
      }
      // active -> convertie ; le disponible a deja ete reduit a la reservation.
      await manager.query(
        `UPDATE stock_reservations SET statut = 'convertie', updated_at = NOW() WHERE commande_id = $1`,
        [commandeId],
      );
    } else {
      // Pas de reservation prealable : decrement ferme direct (borne a 0).
      if (!(q > 0)) return;
      await manager.query(
        `UPDATE publications SET quantite_disponible = GREATEST(0, quantite_disponible - $1), updated_at = NOW() WHERE id = $2`,
        [q, publicationId],
      );
      await manager.query(
        `INSERT INTO stock_reservations (commande_id, publication_id, quantite, statut)
         VALUES ($1, $2, $3, 'convertie')`,
        [commandeId, publicationId, q],
      );
    }

    // Decrement des recoltes liees (une seule fois, a la conversion).
    await manager.query(
      `UPDATE recoltes r
         SET stock_disponible = GREATEST(0, r.stock_disponible - $1),
             stock_vendu = r.stock_vendu + $1,
             statut = CASE WHEN GREATEST(0, r.stock_disponible - $1) = 0 THEN 'vendue' ELSE r.statut END,
             updated_at = NOW()
       FROM publications p
       WHERE p.id = $2 AND p.recolte_id = r.id`,
      [q, publicationId],
    );

    // Passage a 'epuise' si la publication est vide.
    await manager.query(
      `UPDATE publications SET statut = 'epuise', updated_at = NOW()
       WHERE id = $1 AND quantite_disponible = 0 AND statut = 'disponible'`,
      [publicationId],
    );
  }

  /**
   * Vente DIRECTE (hors marche/publication) : decrement FERME d'une recolte
   * explicite (cf. ADR-0001 D2 / #12). Pas de deduction heuristique — la
   * recolte cible est fournie par l'appelant. Meme esprit que la conversion
   * marche : definitif, borne a 0, idempotent par commande_id, verrou recolte.
   * Le mouvement est journalise dans stock_reservations (publication_id NULL,
   * recolte_id renseigne, statut 'convertie'). Aucun argent implique.
   */
  async convertirRecolteDirecte(
    manager: EntityManager,
    cible: { commandeId: string; recolteId: string; quantite: number },
  ): Promise<void> {
    const { commandeId, recolteId, quantite } = cible;
    if (!recolteId) return;
    const q = Number(quantite);
    if (!(q > 0)) return;

    // Idempotence : un mouvement existe deja pour cette commande -> ne rien refaire.
    const deja = await manager.query(
      `SELECT id FROM stock_reservations WHERE commande_id = $1 FOR UPDATE`,
      [commandeId],
    );
    if (deja.length > 0) return;

    // Verrou recolte (serialise les concurrents sur la meme recolte).
    const rec = await manager.query(
      `SELECT id FROM recoltes WHERE id = $1 FOR UPDATE`,
      [recolteId],
    );
    if (rec.length === 0) {
      throw new NotFoundException('Recolte introuvable pour la vente directe');
    }

    // Decrement ferme (borne a 0) + passage a 'vendue' si epuisee.
    await manager.query(
      `UPDATE recoltes
         SET stock_disponible = GREATEST(0, stock_disponible - $1),
             stock_vendu = stock_vendu + $1,
             statut = CASE WHEN GREATEST(0, stock_disponible - $1) = 0 THEN 'vendue' ELSE statut END,
             updated_at = NOW()
       WHERE id = $2`,
      [q, recolteId],
    );
    await manager.query(
      `INSERT INTO stock_reservations (commande_id, publication_id, recolte_id, quantite, statut)
       VALUES ($1, NULL, $2, $3, 'convertie')`,
      [commandeId, recolteId, q],
    );
  }

  /**
   * Libere la reservation active d'une commande (annulation) : restitue le
   * disponible et marque la ligne 'liberee'. Idempotent : n'agit que sur une
   * reservation 'active' (ne restitue jamais une vente deja convertie).
   */
  async liberer(manager: EntityManager, commandeId: string): Promise<void> {
    const res = await manager.query(
      `SELECT publication_id, quantite, statut FROM stock_reservations WHERE commande_id = $1 FOR UPDATE`,
      [commandeId],
    );
    if (res.length === 0 || res[0].statut !== 'active') return; // idempotent

    const publicationId = res[0].publication_id as string;
    const q = Number(res[0].quantite);

    await manager.query(
      `SELECT id FROM publications WHERE id = $1 FOR UPDATE`,
      [publicationId],
    );
    await manager.query(
      `UPDATE publications SET quantite_disponible = quantite_disponible + $1, updated_at = NOW() WHERE id = $2`,
      [q, publicationId],
    );
    await manager.query(
      `UPDATE stock_reservations SET statut = 'liberee', updated_at = NOW() WHERE commande_id = $1`,
      [commandeId],
    );
  }
}
