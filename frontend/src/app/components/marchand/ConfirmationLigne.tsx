/**
 * Vente guidée — CONFIRMATION D'UNE LIGNE (présentation).
 *
 * Affiche la répétition de Tata (« J'ai compris : 3 tas à 500, c'est bon ? »),
 * les gros boutons VERT (confirmer) / ORANGE (corriger), la levée d'ambiguïté
 * prix (« d'un seul » / « de tous les N ») et un panneau de correction tactile.
 *
 * 100 % piloté par les modules PURS (ligneProvisoire, dialoguesTata) : ce composant
 * ne calcule aucun prix lui-même et ne touche ni au panier ni à l'enregistrement.
 * Il émet la ligne CONFIRMÉE via onConfirmer ; le parent décide de l'ajout.
 *
 * CE QUI EST ÉCRIT ICI EST DIT (VOIX-01, lot D). Sur `f0c965c`, ce fichier ne
 * contenait aucun appel à `speak` : la répétition de Tata était affichée,
 * jamais prononcée. Or on arrive ici parce que la DICTÉE vient d'échouer —
 * une marchande qui ne lit pas y trouvait un écran muet, à l'étape même où
 * elle doit pouvoir entendre l'écart entre « 5 tomates » et « 15 tomates ».
 * Désormais la phrase affichée part à la synthèse, une fois par état de
 * ligne (pas à chaque rendu), et un bouton « réécouter » la redonne à la
 * demande. Le garde-fou `repliParle.test.mts` empêche le silence de revenir.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { guidageVocal } from '../../utils/accessMode';
import { quantiteAvecUnite } from '../../utils/unite.utils';
import {
  type LigneProvisoire, estResolue, confirmer,
  corrigerQuantite, corrigerPrix, resoudreAmbiguite,
} from '../../services/ligneProvisoire';
import { confirmationDeuxFormes, ambiguiteDeuxFormes, phraseConfirmation, phraseAmbiguite, resumeLigne } from '../../services/dialoguesTata';
import { resoudreMessage } from '../../i18n/voice/runtime';
import { rendreMessage } from '../../i18n/voice/contrat-audio';

const VERT = 'var(--color-green-700)';
const ORANGE = 'var(--commerce-action)';

/** Cible tactile minimale, en pixels — même règle que la barre de recherche de la caisse (test-cible-tactile.mjs). */
export const CIBLE_TACTILE = 44;


/**
 * « Réécouter » — pour les deux écrans du repli (celui-ci et SaisieGuidee, qui
 * l'importe). Si elle n'a pas saisi ce que Tata a dit, son seul recours sans
 * ce bouton est de refaire la ligne. L'appui est un geste EXPLICITE : il parle
 * même si le profil a coupé le guidage automatique — elle l'a demandé.
 */
export function BoutonReecouter({ phrase }: { phrase: () => string }) {
  const { speak } = useApp();
  return (
    <button type="button" onClick={() => speak(phrase())} aria-label="Réécouter Tata"
      style={{ minHeight: CIBLE_TACTILE, minWidth: CIBLE_TACTILE, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '0 12px', background: 'white', border: `1.5px solid ${VERT}55`, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
      <Volume2 size={20} color={VERT} />
      <span style={{ fontSize: 12, fontWeight: 800, color: VERT }}>Réécouter</span>
    </button>
  );
}

interface Props {
  ligne: LigneProvisoire;
  /** Montant dicté ambigu (unitaire OU total), pour la question de levée d'ambiguïté. */
  montantAmbigu?: number | null;
  onLigneChange: (l: LigneProvisoire) => void;
  onConfirmer: (l: LigneProvisoire) => void;
  onAnnuler: () => void;
}

const btnBase: React.CSSProperties = {
  minHeight: 52, borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: 'pointer',
  fontFamily: 'inherit', border: 'none', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, width: '100%',
};

export function ConfirmationLigne({ ligne, montantAmbigu, onLigneChange, onConfirmer, onAnnuler }: Props) {
  const [corrige, setCorrige] = useState(false);
  const [prixSaisi, setPrixSaisi] = useState('');
  const [modePrix, setModePrix] = useState<'unitaire' | 'total'>('unitaire');
  const { speak } = useApp();

  const resolue = estResolue(ligne);
  const ambigu = ligne.interpretationPrix === 'a_confirmer';
  const montantADemander = ambigu && montantAmbigu != null && montantAmbigu > 0 ? montantAmbigu : null;

  // UNE SEULE phrase de Tata par état de ligne : celle qu'on affiche. On la
  // calcule une fois, on la rend ET on la dit — impossible de diverger.
  // DEUX FORMES, UN SEUL APPEL — terrain du 24/09.
  //
  // Une seule phrase servait l'œil ET l'oreille : « impossible de diverger »,
  // disait le commentaire, et c'était juste. Mais une forme unique ne peut pas
  // servir les deux : à l'œil « 2 000 F » se lit, à l'oreille il s'épelait
  // « 2 zéro zéro zéro ». Les deux formes sortent maintenant du MÊME appel —
  // elles ne peuvent toujours pas diverger, et chacune va où elle sert.
  const phrase = montantADemander != null
    ? ambiguiteDeuxFormes(ligne.quantite, montantADemander)
    : confirmationDeuxFormes(ligne);
  const texteAffiche = phrase.texte;

  // Dernière phrase dite : garde l'effet contre les rendus répétés (même
  // phrase → silence) et alimente « réécouter ». Le guidage automatique suit
  // le profil (muet seulement si elle a choisi « je lis »).
  const dernierePhraseRef = useRef('');
  const dire = (t: string) => {
    dernierePhraseRef.current = t;
    if (guidageVocal()) speak(t);
  };
  // Même règle, pour une CLÉ du catalogue i18n (lot langues) : résolue dans la
  // langue active, retenue pour « réécouter », remise au rendu vocal.
  const direMessage = (id: string, vars?: Record<string, string | number>) => {
    const m = resoudreMessage(id, vars);
    dernierePhraseRef.current = m.texte;
    if (guidageVocal()) void rendreMessage(m, speak);
  };
  // Une fois par ÉTAT de ligne : la phrase change quand la ligne change
  // (correction, levée d'ambiguïté), pas quand l'écran se redessine.
  useEffect(() => {
    if (dernierePhraseRef.current !== phrase.texteParle) dire(phrase.texteParle);
  }, [phrase.texteParle]); // eslint-disable-line react-hooks/exhaustive-deps -- `dire` ne dépend que d'un ref et du contexte

  const reecouter = () => dernierePhraseRef.current || texteAffiche;

  // Dans le panneau de correction, chaque geste se DIT : « 3 tas » quand
  // elle touche +, « 1 500 francs » quand elle tape le prix. La ligne
  // corrigée, elle, sera redite par l'effet ci-dessus, puisque sa phrase change.
  const corrigerEtDire = (q: number) => {
    onLigneChange(corrigerQuantite(ligne, q));
    dire(quantiteAvecUnite(q, ligne.unite));
  };
  const taperPrix = (valeur: string) => {
    setPrixSaisi(valeur);
    // Un montant à DIRE : « 1 500 francs », jamais « 1 500 F » (la synthèse lit « F » comme une lettre).
    if (valeur) direMessage('TATA_MONTANT_DEVISE', { montant: Math.round(parseInt(valeur, 10)) });
    else direMessage('TATA_PRIX_EFFACE');
  };

  // Cas AMBIGU avec un montant connu → question « d'un seul / de tous les N » (§5).
  if (montantADemander != null) {
    return (
      <div style={{ background: 'var(--commerce-paper)', border: `2px solid ${ORANGE}`, borderRadius: 20, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <p style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--color-gray-800)', margin: 0, lineHeight: 1.35 }}>
            {texteAffiche}
          </p>
          <BoutonReecouter phrase={reecouter} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileTap={{ scale: 0.97 }} style={{ ...btnBase, background: 'white', color: ORANGE, border: `2px solid ${ORANGE}` }}
            onClick={() => onLigneChange(resoudreAmbiguite(ligne, montantADemander, 'unitaire'))}>
            D'un seul
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} style={{ ...btnBase, background: ORANGE, color: 'white' }}
            onClick={() => onLigneChange(resoudreAmbiguite(ligne, montantADemander, 'total'))}>
            De tous les {ligne.quantite}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--commerce-paper)', border: `2px solid ${ORANGE}`, borderRadius: 20, padding: 16 }}>
      {/* Répétition de Tata — affichée ET dite (voir l'effet ci-dessus). */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <p style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--color-gray-800)', margin: 0, lineHeight: 1.35 }}>
          {texteAffiche}
        </p>
        <BoutonReecouter phrase={reecouter} />
      </div>

      {/* Panneau de CORRECTION */}
      {corrige ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quantité */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Combien ?</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.button whileTap={{ scale: 0.9 }} aria-label="Moins"
                onClick={() => corrigerEtDire(Math.max(1, ligne.quantite - 1))}
                style={{ width: 48, height: 48, borderRadius: 14, background: 'white', border: '1.5px solid var(--commerce-gray-100)', fontSize: 24, fontWeight: 800, color: 'var(--herite-gris-33)', cursor: 'pointer', flexShrink: 0 }}>−</motion.button>
              <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--encre)', minWidth: 40, textAlign: 'center' }}>{ligne.quantite}</span>
              <motion.button whileTap={{ scale: 0.9 }} aria-label="Plus"
                onClick={() => corrigerEtDire(ligne.quantite + 1)}
                style={{ width: 48, height: 48, borderRadius: 14, background: ORANGE, border: 'none', fontSize: 24, fontWeight: 800, color: 'white', cursor: 'pointer', flexShrink: 0 }}>+</motion.button>
              <span style={{ fontSize: 14, color: 'var(--encre-4)', fontWeight: 700 }}>{ligne.unite}</span>
            </div>
          </div>
          {/* Prix */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Le prix ?</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['unitaire', 'total'] as const).map(m => (
                <button key={m} onClick={() => { setModePrix(m); direMessage(m === 'unitaire' ? 'TATA_PRIX_D_UN_SEUL' : 'TATA_PRIX_DU_TOUT'); }}
                  style={{ flex: 1, minHeight: CIBLE_TACTILE, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${modePrix === m ? ORANGE : 'var(--commerce-gray-100)'}`, background: modePrix === m ? 'var(--color-orange-100)' : 'white', color: modePrix === m ? ORANGE : 'var(--herite-gris-53)' }}>
                  {m === 'unitaire' ? "Prix d'un" : 'Prix du tout'}
                </button>
              ))}
            </div>
            {/* Gros chiffre + clavier numérique, jamais une case de texte nue à
                remplir (même principe que le code à la connexion). */}
            <div style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, color: prixSaisi ? 'var(--encre)' : 'var(--herite-taupe)', fontVariantNumeric: 'tabular-nums', marginBottom: 10 }}>
              {prixSaisi || '—'}{prixSaisi ? ' F' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <button key={d} type="button" onClick={() => taperPrix((prixSaisi === '0' ? d : prixSaisi + d).slice(0, 6))}
                  style={{ minHeight: 48, borderRadius: 12, border: '1.5px solid var(--commerce-gray-100)', background: 'white', fontSize: 18, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => taperPrix('')}
                style={{ minHeight: 48, borderRadius: 12, border: '1.5px solid var(--commerce-gray-100)', background: 'white', fontSize: 13, fontWeight: 800, color: 'var(--herite-gris-53)', cursor: 'pointer', fontFamily: 'inherit' }}>C</button>
              <button type="button" onClick={() => taperPrix((prixSaisi === '0' ? '0' : prixSaisi + '0').slice(0, 6))}
                style={{ minHeight: 48, borderRadius: 12, border: '1.5px solid var(--commerce-gray-100)', background: 'white', fontSize: 18, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' }}>0</button>
              <button type="button" onClick={() => taperPrix(prixSaisi.slice(0, -1))} aria-label="Effacer un chiffre"
                style={{ minHeight: 48, borderRadius: 12, border: '1.5px solid var(--commerce-gray-100)', background: 'white', fontSize: 15, fontWeight: 800, color: 'var(--herite-gris-53)', cursor: 'pointer', fontFamily: 'inherit' }}>⌫</button>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} disabled={!prixSaisi}
              onClick={() => { const v = parseInt(prixSaisi, 10); if (v > 0) { onLigneChange(corrigerPrix(ligne, v, modePrix)); setCorrige(false); setPrixSaisi(''); } }}
              style={{ width: '100%', minHeight: 48, background: prixSaisi ? ORANGE : 'var(--commerce-line)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: prixSaisi ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              Valider le prix
            </motion.button>
          </div>
          <button onClick={() => setCorrige(false)}
            style={{ background: 'none', border: 'none', color: 'var(--encre-4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', alignSelf: 'center' }}>
            Retour
          </button>
        </div>
      ) : (
        <>
          {/* Résumé chiffré */}
          {resolue && (
            <div style={{ background: 'white', borderRadius: 14, padding: '10px 12px', marginBottom: 14, border: '1px solid var(--commerce-gray-100)' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--encre)', textAlign: 'center', margin: 0 }}>{resumeLigne(ligne)}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button whileTap={{ scale: 0.97 }} disabled={!resolue}
              onClick={() => { const c = confirmer(ligne); if (c) onConfirmer(c); }}
              style={{ ...btnBase, background: resolue ? VERT : '#c7d6cd', color: 'white', cursor: resolue ? 'pointer' : 'default' }}>
              ✓ Oui, c'est bon
            </motion.button>
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Question posée quand elle ouvre la correction : les deux choses qu'elle peut changer. */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setCorrige(true); direMessage('TATA_QUESTION_CORRECTION'); }}
                style={{ ...btnBase, background: 'white', color: ORANGE, border: `2px solid ${ORANGE}` }}>
                Non, corriger
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onAnnuler}
                style={{ ...btnBase, background: 'white', color: 'var(--color-gray-400)', border: '2px solid var(--commerce-gray-100)' }}>
                Annuler
              </motion.button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
