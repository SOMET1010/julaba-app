import { randomInt } from 'node:crypto';

/**
 * LE CODE DE L'IDENTIFICATEUR — généré ici, et nulle part ailleurs.
 *
 * CE QU'ON REMPLACE. `auth.controller.ts` tirait le code avec `Math.random()` :
 *   digits[Math.floor(Math.random() * digits.length)]
 * `Math.random()` n'est pas un générateur cryptographique. Sa graine est
 * devinable, sa suite est prédictible à partir de quelques sorties. Pour un
 * mot de passe de session jetable ce serait négligeable ; pour un credential
 * qui ouvre la modification des fiches acteurs, non.
 *
 * CE QU'ON GARDE, ET POURQUOI. Quatre chiffres, alphabet 2–9. Ce n'est pas un
 * oubli, c'est un arbitrage de Patrick du 19/09/2026, écrit ici pour que
 * personne ne le « corrige » par réflexe :
 *
 *   « Pour JULABA, l'accessibilité terrain prime : mémorisation, dictée,
 *     compréhension vocale, utilisatrices peu alphabétisées. »
 *
 * Un code à 6 chiffres se retient mal, se dicte mal, et s'entend mal au
 * téléphone sur un marché. On n'ajoute pas de la sécurité en rendant l'outil
 * inutilisable : on la met ailleurs.
 *
 * 0 et 1 sont exclus parce qu'ils se confondent à l'oral et à l'écrit avec O
 * et I — c'est une règle de lisibilité, pas de sécurité.
 *
 * CE QUE ÇA COÛTE, DIT HONNÊTEMENT. 8⁴ = 4 096 combinaisons. C'est peu. Ce
 * choix n'est tenable QUE parce que chaque vérification passe par le verrou de
 * `verrou-pin.ts` : au-delà de ~72 essais par jour, l'attaquant attend. Si un
 * jour quelqu'un retire ce verrou d'un chemin de vérification, l'arbitrage
 * ci-dessus tombe avec lui. C'est pour ça que les tests le prouvent.
 */
export const ALPHABET_PIN_IDENTIFICATEUR = '23456789';
export const LONGUEUR_PIN_IDENTIFICATEUR = 4;

export function genererPinIdentificateur(): string {
  let pin = '';
  for (let i = 0; i < LONGUEUR_PIN_IDENTIFICATEUR; i += 1) {
    // `randomInt` puise dans le CSPRNG du système et évite le biais modulo.
    pin += ALPHABET_PIN_IDENTIFICATEUR[randomInt(ALPHABET_PIN_IDENTIFICATEUR.length)];
  }
  return pin;
}

/**
 * Un PIN trop évident reste refusé, même tiré au sort. La probabilité est
 * faible (4 chances sur 4 096) mais une marchande à qui on envoie « 2222 » n'a
 * aucune raison de payer notre paresse.
 */
export function pinTropSimple(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;               // 2222, 7777…
  const croissant = '0123456789';
  const decroissant = '9876543210';
  return croissant.includes(pin) || decroissant.includes(pin); // 2345, 5432…
}

export function genererPinIdentificateurAcceptable(): string {
  for (let essai = 0; essai < 20; essai += 1) {
    const pin = genererPinIdentificateur();
    if (!pinTropSimple(pin)) return pin;
  }
  // Inatteignable en pratique ; on ne boucle pas sans fin sur un aléa.
  return genererPinIdentificateur();
}
