import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

/**
 * Commande de mouvement de stock côté Gateway — frontière d'intégration avec
 * Odoo, donc on refuse (fail closed) plutôt que de normaliser silencieusement
 * une valeur invalide (contrairement au mock, qui simule un système externe
 * et n'a pas à faire cette police).
 *
 * Pas de knob de simulation d'erreur ici : un tel champ n'a aucun sens pour
 * un vrai appelant Odoo et ne doit jamais faire partie de la surface HTTP
 * publique. `OdooMockClient` garde son propre knob interne pour ses propres
 * tests directs (voir odoo-mock.client.ts) — inatteignable depuis ce DTO.
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
}
