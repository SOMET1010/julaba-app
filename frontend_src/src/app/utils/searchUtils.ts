/**
 * JÙLABA — Utilitaires de recherche unifiés
 * ==========================================
 * Toutes les barres de recherche de la plateforme utilisent ces fonctions.
 *
 * Règles de filtrage standard :
 *  - Insensible à la casse (toLowerCase)
 *  - Recherche inclusive (includes, pas startsWith)
 *  - Chaîne vide = pas de filtre (affiche tout)
 *  - Normalisation des accents via normalize + replace
 */

/**
 * Normalise une chaîne pour la comparaison :
 * minuscules + suppression des accents diacritiques
 */
export function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Vérifie si UNE chaîne contient le terme de recherche.
 * Insensible à la casse et aux accents.
 */
export function fieldMatches(field: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalizeStr(field).includes(normalizeStr(query));
}

/**
 * Vérifie si AU MOINS UN des champs fournis correspond au terme de recherche.
 * C'est la fonction principale à utiliser dans les useMemo de filtrage.
 *
 * @example
 * const match = matchesSearch(query, acteur.nom, acteur.prenoms, acteur.telephone);
 */
export function matchesSearch(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query.trim()) return true;
  const q = normalizeStr(query);
  return fields.some((field) => field != null && normalizeStr(field).includes(q));
}

/**
 * Filtre générique sur un tableau d'objets.
 * Retourne le tableau complet si query est vide.
 *
 * @example
 * const filtered = filterBySearch(query, acteurs, (a) => [a.nom, a.prenoms, a.telephone]);
 */
export function filterBySearch<T>(
  query: string,
  items: T[],
  getFields: (item: T) => (string | undefined | null)[]
): T[] {
  if (!query.trim()) return items;
  const q = normalizeStr(query);
  return items.filter((item) =>
    getFields(item).some((field) => field != null && normalizeStr(field).includes(q))
  );
}

/**
 * Surligne la portion d'un texte correspondant à la requête.
 * Retourne un tableau de segments { text, highlight }.
 *
 * @example
 * const parts = highlightMatch('Aminata Kouassi', 'kou');
 * // [{ text: 'Aminata ', highlight: false }, { text: 'Kou', highlight: true }, { text: 'assi', highlight: false }]
 */
export function highlightMatch(
  text: string,
  query: string
): { text: string; highlight: boolean }[] {
  if (!query.trim()) return [{ text, highlight: false }];

  const normalText = normalizeStr(text);
  const normalQuery = normalizeStr(query);
  const idx = normalText.indexOf(normalQuery);

  if (idx === -1) return [{ text, highlight: false }];

  return [
    { text: text.slice(0, idx), highlight: false },
    { text: text.slice(idx, idx + query.length), highlight: true },
    { text: text.slice(idx + query.length), highlight: false },
  ].filter((s) => s.text.length > 0);
}
