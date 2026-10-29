/**
 * PIN D'ARGENT — la seconde primitive maison T8 (AUDIT-UX-ROLES-2026-10-06) :
 * le champ PIN 4 chiffres qui accompagne toute confirmation d'argent quand
 * `pinSecurityEnabled` est actif. Extrait de MaCooperative (REVIEW-001/R1-3,
 * où il vivait inline), pour qu'il n'existe qu'UNE copie du geste.
 *
 * Contrat inchangé : contrôlé par l'appelant (valeur + onChange), chiffres
 * seuls, 4 max. La VÉRIFICATION reste chez l'appelant (/auth/pin/verify
 * AVANT le POST d'argent — même contrat que MarcheVirtuel et la caisse).
 * Accessibilité : label explicite, erreur en role="alert" reliée par
 * aria-describedby (AUTH-05).
 */
export interface PinArgentProps {
  /** id du champ (l'erreur est reliée via `${id}-erreur`). */
  id: string;
  valeur: string;
  onChangement: (pin: string) => void;
  erreur?: string;
  /** Bordure quand le champ est rempli (accent de la page). */
  accent?: string;
  disabled?: boolean;
}

export function PinArgent({ id, valeur, onChangement, erreur, accent = 'var(--color-green-600)', disabled = false }: PinArgentProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-gray-700">Ton code PIN</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={valeur}
        onChange={(e) => onChangement(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="4 chiffres"
        disabled={disabled}
        className="w-full h-12 px-4 rounded-xl border-2 text-center text-xl font-bold tracking-[0.5em] tabular-nums focus:outline-none"
        style={{ borderColor: valeur ? accent : 'var(--border)' }}
        aria-describedby={erreur ? `${id}-erreur` : undefined}
      />
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>{erreur}</p>
      )}
    </div>
  );
}
