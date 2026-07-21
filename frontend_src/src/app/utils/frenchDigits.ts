// ── Dictée vocale d'un numéro de téléphone ────────────────────────────────────
// Une marchande qui ne lit pas dit son numéro à voix haute (« zéro sept,
// quarante-cinq… »). Le moteur vocal renvoie soit des chiffres (« 07 45 »), soit
// des mots (« zéro sept quarante cinq »). Cette fonction transforme les DEUX cas
// en une suite de chiffres.

const SMALL: Record<string, number> = {
  zero: 0, 'zéro': 0,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS: Record<string, number> = {
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
};

/** Convertit des MOTS français (0–99, dits par paires comme au téléphone) en chiffres. */
export function frenchWordsToDigits(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[^0-9a-zàâäéèêëïîôöùûüç\s]/g, ' ') // enlève ponctuation (virgules, points…)
    .split(/\s+/)
    .filter(Boolean);

  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];

    // Déjà un nombre (ex. « 07 »)
    if (/^\d+$/.test(tok)) { out.push(tok); i++; continue; }

    // quatre-vingt(s) → 80, éventuellement 81–99
    if (tok === 'quatre' && tokens[i + 1] && tokens[i + 1].startsWith('vingt')) {
      let val = 80;
      i += 2;
      const nx = tokens[i] !== undefined ? SMALL[tokens[i]] : undefined;
      if (nx !== undefined && nx <= 19) { val = 80 + nx; i++; }
      out.push(String(val));
      continue;
    }

    // dizaines (vingt…soixante), avec unité éventuelle
    if (TENS[tok] !== undefined) {
      let val = TENS[tok];
      i++;
      if (tokens[i] === 'et') i++; // « vingt et un »
      const nx = tokens[i] !== undefined ? SMALL[tokens[i]] : undefined;
      if (nx !== undefined) {
        if (val === 60 && nx >= 10 && nx <= 16) { val = 60 + nx; i++; }        // soixante-dix…seize → 70–76
        else if (nx <= 9) { val = val + nx; i++; }                             // vingt-deux, soixante-cinq…
      }
      out.push(String(val));
      continue;
    }

    // unités et 10–16
    if (SMALL[tok] !== undefined) { out.push(String(SMALL[tok])); i++; continue; }

    // mot inconnu → ignoré
    i++;
  }
  return out.join('');
}

/**
 * Extrait un numéro (jusqu'à 10 chiffres) d'une phrase dictée.
 * Priorité aux chiffres déjà reconnus par le moteur ; sinon on lit les mots.
 */
export function extractPhoneDigits(transcript: string): string {
  const direct = (transcript || '').replace(/\D/g, '');
  const digits = direct.length >= 8 ? direct : frenchWordsToDigits(transcript || '');
  return digits.slice(0, 10);
}
