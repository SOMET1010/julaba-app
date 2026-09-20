import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Minus, Trash2, X, Check, ArrowLeft, Package, FileText } from 'lucide-react';
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
import { useCatalogueMaitre, ReferenceMaitre } from '../../hooks/useCatalogueMaitre';
import { RaccourcisProvider } from '../../contexts/RaccourcisContext';
import { ObjectifProvider } from '../../contexts/ObjectifContext';
import { MicroVenteCaisse, type ProduitPreselectionne } from './MicroVenteCaisse';
import { ETAT_INITIAL, empreintePanier, reduire, type EtatEncaissement, type EtatFinancier } from '../../services/machineEncaissement';
import type { IntentionEncaissement } from '../../voice-offline/grammaireEncaissement';

const P = '#AF5B23';
const BG = '#F6F0E4';

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
    addToCart(p, 1);
    dire(`${p?.nom || p?.name || 'Produit'} ajouté`);
  };

  const fermerAutreArticle = () => {
    setShowLibre(false);
    setLibreMontant(''); setLibreDesc('');
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
      nom, prix: montant, prix_achat: 0, categorie: 'Autre', stock: 0, unite: 'unite',
    };
    addToCart(produitLibre, 1);
    dire(`${nom} ajouté`);
    setLibreMontant(''); setLibreDesc(''); setShowLibre(false);
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
  const traiterIntentionEncaissement = (intention: IntentionEncaissement) => {
    const { etat, effet } = reduire(etatEncaissementRef.current, intention, etatFinancier);
    etatEncaissementRef.current = etat;
    if (effet.type === 'rien') return;
    // La réponse à une PHRASE se dit toujours — `speak`, pas `dire`. `dire`
    // tait les confirmations automatiques en mode lecture, parce que l'écran
    // les affiche déjà ; ici la relecture EST la garantie : une marchande qui
    // dit « encaisse » et n'entend rien dirait « oui valide » sans avoir
    // entendu le compte qu'elle confirme. Même règle que les réponses du
    // micro (MicroVenteCaisse parle par `speak`).
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
  // vraie. Aucune phrase n'est dite — elle manipule, elle n'écoute pas ; Tata
  // relira quand elle redemandera.
  const etatFinancierRef = useRef(etatFinancier);
  etatFinancierRef.current = etatFinancier;
  const cleEmpreinte = `${total}|${recu}|${etatFinancier.empreinte.lignes}`;
  useEffect(() => {
    etatEncaissementRef.current = reduire(etatEncaissementRef.current, 'etat_financier_change', etatFinancierRef.current).etat;
  }, [cleEmpreinte]);

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

  const Prix = ({ prix, unite }: { prix: number; unite: string }) => (
    <div style={{ margin:'3px 0' }}>
      <span style={{ fontSize:20, fontWeight:900, color:P }}>{prix.toLocaleString('fr-FR')} </span>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--encre-4)' }}>FCFA/{unite}</span>
    </div>
  );

  const StockBadge = ({ stock }: { stock: number }) => {
    const low = stock < 10;
    return (
      <div style={{ position:'absolute', bottom:8, left:8, background: low ? 'rgba(239,68,68,0.9)' : 'rgba(29,158,117,0.9)', borderRadius:8, padding:'3px 8px', fontSize:10, fontWeight:700, color:'white' }}>
        {stock} {low ? 'restants' : 'en stock'}
      </div>
    );
  };

  // Lignes du panier — factorisées pour être identiques dans le panneau
  // permanent (grand écran) et le panneau coulissant (mobile) : même logique
  // de négoce/prix/quantité, un seul endroit à faire évoluer.
  const renderCartLines = () => (
    <>
      {cart.map(item => (
        <div key={item.productId} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #f5f0eb' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--encre)' }}>{item.nom}</div>
            <div style={{ fontSize:12, color:'var(--encre-4)', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
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
                  style={{ width:72, border:'1.5px solid var(--trait)', borderRadius:8, padding:'6px 6px', fontSize:13, fontWeight:800, color:'var(--encre)', textAlign:'right', background:'#FFFCF7', fontVariantNumeric:'tabular-nums' }} />
              ) : (
                <span>{item.prix.toLocaleString('fr-FR')} FCFA</span>
              )}
              <span>{estNegoce ? 'F ×' : '×'}</span>
              {/* Quantité TAPÉE directement (indispensable en gros). */}
              <input key={`q-${item.productId}-${item.quantite}`} defaultValue={item.quantite}
                inputMode="numeric" aria-label={`Quantité de ${item.nom}`}
                onBlur={e => {
                  const v = parseInt(e.target.value.replace(/[^\d]/g, '')) || 0;
                  if (v > 0 && v !== item.quantite) {
                    updateCartItemQuantity(item.productId, v);
                    dire(`${item.nom} : ${v}`);
                  } else { e.target.value = String(item.quantite); }
                }}
                style={{ width:56, border:'1.5px solid var(--trait)', borderRadius:8, padding:'6px 6px', fontSize:13, fontWeight:800, color:'var(--encre)', textAlign:'center', background:'#FFFCF7', fontVariantNumeric:'tabular-nums' }} />
              {/* L'UNITÉ, SUR LA LIGNE DE PANIER (lot A — VOIX-01).
                  Elle n'existait, sur téléphone, que dans la barre flottante
                  « Encaisser » — qui vient de disparaître avec la feuille. Sans
                  elle, le panier dit « 3 » : trois quoi ? Trois tas, trois
                  kilos, trois pièces ? C'est la même information que
                  l'étiquette du produit (500 F / tas) et que le reçu ; elle
                  doit se lire au même endroit que la quantité qu'on modifie.
                  Vide quand l'unité n'apprend rien (« unité »). */}
              {uniteSeule(item.quantite, item.unite) && (
                <span style={{ fontWeight:700, color:'var(--encre-3)' }}>{uniteSeule(item.quantite, item.unite)}</span>
              )}
            </div>
          </div>
          <div style={{ fontSize:15, fontWeight:800, color:P }}>{(item.totalExact ?? item.prix * item.quantite).toLocaleString('fr-FR')} FCFA</div>
          <motion.button whileTap={{ scale:0.9 }} onClick={() => removeFromCart(item.productId)} aria-label={`Enlever ${item.nom}`}
            style={{ width:44, height:44, background:'#FEF2F2', border:'none', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Trash2 size={16} color="#ef4444" />
          </motion.button>
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
      <button type="button" onClick={() => dire(`Total : ${total.toLocaleString('fr-FR')} francs`)}
        aria-label={`Total ${total.toLocaleString('fr-FR')} francs — touche pour entendre`}
        style={{ width:'100%', display:'flex', justifyContent:'space-between', marginBottom:12, background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit' }}>
        <span style={{ fontSize:16, fontWeight:700, color:'var(--encre)' }}>Total</span>
        <span style={{ fontSize:20, fontWeight:900, color:P }}>{total.toLocaleString('fr-FR')} FCFA</span>
      </button>

      {/* Moyen de paiement — espèces / mobile money (déclaré) / crédit */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <button type="button" onClick={() => setPaymentMethod('cash')}
          style={{ flex:1, padding:'12px 6px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer',
            border: paymentMethod==='cash' ? `2px solid ${P}` : '1.5px solid var(--trait)',
            background: paymentMethod==='cash' ? '#FFF3E9' : '#fff', color: paymentMethod==='cash' ? P : '#8A7A6A' }}>
          Espèces
        </button>
        {CAISSE_MOBILE_MONEY_ACTIF && (
        <button type="button" onClick={() => setPaymentMethod('mobile_money')}
          style={{ flex:1, padding:'12px 6px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer', lineHeight:1.15,
            border: paymentMethod==='mobile_money' ? `2px solid ${P}` : '1.5px solid var(--trait)',
            background: paymentMethod==='mobile_money' ? '#FFF3E9' : '#fff', color: paymentMethod==='mobile_money' ? P : '#8A7A6A' }}>
          Mobile money
        </button>
        )}
        {CAISSE_CREDIT_ACTIF && (
        <button type="button" onClick={() => { setPaymentMethod('credit'); setShowCredit(true); }}
          style={{ flex:1, padding:'12px 6px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer',
            border:'1.5px solid var(--trait)', background:'#fff', color:'var(--encre-3)' }}>
          Crédit
        </button>
        )}
      </div>

      {/* Pilote ESPÈCES : crédit et/ou mobile money désactivés (voir #16). */}
      {(!CAISSE_CREDIT_ACTIF || !CAISSE_MOBILE_MONEY_ACTIF) && (
        <div style={{ fontSize:11, color:'var(--encre-3)', marginTop:-6, marginBottom:12, textAlign:'center' }}>
          Caisse pilote : espèces uniquement.
        </div>
      )}

      {/* Mobile money DÉCLARÉ : choix de l'opérateur (aucune intégration) */}
      {CAISSE_MOBILE_MONEY_ACTIF && paymentMethod === 'mobile_money' && (
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {MOBILE_OPERATORS.map(op => (
            <button type="button" key={op.id} onClick={() => setMmOperator(op.id)}
              style={{ flex:'1 0 30%', padding:'11px 6px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer',
                border: mmOperator===op.id ? `2px solid ${op.color}` : '1.5px solid var(--trait)',
                background: mmOperator===op.id ? op.color : '#fff', color: mmOperator===op.id ? op.textColor : '#5a4a3a' }}>
              {op.name}
            </button>
          ))}
        </div>
      )}

      {/* Espèces : montant reçu EN BILLETS (geste du marché) + monnaie
          à rendre décomposée en coupures. Le champ chiffres reste le
          filet pour celle qui préfère taper. */}
      {paymentMethod === 'cash' && (
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, border:'1.5px solid var(--trait)', borderRadius:12, padding:'10px 12px', minWidth:0 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)', whiteSpace:'nowrap' }}>Montant reçu</span>
          {/* minWidth:0 — sans lui, un input vide garde un min-content flexbox
              qui peut dépasser un conteneur étroit (panneau permanent 400px,
              repéré en recette visuelle) au lieu de rétrécir avec flex:1. */}
          <input value={montantRecu} onChange={e => setMontantRecu(e.target.value.replace(/[^\d]/g,''))} inputMode="numeric" placeholder="—"
            style={{ flex:1, minWidth:0, border:'none', outline:'none', textAlign:'right', fontSize:18, fontWeight:800, color:'var(--encre)', background:'transparent', fontVariantNumeric:'tabular-nums' }} />
          <span style={{ fontSize:13, fontWeight:700, color:'var(--encre-3)' }}>F</span>
          {recu > 0 && (
            <button type="button" aria-label="Effacer le montant reçu" onClick={() => setMontantRecu('')}
              style={{ width:30, height:30, borderRadius:9, border:'none', background:'#FEF2F2', color:'#c0392b', fontWeight:900, fontSize:14, cursor:'pointer' }}>
              ✕
            </button>
          )}
        </div>
        {/* Les billets qu'elle vient de recevoir : un toucher = un billet
            ajouté (et dit à voix haute). Couleurs proches des vraies coupures. */}
        {/* alignItems:'flex-end' : les billets n'ont plus tous la même hauteur
            (les vraies coupures non plus). Alignés par le bas, ils se lisent
            comme une liasse posée sur la table, pas comme une grille bancale. */}
        <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          {COUPURES.filter(c => c.forme === 'billet').map(c => (
            <BilletDessine key={c.valeur} coupure={c} onTouche={() => ajouterCoupure(c.valeur)} />
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap', alignItems:'center' }}>
          {COUPURES.filter(c => c.forme === 'piece').map(c => (
            <PieceDessinee key={c.valeur} coupure={c} onTouche={() => ajouterCoupure(c.valeur)} />
          ))}
          <button type="button" onClick={() => { setMontantRecu(String(total)); dire('Compte juste'); }}
            style={{ flex:1, minWidth:104, padding:'13px 10px', borderRadius:12, border:'1.5px solid #A8D8B9', background:'#EAF7EE', color:'#0E7A47', fontWeight:800, fontSize:13, cursor:'pointer' }}>
            Compte juste
          </button>
        </div>
        {recu > 0 && !insuffisant && (
          <button type="button" onClick={() => dire(`Monnaie à rendre : ${formatF(monnaie)} francs`)}
            aria-label={`Monnaie à rendre ${formatF(monnaie)} francs — touche pour entendre`}
            style={{ width:'100%', background:'none', border:'none', padding:0, marginTop:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:800, color:'#0E7A47' }}>
              <span>Monnaie à rendre</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{formatF(monnaie)} F</span>
            </div>
            {/* La monnaie EN COUPURES concrètes : « 2000 ×1 · 500 ×1 » */}
            {monnaie > 0 && monnaieDecomposee.lignes.length > 0 && (
              <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
                {monnaieDecomposee.lignes.map(l => (
                  <span key={l.valeur} style={{ padding:'4px 9px', borderRadius:8, background:'#EAF7EE', border:'1px solid #A8D8B9', color:'#0E7A47', fontWeight:800, fontSize:12, fontVariantNumeric:'tabular-nums' }}>
                    {formatF(l.valeur)} ×{l.nb}
                  </span>
                ))}
                {monnaieDecomposee.reste > 0 && (
                  <span style={{ padding:'4px 9px', borderRadius:8, background:'#FFF7E6', border:'1px solid #F0D9A8', color:'#8A6A1A', fontWeight:800, fontSize:12 }}>
                    + {formatF(monnaieDecomposee.reste)} F
                  </span>
                )}
              </div>
            )}
          </button>
        )}
        {insuffisant && (
          <div style={{ marginTop:8, fontSize:13, fontWeight:700, color:'#c0392b' }}>Montant reçu insuffisant</div>
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
            style={{ width:'100%', border:'none', borderRadius:18, padding:'17px 0', fontSize:16, fontWeight:800, color:'white', cursor: bloque ? 'not-allowed':'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${P}55`, background: bloque ? '#CBB9A8' : P }}>
            {label}
          </motion.button>
        );
      })()}
    </>
  );

  return (
    <SubPageLayout
      role="marchand"
      title="Caisse du jour"
      rightContent={
        <div style={{ display:'flex', gap:7, alignItems:'center' }}>
          {/* Statut réseau — simple et permanent (mockup validé) : la donnée
              existe déjà globalement (useApp().isOnline), on ne fait que
              l'afficher ici au lieu de seulement lors d'une coupure. */}
          <div style={{ height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', gap:6, padding:'0 11px' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: isOnline ? '#4ADE80' : '#F87171', flexShrink:0 }} />
            <span style={{ fontSize:12, fontWeight:700, color:'white', whiteSpace:'nowrap' }}>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
          </div>
          {CAISSE_CREDIT_ACTIF && (
          <motion.button whileTap={{ scale: nbItems > 0 ? 0.95 : 1 }}
            onClick={() => {
              // On n'ouvre le crédit QUE si le panier n'est pas vide (B4).
              if (nbItems === 0) { dire('Ajoute d\'abord des produits au panier.'); return; }
              setPaymentMethod('credit'); setShowCredit(true);
            }}
            style={{ height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px', gap:6, cursor: nbItems > 0 ? 'pointer' : 'not-allowed', opacity: nbItems > 0 ? 1 : 0.5 }}>
            <FileText size={13} color="white" />
            <span style={{ fontSize:12, fontWeight:700, color:'white' }}>À crédit</span>
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
        <label style={{ marginBottom:12, background:'white', border:'1.5px solid var(--trait)', borderRadius:13, padding:'13px 14px', display:'flex', alignItems:'center', gap:9, cursor:'text' }}>
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
          <span aria-hidden="true" style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
            <Search size={14} color="var(--encre-4)" />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un produit…"
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:15, color:'var(--encre)', fontFamily:'inherit', minWidth:0 }} />
          {search && <motion.button type="button" aria-label="Effacer la recherche" whileTap={{ scale:0.9 }} onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <X size={16} color="#aaa" />
          </motion.button>}
        </label>

        {/* AUTRE ARTICLE — vendre un montant libre, sans produit listé (Phase 3) */}
        <motion.button whileTap={{ scale:0.98 }} onClick={() => setShowLibre(true)}
          style={{ width:'100%', marginBottom:14, padding:'12px', borderRadius:13, border:`1.5px dashed ${P}`, background:'#fff', color:P, fontWeight:800, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Plus size={16} /> Autre article
        </motion.button>

        {/* VENTE RAPIDE */}
        {search === '' && topProducts.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:3, height:14, background:P, borderRadius:2 }} />
              <span style={{ fontSize:11, fontWeight:700, color:P, textTransform:'uppercase', letterSpacing:'0.1em' }}>Vente rapide</span>
              <span style={{ fontSize:10, color:'var(--encre-4)' }}>· dynamique selon tes ventes</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {topProducts.map((p, i) => (
                <motion.button key={p.id} whileTap={{ scale:0.97 }}
                  onClick={() => ajouterAuPanier(p)}
                  style={{ borderRadius:18, overflow:'hidden', position:'relative', height:96, border:'none', cursor:'pointer', padding:0 }}>
                  <ImageWithFallback src={p.image || undefined} fallbackSrc={getImageByNom(p.nom)} alt={p.nom} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', position:'absolute', top:0, left:0 }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.25) 55%,transparent 100%)' }} />
                  <div style={{ position:'absolute', inset:0, padding:'0 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontSize:20, fontWeight:900, color:'white' }}>{p.nom}</div>
                      <div style={{ fontSize:15, color:'rgba(255,255,255,0.92)', fontWeight:700, marginTop:1 }}>
                        {(p.prix||0).toLocaleString('fr-FR')} <span style={{ fontSize:11 }}>FCFA/{p.unite}</span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ scale:[1,1.12,1], boxShadow:['0 2px 8px 0 rgba(0,0,0,0.25)','0 0 0 6px rgba(255,255,255,0)','0 2px 8px 0 rgba(0,0,0,0.25)'] }}
                      transition={{ duration:2, repeat:Infinity, delay: i * 0.8 }}
                      style={{ width:44, height:44, borderRadius:'50%', background:'white', border:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </motion.div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* TOUS LES PRODUITS */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:3, height:14, background:'#EDE7DE', borderRadius:2 }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--encre-4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Tous les produits</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--encre-4)' }}>
              <Package size={48} style={{ margin:'0 auto 12px', opacity:0.3 }} />
              <p style={{ marginBottom:16 }}>Aucun produit</p>
              <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowLibre(true)}
                style={{ padding:'12px 22px', borderRadius:14, border:'none', background:P, color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer' }}>
                + Autre article
              </motion.button>
            </div>
          ) : (
            <div className={voirPlusProduits ? 'pos-grille' : 'pos-grille pos-grille-apercu'}
              style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {filtered.map((p, i) => {
                const inCart = cart.find(c => c.productId === p.id);
                const enPromo = promoActive(p as any);
                const cartTotal = inCart ? inCart.quantite * inCart.prix : 0;
                return (
                  <motion.div key={p.id} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.04 }}
                    style={{ background:'white', border:`1.5px solid ${inCart ? P : '#EDE7DE'}`, borderRadius:20, overflow:'hidden', boxShadow: inCart ? `0 4px 20px rgba(175,91,35,0.18)` : 'none' }}>
                    <div style={{ position:'relative', height:110 }}>
                      <ImageWithFallback src={p.image || undefined} fallbackSrc={getImageByNom(p.nom)} alt={p.nom} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.55) 100%)' }} />
                      <StockBadge stock={p.stock || 0} />
                      {enPromo && (
                        <div style={{ position:'absolute', top:8, left:8, background:'#C0392B', borderRadius:10, padding:'3px 9px', fontSize:11, fontWeight:900, color:'white', boxShadow:'0 2px 8px rgba(192,57,43,0.4)' }}>
                          -{remisePct(p as any)}%
                        </div>
                      )}
                      {inCart && (
                        <div style={{ position:'absolute', top:8, right:8, background:P, borderRadius:10, padding:'3px 10px', fontSize:11, fontWeight:800, color:'white' }}>
                          {cartTotal.toLocaleString('fr-FR')} FCFA
                        </div>
                      )}
                    </div>
                    <div style={{ padding:'11px 12px' }}>
                      <div style={{ fontSize:16, fontWeight:800, color:'var(--encre)' }}>{p.nom}</div>
                      {enPromo ? (
                        <div style={{ margin:'3px 0', display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:20, fontWeight:900, color:'#C0392B' }}>{prixEffectif(p as any).toLocaleString('fr-FR')}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:'#C0392B' }}>FCFA/{p.unite}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--encre-4)', textDecoration:'line-through' }}>{(p.prix||0).toLocaleString('fr-FR')}</span>
                        </div>
                      ) : (
                        <Prix prix={p.prix||0} unite={p.unite} />
                      )}
                      {inCart ? (
                        <div style={{ display:'flex', alignItems:'center', background:'#FFF3EA', borderRadius:12, padding:4, marginTop:8, gap:4 }}>
                          <motion.button whileTap={{ scale:0.86 }} onClick={() => updateCartItemQuantity(p.id, inCart.quantite-1)} aria-label="Enlever un"
                            style={{ width:44, height:44, background:'white', border:'none', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                            <Minus size={18} color={P} />
                          </motion.button>
                          <span style={{ flex:1, textAlign:'center', fontSize:20, fontWeight:900, color:P }}>{inCart.quantite}</span>
                          <motion.button whileTap={{ scale:0.86 }} onClick={() => updateCartItemQuantity(p.id, inCart.quantite+1)} aria-label="Ajouter un"
                            style={{ width:44, height:44, background:P, border:'none', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                            <Plus size={18} color="white" />
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button whileTap={{ scale:0.97 }} onClick={() => ajouterAuPanier(p)}
                          style={{ width:'100%', background:P, border:'none', borderRadius:12, padding:'11px 0', fontSize:15, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>
                          + Ajouter
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* « Voir plus » — DÉPLIE la grille SUR PLACE, il ne change pas
              d'écran (lot A). Sur téléphone la grille n'affiche que les
              premières vignettes : sans ce repli, le panier qui la suit
              serait à plusieurs écrans de défilement et la surface unique ne
              serait qu'un mot. Au-dessus de 1024 px le panier est à CÔTÉ, pas
              dessous : la grille y reste entière et ce bouton n'existe pas
              (cf. .pos-grille-apercu dans styles/commerce.css). */}
          {filtered.length > 4 && (
            <div className="lg:hidden" style={{ marginTop:12 }}>
              <button type="button" onClick={() => setVoirPlusProduits(v => !v)}
                style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'1.5px solid var(--trait)', background:'#fff', color:P, fontWeight:800, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                {voirPlusProduits ? 'Voir moins' : `Voir plus (${filtered.length - 4})`}
              </button>
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
        <section className="lg:hidden" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:17, fontWeight:900, color:'var(--encre)' }}>
              Panier actuel{nbItems > 0 && <span style={{ fontWeight:400, fontSize:13, color:'var(--encre-4)' }}> ({nbItems})</span>}
            </span>
            {nbItems > 0 && (
              <button type="button" onClick={clearCart}
                style={{ background:'none', border:'none', color:'#AE3A38', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', padding:'8px 0' }}>
                Vider le panier
              </button>
            )}
          </div>
          {nbItems === 0 ? (
            <div style={{ background:'white', border:'1.5px dashed var(--trait)', borderRadius:20, textAlign:'center', padding:'26px 18px', color:'var(--encre-4)', fontSize:13 }}>
              Touche un produit pour l'ajouter au panier.
            </div>
          ) : (
            <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:20, padding:'2px 16px 16px' }}>
              {renderCartLines()}
              <div style={{ marginTop:14 }}>
                {renderCartFooter()}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Panier permanent — grand écran uniquement (mockup validé). Même
          logique/JSX que le panneau coulissant mobile, via renderCartLines()/
          renderCartFooter() : rien de dupliqué, juste affiché autrement. */}
      <aside className="hidden lg:flex lg:flex-col" style={{ width:400, flexShrink:0, position:'sticky', top:100, maxHeight:'calc(100vh - 120px)', background:'white', border:'1.5px solid var(--trait)', borderRadius:20, marginTop:14, overflow:'hidden' }}>
        <div style={{ padding:'16px 18px 6px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:17, fontWeight:900, color:'var(--encre)' }}>
            Mon panier {nbItems > 0 && <span style={{ fontWeight:400, fontSize:13, color:'var(--encre-4)' }}>({nbItems})</span>}
          </span>
          {nbItems > 0 && (
            <button type="button" onClick={clearCart} style={{ background:'none', border:'none', color:'#AE3A38', fontWeight:700, fontSize:12, cursor:'pointer' }}>
              Vider
            </button>
          )}
        </div>
        {nbItems === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 18px', color:'var(--encre-4)', fontSize:13 }}>
            Touche un produit pour l'ajouter au panier.
          </div>
        ) : (
          <>
            <div style={{ flex:1, overflowY:'auto', padding:'0 18px', minHeight:0 }}>
              {renderCartLines()}
            </div>
            <div style={{ padding:'14px 18px 18px', flexShrink:0 }}>
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
              style={{ width:'100%', maxWidth:480, background:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:'20px 18px calc(20px + env(safe-area-inset-bottom))' }}
            >
              <div style={{ fontSize:18, fontWeight:800, color:'var(--encre)', marginBottom:14 }}>Autre article</div>

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
                              style={{ textAlign:'left', border:'1.5px solid var(--trait)', borderRadius:13, padding:'11px 13px', background: deja ? '#F6F2EC' : '#fff', cursor: deja ? 'default' : 'pointer', fontFamily:'inherit', opacity: deja ? 0.7 : 1 }}
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
                <div style={{ border:`1.5px solid ${P}`, borderRadius:14, padding:'11px 13px', marginBottom:14, background:'#FFF8F3' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:'var(--encre)' }}>{refChoisie.nom}</div>
                      <div style={{ fontSize:11, color:'var(--encre-3)', marginTop:2 }}>{refChoisie.categorie || 'Catalogue JULABA'}</div>
                    </div>
                    <button type="button" onClick={() => { setRefChoisie(null); setLibreDesc(''); setAdoptionMessage(null); }}
                      style={{ background:'none', border:'none', color:P, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', padding:6 }}>
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
                        style={{ border:`1.5px solid ${refUnite === u ? P : 'var(--trait)'}`, background: refUnite === u ? `${P}12` : '#fff', color: refUnite === u ? P : 'var(--encre-3)', borderRadius:11, padding:'8px 13px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
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
                    style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', marginTop:6, marginBottom:18, fontSize:15, color:'var(--encre)', outline:'none', fontFamily:'inherit' }}
                  />
                </>
              )}

              {adoptionMessage && (
                <div role="alert" style={{ background:'#FDECEA', border:'1.5px solid #E4B4AE', borderRadius:12, padding:'10px 12px', marginBottom:12, fontSize:13, color:'#8C2F23', lineHeight:1.45 }}>
                  {adoptionMessage}
                </div>
              )}

              <button
                type="button"
                onClick={refChoisie ? adopterReference : ajouterMontantLibre}
                disabled={!libreMontant || Number(libreMontant) <= 0 || adoptionEnCours}
                style={{ width:'100%', padding:'16px', borderRadius:16, border:'none', color:'#fff', fontWeight:800, fontSize:16, cursor:'pointer', background: (!libreMontant || Number(libreMontant) <= 0 || adoptionEnCours) ? '#CBB9A8' : P }}
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
            style={{ position:'fixed', inset:0, zIndex:120, background:'#FFFCF7', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', textAlign:'center' }}>
            <div style={{ width:88, height:88, borderRadius:'50%', background:'#EAF7EE', display:'grid', placeItems:'center', marginBottom:16 }}>
              <Check size={48} color="#0E7A47" />
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'#0E7A47', marginBottom:8 }}>Vente réussie</div>
            <div style={{ fontSize:34, fontWeight:900, color:'var(--encre)', fontVariantNumeric:'tabular-nums' }}>{lastSale.montant.toLocaleString('fr-FR')} F</div>
            <div style={{ fontSize:14, color:'var(--encre-3)', marginTop:6 }}>
              {lastSale.moyen}{lastSale.monnaie > 0 ? ` · rendu ${lastSale.monnaie.toLocaleString('fr-FR')} F` : ''}
            </div>
            <div style={{ width:'100%', maxWidth:360, marginTop:28, display:'flex', flexDirection:'column', gap:10 }}>
              <button type="button"
                onClick={() => { void partagerRecu({ montant: lastSale.montant, produits: lastSale.produits, mode_paiement: lastSale.moyen, created_at: new Date().toISOString() } as any, marchandNom); }}
                style={{ width:'100%', padding:'14px', borderRadius:16, border:'1.5px solid #25D366', background:'#fff', color:'#128C4B', fontWeight:800, fontSize:15, cursor:'pointer' }}>
                Envoyer le reçu (WhatsApp)
              </button>
              <button type="button"
                onClick={() => { setShowSuccess(false); setLastSale(null); }}
                style={{ width:'100%', padding:'16px', borderRadius:16, border:'none', background:P, color:'#fff', fontWeight:800, fontSize:16, cursor:'pointer' }}>
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
