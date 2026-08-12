import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Check, ArrowLeft, Package, FileText } from 'lucide-react';
import { useCaisse } from '../../contexts/CaisseContext';
import { SyncEchecsBanner } from './SyncEchecsBanner';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { CreditModal } from './CreditModal';
import { SubPageLayout } from '../layout/SubPageLayout';
import { promoActive, prixEffectif, remisePct } from '../../utils/promo.utils';
import { partagerRecu } from '../../utils/recu.utils';
import { MOBILE_OPERATORS, getMobileOperator } from '../../types/payment';
import { COUPURES, decomposerMonnaie, direCoupure, formatF } from '../../utils/fcfa';
import { vibrerSucces, vibrerErreur, vibrerTic } from '../../utils/haptique';
import { getImageByNom } from '../../data/catalogue-produits';
import { guidageVocal } from '../../utils/accessMode';

const P = '#AF5B23';
const BG = '#FFF2E9';

export function POSCaisse() {
  const navigate = useNavigate();
  const { products, cart, addToCart, removeFromCart, updateCartItemQuantity, updateCartItemPrice, clearCart, getTotalCart, enregistrerVente, updateProduct, transactions } = useCaisse();
  const { speak, reloadTransactions, user } = useApp();
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
  const [showCart, setShowCart] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  // Montant libre « Autre article » (Phase 3, lot 1) : vendre sans produit listé.
  const [showLibre, setShowLibre] = useState(false);
  const [libreMontant, setLibreMontant] = useState('');
  const [libreDesc, setLibreDesc] = useState('');

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
        total: i.prix * i.quantite,
        prix_achat: (i as any).prixAchat ?? (i as any).prix_achat ?? 0,
      }));
      await enregistrerVente(total, details, moyen, undefined);
      details.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) updateProduct(prod.id, { stock: Math.max(0, (prod.stock || 0) - item.quantite) });
      });
      // Écran « Vente réussie » (Phase 3, lot 4) — capturé AVANT de vider le panier.
      setLastSale({ montant: total, moyen, monnaie: estMM ? 0 : monnaie, produits: details });
      clearCart();
      setPaymentMethod('cash');
      setMmOperator(null);
      setMontantRecu('');
      setShowCart(false);
      setShowSuccess(true);
      // Confirmation qui se VOIT (écran vert), s'ENTEND (parlée) et se SENT
      // (vibration) : une non-lectrice ou une sourde sait que c'est passé.
      vibrerSucces();
      dire(`Vente enregistrée. ${total.toLocaleString('fr-FR')} francs`);
    } catch (e) {
      console.error(e);
      vibrerErreur();
      dire("La vente n'a pas pu être enregistrée. Réessaie.");
    }
    finally { paiementEnCoursRef.current = false; setIsProcessing(false); }
  };

  const handleCreditSuccess = () => {
    // Décrément optimiste — CreditModal a persisté la vente côté backend
    console.warn('[POSCaisse] handleCreditSuccess: décrément stock optimiste');
    const details = cart.map(i => ({
      productId: i.productId,
      nom: i.nom,
      quantite: i.quantite,
      prix: i.prix,
      total: i.prix * i.quantite,
      prix_achat: (i as any).prixAchat ?? (i as any).prix_achat ?? 0,
    }));
    details.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) updateProduct(prod.id, { stock: Math.max(0, (prod.stock || 0) - item.quantite) });
    });
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

  return (
    <SubPageLayout
      role="marchand"
      title="Caisse du jour"
      rightContent={
        <div style={{ display:'flex', gap:7 }}>
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
          <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowCart(true)}
            style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <ShoppingCart size={16} color="white" />
            {nbItems > 0 && <span style={{ position:'absolute', top:-4, right:-4, minWidth:17, height:17, background:'#ef4444', borderRadius:'50%', fontSize:9, fontWeight:800, color:'white', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #8f4418' }}>{nbItems}</span>}
          </motion.button>
        </div>
      }
      bottomAction={
        <AnimatePresence>
          {nbItems > 0 && (
            <motion.div initial={{ y:80 }} animate={{ y:0 }} exit={{ y:80 }}
              style={{ flexShrink:0, padding:'10px 14px 24px', background:BG }}>
              <div style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', border:'1.5px solid rgba(175,91,35,0.2)', borderRadius:18, padding:'13px 16px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, color:'var(--encre-4)', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {cart.map(i => `${i.nom} ×${i.quantite}`).join(' · ')}
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:P }}>{total.toLocaleString('fr-FR')} <span style={{ fontSize:12, fontWeight:700 }}>FCFA</span></div>
                </div>
                <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowCart(true)}
                  style={{ background:P, border:'none', borderRadius:14, padding:'13px 20px', fontSize:15, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', boxShadow:`0 4px 14px ${P}55` }}>
                  Encaisser {total.toLocaleString('fr-FR')} F
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      }
    >

      {/* CONTENU */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 0 0' }}>
        <SyncEchecsBanner />
        <div style={{ marginBottom:12, background:'white', border:'1.5px solid var(--trait)', borderRadius:13, padding:'11px 14px', display:'flex', alignItems:'center', gap:9 }}>
          <Search size={14} color="#aaa" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..."
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:13, color:'var(--encre)', fontFamily:'inherit' }} />
          {search && <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <X size={14} color="#aaa" />
          </motion.button>}
        </div>

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
                      animate={{ scale:[1,1.12,1], boxShadow:['0 0 0 0 rgba(255,255,255,0.4)','0 0 0 6px rgba(255,255,255,0)','0 0 0 0 rgba(255,255,255,0)'] }}
                      transition={{ duration:2, repeat:Infinity, delay: i * 0.8 }}
                      style={{ width:38, height:38, borderRadius:12, background:'rgba(255,255,255,0.22)', border:'1.5px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
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
        </div>
      </div>

      {/* PANIER MODAL */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:50 }} onClick={() => setShowCart(false)} />
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:28 }}
              style={{ position:'fixed', bottom:0, left:0, right:0, background:'white', borderRadius:'24px 24px 0 0', zIndex:51, maxHeight:'75vh', display:'flex', flexDirection:'column' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#EDE7DE', margin:'14px auto 0' }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 10px' }}>
                <span style={{ fontSize:19, fontWeight:900, color:'var(--encre)' }}>Panier <span style={{ fontSize:14, fontWeight:400, color:'var(--encre-4)' }}>({nbItems} article{nbItems>1?'s':''})</span></span>
                <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowCart(false)} aria-label="Fermer le panier"
                  style={{ width:44, height:44, borderRadius:10, background:'#f0f0f0', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={16} color="#888" />
                </motion.button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'0 16px' }}>
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
                            style={{ width:72, border:'1.5px solid var(--trait)', borderRadius:8, padding:'6px 6px', fontSize:13, fontWeight:800, color:'var(--encre)', textAlign:'right', background:'#FFFDF9', fontVariantNumeric:'tabular-nums' }} />
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
                          style={{ width:56, border:'1.5px solid var(--trait)', borderRadius:8, padding:'6px 6px', fontSize:13, fontWeight:800, color:'var(--encre)', textAlign:'center', background:'#FFFDF9', fontVariantNumeric:'tabular-nums' }} />
                      </div>
                    </div>
                    <div style={{ fontSize:15, fontWeight:800, color:P }}>{(item.prix * item.quantite).toLocaleString('fr-FR')} FCFA</div>
                    <motion.button whileTap={{ scale:0.9 }} onClick={() => removeFromCart(item.productId)} aria-label={`Enlever ${item.nom}`}
                      style={{ width:44, height:44, background:'#FEF2F2', border:'none', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <Trash2 size={16} color="#ef4444" />
                    </motion.button>
                  </div>
                ))}
              </div>
              <div style={{ padding:'14px 16px 32px' }}>
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
                  <button type="button" onClick={() => setPaymentMethod('mobile_money')}
                    style={{ flex:1, padding:'12px 6px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer', lineHeight:1.15,
                      border: paymentMethod==='mobile_money' ? `2px solid ${P}` : '1.5px solid var(--trait)',
                      background: paymentMethod==='mobile_money' ? '#FFF3E9' : '#fff', color: paymentMethod==='mobile_money' ? P : '#8A7A6A' }}>
                    Mobile money
                  </button>
                  <button type="button" onClick={() => { setShowCart(false); setPaymentMethod('credit'); setShowCredit(true); }}
                    style={{ flex:1, padding:'12px 6px', borderRadius:12, fontWeight:800, fontSize:13, cursor:'pointer',
                      border:'1.5px solid var(--trait)', background:'#fff', color:'var(--encre-3)' }}>
                    Crédit
                  </button>
                </div>

                {/* Mobile money DÉCLARÉ : choix de l'opérateur (aucune intégration) */}
                {paymentMethod === 'mobile_money' && (
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
                  <div style={{ display:'flex', alignItems:'center', gap:8, border:'1.5px solid var(--trait)', borderRadius:12, padding:'10px 12px' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)', whiteSpace:'nowrap' }}>Montant reçu</span>
                    <input value={montantRecu} onChange={e => setMontantRecu(e.target.value.replace(/[^\d]/g,''))} inputMode="numeric" placeholder="—"
                      style={{ flex:1, border:'none', outline:'none', textAlign:'right', fontSize:18, fontWeight:800, color:'var(--encre)', background:'transparent', fontVariantNumeric:'tabular-nums' }} />
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
                  <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                    {COUPURES.filter(c => c.forme === 'billet').map(c => (
                      <motion.button type="button" key={c.valeur} whileTap={{ scale:0.92 }} onClick={() => ajouterCoupure(c.valeur)}
                        aria-label={`Ajouter un billet de ${formatF(c.valeur)} francs`}
                        style={{ flex:'1 0 28%', minHeight:46, borderRadius:9, border:'none', cursor:'pointer',
                          background:`linear-gradient(135deg, ${c.couleur}, ${c.couleur}DD)`, color:c.encre,
                          fontWeight:900, fontSize:15, fontVariantNumeric:'tabular-nums',
                          boxShadow:'0 2px 6px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(255,255,255,0.35)' }}>
                        {formatF(c.valeur)}
                      </motion.button>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap', alignItems:'center' }}>
                    {COUPURES.filter(c => c.forme === 'piece').map(c => (
                      <motion.button type="button" key={c.valeur} whileTap={{ scale:0.9 }} onClick={() => ajouterCoupure(c.valeur)}
                        aria-label={`Ajouter une pièce de ${formatF(c.valeur)} francs`}
                        style={{ width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer',
                          background:`radial-gradient(120% 120% at 30% 25%, ${c.couleur}, ${c.couleur}CC)`, color:c.encre,
                          fontWeight:900, fontSize:13, fontVariantNumeric:'tabular-nums',
                          boxShadow:'0 2px 5px rgba(0,0,0,0.2), inset 0 0 0 2.5px rgba(255,255,255,0.5)' }}>
                        {c.valeur}
                      </motion.button>
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
                  const label = isProcessing ? 'Traitement...'
                    : paymentMethod === 'mobile_money'
                      ? (mmOperator ? `Valider — payé par ${getMobileOperator(mmOperator).name}` : 'Choisis l\'opérateur')
                      : (monnaie > 0 ? `Valider · rendre ${monnaie.toLocaleString('fr-FR')} F` : 'Valider la vente');
                  return (
                    <motion.button whileTap={{ scale: bloque ? 1 : 0.97 }} onClick={handlePay} disabled={bloque}
                      style={{ width:'100%', border:'none', borderRadius:18, padding:'17px 0', fontSize:16, fontWeight:800, color:'white', cursor: bloque ? 'not-allowed':'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${P}55`, background: bloque ? '#CBB9A8' : P }}>
                      {label}
                    </motion.button>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreditModal
        isOpen={showCredit}
        onClose={() => { setShowCredit(false); setPaymentMethod('cash'); }}
        cart={cart.map(i => ({ nom: i.nom, quantite: i.quantite, prix: i.prix }))}
        total={total}
        onSuccess={handleCreditSuccess}
      />

      {/* Feuille « Autre article » — montant libre (Phase 3, lot 1) */}
      <AnimatePresence>
        {showLibre && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setShowLibre(false)}
            style={{ position:'fixed', inset:0, zIndex:110, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
            role="dialog" aria-modal="true" aria-label="Autre article"
          >
            <motion.div
              initial={{ y:40 }} animate={{ y:0 }} exit={{ y:40 }}
              onClick={e => e.stopPropagation()}
              style={{ width:'100%', maxWidth:480, background:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:'20px 18px calc(20px + env(safe-area-inset-bottom))' }}
            >
              <div style={{ fontSize:18, fontWeight:800, color:'var(--encre)', marginBottom:14 }}>Autre article</div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)' }}>Montant</label>
              <div style={{ display:'flex', alignItems:'center', gap:8, border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', marginTop:6, marginBottom:14 }}>
                <input
                  value={libreMontant}
                  onChange={e => setLibreMontant(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric" autoFocus placeholder="0"
                  style={{ flex:1, border:'none', outline:'none', fontSize:26, fontWeight:800, color:'var(--encre)', background:'transparent', fontVariantNumeric:'tabular-nums' }}
                />
                <span style={{ fontSize:16, fontWeight:700, color:'var(--encre-3)' }}>F</span>
              </div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--encre-3)' }}>Quoi ? (facultatif)</label>
              <input
                value={libreDesc}
                onChange={e => setLibreDesc(e.target.value)}
                placeholder="ex. bananes"
                style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', marginTop:6, marginBottom:18, fontSize:15, color:'var(--encre)', outline:'none', fontFamily:'inherit' }}
              />
              <button
                type="button"
                onClick={ajouterMontantLibre}
                disabled={!libreMontant || Number(libreMontant) <= 0}
                style={{ width:'100%', padding:'16px', borderRadius:16, border:'none', color:'#fff', fontWeight:800, fontSize:16, cursor:'pointer', background: (!libreMontant || Number(libreMontant) <= 0) ? '#CBB9A8' : P }}
              >
                Ajouter
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Écran « Vente réussie » (Phase 3, lot 4) */}
      <AnimatePresence>
        {showSuccess && lastSale && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:120, background:'#FFFDF9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', textAlign:'center' }}>
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