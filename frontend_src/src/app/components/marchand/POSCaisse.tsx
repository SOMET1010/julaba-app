import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Minus, Trash2, X, Check, Package, FileText, Banknote, ChevronRight, Leaf, Zap, Volume2 } from 'lucide-react';
import { useCaisse } from '../../contexts/CaisseContext';
import { SyncEchecsBanner } from './SyncEchecsBanner';
import { useApp } from '../../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { CreditModal } from './CreditModal';
import { SubPageLayout } from '../layout/SubPageLayout';
import { promoActive, prixEffectif, remisePct } from '../../utils/promo.utils';
import { partagerRecu } from '../../utils/recu.utils';
import { uniteSeule } from '../../utils/unite.utils';
import { MOBILE_OPERATORS, getMobileOperator } from '../../types/payment';
import { COUPURES, decomposerMonnaie, direCoupure, formatF } from '../../utils/fcfa';
import { BilletDessine, PieceDessinee } from './CoupureDessinee';
import { avertissementRupture } from '../../services/ruptureStock';
import { vibrerSucces, vibrerErreur, vibrerTic } from '../../utils/haptique';
import { getImageByNom } from '../../data/catalogue-produits';
import { guidageVocal } from '../../utils/accessMode';
import { phraseRelecture, phraseLigneAjoutee, type EtatEncaissement as EtatRelu } from '../../services/relectureSpontanee';
import { ChoixUnite } from './ChoixUnite';
import { useCatalogueMaitre, ReferenceMaitre } from '../../hooks/useCatalogueMaitre';
import { RaccourcisProvider } from '../../contexts/RaccourcisContext';
import { ObjectifProvider } from '../../contexts/ObjectifContext';
import { MicroVenteCaisse, type ProduitPreselectionne } from './MicroVenteCaisse';
import { ETAT_INITIAL, empreintePanier, reduire, type EffetEncaissement, type EtatEncaissement, type EtatFinancier } from '../../services/machineEncaissement';
import type { IntentionEncaissement } from '../../voice-offline/grammaireEncaissement';

// PLUS AUCUNE COULEUR EN DUR ICI (VOIX-01, lot F). Les constantes `P` et `BG`
// portaient l'ancienne charte ; la caisse lit maintenant la charte de la
// maquette dans styles/commerce.css (`--caisse-*`), seule source de vérité —
// garde-fou : caisseCharte.test.mts.
//
// Les icônes lucide prennent une TAILLE en nombre (attribut SVG), pas une
// variable CSS : la planche dit 24 px, on le recopie ici, une fois.
const ICONE = 24;

// Pilote ESPÈCES uniquement : la vente à crédit est désactivée en caisse tant
// que les blockers « argent gelé » (I4/I5/I6) ne sont pas traités — le backend
// ne décrémente pas encore le stock pour le crédit et la chaîne crédit n'est pas
// idempotente. Réactivation = chantier crédit dédié (décrément stock backend +
// idempotence), pas un simple retour d'UI. Typé `boolean` volontairement pour
// ne pas figer les conditions en littéral. Voir docs / suivi pré-recette #16.
const CAISSE_CREDIT_ACTIF: boolean = false;

// Pilote ESPÈCES uniquement : le « mobile money » de caisse est DÉCLARATIF
// (aucune intégration ni encaissement réel — on note juste l'opérateur). Le
// laisser visible crée une promesse fonctionnelle contradictoire avec un pilote
// espèces. On le masque tant qu'il n'est pas branché à un vrai encaissement.
// Réactivation = chantier mobile money dédié. Typé `boolean` volontairement.
const CAISSE_MOBILE_MONEY_ACTIF: boolean = false;

function POSCaisseInner() {
  const navigate = useNavigate();
  const location = useLocation();
  // PRODUIT PRÉSÉLECTIONNÉ — arrive par l'ÉTAT DE ROUTE, jamais par une
  // variable globale ni un état caché : « Vendre » depuis la fiche d'un
  // produit (Mon stock) ouvre CETTE page avec le produit déjà choisi. C'est la
  // convention déjà en place dans JULABA (voir RoleDashboard, LoginPassword…),
  // donc lisible, testable, et vide quand on arrive autrement.
  const produitPreselectionne = ((location.state as { produitPreselectionne?: ProduitPreselectionne } | null)?.produitPreselectionne) ?? null;
  const { products, cart, addToCart, removeFromCart, updateCartItemQuantity, updateCartItemPrice, clearCart, getTotalCart, enregistrerVente, refreshProducts, transactions } = useCaisse();
  const { speak, reloadTransactions, user, isOnline } = useApp();
  const marchandNom = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (user as any)?.nom || 'Ma boutique';
  // La caisse SUIT le sous-profil (docs/SOUS_PROFILS_MARCHAND.md) : en négoce
  // (demi-grossiste, grossiste), le prix unitaire se discute à chaque vente et
  // les quantités se tapent directement (on ne vend pas 40 cuvettes au +1/+1).
  const sousProfil = user?.sousProfilMarchand ?? null;
  const estNegoce = sousProfil === 'demi_grossiste' || sousProfil === 'grossiste';
  // Confirmations vocales AUTO selon le profil (le même que la connexion) :
  // silencieuses en mode 'lecture' (l'écran affiche déjà tout), parlées en voix/mixte.
  const dire = (t: string) => { if (guidageVocal()) speak(t); };

  const [search, setSearch] = useState('');
  // Aperçu produits sur téléphone (lot A) : la grille est repliée à quelques
  // vignettes tant que la marchande ne demande pas à voir plus. Le panier et
  // l'encaissement sont SOUS la grille — sans ce repli ils seraient à
  // plusieurs écrans de défilement, et la « surface unique » serait un mot.
  const [voirPlusProduits, setVoirPlusProduits] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  // Montant libre « Autre article » (Phase 3, lot 1) : vendre sans produit listé.
  const [showLibre, setShowLibre] = useState(false);
  const [libreMontant, setLibreMontant] = useState('');
  const [libreDesc, setLibreDesc] = useState('');
  // « Autre article » sert maintenant DEUX gestes : chercher dans le
  // référentiel maître (Odoo) pour ajouter un vrai article à son catalogue,
  // ou vendre un montant libre quand rien ne correspond. Le second reste
  // disponible tel quel — on n'enlève rien à la marchande.
  const catalogueMaitre = useCatalogueMaitre((user as any)?.id);
  const [refRecherche, setRefRecherche] = useState('');
  const [refChoisie, setRefChoisie] = useState<ReferenceMaitre | null>(null);
  const [refUnite, setRefUnite] = useState('unité');
  // L'UNITÉ DE L'ARTICLE LIBRE SE CHOISIT (lot E). Elle était écrite en dur
  // (« unite ») : la marchande vendait « quelque chose à 500 F » et le code
  // décidait à sa place que c'était « à l'unité » — un tas de gombo devenait
  // une unité de gombo au reçu. Le chemin voisin (référence du catalogue
  // maître) demandait, lui, l'unité ; celui-ci ne demandait rien.
  const [libreUnite, setLibreUnite] = useState('unité');
  const [adoptionEnCours, setAdoptionEnCours] = useState(false);
  const [adoptionMessage, setAdoptionMessage] = useState<string | null>(null);

  // Encaissement (Phase 3, lots 2-4) : montant reçu (espèces) + écran « Vente réussie ».
  const [montantRecu, setMontantRecu] = useState('');
  const [lastSale, setLastSale] = useState<{ montant: number; moyen: string; monnaie: number; produits: any[] } | null>(null);
  // Mobile money DÉCLARÉ (Chemin A) : opérateur choisi, aucune intégration/argent.
  const [mmOperator, setMmOperator] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Verrou SYNCHRONE anti double-clic : l'état React (et donc `disabled`) ne se
  // met à jour qu'au render suivant ; un ref bloque le 2e tap dès la même frame.
  const paiementEnCoursRef = useRef(false);

  // Ajout au panier VOCALISÉ : une non-lectrice entend ce qu'elle vient d'ajouter
  // et peut vérifier son panier avant d'encaisser.
  const ajouterAuPanier = (p: any) => {
    // CE QU'ELLE ENTEND : la ligne AVEC son unité, et le TOTAL du panier
    // (lot D). « Tomate ajouté » ne disait ni combien, ni à quel prix, ni où
    // en est le panier — et le total ne se disait que si on touchait le
    // chiffre. Le calcul se fait AVANT que l'état ne bouge, sur le panier du
    // rendu courant : un seul addToCart par geste, même fusion de ligne que
    // CaisseContext.addToCart.
    const existante = cart.find(i => i.productId === p.id);
    const q = (existante?.quantite ?? 0) + 1;
    const prixU = prixEffectif(p);
    const totalLigne = (existante?.totalExact ?? (existante ? existante.prix * existante.quantite : 0)) + prixU;
    addToCart(p, 1);
    dire(phraseLigneAjoutee({ nom: p?.nom || p?.name || 'Produit', quantite: q, unite: p?.unite, totalLigne, totalPanier: total + prixU }));
  };

  const fermerAutreArticle = () => {
    setShowLibre(false);
    setLibreMontant(''); setLibreDesc(''); setLibreUnite('unité');
    setRefRecherche(''); setRefChoisie(null); setRefUnite('unité'); setAdoptionMessage(null);
  };

  const choisirReference = (r: ReferenceMaitre) => {
    setRefChoisie(r);
    setAdoptionMessage(null);
    setLibreDesc(r.nom);
    dire(`${r.nom}. Quel est ton prix ?`);
  };

  /**
   * ADOPTION : la référence devient un article de CETTE marchande, au prix
   * qu'elle vient de poser. Odoo a dit ce qu'est le produit, elle dit combien
   * elle le vend — tant que cette seconde phrase n'est pas dite, il n'y a pas
   * d'article, et donc jamais de vente à 0 F.
   *
   * Elle était en train d'encaisser : une fois l'article créé, on le met
   * DIRECTEMENT au panier. Lui faire rechercher son propre produit juste
   * après l'avoir ajouté serait un pas de plus pour rien, devant une cliente
   * qui attend.
   */
  const adopterReference = async () => {
    if (!refChoisie || adoptionEnCours) return;
    const prix = Number(libreMontant);
    if (!prix || prix <= 0) {
      setAdoptionMessage('Il faut indiquer ton prix de vente.');
      dire('Il faut indiquer ton prix');
      vibrerErreur();
      return;
    }
    setAdoptionEnCours(true);
    setAdoptionMessage(null);
    try {
      const res = await catalogueMaitre.adopter({
        default_code: refChoisie.default_code, prix, unite: refUnite, stock: 0,
      });
      if (!res.ok || !res.produit) {
        setAdoptionMessage(res.message || "Impossible d'ajouter cet article.");
        dire(res.message || "Impossible d'ajouter cet article");
        vibrerErreur();
        return;
      }
      await refreshProducts();
      addToCart({
        id: res.produit.id, nom: res.produit.nom, prix: Number(res.produit.prix),
        categorie: res.produit.categorie, stock: Number(res.produit.stock),
        unite: res.produit.unite,
      } as any, 1);
      vibrerSucces();
      dire(`${res.produit.nom} ajouté à ton catalogue et au panier`);
      fermerAutreArticle();
    } finally {
      setAdoptionEnCours(false);
    }
  };

  // Ajoute une ligne « montant libre » : produit synthétique (id unique) au prix
  // saisi. N'affecte PAS le stock (aucun produit du catalogue n'y correspond).
  const ajouterMontantLibre = () => {
    const montant = Number(libreMontant);
    if (!montant || montant <= 0) return;
    const nom = libreDesc.trim() || 'Autre article';
    const produitLibre: any = {
      id: `libre-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      nom, prix: montant, prix_achat: 0, categorie: 'Autre', stock: 0, unite: libreUnite,
    };
    addToCart(produitLibre, 1);
    dire(phraseLigneAjoutee({ nom, quantite: 1, unite: libreUnite, totalLigne: montant, totalPanier: total + montant }));
    // L'unité revient au défaut : sinon le « tas » de la vente précédente
    // collerait, en silence, à l'article libre suivant.
    setLibreMontant(''); setLibreDesc(''); setLibreUnite('unité'); setShowLibre(false);
  };

  const total = getTotalCart();
  const nbItems = cart.reduce((s, i) => s + i.quantite, 0);

  // Espèces : montant reçu composé EN BILLETS (le geste réel du marché — elle
  // touche les coupures reçues au lieu de déchiffrer « 12 500 », inclusion §2.2)
  // + monnaie à rendre décomposée en coupures concrètes.
  const recu = Number(montantRecu) || 0;
  const monnaie = Math.max(0, recu - total);
  const insuffisant = recu > 0 && recu < total;
  const ajouterCoupure = (valeur: number) => {
    setMontantRecu(String(recu + valeur));
    vibrerTic(); // se SENT aussi (bruit du marché, marchande qui n'entend pas)
    dire(direCoupure(valeur));
  };
  const monnaieDecomposee = useMemo(() => decomposerMonnaie(monnaie), [monnaie]);


  const topProducts = useMemo(() => {
    const salesCount: Record<string, number> = {};
    (transactions || []).forEach((t: any) => {
      if (t.type === 'vente' && t.productName) {
        const prod = products.find(p => p.nom === t.productName);
        if (prod) salesCount[prod.id] = (salesCount[prod.id] || 0) + 1;
      }
    });
    return [...products]
      .sort((a, b) => (salesCount[b.id] || 0) - (salesCount[a.id] || 0))
      .slice(0, 2);
  }, [products, transactions]);

  const filtered = useMemo(() => {
    if (search === '') return products;
    return products.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);



  const handlePay = async () => {
    if (paiementEnCoursRef.current) return; // anti double-clic (synchrone)
    if (cart.length === 0) return;
    if (total <= 0) {
      dire('Montant total invalide');
      return;
    }
    if (paymentMethod === 'credit') return;
    if (paymentMethod === 'cash' && insuffisant) { dire('Montant reçu insuffisant'); return; }
    if (paymentMethod === 'mobile_money' && !mmOperator) { dire('Choisis l\'opérateur'); return; }
    const estMM = paymentMethod === 'mobile_money';
    const moyen = estMM ? getMobileOperator(mmOperator as string).name : 'Espèces';
    paiementEnCoursRef.current = true;
    setIsProcessing(true);
    try {
      const details = cart.map(i => ({
        productId: i.productId,
        nom: i.nom,
        quantite: i.quantite,
        prix: i.prix,
        // Total exact (voix/guidé) prioritaire : 500F/3 ne retombe pas juste
        // en FCFA, `prix` n'est qu'un unitaire arrondi (voir CartItem.totalExact).
        total: i.totalExact ?? i.prix * i.quantite,
        prix_achat: (i as any).prixAchat ?? (i as any).prix_achat ?? 0,
        // L'UNITÉ PART AVEC LA VENTE — arbitrage du 19/09/2026. Elle est
        // enregistrée dans `details` (jsonb déjà persisté), donc figée au
        // moment de la vente. Sans elle, changer l'unité d'un produit
        // réécrivait le sens de tout l'historique : « 3 × Tomate » vendues au
        // tas se relisaient au kilo, sans aucun moyen de le savoir.
        unite: i.unite,
      }));
      // D'OÙ VIENT CETTE VENTE. La voix ne fait que remplir le panier : c'est
      // toujours ce bouton qui enregistre. La seule chose qui sache si la
      // marchande a parlé, c'est donc la LIGNE. Une vente compte comme dictée
      // dès qu'au moins une de ses lignes l'est — un panier commencé à la voix
      // puis complété au doigt reste un panier où la voix a servi, et c'est ce
      // qu'elle cherchera dans « Par la voix ».
      const source = cart.some((i) => i.origine === 'vocal') ? 'vocal' : 'kassa';
      await enregistrerVente(total, details, moyen, undefined, source);
      // Rupture éventuelle (décision n°6) : calculée AVANT le décrément optimiste.
      // Le serveur borne déjà le stock à 0 et journalise le manquant (I3) ; ici on
      // AVERTIT à la voix au lieu de plancher en silence. La vente passe toujours.
      const avertRupture = avertissementRupture(
        details
          .map((i) => {
            const p = products.find((pp) => pp.id === i.productId);
            return p ? { nom: i.nom, quantite: i.quantite, stockAvant: p.stock || 0 } : null;
          })
          .filter((x): x is { nom: string; quantite: number; stockAvant: number } => x !== null),
      );
      // Stock : le BACKEND est seul maître. `/caisse/vente` décrémente de façon
      // atomique (SELECT … FOR UPDATE) et journalise le manquant (I3) dans la MÊME
      // transaction. On ne réécrit plus un stock ABSOLU depuis le front : c'était
      // la « double autorité » (R-A) — en concurrence ou au rejeu offline, ce PUT
      // absolu, calculé sur un état local possiblement périmé, écrasait le
      // décrément serveur (stock trop haut, divergence stock/ledger). On reflète
      // désormais l'état autoritaire par un simple refetch.
      void refreshProducts();
      // Écran « Vente réussie » (Phase 3, lot 4) — capturé AVANT de vider le panier.
      setLastSale({ montant: total, moyen, monnaie: estMM ? 0 : monnaie, produits: details });
      clearCart();
      setPaymentMethod('cash');
      setMmOperator(null);
      setMontantRecu('');
      setShowSuccess(true);
      // Confirmation qui se VOIT (écran vert), s'ENTEND (parlée) et se SENT
      // (vibration) : une non-lectrice ou une sourde sait que c'est passé.
      vibrerSucces();
      dire(`Vente enregistrée. ${total.toLocaleString('fr-FR')} francs${avertRupture ? '. ' + avertRupture : ''}`);
    } catch (e) {
      console.error(e);
      vibrerErreur();
      dire("La vente n'a pas pu être enregistrée. Réessaie.");
    }
    finally { paiementEnCoursRef.current = false; setIsProcessing(false); }
  };

  // ── ENCAISSEMENT À LA VOIX (VOIX-01, lot C) ──────────────────────────────
  // « Encaisse » ne paie jamais : Tata relit le compte (« Elle doit 4 000.
  // Elle t'a donné 5 000. Tu rends 1 000. Je valide ? ») et attend « oui
  // valide ». La décision est prise par `reduire` (machineEncaissement.ts),
  // une fonction pure : cet écran ne fait que lui donner l'état financier de
  // l'instant et exécuter l'effet qu'elle rend. Quand l'effet est
  // `encaisser`, on appelle `handlePay` — LA MÊME primitive que le bouton
  // « Payer en espèces », avec le même verrou `paiementEnCoursRef` et les
  // mêmes gardes. Il n'existe pas de second chemin vers `enregistrerVente`.
  //
  // L'ÉTAT FINANCIER DE L'INSTANT. Ce sont les trois nombres que Tata relit
  // et que « oui valide » doit retrouver à l'identique. Les lignes portent le
  // même total que `handlePay` envoie au serveur : l'exact dicté quand il
  // existe, sinon prix × quantité — l'empreinte confirme la vente qui sera
  // écrite, pas une approximation.
  const etatFinancier: EtatFinancier = {
    panierVide: cart.length === 0,
    total,
    recu,
    monnaie,
    // Le bouton accepte un reçu à 0 (elle n'a pas touché les billets) ; la
    // voix, non : « Elle t'a donné 0 » n'est pas un compte qu'on peut relire.
    // Tata demande alors de toucher les billets — au doigt, jamais dictés.
    suffisant: recu > 0 && !insuffisant,
    empreinte: {
      total,
      recu,
      lignes: empreintePanier(cart.map(i => ({ productId: i.productId, quantite: i.quantite, total: i.totalExact ?? i.prix * i.quantite }))),
    },
  };
  // UN REF, PAS UN useState, et c'est une décision de sécurité : la
  // transition doit être SYNCHRONE. Deux « oui valide » qui arrivent dans la
  // même frame liraient le même état React (« attente ») et paieraient deux
  // fois avant le re-render ; avec un ref, le premier consomme l'attente et
  // le second trouve « repos ». Rien n'est rendu à partir de cet état — il ne
  // pilote que la voix — donc aucun re-render n'est perdu.
  const etatEncaissementRef = useRef<EtatEncaissement>(ETAT_INITIAL);
  // LA RELECTURE SE VOIT AUSSI (décision de Patrick, 20/09/2026) : « conserver
  // speak ; afficher simultanément à l'écran la même relecture financière
  // exacte que celle prononcée, dérivée du même snapshot de machine ». Cet
  // état ne reçoit JAMAIS autre chose que `effet.texte` — pas de phrase
  // reconstruite depuis `total`/`recu` du rendu, qui pourrait différer du
  // compte que la machine a réellement relu. Une seule chaîne, dite et
  // affichée ; null dès que la machine revient au repos (paiement,
  // annulation, panier vidé), et remplacée par la relecture suivante.
  const [relectureAffichee, setRelectureAffichee] = useState<string | null>(null);
  const afficherRelecture = (etat: EtatEncaissement, effet: EffetEncaissement) => {
    if (etat.phase === 'repos') setRelectureAffichee(null);
    else if (effet.type === 'dire') setRelectureAffichee(effet.texte);
  };
  const traiterIntentionEncaissement = (intention: IntentionEncaissement) => {
    const { etat, effet } = reduire(etatEncaissementRef.current, intention, etatFinancier);
    etatEncaissementRef.current = etat;
    if (effet.type === 'rien') return;
    // La réponse à une PHRASE se dit toujours — `speak`, pas `dire`. `dire`
    // tait les confirmations automatiques en mode lecture, parce que l'écran
    // les affiche déjà ; ici la relecture EST la garantie : une marchande qui
    // dit « encaisse » et n'entend rien dirait « oui valide » sans avoir
    // entendu le compte qu'elle confirme. Même règle que les réponses du
    // micro (MicroVenteCaisse parle par `speak`). Et l'écran montre la même
    // phrase, pour celle qui n'a pas entendu — le bruit, le doute.
    afficherRelecture(etat, effet);
    if (effet.texte) speak(effet.texte);
    if (effet.type === 'encaisser') void handlePay();
  };
  // Le moteur vocal tient son gestionnaire dans des fermetures qui peuvent
  // dater d'un rendu antérieur (l'enregistrement a commencé avant que la
  // cliente ajoute un article). Un ref « dernier rendu » garantit que la
  // phrase est jugée sur le panier, le reçu et le `handlePay` d'AUJOURD'HUI —
  // jamais sur ceux d'il y a trois gestes.
  const traiterIntentionRef = useRef(traiterIntentionEncaissement);
  traiterIntentionRef.current = traiterIntentionEncaissement;
  const onIntentionEncaissement = useCallback((intention: IntentionEncaissement) => traiterIntentionRef.current(intention), []);
  // LE PANIER OU LE REÇU BOUGE → LA CONFIRMATION TOMBE. Un article ajouté
  // pendant que la cliente cherche sa monnaie, un billet touché, « Vider »,
  // le bouton « Payer » lui-même (qui vide le panier) : tout passe par ici, et
  // la machine ne garde une attente que si l'empreinte relue est encore la
  // vraie. Et c'est ici que Tata relit D'ELLE-MÊME (parcours cible, étapes
  // 6→8) : « encaisse », elle touche les billets, et dès que le reçu couvre,
  // la machine rend la relecture du compte de l'instant — on la DIT et on
  // l'AFFICHE, par le même geste que plus haut. Cet effet ne peut jamais
  // être `encaisser` (la machine ne paie que sur « oui valide », et
  // l'énumération exhaustive de son test le prouve) : on ne traite donc que
  // la parole ici, jamais le paiement — `handlePay` n'a qu'un seul appelant
  // vocal, plus haut.
  const etatFinancierRef = useRef(etatFinancier);
  etatFinancierRef.current = etatFinancier;
  const cleEmpreinte = `${total}|${recu}|${etatFinancier.empreinte.lignes}`;
  useEffect(() => {
    const { etat, effet } = reduire(etatEncaissementRef.current, 'etat_financier_change', etatFinancierRef.current);
    etatEncaissementRef.current = etat;
    afficherRelecture(etat, effet);
    if (effet.type === 'dire') speak(effet.texte);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne réagit qu'à l'empreinte financière ; `speak` est stable (contexte), `afficherRelecture` n'est qu'un setter
  }, [cleEmpreinte]);

  // RELECTURE SPONTANÉE (lot D) : ce que l'écran recalcule, Tata le redit
  // d'elle-même — « Il manque 2 000 », « Compte juste », « Tu rends 1 000 ».
  // Le total, la monnaie et « compte juste » ne parlaient que si on les
  // touchait : pour une non-lectrice, une information derrière un appui sur
  // un chiffre n'existe pas.
  //
  // DEUX VOIX, UNE SEULE À LA FOIS. Quand la marchande a dit « encaisse », la
  // machine du lot C tient la parole et relit le compte complet (« …Je
  // valide ? ») dès que le reçu suffit ; cette relecture-ci se tait alors
  // sur le compte suffisant pour ne pas dire deux fois la même chose, mais
  // continue de dire « Il manque… » pendant qu'elle compte les billets — la
  // machine, elle, ne parle qu'au moment du compte plein.
  //
  // On mémorise le dernier état SOUMIS, pas le dernier état DIT : sinon vente
  // A → panier vidé → vente B identique rendrait B muette (cas testé dans
  // relectureSpontanee.test.mts).
  const dernierEtatReluRef = useRef<EtatRelu | null>(null);
  useEffect(() => {
    const etat: EtatRelu = { total, recu, nbLignes: cart.length };
    const phrase = phraseRelecture(etat, dernierEtatReluRef.current);
    dernierEtatReluRef.current = etat;
    if (!phrase) return;
    const machineParle = etatEncaissementRef.current.phase !== 'repos' && recu >= total;
    if (!machineParle) dire(phrase);
  }, [total, recu, cart.length]);

  // Crédit désactivé en pilote espèces (CAISSE_CREDIT_ACTIF=false) : ce handler
  // n'est plus atteignable (modal non monté). Conservé pour la réactivation
  // future — mais SANS écriture stock front : le stock reste backend-autoritaire
  // (leçon R-A). Au retour du crédit, le décrément passera par le backend puis un
  // refreshProducts(), jamais par un PUT absolu depuis l'écran de caisse.
  const handleCreditSuccess = () => {
    const details = cart.map(i => ({
      productId: i.productId,
      nom: i.nom,
      quantite: i.quantite,
      prix: i.prix,
      total: i.totalExact ?? i.prix * i.quantite,
      prix_achat: (i as any).prixAchat ?? (i as any).prix_achat ?? 0,
      // Même règle que la vente en espèces : l'unité est figée à la vente.
      unite: i.unite,
    }));
    void refreshProducts();
    // Confirmation parlée ET sentie aussi pour la vente à crédit.
    vibrerSucces();
    dire(`Vente à crédit enregistrée. ${total.toLocaleString('fr-FR')} francs`);
    // Recharge les totaux du jour (la vente à crédit doit apparaître : convention A).
    void reloadTransactions?.();
    setLastSale({ montant: total, moyen: 'Crédit', monnaie: 0, produits: details });
    clearCart();
    setPaymentMethod('cash');
    setMontantRecu('');
    setShowCredit(false);
    setShowSuccess(true);
  };

  // « 500 F / tas » — le prix ET l'unité, comme l'étiquette de la maquette
  // (« Unité toujours affichée » : le client comprend immédiatement). Le prix
  // en texte courant semibold, l'unité en gris : deux poids, une seule ligne
  // qui se replie proprement quand la vignette est étroite (« 1 000 F » puis
  // « / kg » dessous).
  const Prix = ({ prix, unite }: { prix: number; unite: string }) => (
    <div style={{ marginTop:'var(--caisse-esp-1)', display:'flex', flexWrap:'wrap', columnGap:'var(--caisse-esp-1)', alignItems:'baseline', justifyContent:'center', font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', fontVariantNumeric:'tabular-nums' }}>
      <span>{prix.toLocaleString('fr-FR')} F</span>
      <span style={{ fontWeight:400, fontSize:14, color:'var(--caisse-gris-texte)' }}>/ {unite}</span>
    </div>
  );

  // Le stock, en pastille discrète sur la photo : rouge (alerte) quand il
  // reste peu, sinon un chiffre sur fond sombre translucide. Sans le mot
  // « restants » : la vignette fait 80 px, et une non-lectrice lit la
  // couleur, pas le mot — le mot reste dans l'infobulle.
  const StockBadge = ({ stock }: { stock: number }) => {
    const low = stock < 10;
    return (
      <div title={`${stock} ${low ? 'restants' : 'en stock'}`} style={{ position:'absolute', top:'var(--caisse-esp-1)', left:'var(--caisse-esp-1)', background: low ? 'var(--caisse-alerte)' : 'var(--caisse-vert-fonce)', opacity: low ? 1 : 0.8, borderRadius:'var(--caisse-rayon-2)', padding:'2px 6px', font:'var(--caisse-font-legende)', fontWeight:600, color:'white', fontVariantNumeric:'tabular-nums' }}>
        {stock}
      </div>
    );
  };

  // Lignes du panier — factorisées pour être identiques dans le panneau
  // permanent (grand écran) et le panneau coulissant (mobile) : même logique
  // de négoce/prix/quantité, un seul endroit à faire évoluer.
  //
  // LA LIGNE DE LA MAQUETTE (lot F) : vignette · nom · « 3 tas » · 500 F ·
  // 1 500 F · − / +. Sur deux rangées et non une, et c'est un arbitrage
  // lisibilité : à 390 px, une seule rangée obligerait à des boutons de 32 px
  // — sous la cible tactile de 44 px du dépôt — ou à un nom tronqué. Rangée 1 :
  // la vignette, le nom, le total de la ligne (ce qu'elle regarde). Rangée 2 :
  // les gestes − / + autour de la quantité, l'unité et le prix unitaire.
  // Les boutons − / + appellent `updateCartItemQuantity`, la même fonction que
  // les vignettes de la grille appelaient déjà ; la corbeille reste, parce
  // qu'en gros une ligne de 40 cuvettes ne s'enlève pas en 40 gestes.
  const renderCartLines = () => (
    <>
      {cart.map(item => (
        <div key={item.productId} style={{ padding:'var(--caisse-esp-3) 0', borderBottom:'1px solid var(--commerce-line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-2)' }}>
            <ImageWithFallback src={products.find(p => p.id === item.productId)?.image || undefined} fallbackSrc={getImageByNom(item.nom)} alt="" aria-hidden="true"
              style={{ width:44, height:44, borderRadius:'var(--caisse-rayon-2)', objectFit:'cover', flexShrink:0, background:'var(--caisse-sable)' }} />
            <div style={{ flex:1, minWidth:0, font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nom}</div>
            <div style={{ font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--caisse-vert-fonce)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{(item.totalExact ?? item.prix * item.quantite).toLocaleString('fr-FR')} F</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-2)', marginTop:'var(--caisse-esp-2)', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)' }}>
              <motion.button type="button" whileTap={{ scale:0.86 }} onClick={() => updateCartItemQuantity(item.productId, item.quantite-1)} aria-label={`Un ${item.nom} de moins`}
                style={{ width:'var(--caisse-cible-tactile)', height:'var(--caisse-cible-tactile)', borderRadius:'50%', border:'1.5px solid var(--caisse-vert)', background:'var(--caisse-succes)', color:'var(--caisse-vert-fonce)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <Minus size={ICONE} strokeWidth={2.5} />
              </motion.button>
              {estNegoce ? (
                /* Quantité TAPÉE directement (indispensable en gros). */
                <input key={`q-${item.productId}-${item.quantite}`} defaultValue={item.quantite}
                  inputMode="numeric" aria-label={`Quantité de ${item.nom}`}
                  onBlur={e => {
                    const v = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
                    if (v > 0 && v !== item.quantite) {
                      updateCartItemQuantity(item.productId, v);
                      dire(`${item.nom} : ${v}`);
                    } else { e.target.value = String(item.quantite); }
                  }}
                  style={{ width:56, minHeight:'var(--caisse-cible-tactile)', border:'1.5px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-2)', padding:'0 var(--caisse-esp-1)', font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', textAlign:'center', background:'var(--caisse-ivoire)', fontVariantNumeric:'tabular-nums' }} />
              ) : (
                <span style={{ minWidth:32, textAlign:'center', font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', fontVariantNumeric:'tabular-nums' }}>{item.quantite}</span>
              )}
              <motion.button type="button" whileTap={{ scale:0.86 }} onClick={() => updateCartItemQuantity(item.productId, item.quantite+1)} aria-label={`Un ${item.nom} de plus`}
                style={{ width:'var(--caisse-cible-tactile)', height:'var(--caisse-cible-tactile)', borderRadius:'50%', border:'none', background:'var(--caisse-vert)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <Plus size={ICONE} strokeWidth={2.5} />
              </motion.button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)', font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)', fontVariantNumeric:'tabular-nums' }}>
              {/* L'UNITÉ, SUR LA LIGNE DE PANIER (lot A — VOIX-01).
                  Elle n'existait, sur téléphone, que dans la barre flottante
                  « Encaisser » — qui vient de disparaître avec la feuille. Sans
                  elle, le panier dit « 3 » : trois quoi ? Trois tas, trois
                  kilos, trois pièces ? C'est la même information que
                  l'étiquette du produit (500 F / tas) et que le reçu ; elle
                  doit se lire au même endroit que la quantité qu'on modifie.
                  Vide quand l'unité n'apprend rien (« unité »). */}
              {uniteSeule(item.quantite, item.unite) && (
                <span style={{ fontWeight:600, color:'var(--encre)' }}>{uniteSeule(item.quantite, item.unite)}</span>
              )}
              <span>·</span>
              {estNegoce ? (
                /* Prix CONVENU pour cette vente — modifiable (négoce). */
                <input key={`p-${item.productId}-${item.prix}`} defaultValue={item.prix}
                  inputMode="numeric" aria-label={`Prix unitaire convenu pour ${item.nom}`}
                  onBlur={e => {
                    const v = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
                    if (v > 0 && v !== item.prix) {
                      updateCartItemPrice(item.productId, v);
                      dire(`${item.nom} : ${v.toLocaleString('fr-FR')} francs l'unité`);
                    } else { e.target.value = String(item.prix); }
                  }}
                  style={{ width:72, minHeight:'var(--caisse-cible-tactile)', border:'1.5px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-2)', padding:'0 var(--caisse-esp-1)', font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', textAlign:'right', background:'var(--caisse-ivoire)', fontVariantNumeric:'tabular-nums' }} />
              ) : (
                <span>{item.prix.toLocaleString('fr-FR')}</span>
              )}
              <span>F</span>
            </div>
            <motion.button type="button" whileTap={{ scale:0.9 }} onClick={() => removeFromCart(item.productId)} aria-label={`Enlever ${item.nom}`}
              style={{ marginLeft:'auto', width:'var(--caisse-cible-tactile)', height:'var(--caisse-cible-tactile)', background:'none', border:'none', borderRadius:'var(--caisse-rayon-2)', color:'var(--caisse-gris-texte)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
              <Trash2 size={ICONE} />
            </motion.button>
          </div>
        </div>
      ))}
    </>
  );

  // Total + moyen de paiement + encaissement — même remarque : une seule
  // version de cette logique, affichée soit dans le sheet mobile, soit dans
  // le panneau permanent grand écran (mockup validé : « Payer en espèces »
  // comme CTA principal unique).
  const renderCartFooter = () => (
    <>
      {/* Le total s'ENTEND d'un toucher (tout montant affiché doit
          pouvoir être entendu — docs/INCLUSION.md §2.2). */}
      {/* LA BARRE TOTAL de la maquette : fond succès, « Total » en titre de
          section, le montant en grand titre — c'est LE chiffre de l'écran,
          celui qu'elle regarde avant de dire le prix à la cliente. */}
      <button type="button" onClick={() => dire(`Total : ${total.toLocaleString('fr-FR')} francs`)}
        aria-label={`Total ${total.toLocaleString('fr-FR')} francs — touche pour entendre`}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--caisse-esp-2)', marginBottom:'var(--caisse-esp-4)', background:'var(--caisse-succes)', border:'none', borderRadius:'var(--caisse-rayon-3)', padding:'var(--caisse-esp-3) var(--caisse-esp-4)', minHeight:'var(--caisse-cible-tactile)', cursor:'pointer', fontFamily:'inherit' }}>
        <span style={{ font:'var(--caisse-font-h2)', color:'var(--encre)' }}>Total</span>
        <span style={{ font:'var(--caisse-font-h1)', color:'var(--caisse-vert-fonce)', fontVariantNumeric:'tabular-nums' }}>{total.toLocaleString('fr-FR')} F</span>
      </button>

      <h2 style={{ font:'var(--caisse-font-h2)', color:'var(--encre)', margin:'0 0 var(--caisse-esp-2)' }}>Paiement</h2>

      {/* Moyen de paiement — espèces / mobile money (déclaré) / crédit.
          En pilote il n'y a qu'un chip : il ne s'étire pas sur toute la
          largeur, et la mention « espèces uniquement » tient à côté. */}
      <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'var(--caisse-esp-2)', marginBottom:'var(--caisse-esp-3)' }}>
        <button type="button" onClick={() => setPaymentMethod('cash')}
          style={{ flex:'0 1 auto', minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            border: paymentMethod==='cash' ? '2px solid var(--caisse-vert)' : '1.5px solid var(--commerce-line)',
            background: paymentMethod==='cash' ? 'var(--caisse-succes)' : 'var(--caisse-ivoire)', color: paymentMethod==='cash' ? 'var(--caisse-vert-fonce)' : 'var(--caisse-gris-texte)' }}>
          Espèces
        </button>
        {CAISSE_MOBILE_MONEY_ACTIF && (
        <button type="button" onClick={() => setPaymentMethod('mobile_money')}
          style={{ flex:1, minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', lineHeight:1.15,
            border: paymentMethod==='mobile_money' ? '2px solid var(--caisse-vert)' : '1.5px solid var(--commerce-line)',
            background: paymentMethod==='mobile_money' ? 'var(--caisse-succes)' : 'var(--caisse-ivoire)', color: paymentMethod==='mobile_money' ? 'var(--caisse-vert-fonce)' : 'var(--caisse-gris-texte)' }}>
          Mobile money
        </button>
        )}
        {CAISSE_CREDIT_ACTIF && (
        <button type="button" onClick={() => { setPaymentMethod('credit'); setShowCredit(true); }}
          style={{ flex:1, minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            border:'1.5px solid var(--commerce-line)', background:'var(--caisse-ivoire)', color:'var(--caisse-gris-texte)' }}>
          Crédit
        </button>
        )}

        {/* Pilote ESPÈCES : crédit et/ou mobile money désactivés (voir #16). */}
        {(!CAISSE_CREDIT_ACTIF || !CAISSE_MOBILE_MONEY_ACTIF) && (
          <div style={{ font:'var(--caisse-font-legende)', color:'var(--caisse-gris-texte)' }}>
            Caisse pilote : espèces uniquement.
          </div>
        )}
      </div>

      {/* Mobile money DÉCLARÉ : choix de l'opérateur (aucune intégration) */}
      {CAISSE_MOBILE_MONEY_ACTIF && paymentMethod === 'mobile_money' && (
        <div style={{ display:'flex', gap:'var(--caisse-esp-2)', marginBottom:'var(--caisse-esp-3)', flexWrap:'wrap' }}>
          {MOBILE_OPERATORS.map(op => (
            <button type="button" key={op.id} onClick={() => setMmOperator(op.id)}
              style={{ flex:'1 0 30%', minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-2)', borderRadius:'var(--caisse-rayon-3)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                border: mmOperator===op.id ? `2px solid ${op.color}` : '1.5px solid var(--commerce-line)',
                background: mmOperator===op.id ? op.color : 'var(--caisse-ivoire)', color: mmOperator===op.id ? op.textColor : 'var(--caisse-gris-texte)' }}>
              {op.name}
            </button>
          ))}
        </div>
      )}

      {/* Espèces : montant reçu EN BILLETS (geste du marché) + monnaie
          à rendre décomposée en coupures. Le champ chiffres reste le
          filet pour celle qui préfère taper.
          ORDRE DES GESTES (lot F) : d'abord les billets qu'elle touche, puis
          la carte « Reçu | Monnaie » de la maquette qui en résulte, juste
          au-dessus du bouton qui termine — le dernier chiffre qu'elle voit
          avant de payer est la monnaie à rendre. */}
      {paymentMethod === 'cash' && (
      <div style={{ marginBottom:'var(--caisse-esp-4)' }}>
        {/* Les billets qu'elle vient de recevoir : un toucher = un billet
            ajouté (et dit à voix haute). Couleurs proches des vraies coupures. */}
        {/* alignItems:'flex-end' : les billets n'ont plus tous la même hauteur
            (les vraies coupures non plus). Alignés par le bas, ils se lisent
            comme une liasse posée sur la table, pas comme une grille bancale. */}
        <div style={{ display:'flex', gap:'var(--caisse-esp-2)', flexWrap:'wrap', alignItems:'flex-end' }}>
          {COUPURES.filter(c => c.forme === 'billet').map(c => (
            <BilletDessine key={c.valeur} coupure={c} onTouche={() => ajouterCoupure(c.valeur)} />
          ))}
        </div>
        <div style={{ display:'flex', gap:'var(--caisse-esp-2)', marginTop:'var(--caisse-esp-2)', flexWrap:'wrap', alignItems:'center' }}>
          {COUPURES.filter(c => c.forme === 'piece').map(c => (
            <PieceDessinee key={c.valeur} coupure={c} onTouche={() => ajouterCoupure(c.valeur)} />
          ))}
          <button type="button" onClick={() => setMontantRecu(String(total))}
            style={{ flex:1, minWidth:104, minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', border:'1.5px solid var(--caisse-vert)', background:'var(--caisse-succes)', color:'var(--caisse-vert-fonce)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Compte juste
          </button>
        </div>

        {/* LA RELECTURE FINANCIÈRE, ÉCRITE. Exactement la phrase que Tata
            vient de dire — la même chaîne, pas une reconstruction — là où
            l'œil est au moment d'encaisser : au-dessus du Reçu | Monnaie et
            du bouton qui termine. Quand elle finit par « Je valide ? », c'est
            la question à laquelle « oui valide » répond, et elle reste
            visible jusqu'à ce que la machine revienne au repos. « Réécouter »
            rejoue la même chaîne. */}
        {relectureAffichee && (
          <div role="status" aria-live="polite"
            style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-3)', marginTop:'var(--caisse-esp-3)', background:'var(--caisse-succes)', border:'1.5px solid var(--caisse-vert)', borderRadius:'var(--caisse-rayon-4)', padding:'var(--caisse-esp-3) var(--caisse-esp-4)', minWidth:0 }}>
            <Volume2 aria-hidden="true" size={ICONE} style={{ color:'var(--caisse-vert)', flexShrink:0 }} />
            <p style={{ flex:1, minWidth:0, margin:0, font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)' }}>{relectureAffichee}</p>
            <button type="button" onClick={() => speak(relectureAffichee)} aria-label="Réécouter la relecture"
              style={{ minWidth:'var(--caisse-cible-tactile)', minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', border:'1.5px solid var(--caisse-vert)', background:'var(--caisse-ivoire)', color:'var(--caisse-vert-fonce)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              Réécouter
            </button>
          </div>
        )}

        {/* LA CARTE PAIEMENT de la maquette : Reçu | Monnaie. Le reçu reste un
            champ (le filet pour celle qui tape), la monnaie s'entend d'un
            toucher, et se décompose en coupures concrètes dessous. */}
        <div style={{ display:'flex', alignItems:'stretch', gap:'var(--caisse-esp-3)', marginTop:'var(--caisse-esp-3)', background:'var(--caisse-ivoire)', border:'1px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-4)', padding:'var(--caisse-esp-3) var(--caisse-esp-4)', minWidth:0 }}>
          <div aria-hidden="true" style={{ alignSelf:'center', width:44, height:44, borderRadius:'50%', background:'var(--caisse-succes)', color:'var(--caisse-vert)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Banknote size={ICONE} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)' }}>Reçu :</div>
            <div style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)', minWidth:0 }}>
              {/* minWidth:0 — sans lui, un input vide garde un min-content flexbox
                  qui peut dépasser un conteneur étroit (panneau permanent 400px,
                  repéré en recette visuelle) au lieu de rétrécir avec flex:1. */}
              <input value={montantRecu} onChange={e => setMontantRecu(e.target.value.replace(/[^\d]/g,''))} inputMode="numeric" placeholder="—" aria-label="Montant reçu"
                style={{ flex:1, minWidth:0, width:'100%', minHeight:'var(--caisse-cible-tactile)', border:'none', outline:'none', textAlign:'left', font:'var(--caisse-font-h2)', fontWeight:600, color:'var(--encre)', background:'transparent', fontVariantNumeric:'tabular-nums', padding:0 }} />
              <span style={{ font:'var(--caisse-font-h2)', color:'var(--encre)' }}>F</span>
              {recu > 0 && (
                <button type="button" aria-label="Effacer le montant reçu" onClick={() => setMontantRecu('')}
                  style={{ width:'var(--caisse-cible-tactile)', height:'var(--caisse-cible-tactile)', borderRadius:'50%', border:'none', background:'transparent', color:'var(--caisse-alerte)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0, flexShrink:0 }}>
                  <X size={ICONE} />
                </button>
              )}
            </div>
          </div>
          <div aria-hidden="true" style={{ width:1, background:'var(--commerce-line)', flexShrink:0 }} />
          {recu > 0 && !insuffisant ? (
          <button type="button" onClick={() => dire(`Monnaie à rendre : ${formatF(monnaie)} francs`)}
            aria-label={`Monnaie à rendre ${formatF(monnaie)} francs — touche pour entendre`}
            style={{ flex:1, minWidth:0, background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
            <div style={{ font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)' }}>Monnaie :</div>
            <div style={{ font:'var(--caisse-font-h2)', color:'var(--caisse-vert-fonce)', fontVariantNumeric:'tabular-nums', minHeight:'var(--caisse-cible-tactile)', display:'flex', alignItems:'center' }}>{formatF(monnaie)} F</div>
            {/* La monnaie EN COUPURES concrètes : « 2000 ×1 · 500 ×1 » */}
            {monnaie > 0 && monnaieDecomposee.lignes.length > 0 && (
              <div style={{ display:'flex', gap:'var(--caisse-esp-1)', marginTop:'var(--caisse-esp-1)', flexWrap:'wrap' }}>
                {monnaieDecomposee.lignes.map(l => (
                  <span key={l.valeur} style={{ padding:'2px var(--caisse-esp-2)', borderRadius:'var(--caisse-rayon-2)', background:'var(--caisse-succes)', color:'var(--caisse-vert-fonce)', font:'var(--caisse-font-legende)', fontWeight:600, fontVariantNumeric:'tabular-nums' }}>
                    {formatF(l.valeur)} ×{l.nb}
                  </span>
                ))}
                {monnaieDecomposee.reste > 0 && (
                  <span style={{ padding:'2px var(--caisse-esp-2)', borderRadius:'var(--caisse-rayon-2)', background:'var(--caisse-sable)', color:'var(--caisse-gris-texte)', font:'var(--caisse-font-legende)', fontWeight:600 }}>
                    + {formatF(monnaieDecomposee.reste)} F
                  </span>
                )}
              </div>
            )}
          </button>
          ) : (
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)' }}>Monnaie :</div>
            <div style={{ font:'var(--caisse-font-h2)', color:'var(--caisse-gris-texte)', minHeight:'var(--caisse-cible-tactile)', display:'flex', alignItems:'center' }}>—</div>
          </div>
          )}
        </div>
        {insuffisant && (
          <div role="alert" style={{ marginTop:'var(--caisse-esp-2)', font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--caisse-alerte)' }}>Montant reçu insuffisant</div>
        )}
      </div>
      )}

      {(() => {
        const bloque = isProcessing
          || (paymentMethod === 'cash' && insuffisant)
          || (paymentMethod === 'mobile_money' && !mmOperator);
        // CTA unique et fort (mockup validé) : « Payer en espèces » plutôt
        // qu'un « Valider » générique — le moyen de paiement pilote est déjà
        // les espèces par défaut, ce texte le dit directement.
        const label = isProcessing ? 'Traitement...'
          : paymentMethod === 'mobile_money'
            ? (mmOperator ? `Valider — payé par ${getMobileOperator(mmOperator).name}` : 'Choisis l\'opérateur')
            : (monnaie > 0 ? `Payer en espèces · rendre ${monnaie.toLocaleString('fr-FR')} F` : 'Payer en espèces');
        return (
          <motion.button whileTap={{ scale: bloque ? 1 : 0.97 }} onClick={handlePay} disabled={bloque}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'var(--caisse-esp-2)', border:'none', borderRadius:'var(--caisse-rayon-4)', padding:'var(--caisse-esp-4) var(--caisse-esp-3)', minHeight:56, font:'var(--caisse-font-bouton)', color:'white', cursor: bloque ? 'not-allowed':'pointer', textWrap:'balance', background: bloque ? 'var(--caisse-gris-texte)' : 'var(--caisse-vert)' }}>
            <Banknote size={ICONE} aria-hidden="true" style={{ flexShrink:0 }} />
            {label}
          </motion.button>
        );
      })()}

      {/* La signature de la maquette, en légende : la seule ligne de cet
          écran qui ne sert pas à vendre — elle dit pour qui on le fait. */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'var(--caisse-esp-1)', marginTop:'var(--caisse-esp-3)', font:'var(--caisse-font-legende)', fontStyle:'italic', color:'var(--caisse-vert)' }}>
        <Leaf size={14} aria-hidden="true" />
        <span>Des marchés plus forts, des familles plus heureuses</span>
      </div>
    </>
  );

  return (
    <SubPageLayout
      role="marchand"
      title="Caisse du jour"
      variante="caisse"
      rightContent={
        <div style={{ display:'flex', gap:'var(--caisse-esp-2)', alignItems:'center' }}>
          {/* L'EN-TÊTE DE LA MAQUETTE : la date du jour et « Bonnes ventes ! »
              sous un soleil. Le statut réseau — simple et permanent (mockup
              validé), la donnée existe déjà globalement (useApp().isOnline) —
              reste lisible sans mot : le point vert ou rouge, et « Hors-ligne »
              remplace le souhait quand il n'y a pas de réseau. */}
          <div style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-2)', minHeight:'var(--caisse-cible-tactile)' }} aria-label={isOnline ? 'En ligne' : 'Hors-ligne'}>
            <div style={{ textAlign:'left' }}>
              <div style={{ font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', whiteSpace:'nowrap' }}>{(d => d.charAt(0).toUpperCase() + d.slice(1))(new Date().toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }))}</div>
              <div style={{ font:'var(--caisse-font-legende)', color: isOnline ? 'var(--caisse-gris-texte)' : 'var(--caisse-alerte)', display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)', whiteSpace:'nowrap' }}>
                <span aria-hidden="true" style={{ width:8, height:8, borderRadius:'50%', background: isOnline ? 'var(--caisse-vert)' : 'var(--caisse-alerte)', flexShrink:0 }} />
                {isOnline ? 'Bonnes ventes !' : 'Hors-ligne'}
              </div>
            </div>
          </div>
          {CAISSE_CREDIT_ACTIF && (
          <motion.button whileTap={{ scale: nbItems > 0 ? 0.95 : 1 }}
            onClick={() => {
              // On n'ouvre le crédit QUE si le panier n'est pas vide (B4).
              if (nbItems === 0) { dire('Ajoute d\'abord des produits au panier.'); return; }
              setPaymentMethod('credit'); setShowCredit(true);
            }}
            style={{ minHeight:'var(--caisse-cible-tactile)', borderRadius:'var(--caisse-rayon-3)', background:'var(--caisse-ivoire)', border:'1px solid var(--commerce-line)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 var(--caisse-esp-3)', gap:'var(--caisse-esp-1)', cursor: nbItems > 0 ? 'pointer' : 'not-allowed', opacity: nbItems > 0 ? 1 : 0.5 }}>
            <FileText size={ICONE} color="var(--caisse-vert)" />
            <span style={{ font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)' }}>À crédit</span>
          </motion.button>
          )}
          {/* PLUS DE BOUTON « PANIER » ICI (lot A — VOIX-01).
              Il ouvrait une feuille coulissante : le panier et TOUT
              l'encaissement vivaient derrière un bouton que la marchande
              devait savoir chercher. Le panier est maintenant sur la surface,
              sous les produits, aux deux tailles d'écran. Un bouton qui
              n'ouvre plus rien n'a pas à rester. */}
        </div>
      }
    >

      {/* CONTENU — UNE SEULE SURFACE (lot A — VOIX-01).
          Grand écran : grille produits + panier permanent à DROITE.
          Téléphone portrait : grille produits (repliée en aperçu) + panier et
          encaissement SOUS la grille, sur la même page. Dans les deux cas,
          produits, panier, total et « Payer en espèces » vivent sur la même
          route : plus aucune feuille à ouvrir, plus aucun écran à changer. */}
      <div className="lg:flex lg:items-start lg:gap-4">
      <div className="lg:flex-1 lg:min-w-0" style={{ flex:1, overflowY:'auto', padding:'14px 0 0' }}>
        <SyncEchecsBanner />

        {/* LE MICRO — présent AUX TROIS MOMENTS de la vente (lot B).
            Il est rendu ici sans aucune condition : ni sur l'état du panier,
            ni sur celui de l'encaissement. C'est la règle de VOIX-01 rendue
            vérifiable — il n'existe aucun état de la vente où la marchande
            regarde cet écran sans voir le micro. Le moteur vocal est monté
            DANS ce composant : le bouton ne peut pas exister sans lui, ce qui
            interdit le retour du micro décoratif de 2026.
            `onIntentionEncaissement` (lot C) : le micro RECONNAÎT « encaisse »
            et « oui valide », c'est cette page qui décide — elle seule tient
            le compte et la primitive de paiement. */}
        <MicroVenteCaisse produitPreselectionne={produitPreselectionne} onIntentionEncaissement={onIntentionEncaissement} />
        {/* UNE ÉTIQUETTE, PAS UNE BOÎTE — le défaut relevé par Patrick le 18/09.
            Il a tapé « banane » et rien n'est arrivé dans le champ : l'écran a
            continué d'afficher l'oignon. La cause n'était pas le filtre, elle
            était ici. Le champ était une <div> : seul le rectangle EXACT de
            l'<input> prenait le focus. La loupe, les 14 px de marge, la bordure
            — tout cela avait l'air d'une barre de recherche et ne répondait
            pas. Une marchande qui vise la loupe tape dans le vide, et ne trouve
            donc AUCUN produit : elle ne peut pas vendre ce qu'elle ne trouve
            pas.
            Une <label> qui ENTOURE l'input donne le focus depuis n'importe
            lequel de ses points. C'est du HTML d'origine, pas un gestionnaire
            de clic à maintenir.
            La hauteur passe à 44 px (13 px de marge haute et basse) : c'est la
            même règle de cible tactile que pour les billets — un doigt, pas un
            curseur. */}
        {/* ── PRODUITS (lot F) — l'en-tête de section de la maquette :
            « Produits » à gauche, « Voir plus › » à droite.
            « Voir plus » DÉPLIE la grille SUR PLACE, il ne change pas d'écran
            (lot A). Sur téléphone la grille n'affiche que les premières
            vignettes : sans ce repli, le panier qui la suit serait à plusieurs
            écrans de défilement et la surface unique ne serait qu'un mot.
            Au-dessus de 1024 px le panier est à CÔTÉ, pas dessous : la grille y
            reste entière et ce bouton n'existe pas (cf. .pos-grille-apercu
            dans styles/commerce.css). */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--caisse-esp-2)', marginBottom:'var(--caisse-esp-2)' }}>
          <h2 style={{ font:'var(--caisse-font-h2)', color:'var(--encre)', margin:0 }}>Produits</h2>
          {filtered.length > 4 && (
            <div className="lg:hidden">
              <button type="button" onClick={() => setVoirPlusProduits(v => !v)} aria-expanded={voirPlusProduits}
                style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)', minHeight:'var(--caisse-cible-tactile)', padding:'0 var(--caisse-esp-2) 0 var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', border:'1px solid var(--commerce-line)', background:'var(--caisse-ivoire)', color:'var(--encre)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {voirPlusProduits ? 'Voir moins' : 'Voir plus'}
                <ChevronRight size={ICONE} aria-hidden="true" style={{ transform: voirPlusProduits ? 'rotate(90deg)' : 'none' }} />
              </button>
            </div>
          )}
        </div>

        {/* Le filtre et « Autre article », sur une seule rangée sous l'en-tête :
            deux outils, pas deux sections — la maquette n'en montre aucun, ils
            restent pour celle qui a trente produits ou vend un article qui
            n'est pas listé. */}
        <div style={{ display:'flex', gap:'var(--caisse-esp-2)', marginBottom:'var(--caisse-esp-2)' }}>
        {/* UNE ÉTIQUETTE, PAS UNE BOÎTE — le défaut relevé par Patrick le 18/09.
            Il a tapé « banane » et rien n'est arrivé dans le champ : l'écran a
            continué d'afficher l'oignon. La cause n'était pas le filtre, elle
            était ici. Le champ était une <div> : seul le rectangle EXACT de
            l'<input> prenait le focus. La loupe, les 14 px de marge, la bordure
            — tout cela avait l'air d'une barre de recherche et ne répondait
            pas. Une marchande qui vise la loupe tape dans le vide, et ne trouve
            donc AUCUN produit : elle ne peut pas vendre ce qu'elle ne trouve
            pas.
            Une <label> qui ENTOURE l'input donne le focus depuis n'importe
            lequel de ses points. C'est du HTML d'origine, pas un gestionnaire
            de clic à maintenir.
            La hauteur passe à 44 px (13 px de marge haute et basse) : c'est la
            même règle de cible tactile que pour les billets — un doigt, pas un
            curseur. */}
        <label style={{ flex:1, minWidth:0, background:'var(--caisse-ivoire)', border:'1px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-3)', padding:'13px 14px', display:'flex', alignItems:'center', gap:'var(--caisse-esp-2)', cursor:'text' }}>
          {/* PAS DE MICROPHONE ICI, ET C'EST VOLONTAIRE.
              Il y en avait un, purement décoratif, à côté du mot « Dites ».
              L'intention était d'éviter un bouton d'apparence cliquable ; le
              résultat était pire. Pour une marchande qui ne lit pas, un micro
              EST une invitation à parler : elle parlait, et rien n'arrivait.
              Deux microphones cohabitaient sur cet écran — celui-ci, inerte,
              et le vrai, le bouton vert de Tata. Rien ne les distinguait pour
              qui ne lit pas.
              Ce champ est un FILTRE qu'on tape. Il le dit maintenant. Le seul
              microphone de l'écran est celui qui marche. */}
          <span aria-hidden="true" style={{ display:'flex', alignItems:'center', flexShrink:0, color:'var(--caisse-gris-texte)' }}>
            <Search size={18} />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un produit…"
            style={{ flex:1, border:'none', outline:'none', background:'transparent', font:'var(--caisse-font-texte)', lineHeight:'18px', color:'var(--encre)', fontFamily:'inherit', minWidth:0 }} />
          {search && <motion.button type="button" aria-label="Effacer la recherche" whileTap={{ scale:0.9 }} onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0, color:'var(--caisse-gris-texte)', display:'flex' }}>
            <X size={ICONE} />
          </motion.button>}
        </label>

        {/* AUTRE ARTICLE — vendre un montant libre, sans produit listé (Phase 3) */}
        <motion.button type="button" whileTap={{ scale:0.98 }} onClick={() => setShowLibre(true)}
          style={{ minHeight:'var(--caisse-cible-tactile)', padding:'0 var(--caisse-esp-3) 0 var(--caisse-esp-2)', borderRadius:'var(--caisse-rayon-3)', border:'1.5px dashed var(--caisse-vert)', background:'var(--caisse-ivoire)', color:'var(--caisse-vert)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'var(--caisse-esp-1)', whiteSpace:'nowrap', fontFamily:'inherit', flexShrink:0 }}>
          <Plus size={ICONE} aria-hidden="true" /> Autre article
        </motion.button>
        </div>

        {/* LA GRILLE — les cartes ivoire de la maquette : photo, nom,
            « 500 F / tas ». La CARTE ENTIÈRE est le bouton qui ajoute au
            panier (`ajouterAuPanier`, qui le DIT) : plus de « + Ajouter » à
            viser sous la photo. Quand le produit est au panier, la carte se
            borde de vert et porte « ×3 » ; les gestes − / + vivent sur la
            ligne du panier, juste dessous, comme la maquette les dessine.
            « VENTE RAPIDE », fondue ici (lot F) : les deux produits les plus
            vendus (`topProducts`, calculé sur ses ventes réelles) portent un
            éclair au lieu d'une section à part qui les affichait deux fois. */}
        <div style={{ marginBottom:'var(--caisse-esp-5)' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'var(--caisse-esp-7) 0', color:'var(--caisse-gris-texte)', font:'var(--caisse-font-texte)' }}>
              <Package size={48} style={{ margin:'0 auto var(--caisse-esp-3)', opacity:0.4 }} />
              <p style={{ marginBottom:'var(--caisse-esp-4)' }}>Aucun produit</p>
              <motion.button type="button" whileTap={{ scale:0.97 }} onClick={() => setShowLibre(true)}
                style={{ minHeight:'var(--caisse-cible-tactile)', padding:'var(--caisse-esp-3) var(--caisse-esp-5)', borderRadius:'var(--caisse-rayon-4)', border:'none', background:'var(--caisse-vert)', color:'white', font:'var(--caisse-font-bouton)', cursor:'pointer', fontFamily:'inherit' }}>
                + Autre article
              </motion.button>
            </div>
          ) : (
            <div className={voirPlusProduits ? 'pos-grille' : 'pos-grille pos-grille-apercu'}>
              {filtered.map((p, i) => {
                const inCart = cart.find(c => c.productId === p.id);
                const enPromo = promoActive(p as any);
                const rapide = topProducts.some(t => t.id === p.id);
                return (
                  <motion.button key={p.id} type="button" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.04 }} whileTap={{ scale:0.96 }}
                    onClick={() => ajouterAuPanier(p)} aria-label={`Ajouter ${p.nom} au panier`}
                    style={{ background:'var(--caisse-ivoire)', border: inCart ? '2px solid var(--caisse-vert)' : '1px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-3)', overflow:'hidden', padding:0, cursor:'pointer', fontFamily:'inherit', textAlign:'center', display:'flex', flexDirection:'column', minWidth:0 }}>
                    <div style={{ position:'relative', width:'100%', aspectRatio:'1 / 1', background:'var(--caisse-sable)' }}>
                      <ImageWithFallback src={p.image || undefined} fallbackSrc={getImageByNom(p.nom)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      <StockBadge stock={p.stock || 0} />
                      {enPromo && (
                        <div style={{ position:'absolute', top:'var(--caisse-esp-1)', right:'var(--caisse-esp-1)', background:'var(--caisse-alerte)', borderRadius:'var(--caisse-rayon-2)', padding:'2px 6px', font:'var(--caisse-font-legende)', fontWeight:600, color:'white' }}>
                          -{remisePct(p as any)}%
                        </div>
                      )}
                      {rapide && !inCart && (
                        <div title="Vente rapide : parmi tes produits les plus vendus" style={{ position:'absolute', bottom:'var(--caisse-esp-1)', right:'var(--caisse-esp-1)', width:24, height:24, borderRadius:'50%', background:'var(--caisse-vert-fonce)', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Zap size={14} aria-hidden="true" />
                        </div>
                      )}
                      {inCart && (
                        <div style={{ position:'absolute', bottom:'var(--caisse-esp-1)', right:'var(--caisse-esp-1)', background:'var(--caisse-vert)', borderRadius:'var(--caisse-rayon-2)', padding:'2px 6px', font:'var(--caisse-font-legende)', fontWeight:600, color:'white', fontVariantNumeric:'tabular-nums' }}>
                          ×{inCart.quantite}
                        </div>
                      )}
                    </div>
                    <div style={{ padding:'var(--caisse-esp-2) var(--caisse-esp-1)', width:'100%', boxSizing:'border-box' }}>
                      <div style={{ font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--encre)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nom}</div>
                      {enPromo ? (
                        <div style={{ marginTop:'var(--caisse-esp-1)', display:'flex', flexWrap:'wrap', columnGap:'var(--caisse-esp-1)', alignItems:'baseline', justifyContent:'center', font:'var(--caisse-font-texte)', fontWeight:600, color:'var(--caisse-alerte)', fontVariantNumeric:'tabular-nums' }}>
                          <span>{prixEffectif(p as any).toLocaleString('fr-FR')} F</span>
                          <span style={{ fontWeight:400, fontSize:14, color:'var(--caisse-gris-texte)' }}>/ {p.unite}</span>
                          <span style={{ fontWeight:400, fontSize:12, color:'var(--caisse-gris-texte)', textDecoration:'line-through' }}>{(p.prix||0).toLocaleString('fr-FR')}</span>
                        </div>
                      ) : (
                        <Prix prix={p.prix||0} unite={p.unite} />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PANIER + ENCAISSEMENT SUR LA MÊME SURFACE (lot A — VOIX-01) ──
            Ce bloc n'existait qu'en `lg:` (le panneau de droite) ; sur
            téléphone — le support du pilote — le panier et TOUT
            l'encaissement étaient dans une feuille coulissante. Une marchande
            qui ne lit pas devait donc deviner qu'un bouton cachait l'argent.
            Ici, rien ne cache rien : les lignes, le total, le montant reçu,
            la monnaie et « Payer en espèces » sont sur la page, sous les
            produits, et se rejoignent en faisant défiler — jamais en ouvrant.
            Même `renderCartLines()` / `renderCartFooter()` que le panneau de
            droite : une seule logique, deux dispositions. */}
        <section className="lg:hidden" style={{ marginBottom:'var(--caisse-esp-5)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--caisse-esp-2)', marginBottom:'var(--caisse-esp-2)' }}>
            <h2 style={{ font:'var(--caisse-font-h2)', color:'var(--encre)', margin:0 }}>
              Panier actuel{nbItems > 0 && <span style={{ font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)' }}> ({nbItems})</span>}
            </h2>
            {nbItems > 0 && (
              <button type="button" onClick={clearCart}
                style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)', minHeight:'var(--caisse-cible-tactile)', padding:'0 var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', border:'none', background:'var(--caisse-sable)', color:'var(--encre)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                <Trash2 size={ICONE} aria-hidden="true" color="var(--caisse-gris-texte)" />
                Vider le panier
              </button>
            )}
          </div>
          {nbItems === 0 ? (
            <div style={{ background:'var(--caisse-ivoire)', border:'1.5px dashed var(--commerce-line)', borderRadius:'var(--caisse-rayon-4)', textAlign:'center', padding:'var(--caisse-esp-5) var(--caisse-esp-4)', color:'var(--caisse-gris-texte)', font:'var(--caisse-font-texte)' }}>
              Touche un produit pour l'ajouter au panier.
            </div>
          ) : (
            <>
              <div style={{ background:'var(--caisse-ivoire)', border:'1px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-4)', padding:'0 var(--caisse-esp-4)', marginBottom:'var(--caisse-esp-3)' }}>
                {renderCartLines()}
              </div>
              <div>
                {renderCartFooter()}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Panier permanent — grand écran uniquement (mockup validé). Même
          logique/JSX que le panneau coulissant mobile, via renderCartLines()/
          renderCartFooter() : rien de dupliqué, juste affiché autrement. */}
      <aside className="hidden lg:flex lg:flex-col" style={{ width:400, flexShrink:0, position:'sticky', top:100, maxHeight:'calc(100vh - 120px)', background:'var(--caisse-ivoire)', border:'1px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-4)', marginTop:'var(--caisse-esp-4)', overflowY:'auto' }}>
        <div style={{ padding:'var(--caisse-esp-4) var(--caisse-esp-4) var(--caisse-esp-2)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--caisse-esp-2)', flexShrink:0 }}>
          <h2 style={{ font:'var(--caisse-font-h2)', color:'var(--encre)', margin:0 }}>
            Panier actuel {nbItems > 0 && <span style={{ font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)' }}>({nbItems})</span>}
          </h2>
          {nbItems > 0 && (
            <button type="button" onClick={clearCart} style={{ display:'flex', alignItems:'center', gap:'var(--caisse-esp-1)', minHeight:'var(--caisse-cible-tactile)', padding:'0 var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', border:'none', background:'var(--caisse-sable)', color:'var(--encre)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              <Trash2 size={ICONE} aria-hidden="true" color="var(--caisse-gris-texte)" />
              Vider
            </button>
          )}
        </div>
        {nbItems === 0 ? (
          <div style={{ textAlign:'center', padding:'var(--caisse-esp-7) var(--caisse-esp-4)', color:'var(--caisse-gris-texte)', font:'var(--caisse-font-texte)' }}>
            Touche un produit pour l'ajouter au panier.
          </div>
        ) : (
          <>
            {/* Le panneau défile EN ENTIER (overflowY sur l'aside) : avec les
                billets, le pied est plus haut qu'un écran de portable, et un
                bloc de lignes en flex:1 était écrasé à zéro — panier invisible. */}
            <div style={{ flexShrink:0, padding:'0 var(--caisse-esp-4)' }}>
              {renderCartLines()}
            </div>
            <div style={{ padding:'var(--caisse-esp-4)', flexShrink:0 }}>
              {renderCartFooter()}
            </div>
          </>
        )}
      </aside>
      </div>

      {/* PLUS DE FEUILLE « PANIER » (lot A — VOIX-01).
          Elle portait, sur téléphone, le panier ET tout l'encaissement :
          total, montant reçu, coupures, monnaie, « Payer en espèces ». Tout
          cela est maintenant SUR la page (voir la section <section
          className="lg:hidden"> plus haut). Une feuille en position fixe
          avait de surcroît un défaut mesuré en recette : quand son pied
          s'allongeait, le bouton qui TERMINE la vente sortait de l'écran et
          rien ne défilait. Sur la page, ce problème n'existe pas. */}

      {/* Crédit désactivé en pilote espèces : le modal n'est jamais monté (les
          boutons déclencheurs sont masqués ; ce garde interdit tout accès résiduel). */}
      {CAISSE_CREDIT_ACTIF && (
      <CreditModal
        isOpen={showCredit}
        onClose={() => { setShowCredit(false); setPaymentMethod('cash'); }}
        cart={cart.map(i => ({ nom: i.nom, quantite: i.quantite, prix: i.prix }))}
        total={total}
        onSuccess={handleCreditSuccess}
      />
      )}

      {/* Feuille « Autre article » — montant libre (Phase 3, lot 1) */}
      <AnimatePresence>
        {showLibre && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={fermerAutreArticle}
            style={{ position:'fixed', inset:0, zIndex:110, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
            role="dialog" aria-modal="true" aria-label="Autre article"
          >
            <motion.div
              initial={{ y:40 }} animate={{ y:0 }} exit={{ y:40 }}
              onClick={e => e.stopPropagation()}
              style={{ width:'100%', maxWidth:480, background:'var(--caisse-ivoire)', borderTopLeftRadius:'var(--caisse-rayon-5)', borderTopRightRadius:'var(--caisse-rayon-5)', padding:'var(--caisse-esp-5) var(--caisse-esp-4) calc(var(--caisse-esp-5) + env(safe-area-inset-bottom))' }}
            >
              <div style={{ font:'var(--caisse-font-h2)', color:'var(--encre)', marginBottom:'var(--caisse-esp-4)' }}>Autre article</div>

              {/* ── 1. Chercher dans le catalogue maître (Odoo) ────────────
                  La recherche est LOCALE (voir useCatalogueMaitre) : elle
                  fonctionne hors ligne et ne déclenche pas un appel réseau à
                  chaque lettre tapée. */}
              {!refChoisie && (
                <>
                  <label style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)' }}>Chercher un produit</label>
                  <input
                    value={refRecherche}
                    onChange={e => setRefRecherche(e.target.value)}
                    placeholder="ex. tomate, igname…"
                    style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', marginTop:6, marginBottom:8, fontSize:15, color:'var(--encre)', outline:'none', fontFamily:'inherit' }}
                  />
                  {refRecherche.trim().length > 0 && (() => {
                    const trouves = catalogueMaitre.rechercher(refRecherche);
                    if (trouves.length === 0) {
                      return (
                        <div style={{ fontSize:13, color:'var(--encre-3)', marginBottom:12, lineHeight:1.5 }}>
                          Rien trouvé sous ce nom. Tu peux quand même vendre un montant libre ci-dessous.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12, maxHeight:210, overflowY:'auto' }}>
                        {trouves.map(r => {
                          const deja = catalogueMaitre.estAdoptee(r.default_code);
                          return (
                            <button
                              type="button" key={r.default_code}
                              onClick={() => { if (!deja) choisirReference(r); }}
                              disabled={deja}
                              style={{ textAlign:'left', border:'1px solid var(--commerce-line)', borderRadius:'var(--caisse-rayon-3)', padding:'var(--caisse-esp-3)', minHeight:'var(--caisse-cible-tactile)', background: deja ? 'var(--caisse-sable)' : 'white', cursor: deja ? 'default' : 'pointer', fontFamily:'inherit', opacity: deja ? 0.7 : 1 }}
                            >
                              <div style={{ fontSize:15, fontWeight:700, color:'var(--encre)' }}>{r.nom}</div>
                              <div style={{ fontSize:11, color:'var(--encre-3)', marginTop:2 }}>
                                {deja ? 'Déjà dans ta caisse' : (r.categorie || 'Catalogue JULABA')}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {catalogueMaitre.source === 'cache' && (
                    // On le DIT plutôt que de laisser croire que la liste est
                    // à jour : elle est utilisable, simplement pas fraîche.
                    <div style={{ fontSize:11, color:'var(--encre-3)', marginBottom:10 }}>
                      Liste enregistrée sur ce téléphone (pas de réseau).
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:10, margin:'4px 0 14px' }}>
                    <div style={{ flex:1, height:1, background:'var(--trait)' }} />
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--encre-3)' }}>OU MONTANT LIBRE</span>
                    <div style={{ flex:1, height:1, background:'var(--trait)' }} />
                  </div>
                </>
              )}

              {/* ── 2. Référence choisie : elle pose SON prix ─────────────── */}
              {refChoisie && (
                <div style={{ border:'1.5px solid var(--caisse-vert)', borderRadius:'var(--caisse-rayon-3)', padding:'var(--caisse-esp-3)', marginBottom:'var(--caisse-esp-4)', background:'var(--caisse-succes)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:'var(--encre)' }}>{refChoisie.nom}</div>
                      <div style={{ fontSize:11, color:'var(--encre-3)', marginTop:2 }}>{refChoisie.categorie || 'Catalogue JULABA'}</div>
                    </div>
                    <button type="button" onClick={() => { setRefChoisie(null); setLibreDesc(''); setAdoptionMessage(null); }}
                      style={{ background:'none', border:'none', color:'var(--caisse-vert)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:'var(--caisse-esp-2)', minHeight:'var(--caisse-cible-tactile)' }}>
                      Changer
                    </button>
                  </div>
                </div>
              )}

              <label style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)' }}>
                {refChoisie ? 'Ton prix de vente' : 'Montant'}
              </label>
              <div style={{ display:'flex', alignItems:'center', gap:8, border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', marginTop:6, marginBottom:14 }}>
                <input
                  value={libreMontant}
                  onChange={e => setLibreMontant(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric" autoFocus placeholder="0"
                  style={{ flex:1, border:'none', outline:'none', fontSize:26, fontWeight:800, color:'var(--encre)', background:'transparent', fontVariantNumeric:'tabular-nums' }}
                />
                <span style={{ fontSize:16, fontWeight:700, color:'var(--encre-3)' }}>F</span>
              </div>

              {/* Unité LOCALE : c'est elle qui sait si elle vend au tas ou au kilo. */}
              {refChoisie && (
                <>
                  <label style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)' }}>Tu vends par…</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6, marginBottom:14 }}>
                    {['unité', 'tas', 'kg', 'sac', 'bassine', 'régime'].map(u => (
                      <button type="button" key={u} onClick={() => setRefUnite(u)}
                        style={{ border:`1.5px solid ${refUnite === u ? 'var(--caisse-vert)' : 'var(--commerce-line)'}`, background: refUnite === u ? 'var(--caisse-succes)' : 'white', color: refUnite === u ? 'var(--caisse-vert-fonce)' : 'var(--caisse-gris-texte)', borderRadius:'var(--caisse-rayon-3)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', minHeight:'var(--caisse-cible-tactile)', minWidth:'var(--caisse-cible-tactile)', font:'var(--caisse-font-texte)', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        {u}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!refChoisie && (
                <>
                  <label style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)' }}>Quoi ? (facultatif)</label>
                  <input
                    value={libreDesc}
                    onChange={e => setLibreDesc(e.target.value)}
                    placeholder="ex. bananes"
                    style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', marginTop:6, marginBottom:12, fontSize:15, color:'var(--encre)', outline:'none', fontFamily:'inherit' }}
                  />
                  {/* L'UNITÉ SE CHOISIT, ELLE N'EST PLUS INVENTÉE (lot E) : les
                      six unités du dépôt, cibles de 44 px, et l'unité choisie se
                      dit (« au tas », « au kilo ») — la voix fait partie du
                      parcours, pas de l'écran. */}
                  <div style={{ marginBottom:18 }}>
                    <ChoixUnite valeur={libreUnite} onChoisir={setLibreUnite} dire={dire} />
                  </div>
                </>
              )}

              {adoptionMessage && (
                <div role="alert" style={{ background:'white', border:'1.5px solid var(--caisse-alerte)', borderRadius:'var(--caisse-rayon-3)', padding:'var(--caisse-esp-2) var(--caisse-esp-3)', marginBottom:'var(--caisse-esp-3)', font:'var(--caisse-font-texte)', color:'var(--caisse-alerte)' }}>
                  {adoptionMessage}
                </div>
              )}

              <button
                type="button"
                onClick={refChoisie ? adopterReference : ajouterMontantLibre}
                disabled={!libreMontant || Number(libreMontant) <= 0 || adoptionEnCours}
                style={{ width:'100%', padding:'var(--caisse-esp-4)', minHeight:56, borderRadius:'var(--caisse-rayon-4)', border:'none', color:'white', font:'var(--caisse-font-bouton)', cursor:'pointer', fontFamily:'inherit', background: (!libreMontant || Number(libreMontant) <= 0 || adoptionEnCours) ? 'var(--caisse-gris-texte)' : 'var(--caisse-vert)' }}
              >
                {adoptionEnCours ? 'Ajout…' : refChoisie ? 'Ajouter à mon catalogue' : 'Ajouter'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Écran « Vente réussie » (Phase 3, lot 4) */}
      <AnimatePresence>
        {showSuccess && lastSale && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:120, background:'var(--caisse-sable)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'var(--caisse-esp-5)', textAlign:'center' }}>
            <div style={{ width:88, height:88, borderRadius:'50%', background:'var(--caisse-succes)', display:'grid', placeItems:'center', marginBottom:'var(--caisse-esp-4)' }}>
              <Check size={48} color="var(--caisse-vert)" />
            </div>
            <div style={{ font:'var(--caisse-font-h2)', color:'var(--caisse-vert)', marginBottom:'var(--caisse-esp-2)' }}>Vente réussie</div>
            <div style={{ font:'var(--caisse-font-h1)', fontSize:36, color:'var(--encre)', fontVariantNumeric:'tabular-nums' }}>{lastSale.montant.toLocaleString('fr-FR')} F</div>
            <div style={{ font:'var(--caisse-font-texte)', color:'var(--caisse-gris-texte)', marginTop:'var(--caisse-esp-2)' }}>
              {lastSale.moyen}{lastSale.monnaie > 0 ? ` · rendu ${lastSale.monnaie.toLocaleString('fr-FR')} F` : ''}
            </div>
            <div style={{ width:'100%', maxWidth:360, marginTop:'var(--caisse-esp-6)', display:'flex', flexDirection:'column', gap:'var(--caisse-esp-3)' }}>
              <button type="button"
                onClick={() => { void partagerRecu({ montant: lastSale.montant, produits: lastSale.produits, mode_paiement: lastSale.moyen, created_at: new Date().toISOString() } as any, marchandNom); }}
                style={{ width:'100%', padding:'var(--caisse-esp-4)', minHeight:56, borderRadius:'var(--caisse-rayon-4)', border:'1.5px solid var(--caisse-vert)', background:'var(--caisse-ivoire)', color:'var(--caisse-vert-fonce)', font:'var(--caisse-font-bouton)', cursor:'pointer', fontFamily:'inherit' }}>
                Envoyer le reçu (WhatsApp)
              </button>
              <button type="button"
                onClick={() => { setShowSuccess(false); setLastSale(null); }}
                style={{ width:'100%', padding:'var(--caisse-esp-4)', minHeight:56, borderRadius:'var(--caisse-rayon-4)', border:'none', background:'var(--caisse-vert)', color:'white', font:'var(--caisse-font-bouton)', cursor:'pointer', fontFamily:'inherit' }}>
                Nouvelle vente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}

/**
 * LA CAISSE MONTE LES PROVIDERS DU MOTEUR VOCAL (lot B).
 *
 * `useVoiceCore` lit `useObjectif()` et `useRaccourcis()`. Sans ces deux
 * providers, ils ne LÈVENT PAS d'erreur : ils retombent sur des valeurs
 * nulles. On obtiendrait donc un micro qui a l'air de marcher — exactement le
 * défaut que VOIX-01 décrit. Ils sont montés ici, au plus près du seul écran
 * qui en a besoin, comme le faisaient l'accueil et Mon stock avant que la
 * vente ne converge sur la caisse.
 */
export function POSCaisse() {
  const { getTodayStats } = useApp();
  const stats = getTodayStats();
  return (
    <RaccourcisProvider>
      <ObjectifProvider ventes={stats?.ventes || 0}>
        <POSCaisseInner />
      </ObjectifProvider>
    </RaccourcisProvider>
  );
}
