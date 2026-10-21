import { BadRequestException } from '@nestjs/common';

/**
 * Hygiène NNI (INSTITUTION-19, audit institution 2026-10-19) + traçabilité
 * sans PII (INSTITUTION-01).
 *
 * Le NNI du RNPP (ONECI Côte d'Ivoire) est numérique — 10 chiffres en réel.
 * La validation est volontairement tolérante (8 à 12 chiffres) pour ne pas
 * casser la saisie incrémentale du front (le lookup se déclenche dès 8
 * caractères tapés — FicheIdentificationDynamique.tsx:2888 et
 * FicheIdentificationDynamiqueBO.tsx:3354) ni le bac à sable RNPP
 * (sandboxMode). Tout le reste (lettres, symboles, gabarit, trop long) est
 * refusé AVANT tout appel upstream : pas d'injection, pas de sonde du RNPP
 * avec des payloads arbitraires.
 */
const NNI_REGEX = /^[0-9]{8,12}$/;

/** Valide et nettoie un NNI reçu en paramètre de route. Lève 400 sinon. */
export function validerNni(nni: unknown): string {
  const valeur = typeof nni === 'string' ? nni.trim() : '';
  if (!NNI_REGEX.test(valeur)) {
    throw new BadRequestException('NNI invalide : 8 à 12 chiffres attendus');
  }
  return valeur;
}

/**
 * Masquage pour le journal d'audit — JAMAIS le NNI en clair (recommandation
 * INSTITUTION-01 §6.1 : « qui / quel NNI masqué / résultat »). Conserve les
 * 3 premiers + 2 derniers caractères (10 chiffres → 123•••••90), milieu
 * plafonné à 12 points ; entrée tronquée à 32 caractères (défense en
 * profondeur contre un payload géant soumis au paramètre).
 */
export function masquerNni(nni: string): string {
  const valeur = String(nni ?? '').slice(0, 32);
  if (valeur.length < 6) return '•'.repeat(Math.max(valeur.length, 6));
  const milieu = '•'.repeat(Math.min(valeur.length - 5, 12));
  return `${valeur.slice(0, 3)}${milieu}${valeur.slice(-2)}`;
}
