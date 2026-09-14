import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const PRIX_MAX = 100_000_000;

/**
 * Le prix de vente, validé par UNE seule contrainte — et c'est délibéré.
 *
 * Empiler `@IsNumber` + `@IsPositive` + `@Max` produisait TROIS messages
 * quand le prix était absent, dont « ce prix est trop élevé » — faux, et
 * adressé à une marchande. `class-validator` évalue en effet toutes les
 * contraintes, y compris sur `undefined`.
 *
 * `stopAtFirstError` ne réglait pas le problème : posé sur la route, il
 * n'était jamais consulté, parce que dans NestJS les pipes GLOBAUX
 * s'exécutent AVANT ceux de la route — le pipe global (main.ts) avait déjà
 * rendu son verdict. Le régler globalement aurait changé le comportement de
 * toute l'API pour un besoin local.
 *
 * Une contrainte unique dit donc exactement ce qui ne va pas, une fois.
 */
@ValidatorConstraint({ name: 'prixDeVente', async: false })
export class PrixDeVenteValide implements ValidatorConstraintInterface {
  validate(valeur: unknown): boolean {
    return typeof valeur === 'number' && Number.isFinite(valeur) && valeur > 0 && valeur <= PRIX_MAX;
  }

  defaultMessage(args: ValidationArguments): string {
    const v = args.value;
    if (v === undefined || v === null || v === '') return 'Il faut indiquer ton prix de vente.';
    if (typeof v !== 'number' || !Number.isFinite(v)) return "Ce prix n'est pas un nombre valide.";
    if (v <= 0) return 'Le prix doit être supérieur à 0 : un article ne se vend pas à 0 franc.';
    return 'Ce prix est trop élevé.';
  }
}

/**
 * Adoption d'une référence maître par une marchande.
 *
 * Le champ qui compte est `prix`, OBLIGATOIRE et STRICTEMENT POSITIF. C'est
 * la traduction en code de la règle du lot : une référence maître n'est pas
 * vendable, elle le devient quand une marchande y pose SON prix. Adopter sans
 * prix reviendrait à créer l'article à 0 F qu'on refuse.
 */
export class AdopterReferenceDto {
  /** Référence stable côté Odoo (`VIV-TUB-001`). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  default_code: string;

  /** Prix de vente de CETTE marchande, en francs CFA. */
  @Validate(PrixDeVenteValide)
  prix: number;

  /** Unité locale : c'est la marchande qui sait si elle vend au tas ou au kilo. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unite?: string;

  /** Stock de départ. Zéro est légitime : on adopte souvent avant de recevoir
   *  la marchandise. C'est le PRIX qui ne peut pas être nul, pas le stock. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  /** Prix d'achat, si elle le connaît — sert au calcul de marge. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_achat?: number;
}
