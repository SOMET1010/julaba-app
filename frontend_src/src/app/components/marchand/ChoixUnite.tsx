/**
 * « TU VENDS PAR… » — le choix de l'unité, posable en deux lignes. VOIX-01, lot E (b).
 *
 * LE DÉFAUT QU'ON FERME. Dans la feuille « Autre article » de la caisse, le
 * chemin « montant libre » enregistrait `unite: 'unite'` en dur : une
 * marchande qui vend un tas de gombo hors catalogue ne pouvait pas le dire, et
 * son reçu disait « 1 × gombo ». Le chemin voisin (adopter une référence du
 * catalogue maître) posait, lui, la question. Deux gestes côte à côte, une
 * seule des deux vérités enregistrée. La doctrine est sans exception :
 * « L'unité est obligatoire partout : 500 F / tas, 800 F / kg, 300 F / pièce ».
 *
 * CE QUE CE COMPOSANT EST. Six boutons — les six unités déjà proposées par la
 * caisse, dans LEUR graphie (c'est elle que `uniteEntendue` reproduit côté
 * voix : le doigt et la voix écrivent pareil). Il ne connaît ni le panier ni
 * le prix : il rend une valeur, l'appelant en fait une ligne. Chaque bouton
 * fait au moins 44 px de haut — règle tactile du dépôt (test-cible-tactile) :
 * une cible plus petite, sur un marché, c'est un mauvais tas dans le panier.
 *
 * LA VOIX FAIT PARTIE DU PARCOURS. Une marchande qui ne lit pas ne vérifie
 * pas son choix des yeux : à la sélection, `dire` prononce « au tas »,
 * « au kilo ». Facultatif, pour que l'appelant garde la main sur le guidage
 * (il passe son `dire`, déjà gardé par `guidageVocal()`).
 */
import type { CSSProperties } from 'react';

/** Les unités de la caisse, dans l'ordre où elle les propose déjà. */
export const UNITES_CHOIX = ['unité', 'tas', 'kg', 'sac', 'bassine', 'régime'] as const;
export type UniteChoix = (typeof UNITES_CHOIX)[number];

/** Hauteur minimale d'une cible tactile, en pixels — même règle que les billets. */
export const CIBLE_TACTILE_MIN = 44;

/**
 * Ce que Tata dit quand l'unité est choisie : « au tas », « au kilo »… La
 * tournure est celle du marché (« je vends au kilo »), pas celle du bouton
 * (« kg » ne se prononce pas).
 */
const PHRASES: Record<UniteChoix, string> = {
  'unité': "à l'unité",
  'tas': 'au tas',
  'kg': 'au kilo',
  'sac': 'au sac',
  'bassine': 'à la bassine',
  'régime': 'au régime',
};

export function phraseUnite(unite: string): string {
  return (PHRASES as Record<string, string>)[unite] ?? `en ${unite}`;
}

interface Props {
  /** Unité actuellement retenue (l'appelant la garde dans son état). */
  valeur: string;
  onChoisir: (unite: UniteChoix) => void;
  /** Synthèse vocale de l'appelant, déjà gardée par la préférence de guidage. */
  dire?: (texte: string) => void;
  /** Couleur d'accent de l'écran hôte (celle de la caisse par défaut). */
  couleur?: string;
}

export function ChoixUnite({ valeur, onChoisir, dire, couleur = '#AF5B23' }: Props) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-3)' }}>Tu vends par…</div>
      <div role="group" aria-label="Unité de vente" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 14 }}>
        {UNITES_CHOIX.map((u) => {
          const choisie = valeur === u;
          const style: CSSProperties = {
            minHeight: CIBLE_TACTILE_MIN,
            minWidth: CIBLE_TACTILE_MIN,
            padding: '8px 14px',
            border: `1.5px solid ${choisie ? couleur : 'var(--trait)'}`,
            background: choisie ? `${couleur}12` : '#fff',
            color: choisie ? couleur : 'var(--encre-3)',
            borderRadius: 11,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          };
          return (
            <button
              type="button"
              key={u}
              aria-pressed={choisie}
              onClick={() => { onChoisir(u); dire?.(phraseUnite(u)); }}
              style={style}
            >
              {u}
            </button>
          );
        })}
      </div>
    </div>
  );
}
