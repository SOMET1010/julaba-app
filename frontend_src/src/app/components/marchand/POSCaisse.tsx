import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Check, ArrowLeft, Package, FileText } from 'lucide-react';
import { useCaisse } from '../../contexts/CaisseContext';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { CreditModal } from './CreditModal';
import { SubPageLayout } from '../layout/SubPageLayout';
import { promoActive, prixEffectif, remisePct } from '../../utils/promo.utils';

const P = '#AF5B23';
const BG = '#FFF2E9';

export function POSCaisse() {
  const navigate = useNavigate();
  const { products, cart, addToCart, removeFromCart, updateCartItemQuantity, clearCart, getTotalCart, enregistrerVente, updateProduct, transactions } = useCaisse();
  const { speak } = useApp();

  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');

  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Verrou SYNCHRONE anti double-clic : l'état React (et donc `disabled`) ne se
  // met à jour qu'au render suivant ; un ref bloque le 2e tap dès la même frame.
  const paiementEnCoursRef = useRef(false);

  const total = getTotalCart();
  const nbItems = cart.reduce((s, i) => s + i.quantite, 0);


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
      speak('Montant total invalide');
      return;
    }
    if (paymentMethod === 'credit') return;
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
      await enregistrerVente(total, details, paymentMethod, undefined);
      details.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) updateProduct(prod.id, { stock: Math.max(0, (prod.stock || 0) - item.quantite) });
      });
      clearCart();
      setPaymentMethod('cash');
      setShowCart(false);
      setShowSuccess(true);
      // Confirmation PARLÉE (comme la vente vocale) : une non-lectrice entend que
      // sa vente est bien enregistrée, sans avoir à lire le petit texte.
      speak(`Vente enregistrée. ${total.toLocaleString('fr-FR')} francs`);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      speak("Erreur lors de l'enregistrement de la vente");
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
    clearCart();
    setPaymentMethod('cash');
    setShowCredit(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const Prix = ({ prix, unite }: { prix: number; unite: string }) => (
    <div style={{ margin:'3px 0' }}>
      <span style={{ fontSize:20, fontWeight:900, color:P }}>{prix.toLocaleString('fr-FR')} </span>
      <span style={{ fontSize:11, fontWeight:700, color:'#aaa' }}>FCFA/{unite}</span>
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
          <motion.button whileTap={{ scale:0.95 }} onClick={() => { setPaymentMethod('credit'); setShowCredit(true); }}
            style={{ height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 12px', gap:6, cursor:'pointer' }}>
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
                  <div style={{ fontSize:11, color:'#aaa', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {cart.map(i => `${i.nom} ×${i.quantite}`).join(' · ')}
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:P }}>{total.toLocaleString('fr-FR')} <span style={{ fontSize:12, fontWeight:700 }}>FCFA</span></div>
                </div>
                <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowCart(true)}
                  style={{ background:P, border:'none', borderRadius:14, padding:'13px 20px', fontSize:15, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', boxShadow:`0 4px 14px ${P}55` }}>
                  Encaisser
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      }
    >

      {/* CONTENU */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 0 0' }}>
        <div style={{ marginBottom:12, background:'white', border:'1.5px solid #EDE7DE', borderRadius:13, padding:'11px 14px', display:'flex', alignItems:'center', gap:9 }}>
          <Search size={14} color="#aaa" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..."
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:13, color:'#333', fontFamily:'inherit' }} />
          {search && <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <X size={14} color="#aaa" />
          </motion.button>}
        </div>

        {/* VENTE RAPIDE */}
        {search === '' && topProducts.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:3, height:14, background:P, borderRadius:2 }} />
              <span style={{ fontSize:11, fontWeight:700, color:P, textTransform:'uppercase', letterSpacing:'0.1em' }}>Vente rapide</span>
              <span style={{ fontSize:10, color:'#aaa' }}>· dynamique selon tes ventes</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {topProducts.map((p, i) => (
                <motion.button key={p.id} whileTap={{ scale:0.97 }}
                  onClick={() => addToCart(p, 1)}
                  style={{ borderRadius:18, overflow:'hidden', position:'relative', height:96, border:'none', cursor:'pointer', padding:0 }}>
                  <ImageWithFallback src={p.image} alt={p.nom} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', position:'absolute', top:0, left:0 }} />
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
            <span style={{ fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.1em' }}>Tous les produits</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#aaa' }}>
              <Package size={48} style={{ margin:'0 auto 12px', opacity:0.3 }} />
              <p>Aucun produit</p>
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
                      <ImageWithFallback src={p.image} alt={p.nom} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
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
                      <div style={{ fontSize:16, fontWeight:800, color:'#1a1206' }}>{p.nom}</div>
                      {enPromo ? (
                        <div style={{ margin:'3px 0', display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:20, fontWeight:900, color:'#C0392B' }}>{prixEffectif(p as any).toLocaleString('fr-FR')}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:'#C0392B' }}>FCFA/{p.unite}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:'#aaa', textDecoration:'line-through' }}>{(p.prix||0).toLocaleString('fr-FR')}</span>
                        </div>
                      ) : (
                        <Prix prix={p.prix||0} unite={p.unite} />
                      )}
                      {inCart ? (
                        <div style={{ display:'flex', alignItems:'center', background:'#FFF3EA', borderRadius:12, padding:4, marginTop:8, gap:4 }}>
                          <motion.button whileTap={{ scale:0.86 }} onClick={() => updateCartItemQuantity(p.id, inCart.quantite-1)}
                            style={{ width:36, height:36, background:'white', border:'none', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                            <Minus size={16} color={P} />
                          </motion.button>
                          <span style={{ flex:1, textAlign:'center', fontSize:20, fontWeight:900, color:P }}>{inCart.quantite}</span>
                          <motion.button whileTap={{ scale:0.86 }} onClick={() => updateCartItemQuantity(p.id, inCart.quantite+1)}
                            style={{ width:36, height:36, background:P, border:'none', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                            <Plus size={16} color="white" />
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button whileTap={{ scale:0.97 }} onClick={() => addToCart(p, 1)}
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
                <span style={{ fontSize:19, fontWeight:900, color:'#1a1206' }}>Panier <span style={{ fontSize:14, fontWeight:400, color:'#aaa' }}>({nbItems} article{nbItems>1?'s':''})</span></span>
                <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowCart(false)}
                  style={{ width:32, height:32, borderRadius:10, background:'#f0f0f0', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={14} color="#888" />
                </motion.button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'0 16px' }}>
                {cart.map(item => (
                  <div key={item.productId} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #f5f0eb' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#1a1206' }}>{item.nom}</div>
                      <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{item.prix.toLocaleString('fr-FR')} FCFA × {item.quantite}</div>
                    </div>
                    <div style={{ fontSize:15, fontWeight:800, color:P }}>{(item.prix * item.quantite).toLocaleString('fr-FR')} FCFA</div>
                    <motion.button whileTap={{ scale:0.9 }} onClick={() => removeFromCart(item.productId)}
                      style={{ width:30, height:30, background:'#FEF2F2', border:'none', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <Trash2 size={14} color="#ef4444" />
                    </motion.button>
                  </div>
                ))}
              </div>
              <div style={{ padding:'14px 16px 32px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:'#1a1206' }}>Total</span>
                  <span style={{ fontSize:20, fontWeight:900, color:P }}>{total.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <motion.button whileTap={{ scale:0.97 }} onClick={handlePay} disabled={isProcessing}
                  style={{ width:'100%', background:P, border:'none', borderRadius:18, padding:'17px 0', fontSize:16, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${P}55` }}>
                  {isProcessing ? 'Traitement...' : 'Valider la vente'}
                </motion.button>
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

      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }}
            style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:100, background:P, color:'white', padding:'12px 24px', borderRadius:20, fontSize:14, fontWeight:700, boxShadow:`0 4px 20px ${P}55`, display:'flex', alignItems:'center', gap:8 }}>
            <Check size={16} color="white" />
            Vente enregistrée !
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}