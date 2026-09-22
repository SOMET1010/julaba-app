import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { salutation } from '../../utils/appellation';
import { useCaisse } from '../../contexts/CaisseContext';
import { IMG_LOGO_JULABA } from '../../assets/images';
import tataAccueil from '../../../assets/redesign/tata-accueil.webp';
import bandeauMarche from '../../../assets/redesign/bandeau-marche.webp';
import { BrandSignature } from '../shared/BrandSignature';
import { PropositionReconnaissance } from '../auth/PropositionReconnaissance';
import { getConfortVisuel, setConfortVisuel, CONFORT_EVENT } from '../../utils/confortVisuel';
import { ResumeModal, CloseDayModal, EditFondModal } from './MarchandModals';
import { RaccourcisProvider } from '../../contexts/RaccourcisContext';
import { RapportHebdoProvider } from '../../contexts/RapportHebdoContext';
import { ObjectifProvider } from '../../contexts/ObjectifContext';
import { useMontantsPrives } from '../../hooks/useMontantsPrives';
import { direAccueilMarchand } from '../../services/accueilMarchandVoix';
import { etatCaisseAccueil } from '../../services/etatCaisseAccueil';
import { useLectureHistorique } from '../../hooks/useLectureHistorique';
import { ventesEnAttenteEnvoi } from '../../voice-offline/incidentsHorsLigne';
import { useSpeakMessage } from '../../i18n/voice/speakMessage';
import { guidageVocal } from '../../utils/accessMode';

/**
 * Accueil marchand « voix & icônes d'abord ».
 *
 * Loi Julaba : chaque chose se VOIT, s'ENTEND, se TOUCHE — presque aucun texte.
 * Un seul geste évident (VENDRE), la caisse qui se dit à voix haute, et les
 * belles icônes existantes de l'app pour le reste. La vue riche complète reste
 * accessible via « Vue avancée ».
 */
function MarchandAccueilVoiceInner() {
  const navigate = useNavigate();
  const { user, getTodayStats, currentSession, transactions } = useApp();
  const stats = getTodayStats();
  const speakMessage = useSpeakMessage();

  // ── ACC-01 — « MA CAISSE AUJOURD'HUI » CESSE DE DIRE ZÉRO QUAND ELLE NE SAIT PAS.
  //
  // Avant : `stats?.caisse || 0`. Sans réseau, `transactions` reste vide et
  // `currentSession` nul ; les trois termes du calcul valent zéro et la
  // soustraction rend un « 0 F » parfaitement formé. Patrick avait vendu.
  //
  // Le CALCUL n'est pas touché — c'est toujours `getTodayStats().caisse`. Ce
  // qui change, c'est le DROIT de l'afficher : la règle vit dans un module pur
  // (services/etatCaisseAccueil.ts), relisible seul, et non éparpillée ici.
  const etatLecture = useLectureHistorique();
  const [ventesEnFile, setVentesEnFile] = useState(0);
  useEffect(() => {
    let vivant = true;
    ventesEnAttenteEnvoi(String(user?.id ?? '')).then(n => { if (vivant) setVentesEnFile(n); })
      .catch(() => { /* la file illisible ne doit pas casser l'accueil */ });
    return () => { vivant = false; };
  }, [user?.id, etatLecture]);

  // « A-t-on lu quelque chose ? » : une transaction reçue, ou la session du
  // jour connue. Faux = les termes valaient zéro parce qu'ils étaient VIDES.
  const aDesDonnees = (transactions?.length ?? 0) > 0 || currentSession != null;
  const etatCaisse = etatCaisseAccueil({
    lecture: etatLecture,
    montant: stats?.caisse ?? Number.NaN,
    aDesDonnees,
    ventesEnFile,
  });
  const caisseAffichable = etatCaisse.type === 'connue' || etatCaisse.type === 'partielle';
  const prenom = user?.firstName || user?.prenoms || user?.prenom || user?.nom || '';
  // Le nom qu'elle a choisi dans sa fiche, sinon son prénom seul (voir
  // utils/appellation) : un marchand était accueilli par « Bonjour Maman ».
  const accueil = salutation((user as { appellation?: string } | undefined)?.appellation, prenom);

  const { montantsMasques, basculerMontants } = useMontantsPrives();
  const soldeVisible = !montantsMasques;
  // Mode SOLEIL (inclusion §2.4) : un seul geste, visible sur l'accueil — pas
  // caché dans les réglages. Tout devient plus grand et plus franc.
  const [soleil, setSoleil] = useState(() => getConfortVisuel() === 'soleil');
  const basculerSoleil = () => {
    const prochain = soleil ? 'normal' : 'soleil';
    setConfortVisuel(prochain); // exclusif : allumer le soleil éteint le sombre
    setSoleil(prochain === 'soleil');
  };
  // Le mode peut changer ailleurs (Paramètres, mode sombre auto 18h) : on se
  // resynchronise sur l'événement de l'arbitre confortVisuel.
  useEffect(() => {
    const sync = () => setSoleil(getConfortVisuel() === 'soleil');
    window.addEventListener(CONFORT_EVENT, sync);
    return () => window.removeEventListener(CONFORT_EVENT, sync);
  }, []);
  const [showResume, setShowResume] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showEditFond, setShowEditFond] = useState(false);

  // Panier en cours : bannière de reprise. « Vendre » et « Reprendre » mènent
  // désormais au MÊME endroit — la caisse, seule surface de vente.
  const { venteEnCours, cart, getTotalCart, staleCart, resumeStaleCart, discardStaleCart } = useCaisse();
  const nbItems = cart.reduce((s, i) => s + i.quantite, 0);
  const totalPanier = getTotalCart();
  const allerCaisse = () => navigate('/marchand/caisse');
  const reprendreStale = () => { resumeStaleCart(); allerCaisse(); };

  // ── ACC-01 — LES DEUX IMPASSES. Le banc a touché « Écouter Tata dire
  // bonjour » et « Écouter le message de bienvenue » : rien ne bougeait. La
  // cause : `accueilMarchandClipUrl` rend `null` quand le drapeau des clips
  // est éteint — c'est-à-dire dans TOUT build livré — et `direAccueilMarchand`
  // « ne synthétise jamais un texte ». Deux boutons câblés sur le vide.
  //
  // On ne change pas cette règle : le clip enregistré reste PRÉFÉRÉ, parce que
  // c'est la voix de Tantie. On ajoute seulement ce qui manquait — un recours
  // quand il n'y en a pas : la clé de catalogue, dite par le même moteur que
  // la caisse. Un bouton qui promet un son en produit un, ou se tait parce que
  // la marchande a coupé le son ; jamais parce que personne n'a rien branché.
  //
  // UNE SEULE SORTIE. La première version appelait le clip PUIS la clé : là où
  // le clip est réellement embarqué, la marchande entendait Tantie deux fois,
  // l'une sur l'autre. Ce composant ne DEVINE plus — `direAccueilMarchand`
  // rapporte ce qu'il a fait, et porte la décision dans `doitDireLeTexte`.
  // Une lecture COUPÉE (muet, navigation) ne rattrape rien : ce silence-là est
  // voulu. Preuve : services/accueilVoixUneSeuleSortie.test.mts.
  const direBonjour = () => {
    void direAccueilMarchand('comptoir').then((r) => {
      if (r.doitDireLeTexte) speakMessage('ACCUEIL_COMPTOIR');
    });
  };

  /** Ce que la caisse a le droit de DIRE — exactement ce qu'elle affiche.
   *  Montants masqués : on ne prononce pas un chiffre que l'œil a caché. */
  const direCaisse = () => {
    if (!soldeVisible) { direBonjour(); return; }
    if (etatCaisse.type === 'connue') speakMessage('ACCUEIL_CAISSE_CONNUE', { caisse: etatCaisse.montant });
    else if (etatCaisse.type === 'partielle') speakMessage('ACCUEIL_CAISSE_PARTIELLE', { caisse: etatCaisse.montant });
    else speakMessage('ACCUEIL_CAISSE_ILLISIBLE');
  };
  const bonjour = direBonjour;

  // ── ACC-01 — LE SILENCE AU MONTAGE. Le banc : « 0 demande au montage ».
  // L'écran que toute marchande voit à chaque ouverture ne disait rien.
  //
  // UNE SEULE PHRASE, et c'est celle qui porte son argent — pas un bonjour
  // suivi d'un chiffre suivi d'un conseil. Le bonjour reste sous le doigt.
  // On attend d'avoir une réponse : tant que l'état est « attente », on ne
  // sait rien, et ne rien savoir ne se raconte pas.
  const [ditAuMontage, setDitAuMontage] = useState(false);
  useEffect(() => {
    if (ditAuMontage || etatCaisse.type === 'attente') return;
    if (!guidageVocal()) return;          // profil « je lis » : rien de parlé
    setDitAuMontage(true);
    direCaisse();
    // `direCaisse` relit `etatCaisse` du rendu courant : la dépendance est
    // le TYPE d'état, pas la fonction, qui change à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etatCaisse.type, ditAuMontage]);

  // Grosses tuiles : icônes vectorielles LOCALES (marchent hors-ligne, aucune
  // dépendance réseau) + un seul libellé clair. Avant : illustrations distantes
  // (Cloudinary) avec un mot incrusté → doublon de texte ET écran vide sans réseau.
  const svg = (d: ReactNode) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
  // TEINTES : les jetons de la charte caisse (styles/commerce.css, `--caisse-*`),
  // choisis PAR LE SENS et non par la teinte d'origine — une marchande qui
  // avance de l'accueil à la caisse ne doit pas sentir qu'elle change d'app.
  //   stock    → vert        (les produits, comme la grille de la caisse)
  //   dépenses → alerte      (le seul registre où l'argent SORT)
  //   ventes   → vert foncé  (« montants forts » : ce qui est déjà rentré)
  //   argent   → gris texte  (le portefeuille, neutre vis-à-vis de la caisse ;
  //              c'est la correspondance la plus faible des quatre — la charte
  //              n'a pas de jeton « portefeuille »)
  const tuiles: Array<{ icon: ReactNode; label: string; go: () => void; teinte: string }> = [
    { icon: svg(<><path d="M21 8V16a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4z"/><path d="M3.27 6.96 12 12l8.73-5.04"/><path d="M12 22V12"/></>), label: 'Mon stock',    go: () => navigate('/marchand/stock'),          teinte: 'var(--caisse-vert)' },
    { icon: svg(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>), label: 'Mes dépenses', go: () => navigate('/marchand/cahier'),         teinte: 'var(--caisse-alerte)' },
    { icon: svg(<><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="9"/><line x1="18" y1="20" x2="18" y2="4"/></>), label: 'Mes ventes',   go: () => navigate('/marchand/ventes-passees'), teinte: 'var(--caisse-vert-fonce)' },
    // La tuile « Mon argent » (Keiwa) est CONSERVÉE : Manus la retire, mais
    // retirer une entrée de navigation est un arbitrage produit, pas un report
    // de design. Seul l'habillage de la tuile vient de Manus.
    { icon: svg(<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></>), label: 'Mon argent',   go: () => navigate('/marchand/keiwa'),          teinte: 'var(--caisse-gris-texte)' },
  ];

  return (
    <div className="commerce-home commerce-home-redesign">
      <div>
        <section className="commerce-home-hero">
          <img src={bandeauMarche} alt="" aria-hidden="true" className="commerce-home-hero-bg" />
          <div className="commerce-home-hero-veil" aria-hidden="true" />
          <div className="commerce-home-header">
            <button type="button" className="commerce-brand commerce-brand-hero" onClick={bonjour} aria-label="Écouter le message de bienvenue">
              <img src={IMG_LOGO_JULABA} alt="JÙLABA" />
              <BrandSignature />
            </button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={basculerSoleil}
              className="commerce-sun-button"
              aria-pressed={soleil}
              aria-label={soleil ? 'Repasser en affichage normal' : 'Mode soleil — tout plus grand'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            </motion.button>
          </div>
          <button type="button" onClick={bonjour} className="commerce-home-welcome" aria-label="Écouter Tata dire bonjour">
            <span className="commerce-home-welcome-copy">
              <small>Ton comptoir est prêt</small>
              <strong>{accueil}</strong>
              <em>On vend ensemble aujourd’hui.</em>
            </span>
            <img src={tataAccueil} alt="Tantie Nanti Lou" />
          </button>
        </section>

        {/* Caisse — montant réel, résumé et lecture vocale */}
        <div className="commerce-balance commerce-balance-redesign">
          <button type="button" className="commerce-balance-main" onClick={() => setShowResume(true)} aria-label="Voir le résumé du jour">
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.92 }}>Ma caisse aujourd'hui</div>
            <div className="commerce-balance-value">
              {!soldeVisible
                ? <>●●●●●<small> F</small></>
                : caisseAffichable
                  // « au moins » : le chiffre est un PLANCHER. Le taire ferait
                  // du plancher un total, ce qui est exactement le mensonge
                  // qu'on ferme — dans l'autre sens.
                  ? <>{etatCaisse.type === 'partielle' ? <small style={{ fontSize: '0.5em', opacity: 0.85 }}>au moins </small> : null}
                      {Math.round((etatCaisse as { montant: number }).montant).toLocaleString('fr-FR')}<small> F</small></>
                  // INCONNU ≠ 0. Un tiret ne se confond avec aucun montant.
                  : <>—</>}
            </div>
          </button>
          {soldeVisible && !caisseAffichable ? (
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 2, opacity: 0.95 }}>
              {etatCaisse.type === 'illisible'
                ? <>Je n’ai pas pu lire ta caisse. Ce n’est pas zéro&nbsp;: ton argent est là.</>
                : <>Je vais chercher ta caisse…</>}
            </div>
          ) : null}
          {soldeVisible && etatCaisse.type === 'partielle' && etatCaisse.ventesEnFile > 0 ? (
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 2, opacity: 0.95 }}>
              {etatCaisse.ventesEnFile === 1
                ? <>1 vente est gardée sur ce téléphone, pas encore envoyée.</>
                : <>{etatCaisse.ventesEnFile} ventes sont gardées sur ce téléphone, pas encore envoyées.</>}
            </div>
          ) : null}
          <div className="commerce-balance-actions">
            <motion.button whileTap={{ scale: 0.9 }} onClick={direCaisse} aria-label="Écouter ma caisse">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={basculerMontants}
              aria-label={soldeVisible ? 'Cacher mes montants' : 'Montrer mes montants'}>
              {soldeVisible
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
            </motion.button>
          </div>
        </div>

        {/* Bannière de reprise (Lot 3) — deux états distincts.
            CHARTE : mêmes jetons que la caisse. L'ancienne vente retrouvée est
            un AVERTISSEMENT (fond sable, bordure alerte) ; la vente en cours
            est un SUCCÈS (fond succès, bordure verte). Les deux suivaient
            auparavant des teintes écrites en dur, qui restaient claires en mode
            sombre : sur un téléphone en mode sombre, ces deux cartes étaient
            les seules surfaces blanches de la page.
            LE CAS QUI RÉSISTE : `--caisse-alerte` ne fait que 3,2:1
            sur `--caisse-sable` — illisible en corps 14/15. Il porte donc la
            BORDURE et l'icône, et le texte reste sur `--encre` (l'encre
            principale, que la caisse lit déjà, commerce.css). */}
        {staleCart ? (
          <div style={{ marginTop: 16, borderRadius: 18, padding: '14px 16px', background: 'var(--caisse-sable)',
            border: '1.5px solid color-mix(in srgb, var(--caisse-alerte) 45%, transparent)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--encre)' }}>Une ancienne vente a été retrouvée</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={reprendreStale}
                style={{ padding: '9px 16px', borderRadius: 12, border: 'none', background: 'var(--caisse-vert)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Reprendre
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={discardStaleCart} aria-label="Effacer l'ancienne vente"
                style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid color-mix(in srgb, var(--caisse-alerte) 45%, transparent)', background: 'var(--caisse-ivoire)', color: 'var(--encre)', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Effacer
              </motion.button>
            </div>
          </div>
        ) : venteEnCours ? (
          <motion.button whileTap={{ scale: 0.98 }} onClick={allerCaisse} aria-label="Reprendre la vente en cours"
            style={{ width: 'calc(100% - 2 * var(--julaba-gouttiere))', boxSizing: 'border-box', marginTop: 16, borderRadius: 18, padding: '14px 16px',
              background: 'var(--caisse-succes)', border: '1.5px solid color-mix(in srgb, var(--caisse-vert) 45%, transparent)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--caisse-vert-fonce)' }}>Vente en cours</div>
              {/* « 6 articles · 2 900 F » est un MONTANT, pas une légende : il prend
                  `--caisse-vert-fonce` (« montants forts ») et non le gris des
                  légendes, qui tombe à 4,4:1 sur le fond succès. La hiérarchie se
                  fait au corps et à la graisse, pas en pâlissant le chiffre. */}
              <div style={{ fontSize: 13, color: 'var(--caisse-vert-fonce)', fontVariantNumeric: 'tabular-nums' }}>
                {nbItems} article{nbItems > 1 ? 's' : ''} · {Math.round(totalPanier).toLocaleString('fr-FR')} F
              </div>
            </div>
            <span style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--caisse-vert)', color: 'white', fontWeight: 800, fontSize: 14 }}>Reprendre</span>
          </motion.button>
        ) : null}

        {/* UN SEUL geste évident pour vendre, et il ouvre LA CAISSE (lot B —
            VOIX-01, arbitrage du 20/09/2026). Il ouvrait auparavant un écran
            vocal distinct qui, la ligne une fois au panier, renvoyait vers la
            caisse : deux démarrages pour un seul parcours, et plus aucun micro
            à l'arrivée. La caisse est désormais la seule surface de vente —
            elle porte le micro, les produits, le panier et l'encaissement. */}
        <motion.button
          whileTap={{ scale: 0.97 }} onClick={allerCaisse} aria-label="Vendre"
          className="commerce-sell commerce-sell-redesign">
          <span className="commerce-sell-icon">
            <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>
          </span>
          <span className="commerce-sell-copy"><strong>Vendre</strong><small>Parler ou toucher les produits</small></span>
          <span className="commerce-sell-arrow" aria-hidden="true">›</span>
        </motion.button>

        {/* Tuiles — icônes vectorielles locales + un seul libellé (hors-ligne) */}
        <div className="commerce-home-tools" aria-label="Mes outils">
          {tuiles.map((t) => (
            <motion.button key={t.label} whileTap={{ scale: 0.94 }} onClick={t.go}
              className="commerce-home-tile">
              <span className="commerce-home-tile-icon" style={{ color: t.teinte }}>
                {t.icon}
              </span>
              <span>{t.label}</span>
            </motion.button>
          ))}
        </div>

      </div>

      {/* Résumé du jour — ouvert en touchant la carte caisse (Phase 2).
          La clôture de journée + le fond y sont relogés (Q-C). */}
      <ResumeModal
        isOpen={showResume}
        onClose={() => setShowResume(false)}
        stats={{ ventes: stats?.ventes || 0, cahier: stats?.cahier || 0, caisse: stats?.caisse || 0, nombreVentes: stats?.nombreVentes || 0 }}
        etatCaisse={etatCaisse}
        onFermerJournee={() => { setShowResume(false); setShowClose(true); }}
        onModifierFond={() => { setShowResume(false); setShowEditFond(true); }}
      />
      {/* ACC-02 — LA CLÔTURE EST UN CONSTAT, ET ON NE CONSTATE PAS À L'AVEUGLE.
          `CloseDayModal` calcule `ecart = comptage − stats.caisse`. Avec le
          faux zéro d'avant, une marchande qui compte 14 000 F en main lisait
          « +14 000 F d'écart » — et en validant, ce chiffre partait en base,
          daté et définitif. Le même faux zéro que l'accueil, mais ici il
          s'ÉCRIT au lieu de se lire. L'état traverse donc jusqu'ici. */}
      <CloseDayModal
        isOpen={showClose}
        onClose={() => setShowClose(false)}
        stats={{ ventes: stats?.ventes || 0, cahier: stats?.cahier || 0, caisse: stats?.caisse || 0, nombreVentes: stats?.nombreVentes || 0 }}
        etatCaisse={etatCaisse}
      />
      <EditFondModal
        isOpen={showEditFond}
        onClose={() => setShowEditFond(false)}
        {...(currentSession ? { currentFond: currentSession.fondInitial } : {})}
      />

      {/* « Tata propose de me reconnaître » (lot 2) : une seule fois, juste après
          une entrée par code — Oui = le téléphone apprend à la reconnaître. */}
      <PropositionReconnaissance />
    </div>
  );
}

// La vente vocale a besoin des contextes Raccourcis / Rapport / Objectif
// (mêmes providers que l'ancien accueil).
export function MarchandAccueilVoice() {
  const { getTodayStats } = useApp();
  const stats = getTodayStats();
  return (
    <RaccourcisProvider>
      <RapportHebdoProvider>
        <ObjectifProvider ventes={stats?.ventes || 0}>
          <MarchandAccueilVoiceInner />
        </ObjectifProvider>
      </RapportHebdoProvider>
    </RaccourcisProvider>
  );
}
