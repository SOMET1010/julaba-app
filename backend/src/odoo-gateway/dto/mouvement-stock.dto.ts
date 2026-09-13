import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Commande de mouvement de stock côté Gateway — frontière d'intégration avec
 * Odoo, donc on refuse (fail closed) plutôt que de normaliser silencieusement
 * une valeur invalide (contrairement au mock, qui simule un système externe
 * et n'a pas à faire cette police).
 */
export class MouvementStockDto {
  @IsString()
  @IsNotEmpty()
  operationId: string;

  @IsInt()
  @IsPositive()
  odooProductId: number;

  @IsNumber()
  @IsPositive()
  quantite: number;

  @IsIn(['in', 'out'])
  type: 'in' | 'out';

  /** Knob de démonstration/tests UNIQUEMENT — jamais exposé côté JULABA réel,
   *  jamais transmis par un vrai appelant. Déclenche le scénario « erreur
   *  Odoo simulée » de façon déterministe pour les tests. */
  @IsOptional()
  @IsBoolean()
  simulerErreur?: boolean;
}
