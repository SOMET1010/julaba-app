/**
 * POSER UN PRODUIT SUR SON ÉTAL — trois questions, STK-03 §2.
 *
 *   1. Qu'est-ce que tu vends ?   → son nom, dit ou touché
 *   2. Tu le vends comment ?      → son unité
 *   3. À combien ?                → SON prix
 *
 * ET RIEN D'AUTRE. Pas de catégorie, pas de stock, pas de seuil d'alerte, pas
 * de prix d'achat, pas de date de péremption. L'écran d'avant les réclamait
 * tous : une marchande ne décrit pas son produit, elle le vend. Chaque champ
 * en plus est une occasion d'abandonner — et pour une non-lectrice, une
 * occasion de plus de se tromper.
 *
 * AUCUNE TAXONOMIE. Ni famille, ni sous-famille, ni référence. Le rattachement
 * au référentiel est notre travail, fait ailleurs, sans elle.
 *
 * UNE SEULE ÉCRITURE : `addProduct` de la caisse — la primitive qui alimente
 * `products`, donc son étal. Une donnée écrite à deux endroits finit par
 * diverger ; il n'y a donc pas d'autre chemin ici.
 *
 * LES DÉCISIONS VIVENT DANS `services/premierProduit` : quelle question poser,
 * quelles unités proposer, si le produit est prêt. Cet écran ne décide rien,
 * il montre et il parle.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useCaisse } from '../../contexts/CaisseContext';
import { guidageVocal } from '../../utils/accessMode';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';
import {
  etapeCourante, unitesProposees, produitACreer, peutValider, etapeSuivante,
  type BrouillonProduit, type EtapeAjout,
} from '../../services/premierProduit';
import { BoutonDirePrix } from './BoutonDirePrix';

const ORANGE = '#B74725';
const VERT = '#0E7A47';
/** Même cible tactile que le reste de la caisse : un doigt, pas un curseur. */
const CIBLE = 44;

const CHIFFRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface Props {
  /** Ses unités déjà employées : elles passent devant celles du marché. */
  sesUnites: readonly string[];
  /**
   * CE QU'ELLE A DÉJÀ DIT — STK-05.
   *
   * Quand elle a nommé son produit à voix haute (« ajoute 10 piments à
   * 500 »), il serait absurde de le lui redemander. Le parcours démarre sur
   * ce qu'elle a donné et `etapeCourante` l'amène directement à la seule
   * question qui reste. Ce qui n'est pas là n'est JAMAIS inventé : c'est
   * précisément ce qu'on lui demande.
   */
  depart?: { nom?: string; unite?: string; prix?: number | null };
  /** Le produit est sur son étal. Le parent referme et rafraîchit. */
  onPose: () => void;
  onAnnuler: () => void;
}

export function AjoutProduitGuide({ sesUnites, depart, onPose, onAnnuler }: Props) {
  const { speak } = useApp();
  const { addProduct, refreshProducts } = useCaisse();
  const [nom, setNom] = useState(depart?.nom ?? '');
  const [unite, setUnite] = useState(depart?.unite ?? '');
  const [prix, setPrix] = useState(
    typeof depart?.prix === 'number' && depart.prix > 0 ? String(depart.prix) : '');
  const [uniteLibre, setUniteLibre] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const dire = (t: string) => { if (guidageVocal()) speak(t); };
  /** Une CLÉ du catalogue, résolue dans la langue active, PUIS rendue par le
   *  contrat audio — qui choisit la forme PARLÉE. Passer par le catalogue ne
   *  suffit pas : `.texte` est la forme ÉCRAN, avec son espace fine, et la
   *  synthèse l'épelle chiffre par chiffre. */
  const direMessage = (id: string, vars?: Record<string, string | number>) => {
    // LA FORME PARLÉE, PAS LA FORME ÉCRAN — terrain du 24/09.
    //
    // Ici on faisait `dire(resoudreMessage(id, vars).texte)`. Or un message du
    // catalogue porte DEUX formes : `.texte` pour l'ŒIL (« 2 000 francs »,
    // avec son espace fine qui le rend lisible) et la forme PARLÉE pour
    // l'OREILLE (« deux mille francs »). En envoyant la première au moteur de
    // voix, la synthèse recevait un nombre coupé et l'épelait : « 2 zéro zéro
    // zéro ». Passer par le catalogue ne suffit pas — il faut passer par le
    // RENDU, qui choisit la bonne forme. C'est ce que font déjà SaisieGuidee,
    // ConfirmationLigne et speakMessage.
    const m = resoudreMessage(id, vars);
    void rendreMessage(m, dire);
  };

  const brouillon: BrouillonProduit = {
    nom, unite,
    // Le champ est vide tant qu'elle n'a rien tapé : `null`, pas zéro. Un
    // zéro se laisserait enregistrer.
    prix: prix === '' ? null : Number(prix),
  };
  /**
   * OÙ ELLE EN EST — recette DTDI du 24/09.
   *
   * L'étape affichée était `etapeCourante(brouillon)`, donc recalculée À CHAQUE
   * TOUCHE. Dès la première lettre du nom, l'étape passait à « unite » et
   * l'input était démonté sous ses doigts : son produit s'appelait « T ». Le
   * champ d'unité libre avait le même défaut.
   *
   * L'étape affichée est maintenant un ÉTAT, qui n'avance que sur un geste
   * explicite. `etapeCourante` reste la règle de complétude — elle sert ici à
   * DÉMARRER au bon endroit quand elle a déjà parlé (STK-05).
   */
  const [etapeVue, setEtapeVue] = useState<EtapeAjout>(() => etapeCourante({
    nom: depart?.nom ?? '', unite: depart?.unite ?? '',
    prix: typeof depart?.prix === 'number' && depart.prix > 0 ? depart.prix : null,
  }));
  const aCreer = produitACreer(brouillon);
  const peutAvancer = peutValider(etapeVue, brouillon);
  /** Avancer est un GESTE : le grand bouton, ou la touche OK du clavier. */
  const avancer = () => { if (peutAvancer) setEtapeVue(etapeSuivante(etapeVue)); };

  const poser = async () => {
    if (!aCreer || enCours) return;
    setEnCours(true);
    try {
      await addProduct(aCreer as never);
      // Son étal se relit : la tuile doit être là TOUT DE SUITE, sinon elle
      // croit que ça n'a pas marché et recommence.
      await refreshProducts();
      direMessage('TATA_PRODUIT_POSE', { produit: aCreer.nom, montant: aCreer.prix, unite: aCreer.unite });
      onPose();
    } catch {
      direMessage('TATA_VENTE_ECHEC');
      setEnCours(false);
    }
  };

  const taperChiffre = (d: string) => {
    const v = (prix === '0' ? d : prix + d).slice(0, 7);
    setPrix(v);
    direMessage('TATA_MONTANT_DEVISE', { montant: Number(v) });
  };

  return (
    <div style={{ background: '#FFFCF7', border: '1.5px solid #F0E4D4', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ─── 1. SON NOM ─────────────────────────────────────────────── */}
      {etapeVue === 'nom' && (
        <>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--encre)', margin: 0 }}>
            Qu'est-ce que tu vends ?
          </p>
          <input autoFocus value={nom} onChange={e => setNom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); avancer(); } }}
            aria-label="Qu'est-ce que tu vends ?" placeholder="Son nom"
            style={{ width: '100%', boxSizing: 'border-box', minHeight: CIBLE, border: '1.5px solid #e5e0d8', borderRadius: 12, padding: '12px 14px', fontSize: 18, fontWeight: 700, color: 'var(--encre)', outline: 'none', fontFamily: 'inherit', background: 'white' }} />
          {/* LES DEUX GESTES — arbitrage de Patrick, 24/09, option C.
              Le grand bouton pour elle : c'est le geste qu'elle sait faire.
              La touche OK du clavier pour qui va vite. Rien n'avance tout
              seul : c'est ce qui effaçait son nom a chaque lettre. */}
          <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={avancer}
            disabled={!peutAvancer} aria-label="C'est bon, continue"
            style={{ width: '100%', minHeight: CIBLE + 12, borderRadius: 16, border: 'none',
              background: peutAvancer ? VERT : '#d9d4cc', color: 'white', fontSize: 18, fontWeight: 800,
              cursor: peutAvancer ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Check size={24} /> C'est bon
          </motion.button>

        </>
      )}

      {/* ─── 2. SON UNITÉ ───────────────────────────────────────────── */}
      {etapeVue === 'unite' && (
        <>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--encre)', margin: 0 }}>
            {nom}, tu le vends comment ?
          </p>
          {!uniteLibre ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {unitesProposees(sesUnites).map(u => (
                  <motion.button key={u} type="button" whileTap={{ scale: 0.95 }}
                    onClick={() => { setUnite(u); direMessage('TATA_UNITE_CHOISIE', { unite: u }); setEtapeVue('prix'); }}
                    style={{ minHeight: CIBLE + 8, borderRadius: 14, border: '2px solid var(--trait)', background: 'white', fontSize: 16, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {u}
                  </motion.button>
                ))}
              </div>
              {/* « Autre » n'est pas une unité : c'est le geste par lequel elle
                  dit SON mot. Une liste, si longue soit-elle, en oublie un. */}
              <button type="button" onClick={() => setUniteLibre(true)}
                style={{ minHeight: CIBLE, background: 'none', border: 'none', color: ORANGE, fontSize: 14, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
                Autre
              </button>
            </>
          ) : (
            <>
              <input autoFocus value={unite} onChange={e => setUnite(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); avancer(); } }}
                aria-label="Tu le vends comment ?" placeholder="Comment tu le vends"
                style={{ width: '100%', boxSizing: 'border-box', minHeight: CIBLE, border: '1.5px solid #e5e0d8', borderRadius: 12, padding: '12px 14px', fontSize: 18, fontWeight: 700, color: 'var(--encre)', outline: 'none', fontFamily: 'inherit', background: 'white' }} />
          {/* LES DEUX GESTES — arbitrage de Patrick, 24/09, option C.
              Le grand bouton pour elle : c'est le geste qu'elle sait faire.
              La touche OK du clavier pour qui va vite. Rien n'avance tout
              seul : c'est ce qui effaçait son nom a chaque lettre. */}
          <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={avancer}
            disabled={!peutAvancer} aria-label="C'est bon, continue"
            style={{ width: '100%', minHeight: CIBLE + 12, borderRadius: 16, border: 'none',
              background: peutAvancer ? VERT : '#d9d4cc', color: 'white', fontSize: 18, fontWeight: 800,
              cursor: peutAvancer ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Check size={24} /> C'est bon
          </motion.button>
            </>
          )}
        </>
      )}

      {/* ─── 3. SON PRIX ────────────────────────────────────────────── */}
      {etapeVue === 'prix' && (
        <>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--encre)', margin: 0 }}>
            Le {unite}, à combien ?
          </p>
          {/* JAMAIS PRÉREMPLI. C'est STK-02 : un prix qu'elle n'a pas donné
              n'existe pas, et il ne se devine pas à partir d'un catalogue. */}
          <div aria-live="polite" style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: `2px solid ${prix ? VERT : '#e5e0d8'}`, borderRadius: 14, fontSize: 26, fontWeight: 800, color: 'var(--encre)' }}>
            {prix ? `${Number(prix).toLocaleString('fr-FR')} F` : '—'}
          </div>
          {/* VOX-03 — LE GESTE PAR DÉFAUT EST CELUI QU'ELLE SAIT FAIRE.
              Ici vivait une icône `aria-hidden` sous « ou dis-le à Tantie » :
              une image qui promettait la voix sans la donner. Le micro s'ouvre
              maintenant tout seul, Tantie pose la question, et le clavier reste
              juste dessous pour qui préfère taper. */}
          <BoutonDirePrix
            ouvrirToutSeul
            question={`Le ${unite}, à combien ?`}
            dire={dire}
            onMontant={(m) => setPrix(String(m))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CHIFFRES.map(d => (
              <button key={d} type="button" onClick={() => taperChiffre(d)}
                style={{ minHeight: CIBLE + 8, borderRadius: 12, border: '1.5px solid var(--trait)', background: 'white', fontSize: 20, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>{d}</button>
            ))}
            <button type="button" onClick={() => setPrix(prix.slice(0, -1))} aria-label="Effacer un chiffre"
              style={{ minHeight: CIBLE + 8, borderRadius: 12, border: '1.5px solid var(--trait)', background: 'white', fontSize: 20, fontWeight: 800, color: ORANGE, cursor: 'pointer', fontFamily: 'inherit' }}>⌫</button>
            <button type="button" onClick={() => taperChiffre('0')}
              style={{ minHeight: CIBLE + 8, borderRadius: 12, border: '1.5px solid var(--trait)', background: 'white', fontSize: 20, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>0</button>
            {/* Éteint tant qu'elle n'a pas donné son prix : rien à valider. */}
            <button type="button" onClick={poser} disabled={!aCreer || enCours} aria-label="C'est bon"
              style={{ minHeight: CIBLE + 8, borderRadius: 12, border: 'none', background: aCreer ? VERT : '#d9d4cc', color: 'white', fontSize: 20, fontWeight: 800, cursor: aCreer ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={22} />
            </button>
          </div>
        </>
      )}

      <button type="button" onClick={onAnnuler}
        style={{ minHeight: CIBLE, background: 'none', border: 'none', color: 'var(--encre-4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Laisser pour l'instant
      </button>
    </div>
  );
}
