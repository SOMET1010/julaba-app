import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { nombreEnMotsFr } from '../../i18n/voice/argent/deuxFormes';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { suggererProduits, getImageByNom, rechercherProduitCatalogue, CATALOGUE_PRODUITS } from '../../data/catalogue-produits';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Package, TrendingUp, AlertCircle, Plus, Search, Trash2, X, Mic, MicOff, Edit3, BarChart3, Eye, EyeOff, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Montant } from '../shared/Montant';
import { prixDicte } from '../../services/prixDeLaMarchande';
import { AjoutProduitGuide } from './AjoutProduitGuide';
import { BoutonDireProduit } from './BoutonDireProduit';
import type { EcouteProduit } from '../../services/produitDit';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../hooks/useToast';
import { ImagePickerField } from '../shared/ImagePickerField';
import { ModalPortal } from '../shared/ModalPortal';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import { NotificationButton } from './NotificationButton';
import { useCaisse } from '../../contexts/CaisseContext';
import { useStock } from '../../contexts/StockContext';
import { eventBus, EVENTS } from '../../services/eventBus';
import { guidageVocal } from '../../utils/accessMode';
import { toast } from 'sonner';
import { UNITES_COURANTES } from '../../config/unites';
import { API_URL } from '../../utils/api';
import { mapApiMouvements, quantiteMouvement, mentionUniteInconnue, type MouvementUI } from '../../services/mouvementsStock';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { vignetteProduit } from '../../utils/emojiTile';
import { useMontantsPrives } from '../../hooks/useMontantsPrives';

const P = 'var(--commerce-action)';

interface Stock {
  id: string; name: string; image: string;
  quantity: number; unit: string;
  purchasePrice: number; salePrice: number;
  threshold: number; category: string;
  promoPrice?: number | null; promoFin?: string | null;
}

function SwipeableCard({ stock, montantsMasques, onTap, onDelete }: { stock: Stock; montantsMasques: boolean; onTap: () => void; onDelete: () => void }) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-72, -20], [1, 0]);
  const isLow = stock.quantity < stock.threshold;
  const isEmpty = stock.quantity <= 0;
  const benefice = stock.salePrice - stock.purchasePrice;
  const marginPct = stock.purchasePrice > 0 ? Math.round((benefice / stock.purchasePrice) * 100) : 0;
  const borderColor = isEmpty ? 'var(--destructive)' : isLow ? 'var(--color-red-500)' : 'var(--color-green-600)';
  const stockPct = Math.min(100, Math.round((stock.quantity / Math.max(stock.threshold * 2, 1)) * 100));

  return (
    <div style={{ position: 'relative', borderRadius: 22, minWidth: 0 }}>
      {/* Fond swipe suppression */}
      <motion.div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
        background: 'var(--color-red-500)', display: 'flex', alignItems: 'center',
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
            background: 'var(--herite-blanc-pur)',
            minWidth: 0,
          }}
        >
          {/* Image */}
          <div style={{ position: 'relative', height: 115, overflow: 'hidden' }}>
            <ImageWithFallback
              src={stock.image || undefined}
              fallbackSrc={getImageByNom(stock.name)}
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
              fontSize: 8, fontWeight: 900, color: 'var(--herite-blanc-pur)',
              textTransform: 'uppercase', letterSpacing: '0.4px',
            }}>
              {isEmpty ? '✕ Rupture' : isLow ? '⚠ Stock bas' : '✓ En stock'}
            </div>
            {/* Pill marge haut droite */}
            {!montantsMasques && marginPct !== 0 && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
                borderRadius: 30, padding: '2px 7px',
                fontSize: 8, fontWeight: 900, color: 'var(--herite-blanc-pur)',
              }}>
                {marginPct > 0 ? '+' : ''}{marginPct}%
              </div>
            )}
            {/* Nom produit bas gauche */}
            <div style={{
              position: 'absolute', bottom: 8, left: 10,
              fontSize: 14, fontWeight: 900, color: 'var(--herite-blanc-pur)',
              textShadow: '0 1px 6px rgba(0,0,0,0.55)',
            }}>
              {stock.name}
            </div>
          </div>

          {/* Corps blanc */}
          <div style={{ padding: '11px 10px 13px', background: 'var(--herite-blanc-pur)' }}>

            {/* Quantité centrée */}
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'center',
              gap: 4, marginBottom: 8,
            }}>
              <span style={{ fontSize:40, fontWeight:900, color:isEmpty ? 'var(--destructive)' : isLow ? 'var(--color-red-500)' : 'var(--color-green-600)' }}>
                {stock.quantity.toLocaleString('fr-FR')}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: isEmpty ? 'var(--destructive)' : isLow ? 'var(--color-red-500)' : 'var(--encre-4)',
              }}>
                {stock.unit}
              </span>
            </div>

            {/* Barre stock + seuil */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 8, fontWeight: 700, color: 'var(--herite-gris-80)',
                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 4,
              }}>
                <span>Stock</span>
                <span>seuil : {stock.threshold} {stock.unit}</span>
              </div>
              <div style={{ background: 'var(--commerce-gray-100)', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stockPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%', borderRadius: 20,
                    background: isEmpty
                      ? 'var(--destructive)'
                      : isLow
                        ? 'linear-gradient(90deg,var(--color-orange-400),var(--color-red-500))'
                        : 'linear-gradient(90deg,var(--color-green-400),var(--color-green-600))',
                  }}
                />
              </div>
            </div>

            {/* Séparateur */}
            <div style={{ height: 1, background: 'var(--commerce-paper)', marginBottom: 10 }} />

            {/* Prix Achat / Vente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{
                background: 'var(--julaba-ivoire)', border: '1.5px solid var(--julaba-sable)',
                borderRadius: 12, padding: '7px 6px', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, color: 'var(--color-orange-700)',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                }}>Achat</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-orange-600)', lineHeight: 1 }}>
                  {montantsMasques ? '•••••' : (stock.purchasePrice || 0).toLocaleString('fr-FR')}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--color-orange-700)', opacity: 0.65, marginTop: 2 }}>
                  FCFA/{stock.unit}
                </div>
              </div>
              <div style={{
                background: 'var(--color-green-50)', border: '1.5px solid var(--color-green-200)',
                borderRadius: 12, padding: '7px 6px', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 900, color: 'var(--color-green-700)',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                }}>Vente</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-green-600)', lineHeight: 1 }}>
                  {montantsMasques ? '•••••' : (stock.salePrice || 0).toLocaleString('fr-FR')}
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--color-green-700)', opacity: 0.65, marginTop: 2 }}>
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

/** La saisie d'un produit. `''` = pas encore saisi — ce n'est ni un montant,
 *  ni un zero, et le distinguer est tout l'objet de STK-02. */
type SaisieProduit = {
  name: string; image: string; quantity: number; unit: string;
  purchasePrice: number | ''; salePrice: number | '';
  threshold: number; category: string; datePeremption: string;
  promoPrice: number | string; promoFin: string;
};

export function GestionStock() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast, ToastContainer } = useToast();
  const { products, addProduct, updateProduct, deleteProduct, refreshProducts } = useCaisse();
  const { speak, setIsModalOpen, isOnline } = useApp();
  const { montantsMasques, basculerMontants } = useMontantsPrives();
  // Retour vocal des ERREURS DE FORMULAIRE selon le profil (muet en 'lecture', où
  // le toast suffit). Les réponses aux COMMANDES VOCALES, elles, parlent toujours.
  const dire = (t: string) => { if (guidageVocal()) speak(t); };
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
        promoPrice: (p as any).prix_promo != null ? Number((p as any).prix_promo) : null,
        promoFin: (p as any).promo_fin || null,
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
  const [reappQty, setReappQty] = useState('');
  const [isListening, setIsListening] = useState(false);
  /** STK-05 — ce qu'elle vient de dire, qui preremplit le parcours guide. */
  const [departDit, setDepartDit] = useState<EcouteProduit['brouillon'] | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false); // repli des champs optionnels de l'ajout produit
  const dicteeNomRef = useRef(false); // true = la prochaine reconnaissance vocale remplit le NOM du produit (pas une commande)
  // STK-02 — LE TYPE DISAIT `number`, LE CODE ECRIVAIT `'' as any`.
  //
  // Un champ de prix a trois etats, pas deux : un montant, zero, ou PAS ENCORE
  // SAISI. Le type n'en connaissait que deux, alors les gestionnaires de
  // saisie contournaient avec un cast — et un cast est un endroit ou le
  // compilateur cesse de nous aider. On l'ecrit tel qu'il est.
  const [newStock, setNewStock] = useState<SaisieProduit>({ name:'', image:'', quantity:0, unit:'kg', purchasePrice:'', salePrice:'', threshold:10, category:'autre', datePeremption:'', promoPrice:'', promoFin:'' });
  const [inlineEdit, setInlineEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name:'', image:'', quantity:0, unit:'kg', purchasePrice:0, salePrice:0, threshold:10, category:'autre', datePeremption:'', promoPrice:'' as number|string, promoFin:'' });
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
        datePeremption: '',
        promoPrice: selectedStock.promoPrice != null ? selectedStock.promoPrice : '',
        promoFin: selectedStock.promoFin || '',
      });
    }
  }, [inlineEdit, selectedStock]);

  useEffect(() => {
    const lowCount = stocks.filter(s => s.quantity < s.threshold).length;
    if (lowCount > 0 && navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }, [stocks.length]);

  useEffect(() => { setIsModalOpen(showAdd || showEdit); }, [showAdd, showEdit, setIsModalOpen]);
  useEffect(() => { if (!showAdd) setShowAdvanced(false); }, [showAdd]); // l'ajout rouvre toujours replié

  const { startRecording, stopRecording } = useVoiceCore({
    context: { module: 'stock', prenom: user?.firstName || user?.prenoms || 'ma chere', genre: (user as any)?.genre || 'femme', userId: user?.id },
    onAction: async (data) => {
      setIsListening(false);
      // Dictée du NOM du produit (micro du champ Nom) : on capte le texte brut dicté
      // et on le pose dans le formulaire, SANS le traiter comme une commande. Permet
      // à une non-lectrice d'ajouter un produit hors catalogue sans taper son nom.
      if (dicteeNomRef.current) {
        dicteeNomRef.current = false;
        const brut = (data.transcript || '').trim();
        if (brut) {
          const nomPropre = brut.charAt(0).toUpperCase() + brut.slice(1);
          setNewStock(prev => ({ ...prev, name: nomPropre }));
          speak(nomPropre);
        } else {
          speak("Je n'ai pas entendu le nom. Réessaie, s'il te plaît.");
        }
        return;
      }
      const a: any = data.action || {};
      const text = (data.transcript || '').toLowerCase();

      // LE BLOC `ajouter_stock` A ÉTÉ RETIRÉ — STK-05, 24/09.
      //
      // Il attendait une action que RIEN ne produisait : `ajouter_stock` avait
      // quatre occurrences dans le dépôt, toutes consommatrices, aucun
      // producteur. `intentLocal` ne fabrique que `vendre` et `depense`, et le
      // mot « ajoute » est dans `MOTS_PAS_UNE_VENTE` — il ferme une porte au
      // lieu d'en ouvrir une. Ce bloc n'a jamais pu s'exécuter.
      //
      // Il portait en plus une SECONDE NAISSANCE de produit : catégorie, unité
      // et seuil d'alerte repris d'un catalogue générique, stock initial qu'elle
      // n'avait pas compté. C'est STK-03g, que l'autre naissance avait déjà
      // payé. Deux naissances, deux règles — et celle-ci ne recevait jamais les
      // correctifs de l'autre.
      //
      // L'ajout par la voix passe maintenant par `BoutonDireProduit` →
      // `produitDit` → `AjoutProduitGuide` : un seul chemin de création.

      if (text.includes('alerte') || text.includes('stock bas')) {
        const low = stocks.filter(s => s.quantity < s.threshold);
        speak(low.length === 0 ? 'Tous tes stocks sont bons' : `${low.length} produits en stock bas : ${low.map(s => s.name).join(', ')}`);
      } else if (text.includes('valeur')) {
        if (montantsMasques) {
          speak("Tes montants sont cachés. Appuie sur l'œil pour les afficher.");
          return;
        }
        const val = stocks.reduce((s, p) => s + p.quantity * p.salePrice, 0);
        speak(`La valeur totale est ${nombreEnMotsFr(val)} francs`);
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

  // Mouvements RÉELS lus sur le ledger stock_mouvements (ventes + annulations),
  // via l'API. Fini le mock (stocks.slice(0,3) + quantités inventées + jours codés
  // en dur, non filtrés par produit). `mouvements` = panneau accueil (tous produits) ;
  // `produitMouvements` = fiche du produit sélectionné (corrige « non filtrés »).
  // NB : les réappros manuels ne passent pas par ce ledger → n'apparaissent pas.
  const [mouvements, setMouvements] = useState<MouvementUI[]>([]);
  const [produitMouvements, setProduitMouvements] = useState<MouvementUI[]>([]);

  const chargerMouvements = useCallback(async (url: string): Promise<MouvementUI[]> => {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return mapApiMouvements(data?.mouvements);
    } catch { return []; }
  }, []);

  useEffect(() => {
    let vivant = true;
    const rafraichir = () => {
      void chargerMouvements(`${API_URL}/stocks/mouvements`).then(m => { if (vivant) setMouvements(m); });
    };
    rafraichir();
    const u1 = eventBus.subscribe(EVENTS.TRANSACTION_CREATED, rafraichir);
    const u2 = eventBus.subscribe(EVENTS.CAISSE_VENTE, rafraichir);
    return () => { vivant = false; u1(); u2(); };
  }, [chargerMouvements]);

  useEffect(() => {
    if (!selectedStock?.id) { setProduitMouvements([]); return; }
    let vivant = true;
    void chargerMouvements(`${API_URL}/stocks/${selectedStock.id}/mouvements`).then(m => { if (vivant) setProduitMouvements(m); });
    return () => { vivant = false; };
  }, [selectedStock?.id, chargerMouvements]);

  // STK-03c — `addStockItem` A DISPARU AVEC SON FORMULAIRE.
  //
  // Il était la SECONDE naissance d'un produit : il reprenait la catégorie et
  // l'image d'une entrée du catalogue générique (`rechercherProduitCatalogue`),
  // imposait un seuil d'alerte par défaut, et acceptait un stock initial que
  // la marchande n'avait pas compté. Deux naissances, c'est deux règles — et
  // celle-ci n'a jamais reçu les correctifs de l'autre.
  //
  // La création passe désormais par `AjoutProduitGuide`, le même écran que la
  // caisse : son nom, son unité, son prix. Rien d'autre.
  //
  // CE QUI RESTE ICI est ce que le stock sait faire et que la caisse ne fait
  // pas : MODIFIER et RÉAPPROVISIONNER un produit DÉJÀ adopté. Là, les champs
  // gardent leur sens — elle corrige ce qu'elle a elle-même posé.


  const updateQty = async (id: string, qty: number) => {
    stockCtx.updateStock(id, { quantite: qty });
    try {
      await updateProduct(id, { stock: qty });
      toast.success('Produit mis à jour');
      speak('C\'est mis à jour.');
    } catch {
      toast.error('Opération impossible. Réessaie.');
      speak("Ça n'a pas marché. Réessaie, s'il te plaît.");
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
    // Cible le produit par ID EXACT d'abord, repli par nom seulement s'il n'y a pas
    // de correspondance d'id : sinon, avec deux produits de même nom, Array.find
    // renverrait le premier homonyme et on supprimerait le MAUVAIS produit.
    const p = products.find(x => x.id === id) || (s?.name ? products.find(x => x.nom === s.name) : undefined);
    // On ATTEND la vraie réponse avant d'annoncer : la suppression touche
    // /caisse/produits (Kassa) et/ou /stocks. On réussit si au moins l'une aboutit.
    // Plus d'annonce « supprimé » avant confirmation (illusion de perte de donnée).
    let supprime = false;
    if (p) {
      try { await deleteProduct(p.id); supprime = true; }
      catch (e: any) { console.warn('[GestionStock] deleteProduct failed:', e?.message); }
    }
    try { await stockCtx.deleteStock(id); supprime = true; }
    catch (e: any) { console.warn('[GestionStock] deleteStock failed:', e?.message); }

    setConfirmDeleteId(null);
    if (supprime) {
      toast.success('Produit supprimé');
      speak(`${s?.name} supprimé`);
      showToast(`${s?.name} supprimé`, 'info');
      setShowEdit(false);
      setInlineEdit(false);
    } else {
      // Échec réel (ex. 401) : on le DIT et on garde la fiche ouverte, plutôt que
      // de faire croire à une suppression qui n'a pas eu lieu.
      toast.error('Suppression impossible. Réessaie.');
      speak("Ça n'a pas marché. Le produit n'est pas supprimé.");
    }
  };

  const saveInlineEdit = async () => {
    if (!selectedStock) return;
    const id = selectedStock.id;
    // La liste affichée fusionne DEUX sources (Kassa /caisse/produits et /stocks).
    // L'id de la ligne peut donc être un id /stocks : dans ce cas un PUT
    // /caisse/produits/:id ne trouve rien et la modif est perdue au rechargement.
    // On résout le vrai produit Kassa (par id OU par nom) ; s'il n'existe pas
    // encore côté Kassa, on le crée pour que la modification soit bien persistée.
    // ID exact d'abord, repli par nom ensuite : évite d'éditer un homonyme
    // (deux produits de même nom → Array.find renverrait le premier).
    const kassa = products.find((x: any) => x.id === id) || products.find((x: any) => x.nom === selectedStock.name);
    const champs = {
      nom: editForm.name,
      prix: editForm.salePrice,
      stock: editForm.quantity,
      unite: editForm.unit,
      categorie: editForm.category,
      image: editForm.image || undefined,
      seuil_alerte: editForm.threshold,
      prix_achat: editForm.purchasePrice,
      prix_promo: editForm.promoPrice !== '' ? Number(editForm.promoPrice) : null,
      promo_fin: editForm.promoFin || null,
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
        promoPrice: editForm.promoPrice !== '' ? Number(editForm.promoPrice) : null,
        promoFin: editForm.promoFin || null,
      });
      setInlineEdit(false);
      speak(`${editForm.name} mis à jour`);
      showToast('Produit mis à jour', 'success');
    } catch (err: unknown) {
      toast.error('Erreur lors de la sauvegarde');
      speak("Ça n'a pas été enregistré. Réessaie, s'il te plaît.");
      console.warn('[GestionStock] saveInlineEdit failed:', err instanceof Error ? err.message : err);
    }
  };

  return (
    <>
    <SubPageLayout
      role="marchand"
      title="Mes produits"
      subtitle={`${stocks.length} produit${stocks.length > 1 ? 's' : ''} · ${lowStocks.length} alerte${lowStocks.length > 1 ? 's' : ''}`}
      rightContent={
        <div style={{ display: 'flex', gap: 7 }}>
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => { if (!montantsMasques) setSortByMargin(false); basculerMontants(); }}
            aria-label={montantsMasques ? 'Afficher les montants' : 'Cacher les montants'}
            style={{ width:44, height:44, borderRadius:14, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {montantsMasques ? <EyeOff size={19} color="white" /> : <Eye size={19} color="white" />}
          </motion.button>
          {/* Alertes de stock : icône DÉLIBÉRÉMENT différente de la cloche
              Notifications (même icône que celle-ci ailleurs prêtait à
              confusion — audit accueil/tuiles). Alertes de rupture, distinct
              de la boîte de réception générale. */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/marchand/alertes')} aria-label="Voir les alertes de stock"
            style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
            <AlertCircle size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            {lowStocks.length > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 3px', background: 'var(--color-red-500)', borderRadius: 9, fontSize: 9, fontWeight: 900, color: 'var(--herite-blanc-pur)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(143,68,24,0.9)' }}>
                {lowStocks.length > 9 ? '9+' : lowStocks.length}
              </span>
            )}
          </motion.button>
          <NotificationButton />
        </div>
      }
    >
        <div style={{ padding:'14px 0 0' }}>

          {!isOnline && (
            <div role="status" style={{ marginBottom:12, background:'var(--color-orange-50)', border:'1.5px solid var(--color-orange-300)', borderRadius:16, padding:'11px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
              <WifiOff size={20} color="var(--color-orange-700)" style={{ flexShrink:0, marginTop:1 }} />
              <div style={{ fontSize:13, lineHeight:1.4, color:'var(--color-orange-900)' }}><strong>Hors connexion.</strong> Tu vois le stock gardé sur ce téléphone. Les changements seront confirmés quand le réseau revient.</div>
            </div>
          )}

          <KPIGrid cols={2}>
            <UniversalKPI label="Produits" animatedTarget={stocks.length} icon={Package} color="var(--herite-bleu-vif)" bgColor="rgba(239,246,255,0.9)" borderColor="rgba(59,130,246,0.35)" iconAnimation="bounce" onClick={() => setActiveKPI('all')} active={activeKPI==='all'} />
            <UniversalKPI label="Alertes" animatedTarget={lowStocks.length} icon={AlertCircle} color="var(--color-orange-600)" bgColor="rgba(255,247,237,0.9)" borderColor="rgba(249,115,22,0.35)" iconAnimation="pulse" onClick={() => setActiveKPI(activeKPI==='alerts'?'all':'alerts')} active={activeKPI==='alerts'} />
            <UniversalKPI label="Valeur stock" value={totalValue.toLocaleString('fr-FR')} masque={montantsMasques} suffix="FCFA" icon={TrendingUp} color="var(--color-green-600)" bgColor="rgba(240,253,244,0.9)" borderColor="rgba(34,197,94,0.35)" iconAnimation="none" onClick={() => setShowValue(true)} />
            <UniversalKPI label="Prix moyen" value={(stocks.length > 0 ? Math.round(totalValue / stocks.length) : 0).toLocaleString('fr-FR')} masque={montantsMasques} suffix="FCFA" icon={BarChart3} color="#9F8170" bgColor="rgba(249,244,240,0.9)" borderColor="rgba(159,129,112,0.35)" iconAnimation="none" />
          </KPIGrid>

          {/* LES DEUX PORTES VERS LES CHIFFRES SONT PARTIES D'ICI — 24/09/2026.
              Décision déjà rendue : « "Résumé caisse" n'est plus une
              destination concurrente : il appartient à "Mes ventes" », et
              « "Ventes passées" et "Résumé détaillé" cessent d'être deux
              portes depuis le stock ».

              CE QU'IL Y AVAIT. Deux boutons côte à côte, même taille, même
              fond, même couleur d'icône, menant à deux écrans de chiffres
              différents — dans l'écran du STOCK. Une marchande qui ne lit pas
              n'a aucun moyen de les distinguer.

              Mesuré le 24/09 : SEPT portes menaient à ces deux écrans depuis
              le parcours marchande. Il en reste UNE, la tuile « Mes ventes »
              de l'accueil, qui ouvre le résumé du jour ; le détail vente par
              vente s'ouvre DEPUIS ce résumé.

              Le stock montre l'étal, pas les chiffres (STK-03). */}

          {/* Recherche + Top marge */}
          <div style={{ display:'flex', gap:8, marginBottom:12, minWidth:0 }}>
            <div style={{ flex:1, minWidth:0, background:'white', border:'1.5px solid var(--trait)', borderRadius:12, padding:'0 12px', display:'flex', alignItems:'center', gap:8, height:46 }}>
              <Search size={15} color="var(--herite-gris-40)" />
              {/* alignSelf stretch : le champ occupe toute la HAUTEUR de la barre
                  (46px). Sans cela sa zone tapable ne faisait que 21px — la
                  hauteur du texte — dans une barre deux fois plus haute. */}
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..."
                style={{ flex:1, alignSelf:'stretch', minWidth:0, border:'none', outline:'none', background:'transparent', fontSize:14, color:'var(--encre)', fontFamily:'inherit' }} />
              {/* 44x44 : ces deux boutons mesuraient 14 et 15px de cote. Un doigt
                  ne les atteint pas. Ils tiennent dans la barre de 46px. */}
              {search && <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} aria-label="Effacer la recherche"
                style={{ flexShrink:0, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <X size={16} color="var(--herite-gris-40)" />
              </motion.button>}
              <motion.button whileTap={{ scale:0.9 }} onClick={toggleMic} aria-label={isListening ? 'Arrêter la recherche vocale' : 'Chercher en parlant'}
                style={{ flexShrink:0, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                {isListening ? <MicOff size={18} color={P} /> : <Mic size={18} color="var(--herite-gris-40)" />}
              </motion.button>
            </div>
            {!montantsMasques && <motion.button whileTap={{ scale:0.95 }} onClick={() => setSortByMargin(!sortByMargin)}
              style={{ background:sortByMargin?P:'white', border:`1.5px solid ${sortByMargin?P:'var(--commerce-gray-100)'}`, borderRadius:12, padding:'0 10px', display:'flex', alignItems:'center', gap:5, height:46, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
              <TrendingUp size={13} color={sortByMargin?'white':P} />
              <span style={{ fontSize:11, fontWeight:700, color:sortByMargin?'white':P, whiteSpace:'nowrap' }}>Top marge</span>
            </motion.button>}
          </div>

          {/* AJOUT PAR LA VOIX — la voie principale pour une non-lectrice.
              STK-05 : ce bouton dictait « dis : "ajoute 10 piments a 500" » et
              rien ne comprenait cette phrase. Il ecoute vraiment maintenant, et
              ce qu'elle donne prerempli le parcours guide : on ne lui redemande
              que ce qui manque. Plus d'exemple syntaxique — elle ne le lit pas. */}
          <div style={{ marginBottom: 10 }}>
            <BoutonDireProduit
              sesProduits={(products || []).map(p => ({ nom: p.nom }))}
              dire={speak}
              onProduit={(lu) => { setDepartDit(lu.brouillon); setShowAdd(true); }}
            />
          </div>

          {/* « ÉCRIRE » N'EXISTE PLUS — STK-18, décision de Patrick.
              Le geste est « Ajouter un produit ». Parler et toucher n'en sont
              que des MOYENS ; nommer l'un d'eux « Écrire » en faisait un geste
              à part, et le mot lui-même désigne ce que la marchande ne sait
              pas faire. Les deux boutons ouvrent le même parcours guidé
              (setShowAdd) : l'un après l'avoir écoutée, l'autre directement.
              Pas « Vendre », qui n'a rien à voir avec la gestion du stock et
              est déjà accessible en un geste depuis l'accueil. */}
          <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowAdd(true)}
            style={{ width:'100%', background:'white', border:`2px solid ${P}`, borderRadius:14, padding:'12px 0', fontSize:14, fontWeight:800, color:P, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:14 }}>
            <Package size={16} /> Ajouter un produit
          </motion.button>

          {/* Grille swipeable */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14 }}>
            {filtered.map((stock) => (
              <SwipeableCard
                key={stock.id}
                stock={stock}
                montantsMasques={montantsMasques}
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
                <Package size={48} color="var(--commerce-gray-100)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--encre)', marginBottom: 6 }}>Aucun produit</div>
                {search ? (
                  <div style={{ fontSize: 13, color: 'var(--encre-4)' }}>Aucun résultat pour "{search}"</div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: 'var(--encre-4)', marginBottom: 14 }}>Ajoute ton premier produit</div>
                    <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowAdd(true)}
                      style={{ display:'inline-flex', alignItems:'center', gap:8, background:P, border:'none', borderRadius:14, padding:'12px 20px', fontSize:14, fontWeight:800, color:'white', cursor:'pointer', fontFamily:'inherit' }}>
                      <Plus size={16} /> Ajouter un produit
                    </motion.button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mouvements */}
          {mouvements.length > 0 && (
            <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:16, padding:14, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:800, color:P, marginBottom:12 }}>Derniers mouvements</div>
              <div style={{ display:'flex', gap:8 }}>
                {mouvements.slice(0,3).map((m,i) => {
                  // Le SIGNE porte la couleur et la flèche ; le NOMBRE affiché
                  // est ce qui est sorti de la boutique. Une vente de 4 kg faite
                  // sur un stock à zéro montrait « rien du tout » avant le
                  // 19/09/2026 — elle était filtrée par le backend. Elle montre
                  // maintenant 4, avec la mention « hors stock ».
                  const isPlus = m.qty > 0;
                  return (
                    <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }}
                      style={{ flex:1, background:isPlus?'var(--color-green-50)':'var(--color-red-50)', borderRadius:14, padding:'10px 6px', textAlign:'center', border:`1.5px solid ${isPlus?'var(--herite-vert-pale)':'var(--color-red-300)'}` }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:isPlus?'var(--color-green-600)':'var(--color-red-500)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 5px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          {isPlus?<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>:<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
                        </svg>
                      </div>
                      <div style={{ fontSize:17, fontWeight:900, color:isPlus?'var(--color-green-600)':'var(--color-red-500)' }}>{isPlus?'+':'−'}{m.qtyAffichee}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:isPlus?'var(--color-green-600)':'var(--color-red-500)' }}>{m.uniteConnue ? `${m.unit} ${m.name}` : m.name}</div>
                      {mentionUniteInconnue(m) && (
                        // ARG-02 : on ne comble pas le blanc avec l'unité du
                        // catalogue d'aujourd'hui. On dit qu'on ne sait pas.
                        <div style={{ fontSize:9, fontWeight:700, color:'var(--encre-4)', marginTop:2 }}>{mentionUniteInconnue(m)}</div>
                      )}
                      {m.horsStock && (
                        // Le stock enregistré ne couvrait pas cette sortie. On le
                        // DIT : sans ça, son stock reste à zéro et rien ne lui
                        // apprend ce qu'elle a réellement écoulé.
                        <div style={{ fontSize:9, fontWeight:800, color:'var(--herite-orange-brule)', marginTop:2 }}>⚠ hors stock</div>
                      )}
                      <div style={{ fontSize:9, color:'var(--encre-4)', marginTop:2 }}>{m.day}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
    </SubPageLayout>

      {/* MODAL AJOUT — STK-03c.
          IL AFFICHAIT LES 37 TUILES GÉNÉRIQUES. Toucher « Igname » posait le
          nom « Igname » — alors que le référentiel en connaît NEUF (Kponan,
          Bêtê-Bêtê, Florido, Krenglè, Lokpa, Assawa…), à quatre prix
          différents. Elle adoptait donc un produit qui n'était pas le sien,
          puis lui collait son prix : le prix juste sur le mauvais nom.
          Et le formulaire réclamait catégorie, stock, seuil, prix d'achat,
          péremption, promo — sept champs pour poser un légume.

          C'EST LE MÊME GESTE QUE DANS LA CAISSE, donc c'est le MÊME écran.
          Un second formulaire, si fidèle soit-il, est un second endroit où la
          règle peut changer sans l'autre. */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end' }}
            onClick={() => setShowAdd(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:25 }}
              onClick={e => e.stopPropagation()}
              style={{ background:'white', borderRadius:'24px 24px 0 0', width:'100%', maxHeight:'90vh', overflowY:'auto', fontFamily:'system-ui,sans-serif' }}>
              <div style={{ background:`linear-gradient(160deg,${P},var(--commerce-orange-700))`, padding:'14px 16px 20px' }}>
                <div style={{ width:40, height:4, background:'rgba(255,255,255,0.3)', borderRadius:2, margin:'0 auto 14px' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:20, fontWeight:900, color:'white' }}>Ajouter un produit</div>
                  <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowAdd(false)}
                    style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <X size={16} color="white" />
                  </motion.button>
                </div>
              </div>
              <div style={{ padding:16 }}>
                {/* SES unités déjà employées passent devant celles du marché. */}
                <AjoutProduitGuide
                  sesUnites={(products || []).map(p => p.unite || '').filter(Boolean)}
                  depart={departDit ?? undefined}
                  onPose={() => { setShowAdd(false); setDepartDit(null); void refreshProducts(); }}
                  onAnnuler={() => { setShowAdd(false); setDepartDit(null); }}
                />
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
                  style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} color="white" />
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
                        background: selectedStock.quantity <= 0 ? 'var(--destructive)' : selectedStock.quantity < selectedStock.threshold ? 'var(--color-red-500)' : 'var(--color-green-600)',
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
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                      Prix & Marge
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: 'var(--julaba-ivoire)', border: '1.5px solid var(--julaba-sable)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: 'var(--color-orange-700)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Achat</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-orange-600)', lineHeight: 1, marginBottom: 2 }}>
                          {(selectedStock.purchasePrice || 0).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-orange-700)', opacity: 0.65, marginBottom: 5 }}>
                          FCFA / {selectedStock.unit}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-orange-700)' }}>
                          {selectedStock.purchasePrice > 0
                            ? `Marge : ${(selectedStock.salePrice - selectedStock.purchasePrice).toLocaleString('fr-FR')} FCFA`
                            : 'Bénéfice inconnu'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--color-green-50)', border: '1.5px solid var(--color-green-200)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: 'var(--color-green-700)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Vente</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-green-600)', lineHeight: 1, marginBottom: 2 }}>
                          {(selectedStock.salePrice || 0).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-green-700)', opacity: 0.65, marginBottom: 5 }}>
                          FCFA / {selectedStock.unit}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-green-700)' }}>
                          {selectedStock.purchasePrice > 0
                            ? `+${Math.round(((selectedStock.salePrice - selectedStock.purchasePrice) / selectedStock.purchasePrice) * 100)}% bénéfice`
                            : '— bénéfice'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--commerce-paper)' }} />

                  {/* 2. STOCK ACTUEL */}
                  <div style={{ background: 'var(--caisse-ivoire)', border: '1.5px solid var(--julaba-sable)', borderRadius: 16, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Stock actuel</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-orange-600)' }}>
                        {Math.min(100, Math.round((selectedStock.quantity / Math.max(selectedStock.threshold * 2, 1)) * 100))}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 10 }}>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => updateQty(selectedStock.id, Math.max(0, selectedStock.quantity - 1))}
                        style={{ width: 44, height: 44, borderRadius: 12, background: 'white', border: '1.5px solid var(--commerce-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--herite-gris-33)" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </motion.button>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize:44, fontWeight:900, color:selectedStock.quantity <= 0 ? 'var(--destructive)' : selectedStock.quantity < selectedStock.threshold ? 'var(--color-red-500)' : 'var(--color-green-600)' }}>
                          {selectedStock.quantity.toLocaleString('fr-FR')}
                        </span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre-4)', marginTop: 2 }}>{selectedStock.unit}</div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => updateQty(selectedStock.id, selectedStock.quantity + 1)}
                        style={{ width: 44, height: 44, borderRadius: 12, background: P, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </motion.button>
                    </div>
                    <div style={{ background: 'var(--commerce-gray-100)', borderRadius: 20, height: 5, overflow: 'hidden', marginBottom: 6 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.round((selectedStock.quantity / Math.max(selectedStock.threshold * 2, 1)) * 100))}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                          height: '100%', borderRadius: 20,
                          background: selectedStock.quantity <= 0
                            ? 'var(--destructive)'
                            : selectedStock.quantity < selectedStock.threshold
                              ? 'linear-gradient(90deg,var(--color-orange-400),var(--color-red-500))'
                              : 'linear-gradient(90deg,var(--color-green-400),var(--color-green-600))',
                        }}
                      />
                    </div>
                    {selectedStock.quantity < selectedStock.threshold && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-red-500)', marginTop: 4 }}>
                        Stock bas — réapprovisionner
                      </div>
                    )}
                  </div>

                  {/* 3. VALEUR + DERNIER MOUVEMENT */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'var(--caisse-ivoire)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Valeur stock</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--encre)' }}>
                        {(selectedStock.quantity * selectedStock.salePrice || 0).toLocaleString('fr-FR')}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--encre-4)', fontWeight: 600, marginTop: 2 }}>FCFA total</div>
                    </div>
                    <div style={{ background: 'var(--caisse-ivoire)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Dernier mouvement</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--encre)' }}>
                        {produitMouvements[0]?.day || '—'}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: produitMouvements[0]?.qty > 0 ? 'var(--color-green-600)' : 'var(--color-red-500)', marginTop: 2 }}>
                        {produitMouvements[0] ? quantiteMouvement(produitMouvements[0], produitMouvements[0].qty) : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--commerce-paper)' }} />

                  {/* 4. REAPPROVISIONNER */}
                  <div style={{ border: '1.5px solid var(--trait)', borderRadius: 16, padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--encre)', marginBottom: 2 }}>Réapprovisionner</div>
                    <div style={{ fontSize: 10, color: 'var(--encre-4)', fontWeight: 600, marginBottom: 10 }}>
                      Combien de {selectedStock.unit} tu veux ajouter ?
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={reappQty}
                        onChange={e => setReappQty(e.target.value)}
                        type="number"
                        placeholder="0"
                        style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--trait)', borderRadius: 12, padding: '10px 14px', fontSize: 16, fontWeight: 700, color: 'var(--encre)', textAlign: 'center', outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--encre-4)', padding: '0 4px' }}>{selectedStock.unit}</span>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleReapp}
                        style={{ flexShrink: 0, background: P, color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        + Ajouter
                      </motion.button>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--commerce-paper)' }} />

                  {/* 5. DERNIERS MOUVEMENTS */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
                      Derniers mouvements
                    </div>
                    {produitMouvements.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--encre-4)', fontWeight: 600, padding: '4px 0' }}>
                        Aucune vente enregistrée pour ce produit.
                      </div>
                    ) : produitMouvements.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < produitMouvements.length - 1 ? '1px solid var(--commerce-paper)' : 'none' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 10, background: m.qty > 0 ? 'var(--color-green-100)' : 'var(--color-red-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {m.qty > 0
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-green-600)" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-red-500)" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--encre)' }}>{m.type === 'annulation' ? 'Annulation' : 'Vente'}</div>
                          <div style={{ fontSize: 10, color: 'var(--encre-4)', fontWeight: 600, marginTop: 1 }}>
                            {m.day}{mentionUniteInconnue(m) ? ` · ${mentionUniteInconnue(m)}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: m.qty > 0 ? 'var(--color-green-600)' : 'var(--color-red-500)' }}>
                          {quantiteMouvement(m, m.qty)}
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
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--herite-gris-33)', display: 'block', marginBottom: 6 }}>Nom du produit</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--trait)', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--encre)' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--herite-gris-33)', display: 'block', marginBottom: 6 }}>Quantité</label>
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={e => setEditForm({ ...editForm, quantity: e.target.value === '' ? '' as any : Number(e.target.value) })}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--trait)', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--encre)' }}
                      />
                    </div>
                    <SelectWithAutre
                      label="Unité"
                      value={editForm.unit}
                      onChange={v => setEditForm({ ...editForm, unit: v })}
                      options={UNITES_COURANTES}
                      primaryColor={P}
                      placeholder="Ex: bouteille..."
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--herite-gris-33)', display: 'block', marginBottom: 6 }}>Prix achat (FCFA)</label>
                      <input
                        type="number"
                        value={editForm.purchasePrice}
                        onChange={e => setEditForm({ ...editForm, purchasePrice: e.target.value === '' ? '' as any : Number(e.target.value) })}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--trait)', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--encre)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--herite-gris-33)', display: 'block', marginBottom: 6 }}>Prix vente (FCFA)</label>
                      <input
                        type="number"
                        value={editForm.salePrice}
                        onChange={e => setEditForm({ ...editForm, salePrice: e.target.value === '' ? '' as any : Number(e.target.value) })}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--trait)', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--encre)' }}
                      />
                    </div>
                  </div>
                  <div style={{ background: 'var(--caisse-ivoire)', border: '1.5px solid var(--julaba-sable)', borderRadius: 14, padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marge</span>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--encre-4)', marginBottom: 2 }}>Nette</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: editForm.purchasePrice > 0 ? P : 'var(--encre-4)' }}>
                          {editForm.purchasePrice > 0
                            ? (editForm.salePrice - editForm.purchasePrice).toLocaleString('fr-FR')
                            : '—'}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--encre-4)' }}>FCFA/{editForm.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--encre-4)', marginBottom: 2 }}>%</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: editForm.purchasePrice > 0 ? 'var(--color-green-600)' : 'var(--encre-4)' }}>
                          {editForm.purchasePrice > 0
                            ? `+${Math.round(((editForm.salePrice - editForm.purchasePrice) / editForm.purchasePrice) * 100)}%`
                            : '—'
                          }
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--encre-4)' }}>bénéfice</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--encre-4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Photo</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {editForm.image && (
                        <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1.5px solid var(--trait)' }}>
                          <ImageWithFallback src={editForm.image} alt={editForm.name} fallbackSrc={vignetteProduit(editForm.name)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--trait)', borderRadius: 12, padding: '9px 14px', cursor: 'pointer', background: 'white' }}>
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
                      Paramètres avancés
                    </div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>
                      Seuil alerte stock
                    </label>
                    <input
                      type="number"
                      value={editForm.threshold}
                      onChange={e => setEditForm({ ...editForm, threshold: e.target.value === '' ? '' as any : Number(e.target.value) })}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--trait)', outline: 'none', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--encre)' }}
                    />
                  </div>
                  <div style={{ gridColumn:'1 / -1', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:'#C0392B', display:'block', marginBottom:6 }}>🏷️ Prix promo <span style={{ color:'var(--encre-4)', fontWeight:500 }}>(vide = aucune)</span></label>
                      <input type="number" value={editForm.promoPrice} placeholder="ex : 400"
                        onChange={e => setEditForm({ ...editForm, promoPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                        style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:'1.5px solid #F1D3CE', outline:'none', fontSize:15, fontFamily:'inherit', boxSizing:'border-box', color:'var(--encre)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:'#555', display:'block', marginBottom:6 }}>Fin promo</label>
                      <input type="date" value={editForm.promoFin}
                        onChange={e => setEditForm({ ...editForm, promoFin: e.target.value })}
                        style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:'1.5px solid var(--trait)', outline:'none', fontSize:15, fontFamily:'inherit', boxSizing:'border-box', color:'var(--encre)' }}
                      />
                    </div>
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
                        // VENDRE OUVRE LA CAISSE (lot B — VOIX-01, voie 2).
                        // « Mon stock » ne vend plus elle-même : elle demande
                        // à la caisse de s'ouvrir avec ce produit déjà choisi.
                        // Le produit voyage par l'ÉTAT DE ROUTE de React
                        // Router — un objet passé à `navigate`, PAS un
                        // paramètre d'URL : il n'apparaît pas dans l'adresse
                        // et ne survit pas à un rechargement de page. C'est
                        // suffisant ici (le geste est immédiat) et ça reste
                        // explicite et testable, contrairement à une variable
                        // globale. La caisse le lit, et fonctionne sans quand
                        // on y arrive autrement.
                        onClick={() => {
                          setShowEdit(false);
                          navigate('/marchand/caisse', { state: { produitPreselectionne: {
                            nom: selectedStock.name,
                            prix: selectedStock.salePrice,
                            unite: selectedStock.unit,
                            image: selectedStock.image || getImageByNom(selectedStock.name),
                          } } });
                        }}
                        style={{ padding: '13px 0', borderRadius: 14, background: P, border: 'none', fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Vendre
                      </motion.button>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => deleteItem(selectedStock.id)}
                      style={{ width: '100%', padding: '11px 0', borderRadius: 14, background: 'white', border: '1.5px solid var(--color-red-300)', fontSize: 13, fontWeight: 700, color: 'var(--color-red-500)', cursor: 'pointer', fontFamily: 'inherit' }}
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
                      style={{ padding: '13px 0', borderRadius: 14, background: 'white', border: '1.5px solid var(--trait)', fontSize: 14, fontWeight: 700, color: 'var(--encre-3)', cursor: 'pointer', fontFamily: 'inherit' }}
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
          // Marge/ROI honnêtes : sans prix d'achat, le coût est INCONNU (pas nul).
          // Compter tout le prix de vente comme marge surévaluerait le bénéfice.
          // On n'affiche donc la marge globale que si TOUS les produits en stock ont un coût.
          const sansCout = stocks.filter(p => p.quantity > 0 && !(p.purchasePrice > 0)).length;
          const margeConnue = sansCout === 0;
          const marge = totalSell - totalBuy;
          const roi = totalBuy > 0 ? ((marge/totalBuy)*100).toFixed(1) : '0';
          return (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'flex-end' }}
              onClick={() => setShowValue(false)}>
              <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }} transition={{ type:'spring', damping:25 }}
                onClick={e => e.stopPropagation()}
                style={{ background:'white', borderRadius:'24px 24px 0 0', width:'100%', maxHeight:'85vh', overflowY:'auto', fontFamily:'system-ui,sans-serif' }}>
                <div style={{ background:'linear-gradient(160deg,var(--herite-vert-eau),var(--julaba-vert-feuille))', padding:'14px 16px 20px' }}>
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
                      { label:'Valeur achat', value:totalBuy, color:'var(--color-red-500)', bg:'var(--color-red-50)' },
                      { label:'Valeur vente', value:totalSell, color:'var(--herite-vert-eau)', bg:'var(--color-green-50)' },
                    ].map((k) => (
                      <div key={k.label} style={{ background:k.bg, borderRadius:14, padding:14, border:`1.5px solid ${k.color}33` }}>
                        <div style={{ fontSize:11, color:'var(--encre-4)', fontWeight:700, marginBottom:6 }}>{k.label}</div>
                        <Montant value={k.value} size="md" color={k.color} masque={montantsMasques} />
                      </div>
                    ))}
                    <div style={{ background:'var(--commerce-orange-50)', borderRadius:14, padding:14, border:`1.5px solid ${P}33` }}>
                      <div style={{ fontSize:11, color:'var(--encre-4)', fontWeight:700, marginBottom:6 }}>Marge totale</div>
                      {margeConnue
                        ? <Montant value={marge} size="md" color={P} masque={montantsMasques} />
                        : <div style={{ fontSize:22, fontWeight:900, color:'var(--encre-4)' }}>—</div>}
                    </div>
                    <div style={{ background:'var(--color-purple-50)', borderRadius:14, padding:14, border:'1.5px solid #a78bfa33' }}>
                      <div style={{ fontSize:11, color:'var(--encre-4)', fontWeight:700, marginBottom:6 }}>ROI</div>
                      <div style={{ fontSize:22, fontWeight:900, color: margeConnue ? 'var(--herite-violet)' : 'var(--encre-4)' }}>{montantsMasques ? '•••••' : (margeConnue ? `+${roi}%` : '—')}</div>
                    </div>
                  </div>
                  {!margeConnue && (
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--color-orange-700)', background:'var(--color-orange-50)', border:'1.5px solid var(--color-orange-200)', borderRadius:12, padding:'10px 12px' }}>
                      ⚠ {sansCout} produit{sansCout > 1 ? 's' : ''} sans prix d'achat — renseigne-le pour voir ta marge réelle.
                    </div>
                  )}
                  <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:14, overflow:'hidden' }}>
                    <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--commerce-paper)', fontSize:13, fontWeight:800, color:'var(--encre)' }}>Top 3 produits</div>
                    {stocks.map(s=>({...s,val:s.quantity*s.salePrice})).sort((a,b)=>b.val-a.val).slice(0,3).map((p,i) => (
                      <div key={p.id} style={{ padding:'12px 14px', borderBottom:i<2?'1px solid var(--commerce-paper)':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:28, height:28, borderRadius:8, background:i===0?'var(--herite-ambre)':i===1?'var(--color-gray-400)':'#c97316', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'white' }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:'var(--encre)' }}>{p.name}</div>
                            <div style={{ fontSize:11, color:'var(--encre-4)' }}>{p.quantity} {p.unit}</div>
                          </div>
                        </div>
                        <Montant value={p.val} size="sm" color="var(--herite-vert-eau)" masque={montantsMasques} />
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
      {/* Confirmation de suppression : rendue via ModalPortal (document.body) pour
          échapper au stacking context de la fiche produit (zIndex:200) qui la
          masquait auparavant (elle était en z-50, peinte SOUS la fiche → invisible
          et non cliquable). z-[210] = sur-couche au-dessus des modals (z-[200]). */}
      <ModalPortal isOpen={confirmDeleteId != null}>
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full">
            <p className="text-lg font-semibold">Supprimer ce produit ?</p>
            <div className="flex gap-3">
              <button onClick={() => { if (confirmDeleteId) void deleteItem(confirmDeleteId, true); }} className="flex-1 min-h-[44px] bg-red-500 text-white py-3 rounded-xl font-semibold">Supprimer</button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 min-h-[44px] bg-gray-100 py-3 rounded-xl font-semibold">Annuler</button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
