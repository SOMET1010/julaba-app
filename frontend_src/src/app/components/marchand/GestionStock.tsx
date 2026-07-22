import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { suggererProduits, getImageByNom, rechercherProduitCatalogue, CATALOGUE_PRODUITS } from '../../data/catalogue-produits';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Package, TrendingUp, AlertCircle, Plus, Search, Trash2, X, Mic, MicOff, Edit3, Receipt, Wallet, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Montant } from '../shared/Montant';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../hooks/useToast';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ImagePickerField } from '../shared/ImagePickerField';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import { NotificationButton } from './NotificationButton';
import { VenteVocaleModal } from './VenteVocaleModal';
import { useCaisse } from '../../contexts/CaisseContext';
import { useStock } from '../../contexts/StockContext';
import { RaccourcisProvider } from '../../contexts/RaccourcisContext';
import { ObjectifProvider } from '../../contexts/ObjectifContext';
import { eventBus, EVENTS } from '../../services/eventBus';
import { toast } from 'sonner';

const P = '#AF5B23';

interface Stock {
  id: string; name: string; image: string;
  quantity: number; unit: string;
  purchasePrice: number; salePrice: number;
  threshold: number; category: string;
}

function AnimatedNumber({ value, color, size = 28 }: { value: number; color: string; size?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0; const end = value;
    if (start === end) { setDisplay(end); return; }
    const step = (end - start) / (800 / 16);
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if ((step > 0 && current >= end) || (step < 0 && current <= end)) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.round(current));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span style={{ fontSize: size, fontWeight: 900, color }}>{display.toLocaleString('fr-FR')}</span>;
}

function SwipeableCard({ stock, onTap, onDelete }: { stock: Stock; onTap: () => void; onDelete: () => void }) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-72, -20], [1, 0]);
  const isLow = stock.quantity < stock.threshold;
  const isEmpty = stock.quantity <= 0;
  const benefice = stock.salePrice - stock.purchasePrice;
  const marginPct = stock.purchasePrice > 0 ? Math.round((benefice / stock.purchasePrice) * 100) : 0;
  const borderColor = isEmpty ? '#dc2626' : isLow ? '#ef4444' : '#16a34a';
  const stockPct = Math.min(100, Math.round((stock.quantity / Math.max(stock.threshold * 2, 1)) * 100));

  return (
    <div style={{ position: 'relative', borderRadius: 22, minWidth: 0 }}>
      {/* Fond swipe suppression */}
      <motion.div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
        background: '#ef4444', display: 'flex', alignItems: 'center',
        justifyContent: 'center', borderRadius: 22, opacity: deleteOpacity,
      }}>
        <Trash2 size={20} color="white" />
      </motion.div>

      {/* Carte draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -72, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => { if (info.offset.x < -60) onDelete(); else x.set(0); }}
        style={{ x, position: 'relative', zIndex: 1, minWidth: 0 }}
        onClick={onTap}
        whileTap={{ scale: 0.97 }}
      >
        <motion.div
          animate={isEmpty ? {
            boxShadow: [
              `0 0 0 0px rgba(220,38,38,0.0)`,
              `0 0 0 3px rgba(220,38,38,0.1)`,
              `0 0 0 0px rgba(220,38,38,0.0)`,
            ]
          } : isLow ? {
            boxShadow: [
              `0 0 0 0px rgba(239,68,68,0.0)`,
              `0 0 0 4px rgba(239,68,68,0.15)`,
              `0 0 0 0px rgba(239,68,68,0.0)`,
            ]
          } : {}}
          transition={{ duration: isEmpty ? 3.5 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            border: `2px solid ${borderColor}`,
            borderRadius: 22,
            overflow: 'hidden',
            cursor: 'pointer',
            background: '#fff',
            minWidth: 0,
          }}
        >
          {/* Image */}
          <div style={{ position: 'relative', height: 115, overflow: 'hidden' }}>
            <ImageWithFallback
              src={stock.image || getImageByNom(stock.name)}
              alt={stock.name}
              className="w-full h-full object-cover"
            />
            {/* Dégradé bas */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.58) 100%)',
            }} />
            {/* Pill statut haut gauche */}
            <div style={{
              position: 'absolute', top: 8, left: 8,
              background: isEmpty ? 'rgba(220,38,38,0.92)' : isLow ? 'rgba(239,68,68,0.92)' : 'rgba(22,163,74,0.92)',
              borderRadius: 30, padding: '2px 8px',
              fontSize: 8, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.4px',
            }}>
              {isEmpty ? '✕ Rupture' : isLow ? '⚠ Stock bas' : '✓ En stock'}
            </div>
            {/* Pill marge haut droite */}
            {marginPct !== 0 && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
                borderRadius: 30, padding: '2px 7px',
                fontSize: 8, fontWeight: 900, color: '#fff',
              }}>
                {marginPct > 0 ? '+' : ''}{marginPct}%
              </div>
            )}
            {/* Nom produit bas gauche */}
            <div style={{
              position: 'absolute', bottom: 8, left: 10,
              fontSize: 14, fontWeight: 900, color: '#fff',
              textShadow: '0 1px 6px rgba(0,0,0,0.55)',
            }}>
              {stock.name}
            </div>
          </div>

          {/* Corps blanc */}
          <div style={{ padding: '11px 10px 13px', background: '#fff' }}>

            {/* Quantité centrée */}
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'center',
              gap: 4, marginBottom: 8,
            }}>
              <AnimatedNumber
                value={stock.quantity}
                color={isEmpty ? '#dc2626' : isLow ? '#ef4444' : '#16a34a'}
                size={40}
              />
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: isEmpty ? '#dc2626' : isLow ? '#ef4444' : '#aaa',
              }}>
                {stock.unit}
              </span>
            </div>

            {/* Barre stock + seuil */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 8, fontWeight: 700, color: '#ccc',
                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4,
              }}>
                <span>Stock</span>
                <span>seuil : {stock.threshold} {stock.unit}</span>
              </div>
              <div style={{ background: '#f0ebe3', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stockPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%', borderRadius: 20,
                    background: isEmpty
                      ? '#dc2626'
                      : isLow
                        ? 'linear-gradient(90deg,#fb923c,#ef4444)'
                        : 'linear-gradient(90deg,#4ade80,#16a34a)',
                  }}
                />
              </div>
            </div>

            {/* Séparateur */}
            <div style={{ height: 1, background: '#f5f0ea', marginBottom: 10 }} />

            {/* Prix Achat / Vente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{
                background: '#FFF7F0', border: '1.5px solid #FDDFC4',
                borderRadius: 12, padding: '7px 6px', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, color: '#C2410C',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                }}>Achat</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#EA580C', lineHeight: 1 }}>
                  {(stock.purchasePrice || 0).toLocaleString('fr-FR')}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: '#C2410C', opacity: 0.65, marginTop: 2 }}>
                  FCFA/{stock.unit}
                </div>
              </div>
              <div style={{
                background: '#F0FDF4', border: '1.5px solid #BBF7D0',
                borderRadius: 12, padding: '7px 6px', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, color: '#15803D',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                }}>Vente</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#16A34A', lineHeight: 1 }}>
                  {(stock.salePrice || 0).toLocaleString('fr-FR')}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: '#15803D', opacity: 0.65, marginTop: 2 }}>
                  FCFA/{stock.unit}
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function GestionStock() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast, ToastContainer } = useToast();
  const { products, addProduct, updateProduct, deleteProduct, refreshProducts, stats: caisseStats } = useCaisse();
  const { speak, setIsModalOpen } = useApp();
  const stockCtx = useStock();

  /** Caisse (Kassa) + API /stocks : fusion par nom, la caisse prime pour qu'un produit créé en Kassa apparaisse même si /stocks n'est pas vide. */
  const stocks: Stock[] = useMemo(() => {
    const seen = new Set<string>();
    const fromCaisse: Stock[] = (!products || !Array.isArray(products)) ? [] : products
      .filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map(p => ({
        id: p.id, name: p.nom, image: p.image || '',
        quantity: p.stock || 0, unit: p.unite,
        purchasePrice: Number(p.prix_achat ?? 0) || 0,
        salePrice: p.prix || 0,
        threshold: (p as any).seuil_alerte || 10,
        category: (p.categorie || 'autres').toLowerCase(),
      }));
    const fromApi: Stock[] = stockCtx.stock.map(s => ({
      id: s.id, name: s.produit, image: '',
      quantity: s.quantite, unit: s.unite,
      purchasePrice: (s as any).prixAchat || 0,
      salePrice: s.prixUnitaire || 0,
      threshold: (s as any).seuilAlerte || 10,
      category: ((s as any).categorie || 'autres').toLowerCase(),
    }));
    const byName = new Map<string, Stock>();
    for (const s of fromApi) byName.set(s.name.toLowerCase().trim(), s);
    for (const s of fromCaisse) byName.set(s.name.toLowerCase().trim(), s);
    return Array.from(byName.values());
  }, [products, stockCtx.stock]);

  const [search, setSearch] = useState('');
  const [activeKPI, setActiveKPI] = useState<'all'|'alerts'>('all');
  const [sortByMargin, setSortByMargin] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [showVente, setShowVente] = useState(false);
  const [reappQty, setReappQty] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [newStock, setNewStock] = useState({ name:'', image:'', quantity:0, unit:'kg', purchasePrice:0, salePrice:0, threshold:10, category:'cereales' });
  const [inlineEdit, setInlineEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name:'', image:'', quantity:0, unit:'kg', purchasePrice:0, salePrice:0, threshold:10, category:'cereales' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const u1 = eventBus.subscribe(EVENTS.PRODUCT_CREATED, () => { void refreshProducts(); });
    const u2 = eventBus.subscribe(EVENTS.PRODUCT_UPDATED, () => { void refreshProducts(); });
    const u3 = eventBus.subscribe(EVENTS.PRODUCT_DELETED, () => { void refreshProducts(); });
    return () => { u1(); u2(); u3(); };
  }, [refreshProducts]);

  useEffect(() => {
    if (inlineEdit && selectedStock) {
      setEditForm({
        name: selectedStock.name,
        quantity: selectedStock.quantity,
        unit: selectedStock.unit,
        purchasePrice: selectedStock.purchasePrice,
        salePrice: selectedStock.salePrice,
        threshold: selectedStock.threshold,
        category: selectedStock.category,
        image: selectedStock.image || '',
      });
    }
  }, [inlineEdit, selectedStock]);

  useEffect(() => {
    const lowCount = stocks.filter(s => s.quantity < s.threshold).length;
    if (lowCount > 0 && navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, [stocks.length]);

  useEffect(() => { setIsModalOpen(showAdd || showEdit || showVente); }, [showAdd, showEdit, showVente, setIsModalOpen]);

  const { startRecording, stopRecording } = useVoiceCore({
    context: { module: 'stock', prenom: user?.firstName || user?.prenoms || 'ma chere', genre: (user as any)?.genre || 'femme', userId: user?.id },
    onAction: async (data) => {
      setIsListening(false);
      const text = (data.transcript || '').toLowerCase();
      if (text.includes('alerte') || text.includes('stock bas')) {
        const low = stocks.filter(s => s.quantity < s.threshold);
        speak(low.length === 0 ? 'Tous tes stocks sont bons' : `${low.length} produits en stock bas : ${low.map(s => s.name).join(', ')}`);
      } else if (text.includes('valeur')) {
        const val = stocks.reduce((s, p) => s + p.quantity * p.salePrice, 0);
        speak(`La valeur totale est ${val.toLocaleString('fr-FR')} francs`);
      }
    },
    onError: () => setIsListening(false),
  });

  const toggleMic = () => { if (isListening) { stopRecording(); setIsListening(false); } else { setIsListening(true); startRecording(); } };

  const filtered = useMemo(() => stocks
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) && (activeKPI === 'all' || s.quantity < s.threshold))
    .sort((a, b) => {
      const aLow = a.quantity < a.threshold;
      const bLow = b.quantity < b.threshold;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      if (sortByMargin) return (b.salePrice-b.purchasePrice)-(a.salePrice-a.purchasePrice);
      return a.name.localeCompare(b.name);
    }),
    [stocks, search, activeKPI, sortByMargin]);

  const lowStocks = useMemo(() => stocks.filter(s => s.quantity < s.threshold), [stocks]);
  const totalValue = useMemo(() => stocks.reduce((s, p) => s + p.quantity * p.salePrice, 0), [stocks]);

  const mouvements = useMemo(() => stocks.slice(0,3).map((s,i) => ({
    name: s.name, unit: s.unit, qty: i%2===0?20:-7, day:['hier','lundi','sam.'][i%3]
  })), [stocks]);

  const addStockItem = async () => {
    if (!newStock.name?.trim()) { toast.error('Nom du produit requis'); speak('Saisis le nom du produit'); return; }
    if (newStock.salePrice <= 0) { toast.error('Prix de vente invalide'); return; }
    if (newStock.quantity < 0) { toast.error('Quantité invalide'); return; }
    const cat = rechercherProduitCatalogue(newStock.name);
    try {
      await addProduct({ nom:newStock.name, categorie:newStock.category, prix:newStock.salePrice, prix_achat:newStock.purchasePrice, stock:newStock.quantity, unite:newStock.unit, image:cat?.image||newStock.image||'', seuil_alerte: Number(newStock.threshold) || 10 } as any);
      toast.success('Produit ajouté');
      speak(`${newStock.quantity || 0} ${newStock.unit} de ${newStock.name} ajouté au stock`);
      showToast(`${newStock.name} ajouté au stock`, 'success');
      setShowAdd(false);
      setNewStock({ name:'', image:'', quantity:0, unit:'kg', purchasePrice:0, salePrice:0, threshold:10, category:'cereales' });
    } catch {
      toast.error('Opération impossible. Réessaie.');
    }
  };

  const updateQty = async (id: string, qty: number) => {
    stockCtx.updateStock(id, { quantite: qty });
    try {
      await updateProduct(id, { stock: qty });
      toast.success('Produit mis à jour');
    } catch {
      toast.error('Opération impossible. Réessaie.');
    }
    setSelectedStock(prev => prev?.id === id ? { ...prev, quantity: qty } : prev);
    const s = stocks.find(x => x.id === id);
    if (s && qty < s.threshold && navigator.vibrate) navigator.vibrate([100,50,100]);
  };

  const handleReapp = () => {
    if (!selectedStock) return;
    const reappNum = Number(reappQty);
    if (!reappQty || isNaN(reappNum) || reappNum <= 0) {
      toast.error('Quantité de réapprovisionnement invalide');
      speak('Saisis une quantité valide');
      return;
    }
    const newQty = selectedStock.quantity + reappNum;
    void updateQty(selectedStock.id, newQty);
    speak(`${reappNum} ${selectedStock.unit} de ${selectedStock.name} ajoutés. Stock à ${newQty} ${selectedStock.unit}`);
    setReappQty('');
    showToast(`Stock mis à jour : ${selectedStock.name}`, 'success');
  };

  const deleteItem = async (id: string, confirmed = false) => {
    if (!confirmed) {
      setConfirmDeleteId(id);
      return;
    }
    const s = stocks.find(x => x.id === id);
    speak(`${s?.name} supprimé`);
    stockCtx.deleteStock(id);
    const p = products.find(x => x.id === id || x.nom === s?.name);
    if (p) {
      try {
        await deleteProduct(p.id);
        toast.success('Produit supprimé');
      } catch (e: any) {
        console.warn('[GestionStock] deleteProduct failed:', e?.message);
        toast.error('Opération impossible. Réessaie.');
      }
    }
    showToast(`${s?.name} supprimé`, 'info');
    setShowEdit(false);
    setInlineEdit(false);
    setConfirmDeleteId(null);
  };

  const saveInlineEdit = async () => {
    if (!selectedStock) return;
    const id = selectedStock.id;
    // La liste affichée fusionne DEUX sources (Kassa /caisse/produits et /stocks).
    // L'id de la ligne peut donc être un id /stocks : dans ce cas un PUT
    // /caisse/produits/:id ne trouve rien et la modif est perdue au rechargement.
    // On résout le vrai produit Kassa (par id OU par nom) ; s'il n'existe pas
    // encore côté Kassa, on le crée pour que la modification soit bien persistée.
    const kassa = products.find((x: any) => x.id === id || x.nom === selectedStock.name);
    const champs = {
      nom: editForm.name,
      prix: editForm.salePrice,
      stock: editForm.quantity,
      unite: editForm.unit,
      categorie: editForm.category,
      image: editForm.image || undefined,
      seuil_alerte: editForm.threshold,
      prix_achat: editForm.purchasePrice,
    } as any;
    try {
      if (kassa) await updateProduct(kassa.id, champs);
      else await addProduct(champs);
      void stockCtx.updateStock(id, { quantite: editForm.quantity, prixUnitaire: editForm.salePrice })
        .catch((e: any) => console.warn('[GestionStock] stockCtx.updateStock failed:', e?.message));
      setSelectedStock({
        ...selectedStock,
        name: editForm.name,
        quantity: editForm.quantity,
        unit: editForm.unit,
        purchasePrice: editForm.purchasePrice,
        salePrice: editForm.salePrice,
        threshold: editForm.threshold,
        category: editForm.category,
        image: editForm.image,
      });
      setInlineEdit(false);
      speak(`${editForm.name} mis à jour`);
      showToast('Produit mis à jour', 'success');
    } catch (err: unknown) {
      toast.error('Erreur lors de la sauvegarde');
      console.warn('[GestionStock] saveInlineEdit failed:', err instanceof Error ? err.message : err);
    }
  };

  return (
    <>
    <SubPageLayout
      role="marchand"
      title="Mes produits"
      subtitle={`${stocks.length} produit${stocks.length > 1 ? 's' : ''} · ${lowStocks.length} alerte${lowStocks.length > 1 ? 's' : ''}`}
      rightContent={<NotificationButton />}
    >
        <div style={{ padding:'14px 0 0' }}>

          <KPIGrid cols={2}>
            <UniversalKPI label="Produits" animatedTarget={stocks.length} icon={Package} color="#2563eb" bgColor="rgba(239,246,255,0.9)" borderColor="rgba(59,130,246,0.35)" iconAnimation="bounce" onClick={() => setActiveKPI('all')} active={activeKPI==='all'} />
            <UniversalKPI label="Alertes" animatedTarget={lowStocks.length} icon={AlertCircle} color="#ea580c" bgColor="rgba(255,247,237,0.9)" borderColor="rgba(249,115,22,0.35)" iconAnimation="pulse" onClick={() => setActiveKPI(activeKPI==='alerts'?'all':'alerts')} active={activeKPI==='alerts'} />
            <UniversalKPI label="Valeur stock" animatedTarget={totalValue} suffix="FCFA" icon={TrendingUp} color="#16a34a" bgColor="rgba(240,253,244,0.9)" borderColor="rgba(34,197,94,0.35)" iconAnimation="float" onClick={() => setShowValue(true)} />
            <UniversalKPI label="Prix moyen" animatedTarget={stocks.length > 0 ? Math.round(totalValue / stocks.length) : 0} suffix="FCFA" icon={BarChart3} color="#9F8170" bgColor="rgba(249,244,240,0.9)" borderColor="rgba(159,129,112,0.35)" iconAnimation="float" />
          </KPIGrid>

          {/* Raccourcis */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/marchand/ventes-passees')}
              style={{ background:'white', border:'2px solid #EDE7DE', borderRadius:16, padding:'11px 10px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'inherit' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'#FFF3EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Receipt size={14} color={P} /></div>
              <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Ventes passées</span>
            </motion.button>
            <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/marchand/resume-caisse')}
              style={{ background:'white', border:'2px solid #EDE7DE', borderRadius:16, padding:'11px 10px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'inherit' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'#FFF3EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Wallet size={14} color={P} /></div>
              <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Résumé caisse</span>
            </motion.button>
          </div>

          {/* Recherche + Top marge */}
          <div style={{ display:'flex', gap:8, marginBottom:12, minWidth:0 }}>
            <div style={{ flex:1, minWidth:0, background:'white', border:'1.5px solid #EDE7DE', borderRadius:12, padding:'0 12px', display:'flex', alignItems:'center', gap:8, height:46 }}>
              <Search size={15} color="#aaa" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..."
                style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:14, color:'#333', fontFamily:'inherit' }} />
              {search && <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                <X size={14} color="#aaa" />
              </motion.button>}
              <motion.button whileTap={{ scale:0.9 }} onClick={toggleMic} style={{ background:'none', border:'none', cursor:'pointer' }}>
                {isListening ? <MicOff size={15} color={P} /> : <Mic size={15} color="#aaa" />}
              </motion.button>
            </div>
            <motion.button whileTap={{ scale:0.95 }} onClick={() => setSortByMargin(!sortByMargin)}
              style={{ background:sortByMargin?P:'white', border:`1.5px solid ${sortByMargin?P:'#EDE7DE'}`, borderRadius:12, padding:'0 10px', display:'flex', alignItems:'center', gap:5, height:46, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              <TrendingUp size={13} color={sortByMargin?'white':P} />
              <span style={{ fontSize:11, fontWeight:700, color:sortByMargin?'white':P, whiteSpace:'nowrap' }}>Top marge</span>
            </motion.button>
          </div>

          {/* Boutons action */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowAdd(true)}
              style={{ background:'white', border:`2px solid ${P}`, borderRadius:14, padding:'12px 0', fontSize:14, fontWeight:800, color:P, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Package size={16} /> Ajouter
            </motion.button>
            <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowVente(true)}
              style={{ background:P, border:'none', borderRadius:14, padding:'12px 0', fontSize:14, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Mic size={16} /> Vendre
            </motion.button>
          </div>

          {/* Grille swipeable */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14 }}>
            {filtered.map((stock) => (
              <SwipeableCard
                key={stock.id}
                stock={stock}
                onTap={() => {
                  setSelectedStock(stock);
                  setShowEdit(true);
                  setReappQty('');
                  setInlineEdit(false);
                }}
                onDelete={() => deleteItem(stock.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
                <Package size={48} color="#EDE7DE" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: '#333', marginBottom: 6 }}>Aucun produit</div>
                <div style={{ fontSize: 13, color: '#aaa' }}>
                  {search ? `Aucun résultat pour "${search}"` : 'Ajoute ton premier produit'}
                </div>
              </div>
            )}
          </div>

          {/* Mouvements */}
          {mouvements.length > 0 && (
            <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:16, padding:14, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:800, color:P, marginBottom:12 }}>Derniers mouvements</div>
              <div style={{ display:'flex', gap:8 }}>
                {mouvements.map((m,i) => {
                  const isPlus = m.qty > 0;
                  return (
                    <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }}
                      style={{ flex:1, background:isPlus?'#F0FAF5':'#FEF2F2', borderRadius:14, padding:'10px 6px', textAlign:'center', border:`1.5px solid ${isPlus?'#9fe1cb':'#fca5a5'}` }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:isPlus?'#16a34a':'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 5px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          {isPlus?<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>:<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
                        </svg>
                      </div>
                      <div style={{ fontSize:17, fontWeight:900, color:isPlus?'#16a34a':'#ef4444' }}>{isPlus?'+':''}{m.qty}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:isPlus?'#16a34a':'#ef4444' }}>{m.unit} {m.name}</div>
                      <div style={{ fontSize:9, color:'#aaa', marginTop:2 }}>{m.day}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
    </SubPageLayout>

      {/* MODAL AJOUT */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end' }}
            onClick={() => setShowAdd(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:25 }}
              onClick={e => e.stopPropagation()}
              style={{ background:'white', borderRadius:'24px 24px 0 0', width:'100%', maxHeight:'90vh', overflowY:'auto', fontFamily:'system-ui,sans-serif' }}>
              <div style={{ background:`linear-gradient(160deg,${P},#8f4418)`, padding:'14px 16px 20px' }}>
                <div style={{ width:40, height:4, background:'rgba(255,255,255,0.3)', borderRadius:2, margin:'0 auto 14px' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:20, fontWeight:900, color:'white' }}>Ajouter un produit</div>
                  <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowAdd(false)}
                    style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <X size={16} color="white" />
                  </motion.button>
                </div>
              </div>
              <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
                {/* Catalogue 100 % IMAGES : toucher une photo remplit tout (nom, unité,
                    prix, catégorie) et dit le nom à voix haute — aucun texte à taper.
                    Conçu pour une vendeuse qui ne lit pas. */}
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#5a4030', marginBottom:8 }}>👇 Touche ton produit</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                    {CATALOGUE_PRODUITS.filter(p => p.nom !== 'Autre').map(p => {
                      const actif = newStock.name === p.nom;
                      return (
                        <motion.button key={p.nom} whileTap={{ scale:0.94 }}
                          onClick={() => {
                            setNewStock({ ...newStock, name:p.nom, image:p.image, unit:p.unite, purchasePrice:p.prixAchat, salePrice:p.prixVente, category:p.categorie });
                            speak(p.nom);
                          }}
                          style={{ border: actif ? `3px solid ${P}` : '2px solid #EDE7DE', borderRadius:14, padding:6, background: actif ? '#FFF3EA' : 'white', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                          <img src={p.image} alt={p.nom} style={{ width:'100%', aspectRatio:'1', borderRadius:10, objectFit:'cover' }} />
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a1206' }}>{p.nom}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                  {newStock.name && (
                    <div style={{ marginTop:10, fontSize:13, fontWeight:700, color:P, textAlign:'center' }}>
                      ✓ {newStock.name} — indique la quantité puis « Ajouter »
                    </div>
                  )}
                  <div style={{ fontSize:12, color:'#aaa', textAlign:'center', marginTop:10 }}>Pas dans la liste ? Écris son nom ci-dessous.</div>
                </div>
                {(() => {
                  const cat = rechercherProduitCatalogue(newStock.name);
                  return cat ? (
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, background:'#FFF3EA', border:`2px solid ${P}`, borderRadius:14 }}>
                      <img src={cat.image} alt={newStock.name} style={{ width:56, height:56, borderRadius:10, objectFit:'cover' }} />
                      <div>
                        <div style={{ fontSize:10, fontWeight:800, color:P, textTransform:'uppercase', letterSpacing:'0.1em' }}>Image officielle Julaba</div>
                        <div style={{ fontSize:14, fontWeight:700, color:'#1a1206' }}>{newStock.name}</div>
                      </div>
                    </div>
                  ) : (
                    <ImagePickerField label="Photo du produit" value={newStock.image||''} onChange={url => setNewStock({...newStock, image:url})} primaryColor={P} shape="rect" size={96} />
                  );
                })()}
                <div style={{ position:'relative' }}>
                  <label style={{ fontSize:13, fontWeight:700, color:'#5a4030', display:'block', marginBottom:6 }}>Nom du produit</label>
                  <input value={newStock.name} onChange={e => setNewStock({...newStock, name:e.target.value})} placeholder="Ex: Tomate, Riz, Gombo..."
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid #EDE7DE', outline:'none', fontSize:15, fontFamily:'inherit', boxSizing:'border-box' }} />
                  {newStock.name.length >= 2 && suggererProduits(newStock.name).length > 0 && !suggererProduits(newStock.name).some(p => p.nom === newStock.name) && (
                    <div style={{ position:'absolute', zIndex:50, width:'100%', marginTop:4, background:'white', borderRadius:14, border:'2px solid #FFF3EA', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden' }}>
                      {suggererProduits(newStock.name).map(p => (
                        <button key={p.nom} onClick={() => setNewStock({...newStock, name:p.nom, image:p.image, unit:p.unite, purchasePrice:p.prixAchat, salePrice:p.prixVente, category:p.categorie})}
                          style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', borderBottom:'1px solid #f5f0eb' }}>
                          <img src={p.image} alt={p.nom} style={{ width:40, height:40, borderRadius:8, objectFit:'cover' }} />
                          <div style={{ textAlign:'left' }}>
                            <div style={{ fontSize:14, fontWeight:700, color:'#1a1206' }}>{p.nom}</div>
                            <div style={{ fontSize:11, color:'#aaa' }}>{p.categorie} · {p.unite} · {p.prixVente} FCFA</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:13, fontWeight:700, color:'#5a4030', display:'block', marginBottom:6 }}>Quantité</label>
                    {/* Réglage au doigt (− / +) pour éviter de taper un nombre. */}
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <motion.button type="button" whileTap={{ scale:0.9 }} aria-label="Moins"
                        onClick={() => setNewStock({...newStock, quantity: Math.max(0, (Number(newStock.quantity)||0) - 1)})}
                        style={{ width:44, height:46, flexShrink:0, borderRadius:12, border:'none', background:'#F0E7DE', color:P, fontSize:24, fontWeight:900, cursor:'pointer' }}>−</motion.button>
                      <input type="number" value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity:e.target.value === '' ? '' as any : Number(e.target.value)})}
                        style={{ width:'100%', minWidth:0, padding:'12px 6px', borderRadius:12, border:'1.5px solid #EDE7DE', outline:'none', fontSize:18, fontWeight:800, textAlign:'center', fontFamily:'inherit', boxSizing:'border-box' }} />
                      <motion.button type="button" whileTap={{ scale:0.9 }} aria-label="Plus"
                        onClick={() => setNewStock({...newStock, quantity: (Number(newStock.quantity)||0) + 1})}
                        style={{ width:44, height:46, flexShrink:0, borderRadius:12, border:'none', background:P, color:'white', fontSize:24, fontWeight:900, cursor:'pointer' }}>+</motion.button>
                    </div>
                  </div>
                  <SelectWithAutre label="Unité" value={newStock.unit} onChange={v => setNewStock({...newStock, unit:v})} options={['kg','L','tas','régimes','sac','tonne','carton']} primaryColor={P} placeholder="Ex: bouteille..." />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:13, fontWeight:700, color:'#5a4030', display:'block', marginBottom:6 }}>Prix achat (FCFA)</label>
                    <input type="number" value={newStock.purchasePrice} onChange={e => setNewStock({...newStock, purchasePrice:e.target.value === '' ? '' as any : Number(e.target.value)})}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid #EDE7DE', outline:'none', fontSize:15, fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:13, fontWeight:700, color:'#5a4030', display:'block', marginBottom:6 }}>Prix vente (FCFA)</label>
                    <input type="number" value={newStock.salePrice} onChange={e => setNewStock({...newStock, salePrice:e.target.value === '' ? '' as any : Number(e.target.value)})}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid #EDE7DE', outline:'none', fontSize:15, fontFamily:'inherit', boxSizing:'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:13, fontWeight:700, color:'#5a4030', display:'block', marginBottom:6 }}>Seuil d'alerte</label>
                  <input type="number" value={newStock.threshold} onChange={e => setNewStock({...newStock, threshold:e.target.value === '' ? '' as any : Number(e.target.value)})}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid #EDE7DE', outline:'none', fontSize:15, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
                <motion.button whileTap={{ scale:0.97 }} onClick={addStockItem}
                  style={{ width:'100%', background:P, border:'none', borderRadius:16, padding:'17px 0', fontSize:17, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit' }}>
                  Ajouter au stock
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDITION */}
      <AnimatePresence>
        {showEdit && selectedStock && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={() => { setShowEdit(false); setInlineEdit(false); }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '92vh', overflowY: 'auto', fontFamily: 'system-ui,sans-serif' }}
            >
              {/* HERO */}
              <div style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden', flexShrink: 0 }}>
                <ImageWithFallback
                  src={selectedStock.image || getImageByNom(selectedStock.name)}
                  alt={selectedStock.name}
                  className="w-full h-full object-cover"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 35%, rgba(0,0,0,0.05) 100%)' }} />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowEdit(false); setInlineEdit(false); }}
                  style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={15} color="white" />
                </motion.button>
                <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 7 }}>
                    {selectedStock.name}
                  </div>
                  {!inlineEdit && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: 'rgba(0,0,0,0.4)', color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
                        Seuil : {selectedStock.threshold} {selectedStock.unit}
                      </span>
                      <span style={{
                        background: selectedStock.quantity <= 0 ? '#dc2626' : selectedStock.quantity < selectedStock.threshold ? '#ef4444' : '#16a34a',
                        color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800,
                      }}>
                        {selectedStock.quantity <= 0 ? 'Rupture' : selectedStock.quantity < selectedStock.threshold ? 'Stock bas' : 'En stock'}
                      </span>
                    </div>
                  )}
                  {inlineEdit && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Modifie les informations du produit
                    </div>
                  )}
                </div>
              </div>

              {/* CORPS */}
              <div style={{ padding: '16px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* VUE DETAIL */}
                {!inlineEdit && (
                <>
                  {/* 1. PRIX & MARGE */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                      Prix & Marge
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: '#FFF7F0', border: '1.5px solid #FDDFC4', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Achat</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#EA580C', lineHeight: 1, marginBottom: 2 }}>
                          {(selectedStock.purchasePrice || 0).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#C2410C', opacity: 0.65, marginBottom: 5 }}>
                          FCFA / {selectedStock.unit}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#C2410C' }}>
                          Marge : {(selectedStock.salePrice - selectedStock.purchasePrice).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                      <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Vente</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#16A34A', lineHeight: 1, marginBottom: 2 }}>
                          {(selectedStock.salePrice || 0).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#15803D', opacity: 0.65, marginBottom: 5 }}>
                          FCFA / {selectedStock.unit}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D' }}>
                          {selectedStock.purchasePrice > 0
                            ? `+${Math.round(((selectedStock.salePrice - selectedStock.purchasePrice) / selectedStock.purchasePrice) * 100)}% benefice`
                            : '— benefice'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#f5f0ea' }} />

                  {/* 2. STOCK ACTUEL */}
                  <div style={{ background: '#FFF8F3', border: '1.5px solid #FDDFC4', borderRadius: 16, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Stock actuel</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#EA580C' }}>
                        {Math.min(100, Math.round((selectedStock.quantity / Math.max(selectedStock.threshold * 2, 1)) * 100))}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 10 }}>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => updateQty(selectedStock.id, Math.max(0, selectedStock.quantity - 1))}
                        style={{ width: 40, height: 40, borderRadius: 12, background: 'white', border: '1.5px solid #e5e0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </motion.button>
                      <div style={{ textAlign: 'center' }}>
                        <AnimatedNumber
                          value={selectedStock.quantity}
                          color={selectedStock.quantity <= 0 ? '#dc2626' : selectedStock.quantity < selectedStock.threshold ? '#ef4444' : '#16a34a'}
                          size={44}
                        />
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#aaa', marginTop: 2 }}>{selectedStock.unit}</div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => updateQty(selectedStock.id, selectedStock.quantity + 1)}
                        style={{ width: 40, height: 40, borderRadius: 12, background: P, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </motion.button>
                    </div>
                    <div style={{ background: '#f0ebe3', borderRadius: 20, height: 5, overflow: 'hidden', marginBottom: 6 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.round((selectedStock.quantity / Math.max(selectedStock.threshold * 2, 1)) * 100))}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                          height: '100%', borderRadius: 20,
                          background: selectedStock.quantity <= 0
                            ? '#dc2626'
                            : selectedStock.quantity < selectedStock.threshold
                              ? 'linear-gradient(90deg,#fb923c,#ef4444)'
                              : 'linear-gradient(90deg,#4ade80,#16a34a)',
                        }}
                      />
                    </div>
                    {selectedStock.quantity < selectedStock.threshold && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                        Stock bas — reapprovisionner
                      </div>
                    )}
                  </div>

                  {/* 3. VALEUR + DERNIER MOUVEMENT */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#F8F5F2', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Valeur stock</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a' }}>
                        {(selectedStock.quantity * selectedStock.salePrice || 0).toLocaleString('fr-FR')}
                      </div>
                      <div style={{ fontSize: 9, color: '#bbb', fontWeight: 600, marginTop: 2 }}>FCFA total</div>
                    </div>
                    <div style={{ background: '#F8F5F2', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Dernier mouvement</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a1a' }}>
                        {mouvements[0]?.day || '—'}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: mouvements[0]?.qty > 0 ? '#16a34a' : '#ef4444', marginTop: 2 }}>
                        {mouvements[0] ? `${mouvements[0].qty > 0 ? '+' : ''}${mouvements[0].qty} ${selectedStock.unit}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#f5f0ea' }} />

                  {/* 4. REAPPROVISIONNER */}
                  <div style={{ border: '1.5px solid #EDE7DE', borderRadius: 16, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 2 }}>Reapprovisionner</div>
                    <div style={{ fontSize: 10, color: '#bbb', fontWeight: 600, marginBottom: 10 }}>
                      Combien de {selectedStock.unit} tu veux ajouter ?
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={reappQty}
                        onChange={e => setReappQty(e.target.value)}
                        type="number"
                        placeholder="0"
                        style={{ flex: 1, border: '1.5px solid #EDE7DE', borderRadius: 12, padding: '10px 14px', fontSize: 16, fontWeight: 700, color: '#1a1a1a', textAlign: 'center', outline: 'none', fontFamily: 'inherit', background: 'white' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', padding: '0 4px' }}>{selectedStock.unit}</span>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleReapp}
                        style={{ background: P, color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        + Ajouter
                      </motion.button>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#f5f0ea' }} />

                  {/* 5. DERNIERS MOUVEMENTS */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
                      Derniers mouvements
                    </div>
                    {mouvements.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < mouvements.length - 1 ? '1px solid #f5f0ea' : 'none' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 10, background: m.qty > 0 ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {m.qty > 0
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: '#bbb', fontWeight: 600, marginTop: 1 }}>{m.day}</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: m.qty > 0 ? '#16a34a' : '#ef4444' }}>
                          {m.qty > 0 ? '+' : ''}{m.qty} {selectedStock.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
                )}

                {/* VUE MODIFIER */}
                {inlineEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Nom du produit</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE7DE', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Quantite</label>
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={e => setEditForm({ ...editForm, quantity: e.target.value === '' ? '' as any : Number(e.target.value) })}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE7DE', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a' }}
                      />
                    </div>
                    <SelectWithAutre
                      label="Unite"
                      value={editForm.unit}
                      onChange={v => setEditForm({ ...editForm, unit: v })}
                      options={['kg', 'L', 'tas', 'regimes', 'sac', 'tonne', 'carton']}
                      primaryColor={P}
                      placeholder="Ex: bouteille..."
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Prix achat (FCFA)</label>
                      <input
                        type="number"
                        value={editForm.purchasePrice}
                        onChange={e => setEditForm({ ...editForm, purchasePrice: e.target.value === '' ? '' as any : Number(e.target.value) })}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE7DE', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Prix vente (FCFA)</label>
                      <input
                        type="number"
                        value={editForm.salePrice}
                        onChange={e => setEditForm({ ...editForm, salePrice: e.target.value === '' ? '' as any : Number(e.target.value) })}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE7DE', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a' }}
                      />
                    </div>
                  </div>
                  <div style={{ background: '#FFF8F3', border: '1.5px solid #FDDFC4', borderRadius: 14, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marge</span>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', marginBottom: 2 }}>Nette</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: P }}>
                          {(editForm.salePrice - editForm.purchasePrice).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#aaa' }}>FCFA/{editForm.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#bbb', marginBottom: 2 }}>%</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: editForm.purchasePrice > 0 ? '#16a34a' : '#aaa' }}>
                          {editForm.purchasePrice > 0
                            ? `+${Math.round(((editForm.salePrice - editForm.purchasePrice) / editForm.purchasePrice) * 100)}%`
                            : '—'
                          }
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: '#aaa' }}>benefice</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Photo</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {editForm.image && (
                        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1.5px solid #EDE7DE' }}>
                          <img src={editForm.image} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #EDE7DE', borderRadius: 12, padding: '9px 14px', cursor: 'pointer', background: 'white' }}>
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => setEditForm({ ...editForm, image: ev.target?.result as string });
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: P }}>Changer la photo</span>
                        </label>
                        {editForm.image && (
                          <button type="button" onClick={() => setEditForm({ ...editForm, image: '' })}
                            style={{ border: '1.5px solid #fca5a5', borderRadius: 12, padding: '9px 14px', background: 'white', fontSize: 13, fontWeight: 700, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                            Supprimer la photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#f5f0ea' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P, marginBottom: 8, cursor: 'pointer' }}>
                      Parametres avances
                    </div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>
                      Seuil alerte stock
                    </label>
                    <input
                      type="number"
                      value={editForm.threshold}
                      onChange={e => setEditForm({ ...editForm, threshold: e.target.value === '' ? '' as any : Number(e.target.value) })}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE7DE', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: '#1a1a1a' }}
                    />
                  </div>
                </div>
                )}

                {/* FOOTER BOUTONS */}
                {!inlineEdit ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setInlineEdit(true)}
                        style={{ padding: '13px 0', borderRadius: 14, background: 'white', border: `2px solid ${P}`, fontSize: 14, fontWeight: 800, color: P, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Modifier
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setShowEdit(false); setShowVente(true); }}
                        style={{ padding: '13px 0', borderRadius: 14, background: P, border: 'none', fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Vendre
                      </motion.button>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => deleteItem(selectedStock.id)}
                      style={{ width: '100%', padding: '11px 0', borderRadius: 14, background: 'white', border: '1.5px solid #fca5a5', fontSize: 13, fontWeight: 700, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Supprimer ce produit
                    </motion.button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setInlineEdit(false)}
                      style={{ padding: '13px 0', borderRadius: 14, background: 'white', border: '1.5px solid #EDE7DE', fontSize: 14, fontWeight: 700, color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Annuler
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={saveInlineEdit}
                      style={{ padding: '13px 0', borderRadius: 14, background: P, border: 'none', fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Enregistrer
                    </motion.button>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
        {showValue && (() => {
          const totalBuy = stocks.reduce((s,p) => s+p.quantity*p.purchasePrice, 0);
          const totalSell = stocks.reduce((s,p) => s+p.quantity*p.salePrice, 0);
          const marge = totalSell - totalBuy;
          const roi = totalBuy > 0 ? ((marge/totalBuy)*100).toFixed(1) : '0';
          return (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end' }}
              onClick={() => setShowValue(false)}>
              <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:25 }}
                onClick={e => e.stopPropagation()}
                style={{ background:'white', borderRadius:'24px 24px 0 0', width:'100%', maxHeight:'85vh', overflowY:'auto', fontFamily:'system-ui,sans-serif' }}>
                <div style={{ background:'linear-gradient(160deg,#1D9E75,#0f6e56)', padding:'14px 16px 20px' }}>
                  <div style={{ width:40, height:4, background:'rgba(255,255,255,0.3)', borderRadius:2, margin:'0 auto 14px' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:20, fontWeight:900, color:'white' }}>Valeur du stock</div>
                    <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowValue(false)}
                      style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <X size={16} color="white" />
                    </motion.button>
                  </div>
                </div>
                <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      { label:'Valeur achat', value:totalBuy, color:'#ef4444', bg:'#FEF2F2' },
                      { label:'Valeur vente', value:totalSell, color:'#1D9E75', bg:'#F0FAF5' },
                      { label:'Marge totale', value:marge, color:P, bg:'#FFF3EA' },
                    ].map((k) => (
                      <div key={k.label} style={{ background:k.bg, borderRadius:14, padding:14, border:`1.5px solid ${k.color}33` }}>
                        <div style={{ fontSize:11, color:'#aaa', fontWeight:700, marginBottom:6 }}>{k.label}</div>
                        <Montant value={k.value} size="md" color={k.color} />
                      </div>
                    ))}
                    <div style={{ background:'#F5F0FF', borderRadius:14, padding:14, border:'1.5px solid #a78bfa33' }}>
                      <div style={{ fontSize:11, color:'#aaa', fontWeight:700, marginBottom:6 }}>ROI</div>
                      <div style={{ fontSize:22, fontWeight:900, color:'#7c3aed' }}>+{roi}%</div>
                    </div>
                  </div>
                  <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:14, overflow:'hidden' }}>
                    <div style={{ padding:'12px 14px', borderBottom:'1px solid #f5f0eb', fontSize:13, fontWeight:800, color:'#1a1206' }}>Top 3 produits</div>
                    {stocks.map(s=>({...s,val:s.quantity*s.salePrice})).sort((a,b)=>b.val-a.val).slice(0,3).map((p,i) => (
                      <div key={p.id} style={{ padding:'12px 14px', borderBottom:i<2?'1px solid #f5f0eb':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:28, height:28, borderRadius:8, background:i===0?'#f59e0b':i===1?'#9ca3af':'#c97316', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'white' }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:'#1a1206' }}>{p.name}</div>
                            <div style={{ fontSize:11, color:'#aaa' }}>{p.quantity} {p.unit}</div>
                          </div>
                        </div>
                        <Montant value={p.val} size="sm" color="#1D9E75" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <ToastContainer />
      <RaccourcisProvider>
        <ObjectifProvider ventes={caisseStats?.ventesJour || 0}>
          <VenteVocaleModal isOpen={showVente} onClose={() => setShowVente(false)} />
        </ObjectifProvider>
      </RaccourcisProvider>
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4">
            <p className="text-lg font-semibold">Supprimer ce produit ?</p>
            <div className="flex gap-3">
              <button onClick={() => { void deleteItem(confirmDeleteId, true); }} className="flex-1 bg-red-500 text-white py-2 rounded-xl">Supprimer</button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 bg-gray-100 py-2 rounded-xl">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}