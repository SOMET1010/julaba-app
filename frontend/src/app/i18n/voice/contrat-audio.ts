/**
 * CONTRAT D'INTÉGRATION AUDIO — la frontière entre Claude et Manus.
 * Découpage définitif de Patrick (20/09/2026) :
 *   Claude = texte structuré + intentions + i18n + moteur métier.
 *   Manus  = langues naturelles + voix + audio, PROPRIÉTAIRE DE BOUT EN BOUT.
 *
 * CE QUE CE FICHIER EST. Une interface typée et un point d'enregistrement :
 * le moteur résout une clé en `{ id, locale, texte, variables }` et le remet
 * au RENDU VOCAL enregistré. Le rendu par défaut appelle le `speak` existant
 * avec le texte résolu — comportement identique à aujourd'hui (clips par
 * texte exact, synthèse, silence : rien ne change dans la façon dont un son
 * est produit). Manus enregistre le sien (`enregistrerRenduVocal`) et fait ce
 * qu'il veut derrière les IDs : clip par (id, locale), voix par langue,
 * prosodie… sans toucher à la logique métier ni aux textes.
 *
 * CE QUE CE FICHIER N'EST PAS. Il ne référence ni ne réorganise les clips,
 * packs, voix natives ou secours (tataVoice, tataUiClips, voicePacks,
 * audioManager, elevenlabs, voixNative) : ce chemin appartient à Manus.
 *
 * INVARIANT QUE MANUS DOIT GARDER : `message.texte` est LA chaîne AFFICHÉE, et
 * `message.texteParle` LA chaîne DITE. Un rendu peut jouer un clip à la place
 * de la synthèse ; il ne réécrit ni l'une ni l'autre.
 *
 * POURQUOI DEUX CHAÎNES DEPUIS LE 22/09/2026. Elles n'en faisaient qu'une, et
 * c'était un défaut d'argent : `3 000` est parfait pour l'œil et faux pour
 * l'oreille — l'espace fine insécable (U+202F) faisait épeler « trois zéro
 * zéro zéro » au moteur de synthèse, sur l'APK livré, en français, sur TOUS
 * les montants. Les deux formes sont DÉRIVÉES de la même source structurée
 * (i18n/voice/argent/) ; l'affichage n'a pas bougé d'un pixel. Pour toute
 * phrase sans argent, `texteParle === texte`.
 */
import { formeParleeDuMessage } from './runtime';
import type { MessageVocal } from './runtime';
export type { MessageVocal } from './runtime';
export { IDS_TTS, IDS_INTENTS, INTENTS_CRITIQUES, MESSAGES_CRITIQUES } from './catalog';

/** Le `speak` existant de l'application, ou toute fonction qui dit un texte. */
export type DireTexte = (texte: string) => void | Promise<void>;

/**
 * Un rendu vocal : reçoit le message résolu et la fonction de repli texte.
 * Il peut ignorer `direTexte` (clip complet), l'appeler (synthèse), ou
 * combiner (clip pour l'ID, synthèse pour les variables).
 */
export type RenduVocal = (message: MessageVocal, direTexte: DireTexte) => void | Promise<void>;

/**
 * LA CHAÎNE QUI PART AU MOTEUR DE SYNTHÈSE — et le seul endroit qui le décide.
 * Tout message issu de `resoudreMessage` porte sa forme parlée ; un
 * `MessageVocal` forgé à la main dans un test de rendu n'en a pas, et il n'a
 * pas non plus de montant à dire.
 */
export { formeParleeDuMessage as formeDite };

/** Le chemin `speak` existant — avec la forme PARLÉE, pas la forme écran. */
export const RENDU_PAR_DEFAUT: RenduVocal = (message, direTexte) => direTexte(formeParleeDuMessage(message));

let renduCourant: RenduVocal = RENDU_PAR_DEFAUT;

/** Point d'enregistrement pour Manus. `null` remet le rendu par défaut. */
export function enregistrerRenduVocal(rendu: RenduVocal | null): void {
  renduCourant = rendu ?? RENDU_PAR_DEFAUT;
}

export function renduVocalCourant(): RenduVocal {
  return renduCourant;
}

/** Fait dire un message résolu par le rendu enregistré. Ne résout rien : voir speakMessage.ts. */
export function rendreMessage(message: MessageVocal, direTexte: DireTexte): void | Promise<void> {
  return renduCourant(message, direTexte);
}
