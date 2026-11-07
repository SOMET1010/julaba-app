/**
 * Aperçu hors production — proposition pour les deux portes vocales.
 * Les états montrent le parcours, sans appeler ni modifier le métier.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Banknote, Banana, Check, ChevronLeft, Circle, Container, Layers3,
  Mic, Minus, PackagePlus, Plus, Scale, ShoppingBag, Volume2, X,
} from 'lucide-react';
import { IMG_LOGO_JULABA } from '../src/app/assets/images';
import { resoudreMessage } from '../src/app/i18n/voice/runtime';
import { BrandSignature } from '../src/app/components/shared/BrandSignature';
import { unitesProposees } from '../src/app/services/premierProduit';
import tataAccueil from '../src/assets/redesign/tata-accueil.webp';
import bandeauMarche from '../src/assets/redesign/bandeau-marche.webp';
import '../src/styles/fonts.css';
import '../src/styles/icons-tabler.css';
import '../src/styles/theme.css';
import '../src/styles/tailwind.css';
import '../src/styles/index.css';
import '../src/styles/tokens.css';
import '../src/styles/soleil.css';
import '../src/styles/commerce.css';
import './preview.css';

type Ecran = 'accueil' | 'caisse-question' | 'caisse-ecoute' | 'caisse-confirme'
  | 'caisse-confirm-ecoute' | 'caisse-ok' | 'produit-question'
  | 'produit-ecoute' | 'produit-unite' | 'produit-quantite';

const ETAT_INITIAL: Ecran = (() => {
  const etat = new URLSearchParams(location.search).get('etat');
  const valides: Ecran[] = ['accueil', 'caisse-question', 'caisse-ecoute', 'caisse-confirme', 'caisse-confirm-ecoute', 'caisse-ok', 'produit-question', 'produit-ecoute', 'produit-unite', 'produit-quantite'];
  return valides.includes(etat as Ecran) ? etat as Ecran : 'accueil';
})();

const UNITE_ICONE = {
  unité: Circle,
  tas: Layers3,
  kg: Scale,
  sac: ShoppingBag,
  bassine: Container,
  régime: Banana,
};
// Deux unités personnelles illustrent l’ordre réel : les siennes, puis celles du marché.
const UNITES = unitesProposees(['bassine', 'régime']);
const FOND_DIT = 'deux mille cinq cents francs';
const QUESTION_FOND = resoudreMessage('CAI_OUVERTURE_FOND').texte;
const QUESTION_CONFIRMER = resoudreMessage('CAI_OUVERTURE_CONFIRMER', { montant: 'deux mille cinq cents' }).texte;
const QUESTION_PRODUIT = resoudreMessage('STOCK_047').texte;

function MicroEnEcoute({ fermer, terminer }: { fermer: () => void; terminer: () => void }) {
  return (
    <main className="ecoute" aria-label="Écoute en cours">
      <button className="fermer-ecoute" aria-label="Fermer" onClick={fermer}><X /></button>
      <button className="micro-battant" aria-label="Terminer l’écoute (simulation)" onClick={terminer}>
        <span className="micro-ondes micro-ondes-a" />
        <span className="micro-ondes micro-ondes-b" />
        <span className="micro-rond"><Mic aria-hidden="true" /></span>
      </button>
    </main>
  );
}

function Apercu() {
  const [ecran, setEcran] = useState<Ecran>(ETAT_INITIAL);
  const [unite, setUnite] = useState(ETAT_INITIAL === 'produit-quantite' ? 'tas' : '');
  const [quantite, setQuantite] = useState(1);
  const aller = (prochain: Ecran) => {
    setEcran(prochain);
    const url = new URL(location.href);
    url.searchParams.set('etat', prochain);
    history.replaceState(null, '', url);
  };
  const lancerCaisse = () => aller('caisse-question');
  const lancerProduit = () => { setUnite(''); aller('produit-question'); };
  const fermer = () => aller('accueil');

  useEffect(() => {
    const suite: Partial<Record<Ecran, Ecran>> = {
      'caisse-question': 'caisse-ecoute',
      'produit-question': 'produit-ecoute',
      // Tata relit le montant puis ouvre l’écoute oui/non.
      'caisse-confirme': 'caisse-confirm-ecoute',
    };
    const prochain = suite[ecran];
    if (!prochain) return;
    const timer = window.setTimeout(() => aller(prochain), ecran === 'caisse-confirme' ? 3_800 : 2_500);
    return () => window.clearTimeout(timer);
  }, [ecran]);

  if (ecran === 'caisse-question' || ecran === 'produit-question') {
    return (
      <main className="flux question-vocale" role="status">
        <Volume2 aria-hidden="true" />
        <p>{ecran === 'caisse-question' ? QUESTION_FOND : QUESTION_PRODUIT}</p>
      </main>
    );
  }
  if (ecran === 'caisse-ecoute') {
    return <MicroEnEcoute fermer={fermer} terminer={() => aller('caisse-confirme')} />;
  }
  if (ecran === 'produit-ecoute') {
    return <MicroEnEcoute fermer={fermer} terminer={() => aller('produit-unite')} />;
  }
  if (ecran === 'caisse-confirme') {
    return (
      <main className="flux">
        <button className="retour" aria-label="Retour à l’accueil" onClick={fermer}><ChevronLeft /></button>
        <div className="montant-preuve" aria-label={`Montant relu : ${FOND_DIT}`}>
          <div className="billet" aria-hidden="true"><Banknote /></div>
          <p>{FOND_DIT}</p>
        </div>
        <button className="rejouer" aria-label="Réécouter le montant puis répondre" onClick={() => aller('caisse-confirm-ecoute')}>
          <Volume2 /><span>Réécouter</span>
        </button>
        <p className="question-confirme">{QUESTION_CONFIRMER}</p>
      </main>
    );
  }
  if (ecran === 'caisse-confirm-ecoute') {
    return <MicroEnEcoute fermer={fermer} terminer={() => aller('caisse-ok')} />;
  }
  if (ecran === 'caisse-ok') {
    return (
      <main className="succes">
        <div className="succes-icone"><Check aria-hidden="true" /></div>
        <p>Ta caisse est ouverte.</p>
        <button onClick={fermer}>Retour à l’accueil</button>
      </main>
    );
  }
  if (ecran === 'produit-unite') {
    return (
      <main className="flux produit">
        <button className="retour" aria-label="Retour à l’accueil" onClick={fermer}><ChevronLeft /></button>
        <div className="produit-reconnu" aria-label="Tomate, produit déjà connu">
          <span aria-hidden="true">🍅</span>
          <strong>Tomate</strong>
        </div>
        <h1>{resoudreMessage('STOCK_048', { nom: 'Tomate' }).texte}</h1>
        <div className="unites" role="group" aria-label="Choisis l’unité pour cette opération">
          {UNITES.map((nom) => {
            const Icone = UNITE_ICONE[nom as keyof typeof UNITE_ICONE];
            return (
              <button key={nom} aria-pressed={unite === nom} onClick={() => setUnite(nom)}>
                <Icone aria-hidden="true" />
                <span>{nom}</span>
              </button>
            );
          })}
        </div>
        <button className="continuer" disabled={!unite} onClick={() => aller('produit-quantite')}>
          <Check aria-hidden="true" /> C’est bon
        </button>
        <button className="annuler" onClick={fermer}>Annuler</button>
      </main>
    );
  }
  if (ecran === 'produit-quantite') {
    return (
      <main className="flux produit">
        <button className="retour" aria-label="Retour à l’accueil" onClick={() => aller('produit-unite')}><ChevronLeft /></button>
        <div className="produit-reconnu" aria-label="Tomate">
          <span aria-hidden="true">🍅</span>
          <strong>Tomate</strong>
        </div>
        <h1>{resoudreMessage('STOCK_055', { produit: 'Tomate', unite }).texte}</h1>
        <div className="compteur">
          <button aria-label="Enlever une" onClick={() => setQuantite(Math.max(1, quantite - 1))}><Minus /></button>
          <strong>{quantite}</strong>
          <button aria-label="Ajouter une" onClick={() => setQuantite(quantite + 1)}><Plus /></button>
        </div>
        <button className="continuer" onClick={fermer}><Check aria-hidden="true" /> C’est bon</button>
        <button className="annuler" onClick={fermer}>Annuler</button>
      </main>
    );
  }

  return (
    <main className="accueil">
      <section className="commerce-home-hero">
        <img src={bandeauMarche} alt="" aria-hidden="true" className="commerce-home-hero-bg" />
        <div className="commerce-home-hero-veil" aria-hidden="true" />
        <div className="commerce-home-header">
          <div className="commerce-brand commerce-brand-hero">
            <img src={IMG_LOGO_JULABA} alt="JÙLABA" />
            <BrandSignature />
          </div>
          <button className="commerce-sun-button" aria-label="Mode soleil" aria-pressed="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
        </div>
        <div className="commerce-home-welcome">
          <span className="commerce-home-welcome-copy">
            <small>Ton comptoir est prêt</small>
            <strong>Bonjour Awa</strong>
            <em>On vend ensemble aujourd’hui.</em>
          </span>
          <img src={tataAccueil} alt="" aria-hidden="true" />
        </div>
      </section>

      <section className="caisse-resume">
        <div className="resume-sans-montant">
          <span>Ma caisse aujourd’hui</span>
          <strong>—</strong>
        </div>
        <button className="lire-caisse" aria-label="Écouter l’état de ma caisse"><Volume2 /></button>
      </section>

      <button className="porte-caisse" onClick={lancerCaisse}>
        <span className="porte-icone">
          <Banknote aria-hidden="true" />
          <span className="badge-micro"><Mic aria-hidden="true" /></span>
        </span>
        <span className="porte-texte"><strong>Ouvrir ma caisse</strong></span>
        <span className="fleche" aria-hidden="true">›</span>
      </button>

      <button className="vendre">
        <span className="vendre-icone"><Mic aria-hidden="true" /></span>
        <span><strong>Vendre</strong><small>Parler ou toucher les produits</small></span>
        <span className="fleche" aria-hidden="true">›</span>
      </button>

      <button className="porte-produit" onClick={lancerProduit}>
        <span className="produit-porte-icone">
          <PackagePlus aria-hidden="true" />
          <span className="badge-micro"><Mic aria-hidden="true" /></span>
        </span>
        <span className="porte-texte"><strong>Ajouter un produit</strong></span>
        <span className="fleche" aria-hidden="true">›</span>
      </button>

      <div className="outils" aria-label="Autres outils">
        <button className="outil"><span><ShoppingBag /></span>Mon stock</button>
        <button className="outil"><span><Banknote /></span>Mes dépenses</button>
        <button className="outil"><span><Layers3 /></span>Mes ventes</button>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Apercu />);
