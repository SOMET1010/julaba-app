/**
 * fr-ci — MESSAGES (TTS_OUTPUT) : ce que Tata dit en français du marché ivoirien.
 *
 * LA RÈGLE DE CETTE LOCALE : elle sert `frActuel` du catalogue, c'est-à-dire
 * EXACTEMENT ce que le code disait avant le lot i18n. C'est ce qui rend le
 * français « identique à avant » prouvable (empreintesArgent.mts). Il n'y a
 * donc pas de seconde copie des 496 textes : la table est DÉRIVÉE du
 * catalogue, entrée par entrée.
 *
 * LES SURCHARGES. Quand Manus livre un français « marché » (`frMarche`) validé
 * pour une clé, l'ingénierie le pose ici, dans `SURCHARGES`, avec son statut
 * de validation — jamais automatiquement depuis `frMarche` : activer une
 * reformulation d'argent est une décision, pas un effet de bord. Vide pour
 * l'instant : Manus n'a encore rien livré.
 *
 * VALIDATION. Le français actuel est celui du pilote, entendu sur appareil
 * réel et couvert par les garde-fous d'argent (VOIX-01/02) : `field_validated`,
 * `finance: true`. Patrick peut rétrograder n'importe quelle clé ici.
 */
import { MESSAGES_TTS } from '../../catalog';
import type { MessageId, MessageLocalise, Validation } from '../../types';

const VALIDATION_FR_ACTUEL: Validation = { linguistique: 'field_validated', finance: true };

/** Reformulations validées, par clé — posées par l'ingénierie sur livraison de Manus. */
export const SURCHARGES: Readonly<Record<MessageId, MessageLocalise>> = {};

export const MESSAGES_FR_CI: Readonly<Record<MessageId, MessageLocalise>> = Object.freeze(
  Object.fromEntries(
    MESSAGES_TTS.map((m) => [m.id, SURCHARGES[m.id] ?? { template: m.frActuel, validation: VALIDATION_FR_ACTUEL }]),
  ),
);
