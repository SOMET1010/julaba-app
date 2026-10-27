import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { Fingerprint, Volume2, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { registerWebAuthn } from '../../hooks/useWebAuthn';
import { doitProposerReconnaissance, marquerBiometrie, noterRefusProposition } from '../../services/comptesMemorises';
import { guidageVocal } from '../../utils/accessMode';
import { vibrerSucces } from '../../utils/haptique';
import { ACCUEIL_MARCHAND_VOICE_CLIPS, direAccueilMarchand, tourVoixAccueilLibre } from '../../services/accueilMarchandVoix';
import { derniereIssuePlayClip } from '../../utils/voiceTrace';
import { intentionOuiNon, type ReponseOuiNon } from '../../voice-offline/commandesEntree';
import { useCommandesVocales } from '../../hooks/useCommandesVocales';

/**
 * « Tata propose de me reconnaître » (connexion inclusive, lot 2).
 *
 * Juste après une entrée réussie par CODE, Tata propose — vocalement — de
 * simplifier les prochaines visites : « Veux-tu que Tata te reconnaisse la
 * prochaine fois ? ». Oui → le téléphone lance ce qu'il sait faire (visage,
 * doigt…) via l'enrôlement WebAuthn existant. Non → refus mémorisé, on ne
 * redemande pas (l'activation reste possible dans Paramètres → Sécurité).
 *
 * L'écran parle le langage de la personne (« te reconnaître », « pose ton
 * doigt ») — jamais « biométrie » ni « WebAuthn ». Une seule proposition par
 * compte et par téléphone (mémoire dans comptesMemorises).
 *
 * ── AUTH-05 (audit UI auth 05/10/2026) — LA MODALE EST PASSÉE SOUS RADIX ──
 *
 * CE QU'ON A TROUVÉ EN COURANT, MESURÉ AU NAVIGATEUR (R5/R7). La modale était
 * un `motion.div` dessiné main : pas de focus trap (Tab s'échappait sous la
 * modale), ESC inopérant, aucun retour de focus à la fermeture, bouton
 * « Fermer » de 32×32 px sous la cible tactile des normes (.ai ACCESSIBILITY_
 * GUIDE §4/§5 : ≥ 44 px) — et surtout : UN TAP MAL PLACÉ SUR LE FOND valait
 * refus DÉFINITIF mémorisé (`noterRefusProposition`). Une marchande qui
 * manquait l'écran de trois pixels perdait la proposition pour toujours.
 *
 * CE QUE C'EST DEVENU. Les primitives Radix `Dialog` portent ce que la norme
 * exige sans qu'on le réécrive (DESIGN_SYSTEM.md §9 : « Préférer Radix Dialog
 * (focus trap natif) » ; ACCESSIBILITY_GUIDE §5 : focus trap + aria-modal +
 * role dialog + retour focus) : piège de focus, ESC, retour de focus à la
 * fermeture, `aria-modal`, `role="dialog"` — tout est natif. La question est
 * un vrai `Title` ; la feuille du bas reste stylée à l'identique.
 *
 * LES SORTIES, REPARTIES SANS PIÈGE :
 *   · « Oui, je veux » → enrôlement (échec → refus noté, comme avant) ;
 *   · « Non » → refus mémorisé — la SEULE façon de dire non ;
 *   · « Fermer », ESC, tap sur le fond → fermeture SANS refus : elle n'a pas
 *     répondu, on ne la punit pas d'un tap manqué — la proposition reviendra
 *     au prochain lancement. Le fond n'est plus un piège à refus.
 *
 * LES CIBLES : « Fermer » passe à 44×44 px. « Oui, je veux » est reçu au
 * focus à l'ouverture (le geste recommandé d'abord, comme sur le pavé).
 */
export function PropositionReconnaissance() {
  const { user } = useApp();
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  // Le téléphone a REFUSÉ le son de la question (autoplay hors geste, vrai
  // téléphone) : l'écran le NOMME au lieu de rester une modale muette.
  const [sonRefuse, setSonRefuse] = useState(false);
  const phoneRef = useRef('');
  // Toute sortie de la modale (« Oui », « Non », « Fermer », ESC, fond) ABANDONNE
  // la chaîne vocale encore en attente — on ne pose pas une question APRÈS qu'on
  // y a déjà répondu.
  const closRef = useRef(false);
  const ouiRef = useRef<HTMLButtonElement>(null);
  // ── SECOND VOLET DE L'AUDIT (Patrick, 26/10) : LA QUESTION S'ENTEND RÉPONDRE
  // Après la question (reconnaissanceProposition) puis la consigne (login-85 —
  // « dis oui ou non »), l'écran ÉCOUTE une fenêtre courte. Le doute
  // n'enrichit NI le oui NI le non (un faux oui ouvre un enrôlement, un faux
  // non mémorise un refus définitif — seule une réponse claire passe).
  const { ecoute, demarrer: demarrerCommandes, arreter: arreterCommandes } = useCommandesVocales<ReponseOuiNon>();
  const ouiActionRef = useRef<() => void>(() => {});
  const nonActionRef = useRef<() => void>(() => {});
  const prenom = (user?.firstName || (user as any)?.prenoms || (user as any)?.prenom || '').toString().trim();

  useEffect(() => {
    // Conditions pour proposer : compte mémorisé sans reconnaissance ni refus,
    // téléphone capable (WebAuthn) et en ligne (l'enrôlement parle au serveur).
    const tel = String((user as any)?.phone || '').replace(/^\+225/, '');
    if (!/^\d{10}$/.test(tel)) return;
    if (typeof window.PublicKeyCredential === 'undefined') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    let propose = false;
    try { propose = doitProposerReconnaissance(window.localStorage, tel); } catch { /* ignore */ }
    if (!propose) return;
    phoneRef.current = tel;
    // La chaîne vocale vit HORS du geste (minuterie + attentes) : elle se
    // doit abandonnable (démontage ou sortie de modale) — d'où `vivant`.
    let vivant = true;
    const dormir = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    const clipQuestion = ACCUEIL_MARCHAND_VOICE_CLIPS.reconnaissanceProposition.file;
    const clipConsigne = ACCUEIL_MARCHAND_VOICE_CLIPS.reconnaissanceConsigneVoix.file;
    // Petite respiration : l'accueil s'installe, PUIS Tata pose sa question.
    // MAIS LA VOIX N'EST PLUS UNE MINUTERIE NUE (Patrick, 26/10 : « la question
    // ne joue pas »). Deux écueils fermés ici :
    //   1. LA COURSE — la question partait PILE sur la phrase de caisse
    //      (priorité 'user' des deux côtés : une preuve coupait l'autre, et la
    //      caisse peut arriver TARD sur réseau réel). La question ATTEND son
    //      tour (créneau de l'accueil — la règle « les rappels attendent leur
    //      tour », e5ebc902) et se REDIT si la caisse la coupe en route.
    //   2. LE SILENCE MENTEUR — sur un vrai téléphone, un `play()` hors geste
    //      peut être REFUSÉ (autoplay) ; le résultat mourait dans l'audio-
    //      manager qui rapportait « joué » (dette ACC-05). Le lecteur VOIX-05
    //      (`derniereIssuePlayClip`) relit la preuve écrite par le lecteur
    //      lui-même : refus → on ne prétend pas qu'elle a entendu, l'écran
    //      NOMME le geste qui marche — le haut-parleur part d'un vrai doigt.
    const t = setTimeout(() => {
      setVisible(true);
      if (!guidageVocal()) return;
      void (async () => {
        try {
          // 1. ATTENDRE SON TOUR — la phrase d'argent d'abord (ACC-01),
          //    au plus ~20 s : ne jamais la laisser dans le noir.
          for (let i = 0; i < 13 && vivant && !tourVoixAccueilLibre(); i++) await dormir(1500);
          // 2. LA QUESTION — deux tentatives au plus : si la caisse s'est
          //    réservée PENDANT (réseau lent), elle a coupé la question ; on
          //    attend derrière elle et on la redit ENTIÈRE.
          for (let essai = 0; essai < 2 && vivant; essai++) {
            if (closRef.current) return;
            const r = await direAccueilMarchand('reconnaissanceProposition');
            if (!vivant || closRef.current) return;
            if (derniereIssuePlayClip(clipQuestion) === 'play-refuse') {
              setSonRefuse(true);
              return;
            }
            if (!r.lu) return; // coupé ou absent : cause au journal, le HP reste
            if (!tourVoixAccueilLibre()) {
              for (let i = 0; i < 13 && vivant && !tourVoixAccueilLibre(); i++) await dormir(1500);
              continue;
            }
            const c = await direAccueilMarchand('reconnaissanceConsigneVoix');
            if (!vivant || closRef.current) return;
            // Consigne refusée ou coupée : pas de micro derrière une phrase
            // que l'oreille n'a pas entendue — les boutons restent (Oui est
            // reçu au focus).
            if (derniereIssuePlayClip(clipConsigne) === 'play-refuse' || !c.lu) return;
            demarrerCommandes({
              grammaire: intentionOuiNon,
              dureeMs: 8_000,
              surCommande: (rep) => {
                // « oui » → l'enrôlement ; « non » → le refus (mémorisé). Le
                // micro est DÉJÀ rendu (le hook arrête l'écoute avant d'appeler).
                if (rep === 'oui') void ouiActionRef.current();
                else nonActionRef.current();
              },
            });
            return;
          }
        } catch { return; }
      })();
    }, 1500);
    return () => { vivant = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const repondreOui = async () => {
    if (enCours) return;
    setEnCours(true);
    closRef.current = true; // la chaîne vocale en attente est abandonnée
    arreterCommandes();
    try {
      const r = await registerWebAuthn();
      if (r.etat === 'ok') {
        try { marquerBiometrie(window.localStorage, phoneRef.current, true); } catch { /* ignore */ }
        vibrerSucces();
        if (guidageVocal()) void direAccueilMarchand('reconnaissanceReussie');
      } else if (r.etat === 'session_expiree') {
        // API-01b : on ne note PAS un refus, et on ne lui dit pas que « ça n'a
        // pas marché ». Elle n'a rien raté — c'est sa session qui a fini.
        // Noter un refus ici la priverait de la proposition à l'avenir, pour
        // une raison qui ne la concerne pas.
        if (guidageVocal()) void direAccueilMarchand('reconnaissanceSession');
      } else {
        // Échec ou annulation : on n'insiste pas (même politesse qu'un « Non »).
        // L'activation reste possible à tout moment dans Paramètres → Sécurité.
        try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
        if (guidageVocal()) void direAccueilMarchand('reconnaissanceErreur');
      }
    } catch {
      try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
      if (guidageVocal()) void direAccueilMarchand('reconnaissanceErreur');
    } finally {
      setEnCours(false);
      setVisible(false);
    }
  };

  // « Non » — la seule sortie qui mémorise un refus. Deliberate : elle a lu
  // (ou entendu) la question et répond. « Une seule proposition » tient.
  const repondreNon = () => {
    closRef.current = true; // la chaîne vocale en attente est abandonnée
    arreterCommandes();
    try { noterRefusProposition(window.localStorage, phoneRef.current); } catch { /* ignore */ }
    if (guidageVocal()) void direAccueilMarchand('reconnaissanceRefus');
    setVisible(false);
  };
  // LA VOIX COMMANDÉE RESTE AUSSI À JOUR QUE LE DOIGT.
  ouiActionRef.current = () => { void repondreOui(); };
  nonActionRef.current = repondreNon;

  // AUTH-05 — ESC, « Fermer », tap sur le fond : fermeture SANS refus. Elle
  // n'a pas dit non — un tap manqué ou une touche pressée par accident ne
  // doit pas lui fermer la porte pour toujours. La proposition reviendra au
  // prochain lancement ; le jour où elle répond « Non », elle s'arrête.
  const fermerSansRepondre = () => {
    closRef.current = true; // la chaîne vocale en attente est abandonnée
    arreterCommandes();
    setVisible(false);
  };

  return (
    <DialogPrimitive.Root open={visible} onOpenChange={(o) => { if (!o) fermerSansRepondre(); }}>
      <AnimatePresence>
        {visible && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.45)' }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild forceMount
              aria-describedby={undefined}
              // Radix 1.1 masque les voisins via aria-hidden (hideOthers) et ne
              // pose pas l'attribut — on l'expose explicitement pour la
              // checklist a11y (.ai ACCESSIBILITY_GUIDE : modale aria-modal).
              aria-modal="true"
              // Le geste recommandé d'abord : « Oui, je veux » reçoit le focus
              // à l'ouverture (à défaut du bouton Fermer, premier du DOM).
              onOpenAutoFocus={(e) => { e.preventDefault(); ouiRef.current?.focus(); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 28 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 121,
                  // Feuille TOUJOURS CLAIRE, à dessein : ses textes sont des bruns
                  // littéraux de la charte auth (voir authCharte.test.mts) — la
                  // passer au jeton sombre les rendrait illisibles. La migration
                  // commence par les textes (→ --encre), pas par la feuille.
                  margin: '0 auto', width: '100%', maxWidth: 480, background: '#fff',
                  borderTopLeftRadius: 26, borderTopRightRadius: 26,
                  padding: '22px 20px calc(24px + env(safe-area-inset-bottom))',
                  textAlign: 'center',
                }}
              >
                {/* AUTH-05 — Radix `Close` : le clic déclenche la fermeture SANS
                    refus (via onOpenChange), et la cible passe à 44×44 px. */}
                <DialogPrimitive.Close asChild>
                  <button type="button" aria-label="Fermer"
                    style={{ position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                    <X size={18} color="#8A5A34" />
                  </button>
                </DialogPrimitive.Close>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  <Fingerprint style={{ width: 32, height: 32, color: 'var(--commerce-action)' }} />
                </div>
                {/* AUTH-05 — la question est un vrai `Title` de dialogue (le
                    lecteur d'écran la nomme à l'entrée dans la modale). */}
                <DialogPrimitive.Title asChild>
                  <p style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 800, color: '#3d1a08', lineHeight: 1.35 }}>
                    {prenom ? `${prenom}, veux-tu` : 'Veux-tu'} que Tantie Nanti Lou te reconnaisse la prochaine fois ?
                  </p>
                </DialogPrimitive.Title>
                <button type="button" onClick={() => { setSonRefuse(false); void direAccueilMarchand('reconnaissanceProposition'); }}
                  aria-label="Écouter Tantie Nanti Lou"
                  style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', border: '2px solid rgba(198,106,44,0.35)', background: '#fff7ef', color: 'var(--commerce-action)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <Volume2 aria-hidden="true" size={25} />
                </button>
                {/* Le silence NOMME le geste (26/10) : si le téléphone a refusé
                    le son (autoplay hors geste), l'écran dit quoi toucher au lieu
                    de rester une modale muette — le haut-parleur, lui, part
                    d'un vrai doigt, donc il joue toujours. */}
                {sonRefuse && (
                  <p role="status" style={{ margin: '-8px 0 14px', fontSize: 14, fontWeight: 700, color: '#8A5A34' }}>
                    Touche le haut-parleur pour écouter la question
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={repondreNon} disabled={enCours}
                    style={{ flex: 1, padding: '15px 0', borderRadius: 16, fontWeight: 800, fontSize: 15, color: '#8A5A34', background: 'var(--commerce-surface)', border: '2px solid rgba(198,106,44,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Non
                  </button>
                  <button ref={ouiRef} type="button" onClick={repondreOui} disabled={enCours}
                    className={ecoute && !enCours ? 'login-cue-clignote' : undefined}
                    style={{ flex: 1.4, padding: '15px 0', borderRadius: 16, fontWeight: 800, fontSize: 15, color: '#fff', background: enCours ? '#CBB9A8' : 'linear-gradient(135deg, #EE8E3C, var(--commerce-action))', border: 'none', cursor: enCours ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                    {enCours ? 'Un instant…' : 'Oui, je veux'}
                  </button>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
