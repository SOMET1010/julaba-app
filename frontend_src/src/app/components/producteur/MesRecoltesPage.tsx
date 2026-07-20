import React, { useState, useMemo } from 'react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, TrendingUp, Plus, Check, Clock,
  ChevronRight, Sprout, ShoppingCart, X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useProducteur, type Recolte, type Cycle } from '../../contexts/ProducteurContext';
import { useApp } from '../../contexts/AppContext';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { SearchBar } from '../shared/SearchBar';

const COLOR = '#2E8B57';
const formatMontant = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;

const QUALITE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: 'Standard', color: '#D97706', bg: '#FEF3C7' },
  premium:  { label: 'Premium',  color: '#16A34A', bg: '#DCFCE7' },
  bio:      { label: 'Bio',      color: '#2563EB', bg: '#DBEAFE' },
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  declaree: { label: 'Déclarée',  color: '#6B7280', bg: '#F3F4F6', Icon: Clock },
  validee:  { label: 'Validée',   color: '#2E8B57', bg: '#D1FAE5', Icon: Check },
  vendue:   { label: 'Vendue',    color: '#DC2626', bg: '#FEE2E2', Icon: ShoppingCart },
};

function ModalDetailRecolte({
  recolte,
  cycle,
  onClose,
}: {
  recolte: Recolte;
  cycle: Cycle | undefined;
  onClose: () => void;
}) {
  const cfg  = STATUT_CONFIG[recolte.statut] ?? STATUT_CONFIG['declaree'];
  const qual = QUALITE_CONFIG[recolte.qualite] ?? QUALITE_CONFIG['standard'];
  const valeurTotale = Number(recolte.quantite) * Number(recolte.prixUnitaire);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-4 mb-2" />

          {recolte.photoUrl && (
            <div className="relative h-40 overflow-hidden">
              <img src={recolte.photoUrl} alt={recolte.produit} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-5 right-14">
                <h2 className="text-2xl font-bold text-white">{cycle?.culture || recolte.produit}</h2>
              </div>
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          )}

          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: qual.bg, color: qual.color }}>
                {qual.label}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Quantité',      value: `${Number(recolte.quantite).toLocaleString('fr-FR')} ${recolte.unite}` },
                { label: 'Prix unitaire', value: `${Number(recolte.prixUnitaire).toLocaleString('fr-FR')} FCFA/${recolte.unite}` },
                { label: 'Valeur totale', value: `${valeurTotale.toLocaleString('fr-FR')} FCFA` },
                { label: 'Date récolte',  value: recolte.dateRecolte ? new Date(recolte.dateRecolte).toLocaleDateString('fr-FR') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {recolte.notes && (
              <div className="bg-gray-50 rounded-2xl p-3">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{recolte.notes}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function MesRecoltesPage() {
  const navigate = useNavigate();
  const { speak } = useApp();
  const { recoltes, cycles } = useProducteur();

  const [filtreStatut, setFiltreStatut] = useState<Recolte['statut'] | 'tout'>('tout');
  const [recolteSelectionnee, setRecolte] = useState<Recolte | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const recoltesFiltrees = useMemo(() => {
    let base = filtreStatut === 'tout' ? [...recoltes] : recoltes.filter(r => r.statut === filtreStatut);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base.filter(r => {
        const cycle = cycles.find(c => c.id === r.cycleId);
        const culture = (cycle?.culture || '').toLowerCase();
        const produit = (r.produit || '').toLowerCase();
        return culture.includes(q) || produit.includes(q);
      });
    }
    return base.sort((a, b) => new Date(b.dateRecolte).getTime() - new Date(a.dateRecolte).getTime());
  }, [recoltes, filtreStatut, searchQuery, cycles]);

  const getCycle = (cycleId?: string) => cycles.find(c => c.id === cycleId);

  const totalKg    = recoltes.reduce((s, r) => s + Number(r.quantite), 0);
  const totalVendu = recoltes.filter(r => r.statut === 'vendue').length;
  const valeurStock = recoltes
    .filter(r => r.statut !== 'vendue')
    .reduce((s, r) => s + Number(r.quantite) * Number(r.prixUnitaire), 0);

  return (
    <>
      <SubPageLayout
        role="producteur"
        title="Mes récoltes"
        subtitle={`${totalKg.toLocaleString('fr-FR')} kg · ${recoltes.length} récolte${recoltes.length > 1 ? 's' : ''}`}
        rightContent={
          <motion.button
            onClick={() => navigate('/producteur/declarer-recolte')}
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        }
      >
        {/* Stats */}
        <div className="px-5 mt-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-5"
          >
            <KPIGrid cols={3}>
              <UniversalKPI
                label="Total"
                value={`${totalKg.toLocaleString('fr-FR')} kg`}
                icon={Package}
                color={COLOR}
                iconAnimation="none"
              />
              <UniversalKPI
                label="Vendues"
                value={String(totalVendu)}
                icon={Check}
                color="#16A34A"
                iconAnimation="none"
              />
              <UniversalKPI
                label="Valeur stock"
                value={`${formatMontant(Math.round(valeurStock))} FCFA`}
                icon={TrendingUp}
                color="#D97706"
                iconAnimation="none"
              />
            </KPIGrid>
          </motion.div>
        </div>

        <div className="px-5 mt-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher une culture, une récolte..."
            primaryColor={COLOR}
            voiceEnabled={false}
          />
        </div>

        {/* Filtres + liste */}
        <div className="px-5 mt-4 pb-36">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
            {([
              { id: 'tout',     label: 'Toutes' },
              { id: 'declaree', label: 'Déclarées' },
              { id: 'validee',  label: 'Validées' },
              { id: 'vendue',   label: 'Vendues' },
            ] as { id: typeof filtreStatut; label: string }[]).map(f => (
              <motion.button
                key={f.id}
                onClick={() => setFiltreStatut(f.id)}
                className="px-4 py-2 rounded-full border-2 text-sm font-semibold whitespace-nowrap flex-shrink-0"
                style={filtreStatut === f.id
                  ? { backgroundColor: COLOR, borderColor: COLOR, color: 'white' }
                  : { backgroundColor: 'white', borderColor: '#E5E7EB', color: '#6B7280' }
                }
                whileTap={{ scale: 0.95 }}
              >
                {f.label}
              </motion.button>
            ))}
          </div>

          <div className="space-y-4">
            {recoltesFiltrees.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Sprout className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm text-center">Aucune récolte dans cette catégorie.</p>
                <motion.button
                  onClick={() => navigate('/producteur/declarer-recolte')}
                  className="px-6 py-3 rounded-2xl font-bold text-white"
                  style={{ backgroundColor: COLOR }}
                  whileTap={{ scale: 0.97 }}
                >
                  Déclarer une récolte
                </motion.button>
              </div>
            ) : (
              recoltesFiltrees.map((recolte, i) => {
                const cycle = getCycle(recolte.cycleId);
                const cfg   = STATUT_CONFIG[recolte.statut] ?? STATUT_CONFIG['declaree'];
                const qual  = QUALITE_CONFIG[recolte.qualite] ?? QUALITE_CONFIG['standard'];
                const StatusIcon = cfg.Icon;

                return (
                  <motion.div
                    key={recolte.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 220 }}
                    onClick={() => { setRecolte(recolte); void speak(`${recolte.produit}, ${Number(recolte.quantite).toLocaleString()} kg`); }}
                    className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden cursor-pointer"
                  >
                    {recolte.photoUrl && (
                      <div className="relative h-36 overflow-hidden">
                        <img src={recolte.photoUrl} alt={recolte.produit} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: qual.bg, color: qual.color }}>
                            {qual.label}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                          <div>
                            <h3 className="text-white font-bold text-lg">{cycle?.culture || recolte.produit}</h3>
                            <p className="text-white/80 text-sm">{Number(recolte.quantite).toLocaleString()} {recolte.unite}</p>
                          </div>
                          <p className="text-white font-bold text-base">{Number(recolte.prixUnitaire).toLocaleString()} FCFA/{recolte.unite}</p>
                        </div>
                      </div>
                    )}

                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{cycle?.culture || recolte.produit}</p>
                        <p className="text-sm text-gray-500">{Number(recolte.quantite).toLocaleString()} {recolte.unite} · {Number(recolte.prixUnitaire).toLocaleString()} FCFA/{recolte.unite}</p>
                      </div>
                      <motion.div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${COLOR}15` }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ChevronRight className="w-5 h-5" style={{ color: COLOR }} />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </SubPageLayout>

      {recolteSelectionnee && (
        <ModalDetailRecolte
          recolte={recolteSelectionnee}
          cycle={getCycle(recolteSelectionnee.cycleId)}
          onClose={() => setRecolte(null)}
        />
      )}

      <motion.button
        onClick={() => navigate('/producteur/declarer-recolte')}
        className="fixed bottom-28 right-5 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ backgroundColor: COLOR }}
        whileTap={{ scale: 0.9 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Plus className="w-7 h-7 text-white" />
      </motion.button>
    </>
  );
}
