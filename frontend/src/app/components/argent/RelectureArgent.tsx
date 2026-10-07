import { useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { vibrerAttente } from '../../utils/haptique';
import { PinArgent } from './PinArgent';

/**
 * RELECTURE D'ARGENT — la primitive maison T8 (AUDIT-UX-ROLES-2026-10-06,
 * reco T8 : « deux primitives obligatoires pour tout mouvement d'argent »).
 * Extraite de TransfertPage + MaCooperative qui la réimplémentaient inline
 * (REVIEW-001/R1-3) : UN écran de relecture, UN contrat, plus aucune copie.
 *
 * CE QU'ELLE GARANTIT, MÉCANIQUEMENT :
 *  1. RELECTURE DITE ET AFFICHÉE DEPUIS LA MÊME SOURCE (POSCaisse 558-665) :
 *     le montant est UN nombre — la forme écran (« 5 000 FCFA ») et la forme
 *     parlée (« 5 000 francs », ARG-17 : forme parlée ≠ forme écran) en
 *     dérivent toutes les deux. R1-4 (REVIEW-001) : la relecture ne pouvait
 *     plus être muette — elle parle à l'ouverture (T7 : tout ce qui est écrit
 *     doit être parlé ; la phrase reproduit exactement ce qui est affiché).
 *  2. TRIPLE CANAL (inclusion, docs/INCLUSION.md §2.3) : pendant l'attente
 *     (l'irréversible est en vol), `vibrerAttente()` — 90 ms, LE motif maison
 *     « c'est pris, mais ce n'est pas encore parti » qui refuse de vibrer
 *     succès (POSCaisse 509-528, arbitrage Patrick 21/09/2026).
 *  3. AUTH-05 (audit UI auth) : Radix Dialog — focus trap, ESC, retour de
 *     focus, rôle dialog + titre décrit. R1-5 (REVIEW-001) : plus de feuille
 *     custom sans trap. La fermeture (ESC, overlay, X) est REFUSÉE tant que
 *     `enCours` — l'argent ne peut pas partir avec une feuille qui disparaît.
 *  4. VERROU SYNCHRONE CHEZ L'APPELANT : le ref anti double-tap (pattern
 *     caisse POSCaisse 208-210) reste la propriété de l'appelant — la
 *     primitive n'appelle `onConfirmer` qu'après ce verrou, jamais à sa
 *     place. `enCours` désactive tout (boutons, X, ESC, overlay).
 *
 * Le PIN (si `pinSecurityEnabled`) vit DANS la relecture, comme la primitive
 * `PinArgent` — vérifié par l'appelant contre /auth/pin/verify AVANT le POST.
 *
 * MarcheVirtuel garde encore son modal PIN historique (3e copie, 1130) — sa
 * migration est un lot à part : il porte montantsMasqués et speakSilent.
 */
export interface RelectureArgentProps {
  /** Feuille ouverte ? (contrôlé — l'appelant possède l'état) */
  ouvert: boolean;
  /** L'irréversible est en vol (verrou synchrone de l'appelant). */
  enCours: boolean;
  /** Fermer (annuler) — jamais invoqué pendant `enCours`. */
  onFermer: () => void;
  /** Confirmer — l'appelant vérifie PIN puis POST, sous son verrou. */
  onConfirmer: () => void;
  /** Forme écran ET voix du titre : « Tu envoies » / « Tu paies ». */
  titre: string;
  /** LA source unique du montant : écran « 5 000 FCFA », voix « 5 000 francs ». */
  montant: number;
  /** Ligne sous le montant, lue telle quelle à voix haute : « à Awa via Wave… ». */
  sousLigne?: string;
  /** L'avertissement définitif — affiché ET parlé. */
  avertissement: string;
  /** Bloc PIN (pinSecurityEnabled) — état possédé par l'appelant. */
  pinRequis?: boolean;
  pinValeur?: string;
  surPinChange?: (pin: string) => void;
  pinErreur?: string;
  /** Libellés du bouton de confirmation (repos / en vol). */
  libelleConfirmer: string;
  libelleEnCours: string;
  /** Accent (bordures, montant, annuler) — var CSS de la page. */
  accent?: string;
  /** Fond du bouton confirmer — peut être un dégradé. */
  accentConfirmer?: string;
}

const ACCENT_PAR_DEFAUT = 'var(--color-green-600)';

export function RelectureArgent({
  ouvert,
  enCours,
  onFermer,
  onConfirmer,
  titre,
  montant,
  sousLigne,
  avertissement,
  pinRequis = false,
  pinValeur = '',
  surPinChange,
  pinErreur,
  libelleConfirmer,
  libelleEnCours,
  accent = ACCENT_PAR_DEFAUT,
  accentConfirmer,
}: RelectureArgentProps) {
  const { speak } = useApp();
  const accentConfirmerFinal = accentConfirmer ?? accent;

  // R1-4 — LA RELECTURE PARLE À L'OUVERTURE, une seule fois par ouverture.
  // La phrase est composée des MÊMES props que l'écran affiche : impossible
  // qu'elle mente (dit et affiché depuis la même source). T7 : tout ce qui
  // est parlé ici est écrit à l'écran — titre, montant, destinataire,
  // avertissement.
  const etaitOuvertRef = useRef(false);
  const phraseVoix = `${titre} ${montant.toLocaleString('fr-FR')} francs${sousLigne ? ` — ${sousLigne}` : ''}. ${avertissement}`;
  useEffect(() => {
    const ouverture = ouvert && !etaitOuvertRef.current;
    etaitOuvertRef.current = ouvert;
    if (ouverture) speak(phraseVoix);
    // La garde d'ouverture (ref) empêche toute re-parole sur re-render :
    // les dépendances ne re-déclenchent que la comparaison, jamais la voix.
  }, [ouvert, phraseVoix, speak]);

  // Vibration d'attente : l'impulsion 90 ms au DÉBUT de l'envoi — sentie même
  // par une marchande qui n'entend pas la voix et ne lit pas l'écran. Jamais
  // le motif du succès : tant que ça tourne, rien n'est parti.
  useEffect(() => {
    if (ouvert && enCours) vibrerAttente();
  }, [ouvert, enCours]);

  // Fermeture refusée pendant l'envoi — les trois portes (ESC, clic dehors,
  // focus dehors) sont gardées ici, en plus des boutons désactivés.
  const refuserSiEnCours = (e: Event) => { if (enCours) e.preventDefault(); };

  return (
    <DialogPrimitive.Root
      open={ouvert}
      onOpenChange={(o) => { if (!o && !enCours) onFermer(); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
        />
        <DialogPrimitive.Content
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom fixed inset-x-0 bottom-0 z-[300] mx-auto w-full max-w-2xl rounded-t-[28px] bg-white shadow-2xl outline-none duration-300"
          onEscapeKeyDown={refuserSiEnCours}
          onInteractOutside={refuserSiEnCours}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            {/* Radix : le titre du dialog est le h2 visible (AUTH-05). */}
            <DialogPrimitive.Title className="text-lg font-bold text-gray-900">{titre}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              disabled={enCours}
              aria-label="Fermer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 disabled:opacity-50"
            >
              <X className="h-5 w-5 text-gray-600" />
            </DialogPrimitive.Close>
          </div>

          <div className="space-y-4 p-6">
            <div className="rounded-2xl p-4" style={{ backgroundColor: `${accent}15` }}>
              <p className="mb-1 text-sm text-gray-600">{titre}</p>
              <p className="text-3xl font-bold tabular-nums" style={{ color: accent }}>
                {montant.toLocaleString('fr-FR')}{' '}<span className="text-base font-bold">FCFA</span>
              </p>
              {sousLigne && (
                <p className="mt-1 text-sm text-gray-600">{sousLigne}</p>
              )}
            </div>

            {/* L'avertissement est la Description Radix : énoncée avec le
                dialog par les lecteurs d'écran, et parlée à l'ouverture. */}
            <DialogPrimitive.Description className="text-xs text-gray-500">
              {avertissement}
            </DialogPrimitive.Description>

            {pinRequis && (
              <PinArgent
                id="relecture-argent-pin"
                valeur={pinValeur}
                onChangement={surPinChange ?? (() => {})}
                erreur={pinErreur}
                accent={accent}
              />
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onFermer}
                disabled={enCours}
                className="flex-1 rounded-2xl border-2 py-3 text-sm font-bold disabled:opacity-50"
                style={{ borderColor: `${accent}40`, color: accent, background: 'white' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onConfirmer}
                disabled={enCours || (pinRequis && pinValeur.length !== 4)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: accentConfirmerFinal }}
              >
                {enCours && <Loader2 className="h-4 w-4 animate-spin" />}
                {enCours ? libelleEnCours : libelleConfirmer}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
