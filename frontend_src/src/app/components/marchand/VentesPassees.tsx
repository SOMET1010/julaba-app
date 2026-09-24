import { etatMarge, libelleMarge, phraseMarge } from '../../services/margeVente';
import { nombreEnMotsFr } from '../../i18n/voice/argent/deuxFormes';
import type { LigneDeVente } from '../../types/vente';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, Filter, FileDown, TrendingUp, Banknote, Package, ShoppingBag, Volume2, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useCaisse } from '../../contexts/CaisseContext';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { format, isToday, isYesterday } from 'date-fns';
import { fetchCredits, marquerCreditPaye, annulerVenteMarchand, type Credit } from '../../services/api/caisse-api';
import { fr } from 'date-fns/locale';
import { exportSimplePDF, formatCurrency, formatDate } from '../../utils/export.utils';
import { partagerRecu } from '../../utils/recu.utils';
import { guidageVocal } from '../../utils/accessMode';
import { resumeVentes, venteComptee } from '../../services/statsVente';
import { toast } from 'sonner';
import { NotificationButton } from './NotificationButton';
import { SubPageLayout } from '../layout/SubPageLayout';
import { montantPrive, useMontantsPrives } from '../../hooks/useMontantsPrives';
import {
  CHIFFRE_INCONNU, annonceEtat, annonceFile, annonceTotal, chiffresLisibles, etatVentesPassees,
} from '../../services/etatVentesPassees';
import { ventesEnAttenteEnvoi } from '../../voice-offline/incidentsHorsLigne';
import { useSpeakMessage } from '../../i18n/voice/speakMessage';
import { useLectureHistorique } from '../../hooks/useLectureHistorique';
import { t } from '../../i18n/voice/runtime';

// LA CHARTE DE LA CAISSE, APPLIQUÉE ICI — rien de nouveau n'est dessiné.
// Cet écran écrivait ses couleurs en dur (`#AF5B23`, `#1D9E75`, `#7c3aed`…)
// pendant que la caisse lisait `--caisse-*` (styles/commerce.css, lot F).
// Même charte, deux écrans : elle se LIT ici aussi, elle ne se recopie pas.
// `P` reste le nom local de l'accent principal — c'est désormais le vert de
// la planche, et `BG` le fond sable de l'écran (celui de `variante="caisse"`).
const P = 'var(--caisse-vert)';
const BG = 'var(--caisse-sable)';
// Une variable CSS ne se concatène pas avec un alpha (`${P}40` donnerait
// `var(--caisse-vert)40`, invalide). Les deux ombres teintées passent donc
// par color-mix, comme commerce.css le fait déjà.
const OMBRE_ONGLET = 'color-mix(in srgb, var(--caisse-vert) 25%, transparent)';
const OMBRE_BOUTON = 'color-mix(in srgb, var(--caisse-vert) 33%, transparent)';
// Pilote ESPÈCES : crédit désactivé (cf. POSCaisse CAISSE_CREDIT_ACTIF=false, #16-B).
// On masque aussi l'onglet « Crédits » ici pour rester cohérent avec la caisse.
const CAISSE_CREDIT_ACTIF = false;


// ── Label jour ────────────────────────────────────────────────
function dayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'dd MMMM yyyy', { locale: fr });
}

// ── Card vente dépliable ──────────────────────────────────────
/** Une vente telle que cet écran l'affiche. Le champ `any` d'origine avait
 *  laissé passer, sans un mot du compilateur, un renommage qui aurait mis
 *  toutes les marges à zéro (cf. axe 3). */
interface VenteAffichee {
  id?: string;
  type?: string;
  montant?: number;
  price?: number;
  benefice?: number;
  source?: string;
  statut?: string;
  date: string;
  productName?: string;
  produit?: string;
  notes?: string;
  mode_paiement?: string;
  paymentMethod?: string;
  details?: LigneDeVente[] | unknown;
  produits?: LigneDeVente[] | unknown;
}

function VenteCard({ sale, index, query, montantsMasques }: { sale: VenteAffichee; index: number; query: string; montantsMasques: boolean }) {
  const [open, setOpen] = useState(false);
  const { user, speak, reloadTransactions } = useApp();
  const { refreshProducts } = useCaisse();
  const marchandNom = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.nom || 'Marchande';
  const montant = sale.montant || sale.price || 0;
  // L'ÉTAT, pas seulement le chiffre — ARGENT-1. Une marge de 100 F sur un
  // panier dont une ligne n'a pas de prix d'achat n'est PAS la même chose
  // qu'une marge de 100 F sur un panier entièrement coûté. L'écran et la voix
  // doivent pouvoir les distinguer, sinon le chiffre juste ment quand même.
  const etat = etatMarge(sale.details, sale.benefice);
  const marge = etat.type === 'inconnue' ? 0 : etat.montant;
  const source = sale.source || 'kassa';
  const dateObj = new Date(sale.date);

  // Annulation self-service (#20) : une vente du JOUR, non déjà annulée. Au-delà
  // du jour, c'est du ressort d'un responsable (admin).
  const estAnnulee = sale.statut === 'annulee';
  const estAnnulable = (sale.type === 'vente' || sale.type === undefined) && !estAnnulee && isToday(dateObj) && !!sale.id;
  const [annulEtat, setAnnulEtat] = useState<'idle' | 'confirm' | 'loading'>('idle');
  const demanderAnnulation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnulEtat('confirm');
    if (guidageVocal()) { try { speak('Veux-tu vraiment annuler cette vente ? Le stock sera rendu.'); } catch { /* ignore */ } }
  };
  const confirmerAnnulation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnulEtat('loading');
    try {
      // `estAnnulable` exige déjà un identifiant ; la garde le dit au
      // compilateur plutôt qu'à la confiance.
      if (!sale.id) throw new Error('vente sans identifiant');
      await annulerVenteMarchand(sale.id);
      await Promise.all([reloadTransactions(), refreshProducts()]);
      // Succès : on SORT de l'état 'loading'. Sinon le libellé « Annulation en
      // cours… » (rendu tant que annulEtat === 'loading') restait affiché jusqu'au
      // rechargement — trompeur pour la marchande (écart relevé en recette). La carte
      // rechargée est désormais estAnnulee → aucun bouton d'annulation réapparaît.
      setAnnulEtat('idle');
      toast.success('Vente annulée — stock rendu');
      if (guidageVocal()) { try { speak('Vente annulée. Le stock a été rendu.'); } catch { /* ignore */ } }
    } catch {
      toast.error("Impossible d'annuler cette vente");
      if (guidageVocal()) { try { speak("Je n'ai pas pu annuler cette vente."); } catch { /* ignore */ } }
      setAnnulEtat('idle');
    }
  };

  // À l'OUVERTURE de la carte, la vente se DIT (inclusion §2.2 : tout montant
  // affiché doit pouvoir être entendu) — produit, montant, marge, moment.
  const basculer = () => {
    const prochainOuvert = !open;
    setOpen(prochainOuvert);
    if (prochainOuvert && guidageVocal() && !montantsMasques) {
      const quand = format(dateObj, "d MMMM 'à' HH'h'mm", { locale: fr });
      // UNE PERTE SE DIT AUSSI. La règle du projet vaut ici plus qu'ailleurs :
      // aucune information importante ne doit exister uniquement sous forme de
      // texte. Une marchande qui ne lit pas n'apprendrait jamais, autrement,
      // qu'elle a vendu en dessous de son prix d'achat.
      // La phrase vient du MÊME endroit que le calcul (services/margeVente).
      // Elle était construite ici, à côté d'un chiffre venu d'ailleurs : c'est
      // ainsi qu'un écran finit par dire autre chose que la donnée.
      const fragment = phraseMarge(etat);
      const texteMarge = fragment ? (etat.type === 'partielle' ? ` ${fragment}` : `, ${fragment}`) : '';
      try { speak(`${sale.productName || 'Vente'} : ${nombreEnMotsFr(montant)} francs${texteMarge}, le ${quand}.`); } catch { /* ignore */ }
    }
  };

  function Highlight({ text }: { text: string }) {
    if (!query.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background:'color-mix(in srgb, var(--caisse-vert) 20%, transparent)', color:P, borderRadius:3, padding:'0 2px' }}>{p}</mark>
      : p)}</>;
  }

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: index * 0.04 }}
      onClick={basculer}
      style={{ background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderRadius:16, overflow:'hidden', cursor:'pointer', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px' }}>
        {/* Icône */}
        <div style={{ width:46, height:46, borderRadius:14, background:'var(--caisse-succes)', border:'1.5px solid color-mix(in srgb, var(--caisse-vert) 35%, transparent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--caisse-vert)" strokeWidth="2" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        {/* Infos */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--encre)', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            <Highlight text={sale.productName || 'Vente'} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--encre-4)', fontWeight:600 }}>
              {format(dateObj, 'HH:mm', { locale:fr })}
            </span>
            {/* Badge source — espacé à droite */}
            <span style={{
              marginLeft:4,
              background: source === 'vocal' ? 'var(--caisse-sable)' : 'var(--caisse-succes)',
              color: source === 'vocal' ? 'var(--caisse-gris-texte)' : P,
              border: `1px solid ${source === 'vocal' ? 'var(--commerce-line)' : 'color-mix(in srgb, var(--caisse-vert) 35%, transparent)'}`,
              borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700
            }}>
              {source === 'vocal' ? 'vocal' : 'kassa'}
            </span>
            {estAnnulee && (
              <span style={{ marginLeft:4, background:'color-mix(in srgb, var(--caisse-alerte) 12%, var(--caisse-ivoire))', color:'var(--caisse-alerte)', border:'1px solid color-mix(in srgb, var(--caisse-alerte) 40%, transparent)', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700 }}>Annulée</span>
            )}
          </div>
        </div>
        {/* Montant + marge */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:900, color: estAnnulee ? 'var(--caisse-gris-texte)' : 'var(--caisse-vert)', textDecoration: estAnnulee ? 'line-through' : 'none' }}>{montantsMasques ? '••••• F' : `+${montant.toLocaleString('fr-FR')} F`}</div>
          {/* UNE PERTE SE VOIT — arbitrage de Patrick, 19/09/2026. La marge était
              plafonnée à zéro côté serveur : une vente à perte s'affichait
              « marge — », exactement comme une vente dont on ignore le coût.
              Deux situations opposées, un seul affichage. Elle ne pouvait pas
              savoir qu'elle vendait en dessous de son prix d'achat.
              Le ROUGE et le mot « Perte » sont volontaires : pour qui ne lit
              pas, la couleur porte le sens avant le mot, et un signe « − » seul
              se confond trop facilement avec un tiret. */}
          {/* Le libellé vient de `libelleMarge` : « Marge connue : … » quand une
              ligne du panier n'a pas de prix d'achat. Le VERT reste réservé à
              une marge complète ; une marge partielle est ambrée, parce qu'elle
              dit « je sais une partie ».
              EXCEPTION ASSUMÉE : `#b45309` reste en dur. La charte de la
              caisse n'a que quatre signaux — vert, vert foncé, alerte, gris —
              et AUCUN avertissement. Prendre le gris effacerait la nuance que
              ce comment vient d'expliquer ; prendre le rouge dirait « perte »
              là où il n'y en a pas. Une couleur inventée serait pire encore.
              Le jour où la planche porte un jeton d'avertissement, il vient
              ici (deux occurrences dans ce fichier, plus l'ambre « Bientôt »
              du crédit). */}
          <div style={{
            fontSize:10, marginTop:2,
            fontWeight: etat.type === 'inconnue' ? 400 : (marge < 0 ? 800 : 700),
            textDecoration: estAnnulee ? 'line-through' : 'none',
            color: estAnnulee ? 'var(--caisse-gris-texte)'
              : etat.type === 'inconnue' ? 'var(--caisse-gris-texte)'
              : marge < 0 ? 'var(--caisse-alerte)'
              : etat.type === 'partielle' ? '#b45309'
              : 'var(--caisse-vert)',
          }}>{montantsMasques ? 'Montant caché' : libelleMarge(etat)}</div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.25 }} style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--caisse-gris-texte)" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </motion.div>
        </div>
      </div>
      {/* Détails dépliables */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
            <div style={{ borderTop:'1px solid var(--commerce-line)', padding:'12px 14px', background:'var(--caisse-sable)', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>Date complète</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--encre)' }}>{format(dateObj, 'dd MMMM yyyy à HH:mm', { locale:fr })}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>Source</span>
                <span style={{ fontSize:12, fontWeight:700, color: source==='vocal' ? 'var(--caisse-gris-texte)' : P }}>{source}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>Montant</span>
                <span style={{ fontSize:14, fontWeight:900, color: estAnnulee ? 'var(--caisse-gris-texte)' : 'var(--caisse-vert)', textDecoration: estAnnulee ? 'line-through' : 'none' }}>{montantPrive(montant, montantsMasques, 'FCFA')}</span>
              </div>
              {etat.type !== 'inconnue' && (
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  {/* Le détail déplié disait « Marge » même quand le chiffre
                      ne couvrait qu'une partie du panier. Il dit maintenant la
                      même chose que la carte et que la voix — un seul libellé,
                      une seule source. */}
                  <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>
                    {etat.type === 'partielle' ? (marge < 0 ? 'Perte connue' : 'Marge connue') : (marge < 0 ? 'Perte' : 'Marge')}
                  </span>
                  <span style={{ fontSize:12, fontWeight:700, textDecoration: estAnnulee ? 'line-through' : 'none',
                    color: estAnnulee ? 'var(--caisse-gris-texte)' : marge < 0 ? 'var(--caisse-alerte)' : etat.type === 'partielle' ? '#b45309' : 'var(--caisse-vert)' }}>
                    {montantsMasques ? '••••• FCFA' : `${marge < 0 ? '−' : '+'}${Math.abs(marge).toLocaleString('fr-FR')} FCFA`}
                  </span>
                </div>
              )}
              {/* Reçu numérique : partage (WhatsApp / SMS) — pas de PDF « à lire »,
                  inadapté aux utilisatrices non-lectrices (et source du gel d'écran). */}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button type="button"
                  onClick={async () => {
                    if (montantsMasques) { toast('Montants cachés — montre-les avant de partager le reçu.'); return; }
                    const r = await partagerRecu(sale, marchandNom);
                    if (r === 'copie') toast.success('Reçu copié'); else if (r === 'echec') toast.error('Partage indisponible');
                  }}
                  style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px 0', borderRadius:14, border:'none', background:'var(--caisse-vert)', color:'var(--caisse-ivoire)', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Partager le reçu
                </button>
              </div>

              {/* Annulation self-service (#20) — vente du jour uniquement ; au-delà = responsable. */}
              {estAnnulable && annulEtat === 'idle' && (
                <button type="button" onClick={demanderAnnulation}
                  style={{ marginTop:2, padding:'11px 0', borderRadius:14, border:'1.5px solid color-mix(in srgb, var(--caisse-alerte) 40%, transparent)', background:'var(--caisse-ivoire)', color:'var(--caisse-alerte)', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                  Annuler cette vente
                </button>
              )}
              {estAnnulable && annulEtat === 'confirm' && (
                <div style={{ marginTop:2, display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--caisse-alerte)', textAlign:'center' }}>Annuler cette vente ? Le stock sera rendu.</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setAnnulEtat('idle'); }}
                      style={{ flex:1, padding:'11px 0', borderRadius:14, border:'1.5px solid var(--trait)', background:'var(--caisse-ivoire)', color:'var(--encre-3)', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                      Non, garder
                    </button>
                    <button type="button" onClick={confirmerAnnulation}
                      style={{ flex:1, padding:'11px 0', borderRadius:14, border:'none', background:'var(--caisse-alerte)', color:'var(--caisse-ivoire)', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                      Oui, annuler
                    </button>
                  </div>
                </div>
              )}
              {annulEtat === 'loading' && (
                <div style={{ marginTop:2, fontSize:12, color:'var(--encre-4)', textAlign:'center' }}>Annulation en cours…</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Composant principal ───────────────────────────────────────
export function VentesPassees() {
  const navigate = useNavigate();
  const { getSalesHistory, reloadTransactions, speak, user } = useApp();
  const speakMessage = useSpeakMessage();
  // HIST-01 : noté par la couche API (services/lectureHistorique), pas déduit
  // d'un tableau vide — un tableau vide ne dit pas POURQUOI il est vide.
  const etatHistorique = useLectureHistorique();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'tous'|'vocal'|'kassa'|'credits'>('tous');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [totalDu, setTotalDu] = useState(0);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
  // Confirmation avant de solder un crédit (évite un solde par clic accidentel) :
  // 1er clic = « Confirmer ? » (Tata prévient) ; 2e clic = on marque payé.
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showOutils, setShowOutils] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { montantsMasques, basculerMontants } = useMontantsPrives();

  useEffect(() => { reloadTransactions(); }, []);

  // LA FILE HORS LIGNE — HIST-01. L'historique est ENTIÈREMENT serveur : une
  // vente encaissée sans réseau dort dans la file et n'apparaît nulle part
  // ici. La marchande vend, regarde ses ventes, ne voit rien, et conclut que
  // l'application a perdu son argent. On LIT la file, on ne la touche pas, et
  // on ne déclenche aucune synchronisation pour afficher un écran.
  const [ventesEnFile, setVentesEnFile] = useState(0);
  useEffect(() => {
    let vivant = true;
    ventesEnAttenteEnvoi(String(user?.id ?? '')).then(n => { if (vivant) setVentesEnFile(n); });
    return () => { vivant = false; };
  }, [user?.id, etatHistorique]);

  // LES CRÉDITS SONT CHARGÉS AU MONTAGE, PAS SEULEMENT SUR LEUR ONGLET —
  // correctif du 18/09/2026.
  //
  // `fetchCredits` n'était appelé que si l'onglet « Crédits » était choisi. Or
  // le pilote est en espèces (CAISSE_CREDIT_ACTIF = false) et cet onglet
  // n'existe pas : les crédits n'étaient donc JAMAIS chargés, pendant que
  // « Toutes » promettait de les inclure (voir la convention A ci-dessous) et
  // que tout le mécanisme pour le faire était déjà écrit juste en dessous.
  // Une marchande avec 10 000 F d'espèces et 5 000 F de crédits historiques
  // voyait 10 000 F en « Toutes ».
  //
  // On ne réactive RIEN : aucun crédit ne peut être créé pendant le pilote.
  // On se contente d'honorer ce que l'écran affirme déjà pour ceux qui
  // existent. L'échec reste silencieux — sans crédit, l'historique espèces
  // doit rester juste et lisible.
  useEffect(() => {
    setCreditsLoading(true);
    fetchCredits()
      .then(r => { setCredits(r.credits || []); setTotalDu(r.total_du || 0); })
      .catch((err: unknown) => {
        console.error('[VentesPassees] erreur chargement crédits', err);
      })
      .finally(() => setCreditsLoading(false));
  }, []);

  const handleMarquerPaye = async (id: string) => {
    try {
      await marquerCreditPaye(id);
      const r = await fetchCredits();
      setCredits(r.credits || []);
      setTotalDu(r.total_du || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du marquage';
      toast.error(message);
    }
  };

  // « Toutes » = ventes espèces + ventes À CRÉDIT (convention A) → cohérent avec
  // l'accueil qui compte le crédit au total. Chaque crédit devient une ligne de
  // vente (le carnet reste géré à part dans l'onglet « Crédits »).
  const cashSales = useMemo(() => getSalesHistory({}), [getSalesHistory]);
  const allSales = useMemo(() => {
    const ventesCredit = (credits || []).map((c) => ({
      id: `credit-${c.id}`,
      type: 'vente' as const,
      productName: `Crédit — ${c.client_nom}`,
      montant: Number(c.montant_total) || 0,
      price: Number(c.montant_total) || 0,
      source: 'credit',
      statut: 'validee',            // une vente à crédit est une vente active (comptée)
      date: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      // Un crédit n'a pas de bénéfice connu tant qu'il n'est pas soldé.
      benefice: 0,
    }));
    return [...cashSales, ...ventesCredit];
  }, [cashSales, credits]);

  // KPIs — les ventes ANNULÉES (#20) ne comptent dans AUCUN chiffre financier :
  // elles restent visibles dans la liste (carte badgée « Annulée ») mais sont
  // exclues du CA, des bénéfices, du volume et du panier moyen. Règle et calcul
  // purs/testés : services/statsVente.ts (resumeVentes / venteComptee).
  const { totalVentes, totalCount, totalBenefices, panierMoyen } =
    useMemo(() => resumeVentes(allSales), [allSales]);
  // Écran « Mes ventes » : une non-lectrice arrive ici pour SAVOIR combien elle a
  // fait -> on l'annonce à voix haute dès que les données sont là (une seule fois).
  // CE QUE L'ÉCRAN A LE DROIT D'AFFIRMER — HIST-01. La règle est dans un
  // module pur (services/etatVentesPassees.ts) pour être relisible et
  // prouvable ailleurs que dans du JSX.
  const etat = useMemo(
    () => etatVentesPassees({ lecture: etatHistorique, nbVentes: allSales.length, ventesEnFile }),
    [etatHistorique, allSales.length, ventesEnFile],
  );
  const lisible = chiffresLisibles(etatHistorique);

  const dejaAnnonce = useRef(false);
  useEffect(() => {
    // On n'annonce plus « dès que les données sont là » — il fallait déjà en
    // avoir. On annonce dès que le serveur A RÉPONDU, quelle que soit la
    // réponse, et l'échec se dit aussi : pour qui ne lit pas, la voix est le
    // seul canal, et c'est là que le zéro faisait le plus de dégâts.
    if (dejaAnnonce.current || etatHistorique === 'jamais' || etatHistorique === 'chargement' || montantsMasques) return;
    dejaAnnonce.current = true;
    const a = annonceTotal(etat, { total: totalVentes, nombre: totalCount });
    speakMessage(a.cle, a.variables);
  }, [etat, etatHistorique, totalVentes, totalCount, speakMessage, montantsMasques]);

  // Ré-écouter le total (bouton haut-parleur).
  const direTotal = () => {
    if (montantsMasques) { speak('Tes montants sont cachés.'); return; }
    const a = annonceTotal(etat, { total: totalVentes, nombre: totalCount });
    speakMessage(a.cle, a.variables);
  };

  // Filtrage
  const filtered = useMemo(() => {
    return allSales.filter(t => {
      const txt = (t.productName || '').toLowerCase();
      const matchSearch = !search.trim() || txt.includes(search.toLowerCase());
      const matchSource = sourceFilter === 'tous' || (t.source || 'kassa') === sourceFilter;
      const matchStart  = !startDate || new Date(t.date) >= new Date(startDate);
      const matchEnd    = !endDate   || new Date(t.date) <= new Date(endDate + 'T23:59:59');
      return matchSearch && matchSource && matchStart && matchEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSales, search, sourceFilter, startDate, endDate]);

  // Grouper par jour
  const grouped = useMemo(() => {
    const map = new Map<string, VenteAffichee[]>();
    filtered.forEach(t => {
      const d = new Date(t.date);
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).map(([key, sales]) => {
      // La liste garde TOUTES les ventes du jour (l'annulée reste affichée, badgée).
      // Mais le compteur et le total du jour ne comptent que les ventes actives.
      const actives = sales.filter(venteComptee);
      return {
        key,
        label: dayLabel(new Date(key)),
        sales,
        count: actives.length,
        total: actives.reduce((s, t) => s + (t.montant || t.price || 0), 0),
      };
    });
  }, [filtered]);

  const handleExport = () => {
    if (montantsMasques) { toast('Montants cachés — montre-les avant de créer le reçu.'); return; }
    const rows = allSales.map(t => ({
      label: formatDate(t.date) + ' — ' + (t.productName || 'Produit'),
      value: formatCurrency(t.montant || t.price || 0),
    }));
    rows.unshift(
      { label: 'Total ventes', value: formatCurrency(totalVentes) },
      { label: 'Nombre de ventes', value: String(totalCount) },
      { label: '─────────────', value: '─────────────' },
    );
    exportSimplePDF('Historique Ventes — JÙLABA', rows, `ventes_${new Date().toISOString().split('T')[0]}`);
  };

  const SOURCE_TABS: { id:'tous'|'vocal'|'kassa'|'credits'; label:string }[] = [
    { id:'tous',    label:'Toutes' },
    { id:'vocal',   label:'Par la voix' },
    { id:'kassa',   label:'Par caisse' },
    ...(CAISSE_CREDIT_ACTIF ? [{ id:'credits' as const, label:'Crédits' }] : []),
  ];
  const sliderIndex = SOURCE_TABS.findIndex(t => t.id === sourceFilter);
  const tabPct = 100 / SOURCE_TABS.length; // largeur d'un onglet (le nb d'onglets varie)
  const ventesDuJour = allSales.filter(s => venteComptee(s) && new Date(s.date).toDateString() === new Date().toDateString()).length;

  return (
    <SubPageLayout
      role="marchand"
      title="Ventes passées"
      /* L'EN-TÊTE VIOLET VENAIT D'ICI, PAR DÉFAUT. `SubPageLayout` a deux
         habillages : `defaut`, l'en-tête sombre `--commerce-sidebar`
         (#332533, l'aubergine) de tous les sous-écrans, et `caisse`, l'en-tête
         clair de la planche. La caisse demandait déjà `variante="caisse"` ;
         cet écran ne demandait rien et héritait donc de l'aubergine. On
         aligne la PROPRIÉTÉ de l'écran — le composant, lui, ne change pas,
         et les autres sous-écrans gardent leur en-tête sombre. */
      variante="caisse"
      subtitle={ventesDuJour > 0 ? `${ventesDuJour} vente${ventesDuJour > 1 ? 's' : ''} aujourd'hui` : undefined}
      rightContent={
        <div style={{ display:'flex', gap:7 }}>
          <motion.button whileTap={{ scale:0.9 }} onClick={basculerMontants}
            aria-label={montantsMasques ? 'Montrer mes montants' : 'Cacher mes montants'}
            style={{ width:44, height:44, borderRadius:13, background:'var(--caisse-sable)', border:'1px solid var(--commerce-line)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            {montantsMasques ? <EyeOff size={19} color="var(--encre)" /> : <Eye size={19} color="var(--encre)" />}
          </motion.button>
          <motion.button whileTap={{ scale:0.9 }} onClick={direTotal} aria-label="Écouter le total des ventes"
            style={{ width:44, height:44, borderRadius:13, background:'var(--caisse-sable)', border:'1px solid var(--commerce-line)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Volume2 size={18} color="var(--encre)" />
          </motion.button>
          {/* Cloche « Notifications » standard, plus l'« Alertes » (stock)
              spécifique à Mon stock — même icône générique cloche que
              là-bas prêtait à confusion (audit accueil/tuiles). */}
          {/* La cloche par défaut est BLANCHE SUR FOND TRANSPARENT : dessinée
              pour l'en-tête sombre, elle disparaîtrait sur l'en-tête clair.
              On demande donc sa forme pleine, dans le vert de la charte —
              le comportement et l'icône ne changent pas. */}
          <NotificationButton variant="solid" accentColor="var(--caisse-vert)" />
        </div>
      }
    >

      {/* CONTENU */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 0 100px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* « TU AS VENDU, MAIS CE N'EST PAS ENCORE ENVOYÉ » — HIST-01.
            Le troisième état, et le plus silencieux : l'historique est
            entièrement serveur, donc une vente encore dans la file hors ligne
            n'apparaissait NULLE PART ici. Ce bandeau ne remplace jamais l'état
            de la lecture — il s'ajoute. Une vente en attente d'envoi n'est ni
            une absence de vente ni un échec de lecture. */}
        {annonceFile(etat) && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:'var(--caisse-rayon-4)', background:'var(--caisse-sable)', border:'1.5px solid var(--commerce-line)' }}>
            <Package size={20} color="var(--caisse-vert)" aria-hidden="true" />
            <span style={{ fontSize:13, fontWeight:700, color:'var(--encre)' }}>
              {t(annonceFile(etat)!.cle, annonceFile(etat)!.variables)}
            </span>
          </div>
        )}

        {/* La lecture a échoué, mais des ventes déjà lues restent à l'écran :
            on montre la liste ET on dit qu'elle n'est pas à jour. Sans ça, une
            liste périmée passerait pour la vérité du moment. */}
        {etat.type === 'liste' && etatHistorique === 'echec' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'12px 14px', borderRadius:'var(--caisse-rayon-4)', background:'color-mix(in srgb, var(--caisse-alerte) 12%, var(--caisse-ivoire))', border:`1.5px solid color-mix(in srgb, var(--caisse-alerte) 40%, transparent)` }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--encre)' }}>{t('TATA_VENTES_PAS_LUES', {})}</span>
            <button type="button" onClick={() => { void reloadTransactions(); }}
              style={{ minHeight:44, flexShrink:0, padding:'0 var(--caisse-esp-3)', borderRadius:'var(--caisse-rayon-3)', border:'none', background:P, color:'var(--caisse-ivoire)', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
              {t('TATA_VENTES_REESSAYER', {})}
            </button>
          </div>
        )}

        <motion.button whileTap={{ scale:0.99 }} onClick={() => setShowOutils(v => !v)}
          aria-expanded={showOutils}
          style={{ width:'100%', minHeight:52, background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderRadius:16, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', color:'var(--encre)' }}>
          <span style={{ display:'flex', alignItems:'center', gap:10, fontSize:15, fontWeight:800 }}>
            <TrendingUp size={20} color={P} /> Mes chiffres et filtres
          </span>
          <motion.span animate={{ rotate: showOutils ? 180 : 0 }}><ChevronDown size={18} /></motion.span>
        </motion.button>

        <AnimatePresence>
        {showOutils && (
        <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
          style={{ overflow:'hidden', display:'flex', flexDirection:'column', gap:10 }}>
        {/* KPIs 2x2 avec UniversalKPI — secondaires, donc repliés au départ. */}
        {montantsMasques ? (
          <div style={{ minHeight:92, borderRadius:16, background:'var(--caisse-succes)', border:'1.5px solid color-mix(in srgb, var(--caisse-vert) 35%, transparent)', padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div><strong style={{ display:'block', fontSize:16, color:'var(--caisse-vert-fonce)' }}>Montants cachés</strong><span style={{ fontSize:13, color:'var(--encre-3)' }}>Personne autour de toi ne voit tes chiffres.</span></div>
            <button type="button" onClick={basculerMontants} style={{ minWidth:48, height:48, borderRadius:14, border:'none', background:'var(--caisse-vert)', color:'var(--caisse-ivoire)', display:'grid', placeItems:'center' }} aria-label="Montrer mes montants"><EyeOff size={21} /></button>
          </div>
        ) : (
        <KPIGrid cols={2}>
          <UniversalKPI
            label="Ventes FCFA"
            value={lisible ? totalVentes.toLocaleString('fr-FR') : CHIFFRE_INCONNU}
            suffix={lisible ? 'FCFA' : undefined}
            icon={TrendingUp}
            color="var(--caisse-vert)"
            bgColor="var(--caisse-succes)"
            borderColor="color-mix(in srgb, var(--caisse-vert) 40%, transparent)"
            iconAnimation="bounce"
            explication="C'est le total de tout l'argent que tu as encaissé sur tes ventes pendant cette période."
            details={!lisible ? undefined : [
              { label: 'Nombre de ventes', value: totalCount },
              { label: "Aujourd'hui", value: allSales.filter(s => venteComptee(s) && new Date(s.date).toDateString() === new Date().toDateString()).reduce((a,b) => a+(b.montant||0), 0).toLocaleString('fr-FR') + ' FCFA' },
            ]}
          />
          <UniversalKPI
            label="Bénéfices FCFA"
            value={lisible ? totalBenefices.toLocaleString('fr-FR') : CHIFFRE_INCONNU}
            suffix={lisible ? 'FCFA' : undefined}
            icon={Banknote}
            color="var(--caisse-vert-fonce)"
            bgColor="var(--caisse-succes)"
            borderColor="color-mix(in srgb, var(--caisse-vert-fonce) 40%, transparent)"
            iconAnimation="pulse"
            explication="C'est l'argent que tu gardes après avoir payé tes fournisseurs. Si tu achètes un produit à 300 FCFA et tu le vends à 500 FCFA, ton bénéfice est 200 FCFA."
            formule="Bénéfice = Prix de vente − Prix d'achat"
            details={!lisible ? undefined : [
              { label: 'Total ventes', value: totalVentes.toLocaleString('fr-FR') + ' FCFA' },
              { label: 'Total achats estimé', value: (totalVentes - totalBenefices).toLocaleString('fr-FR') + ' FCFA' },
            ]}
          />
          <UniversalKPI
            label="Transactions"
            value={lisible ? totalCount.toLocaleString('fr-FR') : CHIFFRE_INCONNU}
            icon={Package}
            color="var(--caisse-gris-texte)"
            bgColor="var(--caisse-sable)"
            borderColor="var(--commerce-line)"
            iconAnimation="spin"
            explication="C'est le nombre de fois que tu as vendu quelque chose. Chaque fois qu'une cliente paie, c'est une transaction."
            details={!lisible ? undefined : [
              { label: "Aujourd'hui", value: allSales.filter(s => venteComptee(s) && new Date(s.date).toDateString() === new Date().toDateString()).length },
              { label: 'Cette semaine', value: allSales.filter(s => { if (!venteComptee(s)) return false; const d = new Date(s.date); const now = new Date(); return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()-7); }).length },
            ]}
          />
          <UniversalKPI
            label="Panier moyen FCFA"
            value={lisible ? panierMoyen.toLocaleString('fr-FR') : CHIFFRE_INCONNU}
            suffix={lisible ? 'FCFA' : undefined}
            icon={ShoppingBag}
            color="var(--caisse-gris-texte)"
            bgColor="var(--caisse-sable)"
            borderColor="var(--commerce-line)"
            iconAnimation="float"
            explication="C'est combien chaque cliente dépense en moyenne chez toi. Plus ce chiffre est grand, mieux c'est !"
            formule="Panier moyen = Total ventes ÷ Nombre de ventes"
            details={!lisible ? undefined : [
              { label: 'Total ventes', value: totalVentes.toLocaleString('fr-FR') + ' FCFA' },
              { label: 'Nombre de ventes', value: totalCount },
              { label: 'Résultat', value: panierMoyen.toLocaleString('fr-FR') + ' FCFA', color: 'var(--caisse-gris-texte)' },
            ]}
          />
        </KPIGrid>
        )}
        <button type="button" onClick={handleExport}
          style={{ minHeight:48, borderRadius:14, border:'1.5px solid var(--trait)', background:'var(--caisse-ivoire)', display:'flex', alignItems:'center', justifyContent:'center', gap:9, color:P, fontSize:14, fontWeight:800 }}>
          <FileDown size={18} /> Créer mon bilan PDF
        </button>
        </motion.div>
        )}
        </AnimatePresence>


        {/* Recherche */}
        {/* height 46 + padding horizontal seul : la zone tapable du champ suit
            alors la hauteur de la barre (alignSelf stretch). Avec un padding
            VERTICAL, la boite de contenu restait celle du texte — 20px — et
            l'etirement ne donnait rien. Meme forme que la recherche du stock. */}
        <div style={{ background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderRadius:14, padding:'0 14px', height:46, display:'flex', alignItems:'center', gap:8 }}>
          <Search size={14} color="var(--caisse-gris-texte)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une vente..."
            style={{ flex:1, alignSelf:'stretch', minWidth:0, border:'none', outline:'none', fontSize:13, color:'var(--encre)', background:'transparent', fontFamily:'inherit' }} />
          {search && <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} aria-label="Effacer la recherche"
            style={{ flexShrink:0, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--caisse-gris-texte)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </motion.button>}
        </div>

        {/* Sélecteur iOS */}
        <div style={{ background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderRadius:16, padding:4, display:'flex', position:'relative' }}>
          <motion.div
            style={{ position:'absolute', top:4, height:'calc(100% - 8px)', background:P, borderRadius:12, boxShadow:`0 2px 8px ${OMBRE_ONGLET}` }}
            animate={{ left:`calc(${sliderIndex * tabPct}% + 4px)`, width:`calc(${tabPct}% - 6px)` }}
            transition={{ type:'spring', stiffness:300, damping:30 }}
          />
          {SOURCE_TABS.map(t => (
            <button key={t.id} onClick={() => setSourceFilter(t.id)}
              // minHeight 44 : cible tactile mesurée à 35px (390×844).
              style={{ flex:1, minHeight:44, padding:'9px 4px', fontSize:11, fontWeight:700, color: sourceFilter===t.id ? 'var(--caisse-ivoire)' : 'var(--encre-4)', background:'none', border:'none', cursor:'pointer', position:'relative', zIndex:1, fontFamily:'inherit', transition:'color 0.2s', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtres avancés */}
        <div>
          <motion.button whileTap={{ scale:0.99 }} onClick={() => setShowFilters(v => !v)}
            style={{ width:'100%', background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Filter size={14} color={P} />
              <span style={{ fontSize:13, fontWeight:600, color:'var(--caisse-gris-texte)' }}>Filtres avancés</span>
            </div>
            <motion.span animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration:0.25 }}>
              <ChevronDown size={12} color="var(--caisse-gris-texte)" />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
                <div style={{ background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderTop:'none', borderRadius:'0 0 14px 14px', padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--encre-4)', display:'block', marginBottom:4 }}>Date début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid var(--trait)', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as any }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--encre-4)', display:'block', marginBottom:4 }}>Date fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid var(--trait)', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as any }} />
                  </div>
                  {(startDate || endDate) && (
                    <motion.button whileTap={{ scale:0.97 }} onClick={() => { setStartDate(''); setEndDate(''); }}
                      style={{ gridColumn:'1/-1', background:'var(--caisse-sable)', border:'none', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, color:'var(--caisse-gris-texte)', cursor:'pointer', fontFamily:'inherit' }}>
                      Réinitialiser
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── ONGLET CRÉDITS ── */}
        {sourceFilter === 'credits' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* KPI total dû */}
            <div style={{ background:'var(--caisse-ivoire)', border:'1.5px solid color-mix(in srgb, var(--caisse-alerte) 45%, transparent)', borderRadius:16, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'var(--caisse-alerte)', borderRadius:'2px 2px 0 0' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--encre-4)', textTransform:'uppercase', marginBottom:4 }}>Total dû</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'var(--caisse-alerte)' }}>{montantPrive(totalDu, montantsMasques, 'FCFA')}</div>
                  <div style={{ fontSize:11, color:'var(--encre-4)', marginTop:2 }}>{credits.filter(c => c.statut !== 'paye').length} client(s) en attente</div>
                </div>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="color-mix(in srgb, var(--caisse-alerte) 45%, transparent)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
            </div>

            {creditsLoading && <div style={{ textAlign:'center', color:'var(--encre-4)', padding:24 }}>Chargement...</div>}

            {!creditsLoading && credits.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--encre)', marginBottom:8 }}>Aucun crédit en cours</div>
                <div style={{ fontSize:13, color:'var(--encre-4)' }}>Les ventes à crédit apparaîtront ici</div>
              </div>
            )}

            {!creditsLoading && credits.length > 0 && credits.map(credit => {
              const statutColor = credit.statut_calcule === 'en_retard' ? 'var(--caisse-alerte)'
                : credit.statut_calcule === 'bientot' ? '#f59e0b'
                : credit.statut_calcule === 'paye' ? 'var(--caisse-vert)'
                : P;
              const statutBg = credit.statut_calcule === 'en_retard' ? 'color-mix(in srgb, var(--caisse-alerte) 12%, var(--caisse-ivoire))'
                : credit.statut_calcule === 'bientot' ? 'var(--color-orange-50)'
                : credit.statut_calcule === 'paye' ? 'var(--caisse-succes)'
                : 'var(--caisse-succes)';
              const statutLabel = credit.statut_calcule === 'en_retard' ? 'En retard'
                : credit.statut_calcule === 'bientot' ? 'Bientôt'
                : credit.statut_calcule === 'paye' ? 'Payé'
                : `${credit.jours_restants}j restants`;

              return (
                <motion.div key={credit.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  style={{ background:'var(--caisse-ivoire)', border:'1.5px solid var(--trait)', borderRadius:16, overflow:'hidden' }}>
                  <div style={{ padding:'13px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:40, height:40, borderRadius:12, background:statutBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={statutColor} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize:15, fontWeight:800, color:'var(--encre)' }}>{credit.client_nom}</div>
                          {credit.client_phone && <div style={{ fontSize:11, color:'var(--encre-4)' }}>{credit.client_phone}</div>}
                        </div>
                      </div>
                      <span style={{ background:statutBg, color:statutColor, border:`1px solid ${statutColor}`, borderRadius:8, padding:'3px 10px', fontSize:10, fontWeight:700 }}>
                        {statutLabel}
                      </span>
                    </div>

                    <div style={{ background:'var(--caisse-sable)', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
                      {(credit.articles || []).length > 0 && (
                        <div style={{ fontSize:12, color:'var(--encre-4)', marginBottom:6 }}>
                          {credit.articles.map((a:any) => `${a.nom} ×${a.quantite}`).join(' · ')}
                        </div>
                      )}
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:12, color:'var(--encre-4)' }}>Acompte versé</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--caisse-vert)' }}>{montantPrive(Number(credit.acompte), montantsMasques, 'FCFA')}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--encre)' }}>Reste dû</span>
                        <span style={{ fontSize:16, fontWeight:900, color:statutColor }}>{montantPrive(Number(credit.montant_restant), montantsMasques, 'FCFA')}</span>
                      </div>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, color:statutColor, fontWeight:700 }}>
                        Échéance : {format(new Date(credit.echeance), 'dd MMMM yyyy', { locale:fr })}
                      </span>
                      {credit.statut !== 'paye' && (
                        <motion.button whileTap={{ scale:0.97 }}
                          onClick={async () => {
                            if (payingIds.has(credit.id)) return;
                            // 1er clic : on demande confirmation (Tata prévient).
                            if (confirmPayId !== credit.id) {
                              setConfirmPayId(credit.id);
                              try { speak('C\'est bien payé ? Touche encore pour confirmer.'); } catch { /* ignore */ }
                              setTimeout(() => setConfirmPayId(id => id === credit.id ? null : id), 4000);
                              return;
                            }
                            // 2e clic : on solde.
                            setConfirmPayId(null);
                            setPayingIds(prev => new Set(prev).add(credit.id));
                            await handleMarquerPaye(credit.id);
                            setPayingIds(prev => { const s = new Set(prev); s.delete(credit.id); return s; });
                          }}
                          disabled={payingIds.has(credit.id)}
                          style={{ background: confirmPayId === credit.id ? 'var(--caisse-vert-fonce)' : P, border:'none', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:700, color:'var(--caisse-ivoire)', cursor:'pointer', fontFamily:'inherit' }}>
                          {confirmPayId === credit.id ? 'Confirmer ?' : 'Marquer payé'}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {sourceFilter !== 'credits' && (
        <>
        {/* Liste groupée par jour */}
        {grouped.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'48px 24px' }}>
            {/* TROIS ÉTATS, TROIS PHRASES — HIST-01.
                Ce bloc affirmait « Pas encore de ventes enregistrées » dès que
                la liste était vide, sans savoir POURQUOI elle l'était. Quand la
                requête échouait, il présentait une absence de réponse comme une
                réponse, sur l'argent déjà gagné. Le filtre de recherche garde sa
                propre phrase : « aucun résultat » ne parle pas de l'argent, il
                parle du filtre. */}
            {search ? (
              <>
                <p style={{ fontSize:16, fontWeight:800, color:'var(--encre)', margin:'0 0 8px' }}>Aucune vente trouvée</p>
                <p style={{ fontSize:13, color:'var(--encre-4)', margin:0 }}>{`Aucun résultat pour "${search}"`}</p>
              </>
            ) : etat.type === 'illisible' ? (
              <>
                {/* La clé vient du module pur : l'écran ne CHOISIT pas la
                    phrase, il rend celle que la règle a décidée. */}
                <p style={{ fontSize:16, fontWeight:800, color:'var(--caisse-alerte)', margin:'0 0 8px' }}>{t(annonceEtat(etat)!.cle, annonceEtat(etat)!.variables)}</p>
                <button type="button" onClick={() => { void reloadTransactions(); }}
                  style={{ minHeight:48, marginTop:8, padding:'0 var(--caisse-esp-4)', borderRadius:'var(--caisse-rayon-3)', border:'none', background:P, color:'var(--caisse-ivoire)', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  {t('TATA_VENTES_REESSAYER', {})}
                </button>
              </>
            ) : etat.type === 'attente' ? (
              <p style={{ fontSize:14, color:'var(--caisse-gris-texte)', margin:0 }}>{t(annonceEtat(etat)!.cle, annonceEtat(etat)!.variables)}</p>
            ) : (
              <>
                <p style={{ fontSize:16, fontWeight:800, color:'var(--encre)', margin:'0 0 8px' }}>Aucune vente trouvée</p>
                <p style={{ fontSize:13, color:'var(--encre-4)', margin:0 }}>{t(annonceEtat(etat)!.cle, annonceEtat(etat)!.variables)}</p>
              </>
            )}
          </motion.div>
        ) : (
          grouped.map(group => (
            <div key={group.key}>
              {/* Header jour */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, fontWeight:700, color:P, textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 0 8px', borderBottom:'1px solid var(--trait)', marginBottom:8 }}>
                <span>{group.label}</span>
                <span style={{ color:'var(--encre-4)', fontWeight:600 }}>{group.count} vente{group.count > 1 ? 's' : ''} · {montantPrive(group.total, montantsMasques)}</span>
              </div>
              {group.sales.map((sale, i) => <VenteCard key={sale.id || i} sale={sale} index={i} query={search} montantsMasques={montantsMasques} />)}
            </div>
          ))
        )}
        </>
        )}
      </div>

      {/* BOUTON BAS */}
      <div style={{ flexShrink:0, padding:'8px 14px 32px', background:BG }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/marchand/caisse')}
          style={{ width:'100%', background:P, color:'var(--caisse-ivoire)', border:'none', borderRadius:20, padding:'17px 0', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${OMBRE_BOUTON}` }}>
          + Noter une vente
        </motion.button>
      </div>
    </SubPageLayout>
  );
}
