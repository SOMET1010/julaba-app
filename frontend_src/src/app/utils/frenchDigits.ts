// ── Dictée vocale d'un numéro de téléphone ────────────────────────────────────
// Une marchande qui ne lit pas dit son numéro à voix haute (« zéro sept,
// quarante-cinq… »). Le moteur vocal renvoie soit des chiffres (« 07 45 »), soit
// des mots (« zéro sept quarante cinq »). Cette fonction transforme les DEUX cas
// en une suite de chiffres.

const SMALL: Record<string, number> = {
  zero: 0, 'zéro': 0, 'zéros': 0, o: 0, oh: 0, ho: 0, // « o »/« oh » : ratés fréquents du moteur pour « zéro »
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

    // Lit une valeur 0–19 à partir de l'index j, en gérant « dix-sept/huit/neuf »
    // (deux tokens) → 17/18/19. Renvoie [valeur|undefined, tokensConsommés].
    const lirePetit = (j: number): [number | undefined, number] => {
      const v = tokens[j] !== undefined ? SMALL[tokens[j]] : undefined;
      if (v === undefined) return [undefined, 0];
      if (v === 10) { // « dix » éventuellement suivi de 7/8/9 → 17/18/19
        const u = tokens[j + 1] !== undefined ? SMALL[tokens[j + 1]] : undefined;
        if (u !== undefined && u >= 7 && u <= 9) return [10 + u, 2];
      }
      return [v, 1];
    };

    // quatre-vingt(s) → 80, éventuellement 81–99 (dont quatre-vingt-dix-neuf = 99)
    if (tok === 'quatre' && tokens[i + 1] && tokens[i + 1].startsWith('vingt')) {
      let val = 80;
      i += 2;
      const [nx, used] = lirePetit(i);
      if (nx !== undefined && nx <= 19) { val = 80 + nx; i += used; }
      out.push(String(val));
      continue;
    }

    // dizaines (vingt…soixante), avec unité éventuelle
    if (TENS[tok] !== undefined) {
      let val = TENS[tok];
      i++;
      if (tokens[i] === 'et') i++; // « vingt et un »
      const [nx, used] = lirePetit(i);
      if (nx !== undefined) {
        if (val === 60 && nx >= 10 && nx <= 19) { val = 60 + nx; i += used; }  // soixante-dix…dix-neuf → 70–79
        else if (nx <= 9) { val = val + nx; i += used; }                       // vingt-deux, soixante-cinq…
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
  const t = transcript || '';
  // frenchWordsToDigits gère À LA FOIS les mots (« zéro sept ») ET les chiffres
  // déjà reconnus (« 07 »). On garde en plus les chiffres bruts comme filet, et
  // on retient la version qui donne le plus de chiffres.
  const parMots = frenchWordsToDigits(t);
  const bruts = t.replace(/\D/g, '');
  const best = parMots.length >= bruts.length ? parMots : bruts;
  return best.slice(0, 10);
}
