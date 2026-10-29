/**
 * Capitalise un prénom ou nom : première lettre de chaque segment en majuscule.
 * Gère : espaces multiples, tirets, accents FR, null/undefined/vide.
 * Ex : "MARIE-CLAIRE" → "Marie-Claire", "FELICITE" → "Félicité" (si accent en DB)
 */
export function toProperCase(input: string | null | undefined): string {
  if (input == null || input === '') return '';
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(/(\s+|-)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === '-') return part;
      if (part === '') return part;
      const lower = part.toLocaleLowerCase('fr-FR');
      return lower.replace(/^[\p{L}]/u, (ch) => ch.toLocaleUpperCase('fr-FR'));
    })
    .join('');
}
