import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, X, Search, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';
import { apiRequest, HttpError } from '../../services/api/api-client';

const COLOR = '#C46210';

interface TontineListItem {
  id: string;
  nom: string;
  montantCotisation: string | number;
  cadenceJours: number;
  statut: 'active' | 'terminee' | 'annulee';
  cycleCourant: number;
  nombreMembres: number;
  estResponsable: boolean;
}

interface MembreCandidat {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'En cours', color: '#16A34A', bg: '#DCFCE7' },
  terminee: { label: 'Terminée', color: '#6B7280', bg: '#F3F4F6' },
  annulee: { label: 'Annulée', color: '#DC2626', bg: '#FEE2E2' },
};

const CADENCES = [
  { label: 'Hebdomadaire', jours: 7 },
  { label: 'Toutes les 2 semaines', jours: 14 },
  { label: 'Mensuelle', jours: 30 },
];

export function Tontines() {
  const { speak } = useApp();
  const navigate = useNavigate();
  const [tontines, setTontines] = useState<TontineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const charger = () => {
    setLoading(true);
    apiRequest<TontineListItem[]>(API_URL, '/tontines/mes-tontines', { method: 'GET' })
      .then((d) => setTontines(Array.isArray(d) ? d : []))
      .catch(() => setTontines([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  return (
    <SubPageLayout role="marchand" title="Mes tontines">
      <motion.div className="pb-32 max-w-2xl mx-auto space-y-4">
        <div className="rounded-2xl border-2 p-4 flex items-center justify-between" style={{ borderColor: `${COLOR}30`, background: `${COLOR}08` }}>
          <div>
            <p className="text-sm font-bold text-gray-800">Épargne tournante entre commerçantes</p>
            <p className="text-xs text-gray-500 mt-0.5">Chacune cotise, chacune reçoit son tour — argent réel, traçable.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw className="w-8 h-8" style={{ color: COLOR }} />
            </motion.div>
          </div>
        ) : tontines.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: COLOR }} />
            <p className="text-sm font-bold text-gray-700">Aucune tontine pour l'instant</p>
            <p className="text-xs text-gray-500 mt-1">Crée-en une, ou fais-toi ajouter par une responsable.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tontines.map((t) => {
              const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.active;
              const montant = Number(t.montantCotisation) || 0;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/marchand/tontines/${t.id}`)}
                  className="w-full text-left bg-white rounded-2xl border-2 p-4"
                  style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{t.nom}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {montant.toLocaleString('fr-FR')} FCFA · {t.nombreMembres} membres
                        {t.estResponsable ? ' · Responsable' : ''}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  {t.statut === 'active' && (
                    <p className="text-xs mt-2 font-semibold" style={{ color: COLOR }}>
                      Tour {t.cycleCourant + 1} / {t.nombreMembres}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        <motion.button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
          style={{ background: COLOR }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="w-5 h-5" /> Créer une tontine
        </motion.button>
      </motion.div>

      {showCreate && (
        <CreerTontineModal
          onClose={() => setShowCreate(false)}
          onCree={(id) => {
            setShowCreate(false);
            speak('Tontine créée. Chaque membre peut maintenant cotiser.');
            toast.success('Tontine créée');
            charger();
            navigate(`/marchand/tontines/${id}`);
          }}
        />
      )}
    </SubPageLayout>
  );
}

function CreerTontineModal({ onClose, onCree }: { onClose: () => void; onCree: (id: string) => void }) {
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [cadenceJours, setCadenceJours] = useState(30);
  const [dateDebut, setDateDebut] = useState(() => new Date().toISOString().slice(0, 10));
  const [telRecherche, setTelRecherche] = useState('');
  const [recherche, setRecherche] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState('');
  const [membres, setMembres] = useState<MembreCandidat[]>([]);
  const [creation, setCreation] = useState(false);

  const rechercherMembre = async () => {
    const digits = telRecherche.replace(/\D/g, '');
    if (digits.length !== 10) return;
    setRecherche(true);
    setErreurRecherche('');
    try {
      const phoneFull = `+225${digits}`;
      const data = await apiRequest<{ id: string; prenom: string; nom: string; telephone: string }>(
        API_URL,
        '/wallets/me/rechercher-destinataire',
        { method: 'POST', body: JSON.stringify({ telephone: phoneFull }) },
      );
      if (membres.some((m) => m.id === data.id)) {
        setErreurRecherche('Déjà ajoutée à la liste');
        return;
      }
      setMembres((prev) => [...prev, { id: data.id, prenom: data.prenom, nom: data.nom, telephone: data.telephone }]);
      setTelRecherche('');
    } catch (e: any) {
      const message = e instanceof HttpError ? e.message : (e?.message || 'Aucun compte Jùlaba trouvé');
      setErreurRecherche(message);
    } finally {
      setRecherche(false);
    }
  };

  const retirerMembre = (id: string) => setMembres((prev) => prev.filter((m) => m.id !== id));

  const peutCreer =
    nom.trim().length > 0 && Number(montant) > 0 && cadenceJours > 0 && dateDebut && membres.length >= 2 && !creation;

  const creer = async () => {
    if (!peutCreer) return;
    setCreation(true);
    try {
      const res = await apiRequest<{ id: string }>(API_URL, '/tontines', {
        method: 'POST',
        body: JSON.stringify({
          nom: nom.trim(),
          montantCotisation: Math.round(Number(montant)),
          cadenceJours,
          dateDebut,
          membres: membres.map((m) => ({ userId: m.id })),
        }),
      });
      onCree(res.id);
    } catch (e: any) {
      const message = e instanceof HttpError ? e.message : (e?.message || 'Création impossible');
      toast.error(message);
    } finally {
      setCreation(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
          <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Créer une tontine</h2>
              <p className="text-xs text-gray-500">L'ordre de réception est fixé dès la création</p>
            </div>
            <motion.button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90 }}>
              <X className="w-4 h-4 text-gray-600" />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Nom de la tontine</label>
              <input
                type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. Tontine des vendeuses de tomates"
                className="w-full rounded-2xl border-2 border-gray-200 px-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: nom ? COLOR : undefined }}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Montant de cotisation (FCFA, par membre et par tour)</label>
              <input
                type="number" inputMode="numeric" min={1} value={montant} onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex. 5000"
                className="w-full rounded-2xl border-2 border-gray-200 px-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: montant ? COLOR : undefined }}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Cadence</label>
              <div className="flex gap-2 flex-wrap">
                {CADENCES.map((c) => (
                  <button
                    key={c.jours} type="button" onClick={() => setCadenceJours(c.jours)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border-2"
                    style={cadenceJours === c.jours ? { borderColor: COLOR, background: `${COLOR}12`, color: COLOR } : { borderColor: '#E5E7EB', color: '#6B7280' }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Date de début</label>
              <input
                type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-2xl border-2 border-gray-200 px-3 py-3 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">
                Membres (dans l'ordre de réception — {membres.length} ajouté{membres.length > 1 ? 's' : ''}, minimum 2)
              </label>
              <div className="flex gap-2 mb-2">
                <span className="flex h-12 items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-600">+225</span>
                <input
                  type="tel" inputMode="numeric" placeholder="07 XX XX XX XX"
                  value={telRecherche}
                  onChange={(e) => { setTelRecherche(e.target.value); setErreurRecherche(''); }}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-gray-200 px-3 py-3 text-sm focus:outline-none"
                />
                <motion.button
                  type="button" onClick={() => void rechercherMembre()}
                  disabled={recherche || telRecherche.replace(/\D/g, '').length !== 10}
                  className="shrink-0 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: COLOR }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Search className="w-4 h-4" />
                </motion.button>
              </div>
              {erreurRecherche && <p className="text-xs text-red-600 mb-2">{erreurRecherche}</p>}

              {membres.length > 0 && (
                <div className="space-y-2">
                  {membres.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl border border-gray-100 p-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: COLOR }}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{m.prenom} {m.nom}</p>
                        <p className="text-xs text-gray-500">{m.telephone}</p>
                      </div>
                      <button type="button" onClick={() => retirerMembre(m.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            <motion.button
              type="button" onClick={() => void creer()} disabled={!peutCreer}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-50"
              style={{ background: COLOR }}
              whileTap={{ scale: 0.97 }}
            >
              {creation ? 'Création…' : 'Créer la tontine'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
