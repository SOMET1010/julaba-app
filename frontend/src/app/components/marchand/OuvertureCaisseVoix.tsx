/**
 * OUVRIR SA CAISSE EN PARLANT — l'ordre de Patrick (06/11).
 *
 * LE DÉFAUT QU'ON FERME. L'ouverture de journée n'avait AUCUNE porte : le
 * commentaire d'AppContext le disait (« l'accueil n'expose aucun bouton
 * "Ouvrir ma journée" — son seul chemin est "Modifier le fond" », enfoui dans
 * le résumé), et `OpenDayModal` — l'écran complet de comptage — était écrit
 * mais monté NULLE PART. Le matin, une marchande qui ne lit pas arrivait sur
 * un accueil qui lui disait SON montant sans lui permettre de déclarer le
 * sien : elle vendait « à zéro » ou détournait « Modifier le fond ».
 *
 * LE FLUX DEMANDÉ, PAR LA VOIX : Tantie demande « Tu as combien dans ta
 * caisse aujourd'hui ? », elle répond le montant en parlant, Tantie le RELIT
 * et demande confirmation — « {montant} francs au fond de caisse. C'est bien
 * ça ? Dis oui ou non » — et son oui déclare la journée (openDay, qui parle
 * lui-même la clé MARCHAND_007). L'argent est en jeu : LE DOUTE NE PROFITE
 * JAMAIS AU OUI — la grammaire déclarée `intentionOuiNon` rend null sur le
 * doute, l'écoute continue, les boutons Oui/Non restent.
 *
 * ON NE RÉÉCRIT RIEN : la dictée de montant est `BoutonDirePrix` (question
 * dite, micro anti-écho, lecture `montantDit` — web et Sherpa) avec UNE
 * question de plus et des refus qui nomment LE geste de CET écran (clés
 * passées en props) ; la confirmation est `useCommandesVocales` +
 * `intentionOuiNon`, le gabarit de `PropositionReconnaissance` ; la prise de
 * parole est réservée au tour de voix de l'accueil. Le comptage à la main
 * reste un repli NOMMÉ : `OpenDayModal`, enfin montée.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader, X } from 'lucide-react';
import { BoutonDirePrix } from './BoutonDirePrix';
import { useCommandesVocales } from '../../hooks/useCommandesVocales';
import { intentionOuiNon, type ReponseOuiNon } from '../../voice-offline/commandesEntree';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';
import { EcranEcoutePleinEcran } from './EcranEcoutePleinEcran';
import { paroleConfirmationTerminee } from '../../services/paroleConfirmation';
import { creerTentativeOuverture } from '../../services/tentativeOuverture';

const ACTION = 'var(--commerce-action)';
const CIBLE = 44;

interface Props {
  /** Parle pour l'écran (la voix d'accueil de la marchande connectée). */
  dire: (texte: string) => void | Promise<void>;
  /** Son oui déclare la journée — `openDay(montant)` reste au parent. */
  onFondDeclare: (montant: number) => void | Promise<void>;
  /** Le repli NOMMÉ : le comptage à la main (OpenDayModal, enfin montée). */
  onManuel: () => void;
  /** « Plus tard » : le flux se ferme sans rien écrire. */
  onFermer: () => void;
}

export function OuvertureCaisseVoix({ dire, onFondDeclare, onManuel, onFermer }: Props) {
  const questionFond = resoudreMessage('CAI_OUVERTURE_FOND');
  // LE TOUR DE LA DICTÉE : à chaque retour de confirmation, BoutonDirePrix est
  // remonté (`key={tour}`) pour que la question reparte et que le micro
  // s'ouvre de lui-même — son garde « une seule ouverture par montage »
  // sinon le laisserait muet au second tour.
  const [tour, setTour] = useState(0);
  const [etape, setEtape] = useState<'fond' | 'confirmation'>('fond');
  const [montant, setMontant] = useState<number | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [parole, setParole] = useState<'enCours' | 'reussie' | 'echec'>('reussie');
  const [erreurOuverture, setErreurOuverture] = useState(false);
  const paroleRef = useRef(false);
  const demandeRef = useRef(0);
  const tentativeRef = useRef(creerTentativeOuverture());
  const { ecoute, demarrer: demarrerCommandes, arreter: arreterCommandes } = useCommandesVocales<ReponseOuiNon>();
  const vivantRef = useRef(true);
  useEffect(() => {
    vivantRef.current = true;
    return () => { vivantRef.current = false; demandeRef.current += 1; paroleRef.current = false; arreterCommandes(); };
  }, [arreterCommandes]);

  const ecouterConfirmation = (m: number, demande: number) => {
    demarrerCommandes({
      grammaire: intentionOuiNon,
      dureeMs: 8_000,
      surCommande: (rep) => {
        if (!vivantRef.current || demandeRef.current !== demande || !paroleRef.current) return;
        if (rep === 'oui') void declarer(m);
        else recommencer();
      },
    });
  };

  const reprendreConfirmation = async (m: number) => {
    const demande = ++demandeRef.current;
    paroleRef.current = false;
    setParole('enCours');
    const reussie = await paroleConfirmationTerminee(
      () => rendreMessage(resoudreMessage('CAI_OUVERTURE_ECHEC'), dire),
    );
    if (!vivantRef.current || demandeRef.current !== demande) return;
    if (!reussie) {
      paroleRef.current = false;
      setParole('echec');
      return;
    }
    paroleRef.current = true;
    setParole('reussie');
    ecouterConfirmation(m, demande);
  };

  // LA CONFIRMATION EST DITE PUIS ÉCOUTÉE — le même ordre que partout (MIC-01
  // : rien n'est écouté tant que Tantie parle). « non » → on re-demande le
  // montant (elle s'est entendue mal dire), jamais on ne déclare à sa place.
  const demanderConfirmation = (m: number) => {
    const demande = ++demandeRef.current;
    paroleRef.current = false;
    setMontant(m);
    setEtape('confirmation');
    setParole('enCours');
    arreterCommandes();
    void (async () => {
      const reussie = await paroleConfirmationTerminee(
        () => rendreMessage(resoudreMessage('CAI_OUVERTURE_CONFIRMER', { montant: m }), dire),
      );
      if (!reussie) {
        if (vivantRef.current && demandeRef.current === demande) setParole('echec');
        return;
      }
      if (!vivantRef.current || demandeRef.current !== demande) return;
      paroleRef.current = true;
      setParole('reussie');
      ecouterConfirmation(m, demande);
    })();
  };

  const declarer = async (m: number) => {
    if (enCours || !paroleRef.current) return;
    const demande = ++demandeRef.current;
    paroleRef.current = false;
    arreterCommandes();
    setEnCours(true);
    try {
      const resultat = await tentativeRef.current.executer(() => onFondDeclare(m));
      if (!vivantRef.current || demandeRef.current !== demande || resultat.etat !== 'echec') return;
      setErreurOuverture(true);
      await reprendreConfirmation(m);
      // Le parent dit MARCHAND_007 (« ta journée est ouverte avec... ») et
      // referme le flux : une seule voix pour l'accusé de réception.
    } finally {
      if (vivantRef.current) setEnCours(false);
    }
  };

  const recommencer = () => {
    demandeRef.current += 1;
    paroleRef.current = false;
    arreterCommandes();
    tentativeRef.current = creerTentativeOuverture();
    setMontant(null);
    setEtape('fond');
    setParole('reussie');
    setErreurOuverture(false);
    setTour((t) => t + 1);
  };

  const annuler = () => {
    demandeRef.current += 1;
    paroleRef.current = false;
    arreterCommandes();
    onFermer();
  };

  if (etape === 'confirmation' && ecoute) {
    return <EcranEcoutePleinEcran onFermer={annuler} />;
  }

  return (
    <div role="status" style={{ background: 'var(--commerce-orange-50)', border: '2px solid ' + ACTION, borderRadius: 18, padding: '14px 15px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--encre)' }}>Ouvre ta caisse</div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={annuler}
          aria-label="Plus tard"
          style={{ width: CIBLE, height: CIBLE, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--encre-3)' }}>
          <X size={18} />
        </motion.button>
      </div>

      {etape === 'fond' ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--encre-3)', margin: '0 0 10px' }}>
            {questionFond.texte}
          </p>
          <BoutonDirePrix
            key={tour}
            onMontant={demanderConfirmation}
            ouvrirToutSeul
            question={questionFond.texte}
            messageQuestion={questionFond}
            afficherEcoutePleinEcran
            onAnnulerEcoute={onFermer}
            dire={dire}
            cleSilence="CAI_OUVERTURE_SILENCE"
            cleMicro="CAI_OUVERTURE_MIC"
            cleReseau="CAI_OUVERTURE_WEB"
          />
        </>
      ) : (
        <>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--encre)', margin: '0 0 12px', lineHeight: 1.4 }}>
            {montant === null ? '' : resoudreMessage('CAI_OUVERTURE_CONFIRMER', { montant }).texte}
          </p>
          {parole === 'echec' && (
            <p role="alert" style={{ fontSize: 14, fontWeight: 700, color: 'var(--encre-3)', margin: '0 0 10px' }}>
              La confirmation n’a pas pu être dite. Réessaie ou reviens.
            </p>
          )}
          {erreurOuverture && (
            <p role="alert" style={{ fontSize: 14, fontWeight: 700, color: 'var(--encre-3)', margin: '0 0 10px' }}>
              {resoudreMessage('CAI_OUVERTURE_ECHEC').texte}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {parole === 'echec' ? (
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => {
                if (montant === null) return;
                if (erreurOuverture) void reprendreConfirmation(montant);
                else demanderConfirmation(montant);
              }}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 800, fontSize: 15, border: '2px solid ' + ACTION, color: ACTION, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                {erreurOuverture ? 'Réessayer la parole' : 'Réessayer'}
              </motion.button>
            ) : (
            <motion.button whileTap={{ scale: 0.96 }} onClick={recommencer} disabled={enCours || parole !== 'reussie'}
              style={{ flex: 1, padding: '13px 0', borderRadius: 14, fontWeight: 800, fontSize: 15, border: '2px solid ' + ACTION, color: ACTION, background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
              Non, je redis
            </motion.button>
            )}
            {parole !== 'echec' && <motion.button whileTap={{ scale: 0.96 }} onClick={() => montant != null && void declarer(montant)} disabled={enCours || parole !== 'reussie'}
              className={ecoute && !enCours ? 'login-cue-clignote' : undefined}
              style={{ flex: 1.3, padding: '13px 0', borderRadius: 14, fontWeight: 800, fontSize: 15, color: 'white', background: ACTION, border: 'none', cursor: enCours || parole !== 'reussie' ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {enCours ? <Loader size={18} style={{ display: 'inline' }} /> : erreurOuverture ? 'Réessayer l’ouverture' : 'Oui, c\u2019est ça'}
            </motion.button>}
          </div>
        </>
      )}

      {/* LE REPLI NOMMÉ : compter à la main. La porte tactile existe depuis
          toujours (OpenDayModal) — elle est enfin montrée, et son geste est
          dit, pas seulement écrit. */}
      {parole !== 'echec' && <motion.button whileTap={{ scale: 0.97 }} onClick={() => { demandeRef.current += 1; paroleRef.current = false; arreterCommandes(); onManuel(); }} disabled={enCours || (etape === 'confirmation' && parole !== 'reussie')}
        style={{ width: '100%', minHeight: CIBLE, borderRadius: 12, border: 'none', background: 'transparent', color: ACTION, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
        Le compter à la main
      </motion.button>}
      {/* La phrase de confirmation est RELUE au toucher du haut-parleur : le
          bouton micro de BoutonDirePrix ne dit que la question du fond. */}
      <motion.button whileTap={{ scale: 0.94 }} onClick={() => {
        const message = etape === 'fond'
          ? questionFond
          : montant === null ? null : resoudreMessage('CAI_OUVERTURE_CONFIRMER', { montant });
        if (message && (etape === 'fond' || parole === 'reussie')) void rendreMessage(message, dire);
      }}
        aria-label="Écouter Tantie encore"
        disabled={etape === 'confirmation' && parole !== 'reussie'}
        style={{ width: '100%', minHeight: 40, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--encre-3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Écouter encore
      </motion.button>
    </div>
  );
}
