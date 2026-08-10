/**
 * Fidelite — Programme de fidélité paramétrable du marchand (CDC 8.1.2).
 *
 * Le marchand règle son barème (points par 100 FCFA, seuil, récompense) puis
 * suit les points de ses clients par numéro de téléphone : enregistrer un achat
 * crédite des points, et la récompense se déclenche au seuil.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Settings, Search, Plus, Check, Star, Phone, X } from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import {
  getConfig, setConfig, getClient, gagnerPoints, utiliserRecompense,
  type FideliteConfig, type FideliteClient,
} from '../../services/fidelite.service';

const COLOR = '#E67E22';

export function Fidelite() {
  const { speak } = useApp();
  const [config, setConfigState] = useState<FideliteConfig | null>(null);
  const [showReglages, setShowReglages] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  // Recherche client
  const [tel, setTel] = useState('');
  const [client, setClient] = useState<FideliteClient | null>(null);
  const [recherche, setRecherche] = useState(false);
  const [montant, setMontant] = useState('');
  const [nom, setNom] = useState('');

  useEffect(() => { getConfig().then(setConfigState); }, []);

  const chercher = async () => {
    const t = tel.trim();
    if (!t) { toast.error('Entre un numéro'); return; }
    setRecherche(true);
    try {
      const r = await getClient(t);
      setConfigState(r.config);
      setClient(r.client);
      if (!r.client) { setNom(''); toast('Nouveau client — enregistre un achat pour démarrer'); }
    } finally { setRecherche(false); }
  };

  const enregistrerAchat = async () => {
    const m = Number(montant);
    if (!tel.trim()) { toast.error('Entre un numéro'); return; }
    if (!(m > 0)) { toast.error('Montant invalide'); return; }
    try {
      const r = await gagnerPoints(tel.trim(), m, nom || client?.nom || '');
      setClient(r.client);
      setConfigState(r.config);
      setMontant('');
      toast.success(`+${r.pointsGagnes} point${r.pointsGagnes > 1 ? 's' : ''}`);
      speak(`${r.pointsGagnes} points ajoutés. Total ${Math.round(Number(r.client.points))} points.`);
      if (r.recompenseDisponible) speak('Ce client a droit à sa récompense !');
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  const utiliser = async () => {
    if (!client) return;
    try {
      const r = await utiliserRecompense(client.telephone);
      setClient(r.client);
      toast.success(`Récompense : ${r.remise.toLocaleString('fr-FR')} FCFA de remise`);
      speak(`Récompense appliquée : ${r.remise} francs de remise.`);
    } catch (e: any) { toast.error(e?.message || 'Points insuffisants'); }
  };

  const sauverConfig = async () => {
    if (!config) return;
    setSavingCfg(true);
    try {
      const saved = await setConfig(config);
      setConfigState(saved);
      setShowReglages(false);
      toast.success('Barème enregistré');
    } catch { toast.error('Enregistrement impossible'); }
    finally { setSavingCfg(false); }
  };

  const points = client ? Math.round(Number(client.points)) : 0;
  const seuil = config ? Number(config.seuil_points) : 100;
  const pct = seuil > 0 ? Math.min(100, Math.round((points / seuil) * 100)) : 0;
  const eligible = config ? points >= seuil && config.recompense_fcfa > 0 : false;

  return (
    <SubPageLayout
      role="marchand"
      title="Fidélité"
      subtitle={config?.actif ? 'Programme actif' : 'Programme désactivé'}
      rightContent={
        <motion.button onClick={() => setShowReglages(true)} whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" aria-label="Réglages">
          <Settings className="w-4 h-4 text-white" />
        </motion.button>
      }
    >
      <div className="pb-32 space-y-4">
        {/* Barème résumé */}
        {config && (
          <div className="rounded-3xl border-2 p-4" style={{ borderColor: `${COLOR}33`, backgroundColor: `${COLOR}0A` }}>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5" style={{ color: COLOR }} />
              <p className="font-bold text-gray-900">Mon barème</p>
              {!config.actif && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">désactivé</span>}
            </div>
            <p className="text-sm text-gray-700">
              {config.points_par_cent} point{config.points_par_cent > 1 ? 's' : ''} par 100 FCFA ·
              récompense à {config.seuil_points} points = {Number(config.recompense_fcfa).toLocaleString('fr-FR')} FCFA de remise
            </p>
            <button onClick={() => setShowReglages(true)} className="mt-2 text-sm font-semibold" style={{ color: COLOR }}>
              Modifier le barème
            </button>
          </div>
        )}

        {/* Recherche client */}
        <div className="rounded-3xl border-2 border-gray-100 bg-white p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Numéro du client</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 rounded-2xl border-2 border-gray-200" style={{ boxSizing: 'border-box' }}>
              <Phone className="w-4 h-4 text-gray-400" />
              <input
                type="tel" inputMode="tel" value={tel}
                onChange={(e) => setTel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') chercher(); }}
                placeholder="07 00 00 00 00"
                className="flex-1 py-3 outline-none text-lg font-semibold bg-transparent"
              />
            </div>
            <motion.button onClick={chercher} disabled={recherche} whileTap={{ scale: 0.95 }}
              className="px-4 rounded-2xl text-white font-bold flex items-center gap-1.5" style={{ backgroundColor: COLOR }}>
              <Search className="w-4 h-4" /> Voir
            </motion.button>
          </div>
        </div>

        {/* Fiche client */}
        {client && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border-2 p-4" style={{ borderColor: `${COLOR}33` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{client.nom || 'Client'}</p>
                <p className="text-xs text-gray-500">{client.telephone}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black" style={{ color: COLOR }}>{points}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>

            {/* Progression vers la récompense */}
            <div className="mt-3">
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: eligible ? '#16A34A' : COLOR }}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {eligible ? '🎁 Récompense disponible !' : `${points}/${seuil} points vers la récompense`}
              </p>
            </div>

            {eligible && (
              <motion.button onClick={utiliser} whileTap={{ scale: 0.97 }}
                className="mt-3 w-full py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2" style={{ backgroundColor: '#16A34A' }}>
                <Gift className="w-5 h-5" /> Utiliser la récompense ({Number(config?.recompense_fcfa).toLocaleString('fr-FR')} FCFA)
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Enregistrer un achat */}
        {tel.trim() && (
          <div className="rounded-3xl border-2 border-gray-100 bg-white p-4 space-y-3">
            <p className="font-bold text-gray-800">Enregistrer un achat</p>
            {!client && (
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du client (facultatif)"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200" style={{ boxSizing: 'border-box' }} />
            )}
            <div className="flex gap-2">
              <input type="number" inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)}
                placeholder="Montant de l'achat (FCFA)"
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 text-lg font-semibold" style={{ boxSizing: 'border-box' }} />
              <motion.button onClick={enregistrerAchat} whileTap={{ scale: 0.95 }}
                className="px-5 rounded-2xl text-white font-bold flex items-center gap-1.5" style={{ backgroundColor: COLOR }}>
                <Plus className="w-4 h-4" /> Points
              </motion.button>
            </div>
            {config && Number(montant) > 0 && (
              <p className="text-xs text-gray-500">
                ≈ +{Math.floor((Number(montant) / 100) * config.points_par_cent)} point(s) avec ton barème actuel
              </p>
            )}
          </div>
        )}
      </div>

      {/* Réglages du barème */}
      <AnimatePresence>
        {showReglages && config && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReglages(false)}>
            <motion.div className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Barème de fidélité</h3>
                <button onClick={() => setShowReglages(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Activer / désactiver */}
              <button onClick={() => setConfigState({ ...config, actif: !config.actif })}
                className="w-full flex items-center justify-between p-3 rounded-2xl border-2 mb-3"
                style={{ borderColor: config.actif ? '#16A34A' : '#E5E7EB', backgroundColor: config.actif ? '#16A34A10' : '#fff' }}>
                <span className="font-semibold text-gray-800">Programme {config.actif ? 'activé' : 'désactivé'}</span>
                <span className="w-12 h-7 rounded-full flex items-center px-1 transition-all" style={{ backgroundColor: config.actif ? '#16A34A' : '#ccc', justifyContent: config.actif ? 'flex-end' : 'flex-start' }}>
                  <span className="w-5 h-5 rounded-full bg-white" />
                </span>
              </button>

              <label className="block text-xs font-semibold text-gray-500 mb-1">Points par 100 FCFA d'achat</label>
              <input type="number" value={config.points_par_cent}
                onChange={(e) => setConfigState({ ...config, points_par_cent: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 mb-3" style={{ boxSizing: 'border-box' }} />

              <label className="block text-xs font-semibold text-gray-500 mb-1">Récompense atteinte à (points)</label>
              <input type="number" value={config.seuil_points}
                onChange={(e) => setConfigState({ ...config, seuil_points: e.target.value === '' ? 1 : Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 mb-3" style={{ boxSizing: 'border-box' }} />

              <label className="block text-xs font-semibold text-gray-500 mb-1">Valeur de la récompense (FCFA de remise)</label>
              <input type="number" value={config.recompense_fcfa}
                onChange={(e) => setConfigState({ ...config, recompense_fcfa: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 mb-4" style={{ boxSizing: 'border-box' }} />

              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 mb-4">
                <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Exemple : un achat de {(seuil * 100 / Math.max(config.points_par_cent, 1)).toLocaleString('fr-FR')} FCFA
                  au total donne droit à {Number(config.recompense_fcfa).toLocaleString('fr-FR')} FCFA de remise.
                </p>
              </div>

              <motion.button onClick={sauverConfig} disabled={savingCfg} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: COLOR }}>
                <Check className="w-5 h-5" /> Enregistrer le barème
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}
