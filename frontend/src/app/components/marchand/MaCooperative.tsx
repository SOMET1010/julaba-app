import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, CheckCircle, RefreshCw, Package, Gift, X } from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../services/api/api-client';
import { useCooperativesListe } from '../../hooks/useCooperativesListe';
import { fetchMesDistributions, type DistributionRecue } from '../../services/api/cooperatives-api';

const COLOR = 'var(--commerce-action)';

// M-P0-2 (AUDIT-UX-ROLES-2026-10-06) : la cotisation est un MOUVEMENT D'ARGENT
// — elle passe désormais par la relecture « tu paies X à Y ? » + PIN si la
// marchande l'a activé (même contrat que le marché : /auth/pin/verify). Le
// montant reste porté par le code tant qu'aucun endpoint ne le sert ; il vit
// ICI et nulle part ailleurs, nommé, pour que le jour de la bascule API il ne
// bouge qu'une seule ligne.
const COTISATION_MONTANT = 25000;
// R1-1 (REVIEW-001) : le libellé affiché DÉRIVE désormais du montant — la
// promesse « il vit ICI et nulle part ailleurs » tient aussi pour l'affichage :
// le jour de la bascule API, une seule ligne à changer (et aucun libellé oublié).
// (\u00A0 = espace insécable, rendu identique à l'ancien libellé en dur.)
const COTISATION_MONTANT_LIBELLE = `${COTISATION_MONTANT.toLocaleString('fr-FR').replace(/[\s\u00A0\u202F]/g, '\u00A0')} FCFA`;

/** Réponse `GET /api/v1/cooperatives/ma-cooperative` (objet plat) */
interface MaCooperativeInfo {
  id: string;
  nom: string;
  statut_membre: string;
  role_membre: string;
  responsable_nom?: string;
  marche?: string;
  commune?: string;
  fonction?: string;
  contact?: string;
  date_adhesion?: string;
  actif?: boolean;
}

export function MaCooperative() {
  const { speak, user } = useApp();
  const navigate = useNavigate();
  const { cooperatives: cooperativesListe } = useCooperativesListe();
  const [selectedCoopId, setSelectedCoopId] = useState('');
  const [maCoopInfo, setMaCoopInfo] = useState<MaCooperativeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [distributions, setDistributions] = useState<DistributionRecue[]>([]);
  // Cotisation : relecture avant l'irréversible + verrou SYNCHRONE anti
  // double-tap (le pattern caisse : l'état React ne se met à jour qu'au
  // render suivant, un ref bloque le 2e tap dès la même frame).
  const [showCotisationConfirm, setShowCotisationConfirm] = useState(false);
  const [cotisationEnCours, setCotisationEnCours] = useState(false);
  const cotisationEnCoursRef = useRef(false);
  const [cotisationPin, setCotisationPin] = useState('');
  const [cotisationErreur, setCotisationErreur] = useState('');
  const pinRequis = Boolean(user?.pinSecurityEnabled);
  useEffect(() => {
    apiRequest<MaCooperativeInfo | null>(API_URL, '/cooperatives/ma-cooperative', { method: 'GET' })
      .then(d => { setMaCoopInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
    // Historique des distributions reçues du stock commun — indépendant du
    // statut d'adhésion courant (une distribution passée reste consultable).
    fetchMesDistributions()
      .then(d => setDistributions(d.distributions))
      .catch(() => setDistributions([]));
  }, []);

  function formatDateDistribution(iso: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }

  const fermerCotisationConfirm = () => {
    if (cotisationEnCours) return;
    setShowCotisationConfirm(false);
    setCotisationPin('');
    setCotisationErreur('');
  };

  const handleConfirmerCotisation = async () => {
    // Verrou synchrone : un 2e tap dans la même frame est ignoré ici, pas
    // au prochain render — la cotisation ne doit JAMAIS partir deux fois.
    if (cotisationEnCoursRef.current) return;
    if (pinRequis && cotisationPin.length !== 4) {
      setCotisationErreur('Ton code PIN a 4 chiffres');
      return;
    }
    cotisationEnCoursRef.current = true;
    setCotisationEnCours(true);
    setCotisationErreur('');
    try {
      if (pinRequis) {
        const verif = await apiRequest<{ valid?: boolean }>(API_URL, '/auth/pin/verify', {
          method: 'POST',
          body: JSON.stringify({ pin: cotisationPin }),
        });
        if (!verif?.valid) {
          setCotisationErreur('Code PIN incorrect. Réessaie');
          setCotisationPin('');
          return;
        }
      }
      await apiRequest<unknown>(API_URL, '/cooperatives/cotisation', {
        method: 'POST',
        body: JSON.stringify({ montant: COTISATION_MONTANT }),
      });
      toast.success('Cotisation payée avec succès');
      speak('Ta cotisation est payée. Merci !');
      setShowCotisationConfirm(false);
      setCotisationPin('');
    } catch (err: any) {
      console.warn('[MaCooperative] cotisation failed:', err?.message);
      toast.error('Le paiement n\'a pas passé. Vérifie ton réseau et réessaie.');
      speak('Le paiement n\'a pas passé. Réessaie.');
    } finally {
      cotisationEnCoursRef.current = false;
      setCotisationEnCours(false);
    }
  };

  const handleRejoindreListe = async () => {
    if (!selectedCoopId) return;
    setJoining(true);
    try {
      await apiRequest<unknown>(API_URL, `/cooperatives/rejoindre/${selectedCoopId}`, {
        method: 'POST',
      });
      toast.success('Demande envoyée à la coopérative');
      speak('Ta demande a été envoyée');
      const d = await apiRequest<MaCooperativeInfo | null>(API_URL, '/cooperatives/ma-cooperative', { method: 'GET' }).catch(() => null);
      setMaCoopInfo(d);
      setSelectedCoopId('');
    } catch (e: any) {
      console.warn('[MaCooperative] handleRejoindreListe failed:', e?.message);
      toast.error('Erreur lors de la demande');
    } finally {
      setJoining(false);
    }
  };

  const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    actif: { label: 'Membre actif', color: 'var(--color-green-600)', bg: 'var(--color-green-100)' },
    en_attente: { label: 'En attente de validation', color: 'var(--herite-ambre-fonce)', bg: 'var(--herite-creme)' },
    suspendu: { label: 'Suspendu', color: 'var(--destructive)', bg: 'var(--color-red-100)' },
  };

  return (
    <SubPageLayout role="marchand" title="Ma coopérative">
      <motion.div className="pb-32 max-w-2xl mx-auto space-y-4">

        {loading ? (
          <motion.div className="flex justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw className="w-8 h-8" style={{ color: COLOR }} />
            </motion.div>
          </motion.div>
        ) : maCoopInfo?.nom ? (
          <>
            {/* Carte coop actuelle */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border-2 p-5 shadow-sm"
              style={{ borderColor: `${COLOR}40` }}>
              <motion.div className="flex items-center gap-4 mb-4">
                <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${COLOR}15` }}>
                  <Users className="w-7 h-7" style={{ color: COLOR }} />
                </motion.div>
                <motion.div>
                  <p className="font-bold text-gray-900 text-lg">
                    {maCoopInfo.nom || 'Coopérative'}
                  </p>
                  {(maCoopInfo.marche || maCoopInfo.commune) && (
                    <p className="text-sm text-gray-500">
                      {[maCoopInfo.marche, maCoopInfo.commune].filter(Boolean).join('\u00A0\u00B7 ')}
                    </p>
                  )}
                  {maCoopInfo.responsable_nom && (
                    <p className="text-sm text-gray-500">Responsable{'\u00A0'}: {maCoopInfo.responsable_nom}</p>
                  )}
                  {maCoopInfo.fonction && (
                    <p className="text-xs text-gray-400">{maCoopInfo.fonction}</p>
                  )}
                  {maCoopInfo.contact && (
                    <p className="text-xs text-gray-400">{maCoopInfo.contact}</p>
                  )}
                </motion.div>
              </motion.div>

              {/* Statut */}
              {(() => {
                const st = (maCoopInfo.statut_membre || 'en_attente').toLowerCase();
                const sc = STATUT_CONFIG[st] || STATUT_CONFIG['en_attente'];
                return (
                  <motion.div className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
                    style={{ backgroundColor: sc.bg }}>
                    <CheckCircle className="w-4 h-4" style={{ color: sc.color }} />
                    <span className="text-sm font-bold" style={{ color: sc.color }}>{sc.label}</span>
                  </motion.div>
                );
              })()}

              {maCoopInfo.date_adhesion && (
                <p className="text-xs text-gray-400 mt-3">
                  Adhésion{'\u00A0'}: {new Date(maCoopInfo.date_adhesion).toLocaleDateString('fr-FR')}
                </p>
              )}
            </motion.div>


            {maCoopInfo.statut_membre?.toLowerCase() === 'actif' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border-2 p-5 shadow-sm"
                style={{ borderColor: '#16A34A40' }}
              >
                <p className="font-bold text-gray-900 mb-2">Cotisation coopérative</p>
                <p className="text-xs text-gray-500 mb-3">
                  Paie ta cotisation mensuelle pour rester membre actif.
                </p>
                <motion.button
                  onClick={() => { setCotisationErreur(''); setShowCotisationConfirm(true); }}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                  style={{ backgroundColor: 'var(--color-green-600)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Payer ma cotisation{'\u00A0'}: {COTISATION_MONTANT_LIBELLE}
                </motion.button>
                <p className="text-xs text-gray-400 mt-2 text-center">On te demandera de confirmer avant le paiement.</p>
              </motion.div>
            )}

            {maCoopInfo.statut_membre?.toLowerCase() === 'actif' && (
              <motion.button
                onClick={() => navigate('/marchand/commandes')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 rounded-2xl bg-white border-2 flex items-center justify-between shadow-sm"
                style={{ borderColor: `${COLOR}40` }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div className="flex items-center gap-3">
                  <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${COLOR}15` }}>
                    <Package className="w-6 h-6" style={{ color: COLOR }} />
                  </motion.div>
                  <motion.div className="text-left">
                    <p className="font-bold text-gray-900">Mes commandes</p>
                    <p className="text-xs text-gray-500">Suivre mes achats auprès des producteurs</p>
                  </motion.div>
                </motion.div>
                <span className="text-gray-400">›</span>
              </motion.button>
            )}

            {/* Bouton soumettre un besoin */}
            {maCoopInfo.statut_membre?.toLowerCase() === 'actif' && (
              <motion.button
                onClick={() => navigate('/marchand/cooperative/besoin')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 rounded-2xl bg-white border-2 flex items-center justify-between shadow-sm"
                style={{ borderColor: `${COLOR}40` }}
                whileTap={{ scale: 0.97 }}>
                <motion.div className="flex items-center gap-3">
                  <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${COLOR}15` }}>
                    <Package className="w-6 h-6" style={{ color: COLOR }} />
                  </motion.div>
                  <motion.div className="text-left">
                    <p className="font-bold text-gray-900">Soumettre un besoin</p>
                    <p className="text-xs text-gray-500">Demande groupée à ma coopérative</p>
                  </motion.div>
                </motion.div>
                <span className="text-gray-400">›</span>
              </motion.button>
            )}

            {/* Historique des distributions reçues du stock commun */}
            {distributions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border-2 p-5 shadow-sm"
                style={{ borderColor: `${COLOR}40` }}>
                <p className="font-bold text-gray-900 mb-3">Distributions reçues</p>
                <div className="space-y-2">
                  {distributions.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${COLOR}15` }}>
                        <Gift className="w-5 h-5" style={{ color: COLOR }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {d.quantite}{d.unite ? ` ${d.unite}` : ''} de {d.produit}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateDistribution(d.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <>
            {/* Pas encore membre */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-10 gap-3">
              <motion.div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${COLOR}15` }}>
                <Users className="w-10 h-10" style={{ color: COLOR }} />
              </motion.div>
              <p className="font-bold text-gray-700 text-lg">Pas encore membre</p>
              <p className="text-sm text-gray-500 text-center px-4">
                Rejoins une coopérative pour accéder aux achats groupés et soumettre tes besoins.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-5 space-y-4">
              <p className="font-bold text-gray-900">Choisir ta coopérative</p>
              <p className="text-xs text-gray-500">Sélectionne ta coopérative dans la liste officielle.</p>
              <select
                value={selectedCoopId}
                onChange={e => setSelectedCoopId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 text-sm focus:outline-none"
                onFocus={e => (e.target.style.borderColor = COLOR)}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              >
                <option value="">Choisis une coopérative…</option>
                {cooperativesListe.map(c => {
                  const lieu = [c.marche, c.commune].filter(Boolean).join(', ');
                  const label = lieu ? `${c.nom} (${lieu})` : c.nom;
                  return (
                    <option key={c.id} value={c.id}>{label}</option>
                  );
                })}
              </select>
              <motion.button
                onClick={handleRejoindreListe}
                disabled={joining || !selectedCoopId}
                className="h-12 w-full px-4 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: COLOR }}
                whileTap={{ scale: 0.95 }}
              >
                {joining ? 'Envoi…' : 'Rejoindre cette coopérative'}
              </motion.button>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Relecture cotisation (M-P0-2) : l'argent ne part jamais d'un seul tap. */}
      <AnimatePresence>
        {showCotisationConfirm && maCoopInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={fermerCotisationConfirm}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmer le paiement de ta cotisation"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Confirmer le paiement</h2>
                <motion.button
                  onClick={fermerCotisationConfirm}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  aria-label="Fermer"
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-2xl p-4" style={{ backgroundColor: `${COLOR}15` }}>
                  <p className="text-sm text-gray-600 mb-1">Tu paies</p>
                  <p className="text-3xl font-bold tabular-nums" style={{ color: COLOR }}>{COTISATION_MONTANT_LIBELLE}</p>
                  <p className="text-sm text-gray-600 mt-1">à {maCoopInfo.nom || 'ta coopérative'} — cotisation mensuelle</p>
                </div>
                <p className="text-xs text-gray-500">Ce paiement est définitif. Vérifie bien avant de confirmer.</p>
                {pinRequis && (
                  <div>
                    <label htmlFor="cotisation-pin" className="text-sm font-semibold text-gray-700 block mb-1">Ton code PIN</label>
                    <input
                      id="cotisation-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      value={cotisationPin}
                      onChange={(e) => setCotisationPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4 chiffres"
                      className="w-full h-12 px-4 rounded-xl border-2 text-center text-xl font-bold tracking-[0.5em] tabular-nums focus:outline-none"
                      style={{ borderColor: cotisationPin ? COLOR : 'var(--border)' }}
                      aria-describedby={cotisationErreur ? 'cotisation-erreur' : undefined}
                    />
                  </div>
                )}
                {cotisationErreur && (
                  <p id="cotisation-erreur" role="alert" className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>{cotisationErreur}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    onClick={fermerCotisationConfirm}
                    disabled={cotisationEnCours}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 disabled:opacity-50"
                    style={{ borderColor: `${COLOR}40`, color: COLOR, background: 'white' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    onClick={handleConfirmerCotisation}
                    disabled={cotisationEnCours || (pinRequis && cotisationPin.length !== 4)}
                    className="flex-1 py-3 rounded-2xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--color-green-600)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {cotisationEnCours && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {cotisationEnCours ? 'Paiement…' : 'Confirmer le paiement'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}
