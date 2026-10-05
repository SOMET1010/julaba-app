/**
 * JÙLABA — Onboarding « Tata se présente » (design v0.3, validé 12/08/2026)
 *
 * Ce n'est pas un tutoriel : c'est un ACCUEIL. UN SEUL écran — Tata se présente
 * et rassure — avant l'identification (Numéro → Code). Le parcours d'entrée est
 * : Bienvenue → Tata → Numéro → Code (quatre écrans avant l'accueil).
 *
 * Changements v0.3 par rapport à la version précédente :
 *  • SUPPRESSION du choix du mode d'accès (« comment veux-tu travailler ? ») —
 *    l'app s'adapte seule (accessMode 'auto'), plus d'écran abstrait.
 *  • SUPPRESSION de l'étape « Ma voix » / installation du moteur : la voix est
 *    détectée automatiquement, le message n'apparaît qu'en cas de besoin réel.
 *  • SUPPRESSION de l'écran « Touche et parle » (démonstration vocale) : la voix
 *    est un CONCEPT non validé qui appartient à la vente, pas à l'entrée.
 *
 * Principes conservés :
 *  • Voix d'abord : Tata LIT l'écran toute seule (auto-narration).
 *  • Interruption : un tap n'importe où arrête Tata et entre dans l'app.
 *  • Le haut-parleur (réécouter) est DISTINCT de l'action (continuer) et ne
 *    couvre jamais le visage de Tata.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

import { accessModeChoisi, getEffectiveMode, type EffectiveMode } from '../../utils/accessMode';
import tataAccueil from "../../../assets/redesign/tata-accueil.webp";
import bandeauMarche from "../../../assets/redesign/bandeau-marche.webp";
import { stopSpeaking } from '../../services/elevenlabs';
import { stopIntro } from '../../services/onboardingVoix';
import { direEntreeAvantConnexion } from '../../services/entreeVoixAvantConnexion';
import { tParle } from '../../i18n/voice/runtime';
import { parlerAvantConnexion } from '../../services/paroleEntree';

/**
 * ── TNT-01 — CET ÉCRAN ÉTAIT MUET, ET SON BOUTON « RÉÉCOUTER » AUSSI ───────
 *
 * Banc terrain, écran 2 : « MUET » au montage ET sous chacun des trois
 * éléments touchés. Le design dit « Tata LIT l'écran toute seule » ; en
 * réalité `direIntro` ne joue qu'un clip enregistré, et dans tout build livré
 * le drapeau des prototypes est éteint, donc il n'y a pas de clip, donc rien.
 * Un bouton « Réécouter Tantie Nanti Lou » qui ne répète rien.
 *
 * `direEntreeAvantConnexion` joue le MÊME clip par la MÊME règle (registre
 * figé, VOICE-01 intacte) mais RAPPORTE ce qu'il en advient. Le texte ne part
 * que s'il ne reste rien à dire : jamais par-dessus le clip, et jamais après
 * une coupure — ici, un tap n'importe où coupe Tantie pour entrer, et ce
 * silence est la décision de la marchande.
 *
 * AKW-02 RESPECTÉE : on ne passe pas par `speakMessage`, dont le rendu finit
 * dans `AppContext.speak` et s'y fait refuser (`role-non-marchand`) — sur cet
 * écran personne n'est encore connecté. On garde la CLÉ de catalogue et on la
 * remet au moteur audio directement. Le muet global reste respecté : il vit
 * dans `audioManager`, pas dans la garde de rôle.
 */
function direOuLire(cle: 'histoire1' | 'bravo', id: 'TANTIE_PRESENTATION' | 'TANTIE_BRAVO'): Promise<void> {
  return direEntreeAvantConnexion(cle)
    // AKW-02 — même voie nommée que l'écran 1 : la permission se demande.
    .then((r) => (r.doitDireLeTexte ? parlerAvantConnexion('onboarding', tParle(id)).then(() => undefined) : undefined))
    .catch(() => { /* une voix qui casse ne bloque jamais l'entrée */ });
}

interface OnboardingSlidesProps {
  onComplete?: () => void;
}

export function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const doneRef = useRef(false); // évite d'entrer deux fois dans l'app

  // Niveau de voix : tant que le mode n'est pas explicitement choisi (Paramètres),
  // on accompagne à fond → « voix ». Le choix du mode n'existe plus à l'entrée.
  const niveauVoix = useCallback(
    (): EffectiveMode => (accessModeChoisi() ? getEffectiveMode() : 'voix'),
    [],
  );

  const stopLocal = useCallback(() => {
    stopIntro();
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // La présentation démarre sur le geste « Écouter et entrer » de Welcome et
  // accompagne cet écran. La relancer ici par autoplay la ferait bloquer sur
  // certains navigateurs, ou couperait le début déjà en cours.
  const direTata = useCallback(() => {
    if (niveauVoix() === 'lecture') return; // lectrice : silence
    setIsSpeaking(true);
    void direOuLire('histoire1', 'TANTIE_PRESENTATION').finally(() => setIsSpeaking(false));
  }, [niveauVoix]);

  useEffect(() => {
    const img = new Image(); img.src = tataAccueil;
    const fond = new Image(); fond.src = bandeauMarche;
    // LA PRÉSENTATION EST DITE ICI, ET C'EST NOUVEAU. Le commentaire d'origine
    // expliquait qu'elle démarrait sur le geste de Welcome et accompagnait cet
    // écran — ce qui était vrai du CLIP. Sans clip, personne ne prenait le
    // relais et l'écran restait muet. `direTata` respecte déjà le profil
    // « je lis » (silence) et le muet global.
    direTata();
    return () => { stopIntro(); stopSpeaking(); };
    // Au montage seulement : la présentation ne se redit pas à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Haut-parleur : RÉÉCOUTER la présentation (distinct de l'action continuer).
  const handleListen = useCallback(() => {
    if (isSpeaking) { stopLocal(); return; }
    setIsSpeaking(true);
    void direOuLire('histoire1', 'TANTIE_PRESENTATION').finally(() => setIsSpeaking(false));
  }, [isSpeaking, stopLocal]);

  // FIN : petite récompense parlée, puis on entre dans l'app (filet de sécurité
  // si l'audio ne se termine pas).
  const terminer = useCallback(() => {
    if (doneRef.current) return;
    const go = () => { if (!doneRef.current) { doneRef.current = true; onComplete?.(); } };
    if (niveauVoix() === 'lecture') { stopLocal(); go(); return; }
    setIsSpeaking(true);
    // LA PORTE NE DÉPEND PAS DE LA VOIX. Le filet de 6 s existait déjà ; il
    // reste, parce qu'une phrase qui n'aboutit pas ne doit jamais retenir la
    // marchande dehors.
    void direOuLire('bravo', 'TANTIE_BRAVO').finally(go);
    setTimeout(go, 6000);
  }, [niveauVoix, onComplete, stopLocal]);

  // Un tap n'importe où continue ; les commandes précises coupent la propagation.
  return (
    <div
      className="fixed inset-0 overflow-hidden cursor-pointer onboarding-tata-redesign"
      onClick={terminer}
    >
      <img src={bandeauMarche} alt="" className="onboarding-market-backdrop" aria-hidden="true" />
      <div className="onboarding-market-veil" aria-hidden="true" />
      <motion.img
        src={tataAccueil}
        alt="Tantie Nanti Lou"
        className="onboarding-tata-figure"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />

      {/* Ondes discrètes autour de Tata (elle parle) — derrière, jamais sur les
          contrôles ; pointer-events none pour ne pas gêner le tap. */}
      <div className="absolute" style={{ top: '36%', left: '67%', width: 210, height: 210, transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-white/50"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 1, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* Contenu EN BAS : titre + rangée [haut-parleur] [flèche continuer].
          Aucun contrôle sur le visage de Tata. */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 px-3 z-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md flex flex-col items-center onboarding-tata-sheet"
        >
          <span className="onboarding-tata-pill">Ton guide dans le marché</span>
          <p className="font-extrabold onboarding-tata-title">
            Moi, c'est Tantie Nanti Lou.
          </p>
          <p className="onboarding-tata-copy">
            Tu peux toucher, parler et écouter. Je reste avec toi.
          </p>

          <div className="flex items-center justify-center gap-4">
            {/* Haut-parleur : réécouter (distinct de l'action) */}
            <motion.button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); handleListen(); }}
              whileTap={{ scale: 0.9 }}
              aria-label={isSpeaking ? 'Arrêter Tantie Nanti Lou' : 'Réécouter Tantie Nanti Lou'}
              className="grid place-items-center rounded-full bg-white shadow-lg onboarding-listen"
              style={{ width: 56, height: 56 }}
            >
              {isSpeaking ? <VolumeX style={{ width: 26, height: 26 }} /> : <Volume2 style={{ width: 26, height: 26 }} />}
            </motion.button>

            {/* Action : continuer (flèche = « avancer », compréhensible sans lire) */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); terminer(); }}
              whileTap={{ scale: 0.92 }}
              aria-label="Continuer"
              className="grid place-items-center rounded-full shadow-2xl onboarding-continue"
              style={{ width: 68, height: 68 }}
            >
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
