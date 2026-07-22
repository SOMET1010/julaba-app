/**
 * ProtectionSociale — Socle « Gestion sociale » du marchand (CDC 8.1.2 + 9.1).
 *
 * Suivi des cotisations CNPS (retraite) et CNAM (santé), consultation des
 * prestations, rappels d'échéance. Aujourd'hui alimenté par le socle LOCAL
 * (protectionSociale.service) ; le jour où les API CNPS/CNAM seront branchées,
 * cet écran fonctionne à l'identique sans modification.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, HeartPulse, Plus, Volume2, Check, Trash2, Clock, X, Info } from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import {
  sourceProtectionSociale as source,
  totalCotise,
  derniereCotisation,
  moisEnRetard,
  LIBELLE_ORGANISME,
  type EtatProtectionSociale,
  type Organisme,
  type Cotisation,
} from '../../services/protectionSociale.service';

const COLOR = '#E67E22';
const ORG_STYLE: Record<Organisme, { color: string; icon: React.ElementType }> = {
  CNPS: { color: '#2E7D32', icon: Shield },
  CNAM: { color: '#1565C0', icon: HeartPulse },
};

function moisCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function libellePeriode(p: string): string {
  const [y, m] = p.split('-');
  const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${mois[idx]} ${y}` : p;
}

export function ProtectionSociale() {
  const { user, speak } = useApp();
  const userId = user?.id || 'anon';

  const [etat, setEtat] = useState<EtatProtectionSociale | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formOrg, setFormOrg] = useState<Organisme>('CNPS');
  const [montant, setMontant] = useState('');
  const [periode, setPeriode] = useState(moisCourant());
  const [mode, setMode] = useState('espèces');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    source.charger(userId).then(setEtat).catch(() => setEtat(null));
  }, [userId]);

  const rappels = useMemo(() => {
    if (!etat) return [] as { organisme: Organisme; mois: number }[];
    return etat.adhesions
      .map((a) => ({ organisme: a.organisme, mois: moisEnRetard(a, etat.cotisations) }))
      .filter((r) => r.mois > 0);
  }, [etat]);

  const ajouterCotisation = async () => {
    const m = Number(montant);
    if (!(m > 0)) { toast.error('Montant invalide'); return; }
    setSaving(true);
    try {
      await source.enregistrerCotisation(userId, {
        organisme: formOrg,
        montant: m,
        periode,
        datePaiement: new Date().toISOString(),
        mode,
      });
      const frais = await source.charger(userId);
      setEtat(frais);
      setShowForm(false);
      setMontant('');
      toast.success(`Cotisation ${formOrg} enregistrée`);
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async (id: string) => {
    await source.supprimerCotisation(userId, id);
    setEtat(await source.charger(userId));
  };

  const ecouter = () => {
    if (!etat) return;
    const cnps = totalCotise(etat.cotisations, 'CNPS');
    const cnam = totalCotise(etat.cotisations, 'CNAM');
    const parts = [
      'Votre protection sociale.',
      `CNPS, pour votre retraite : ${cnps.toLocaleString('fr-FR')} francs cotisés.`,
      `CNAM, pour votre santé : ${cnam.toLocaleString('fr-FR')} francs cotisés.`,
    ];
    if (rappels.length) parts.push(`Attention, il vous reste des mois à régler.`);
    speak(parts.join(' '));
  };

  const cotisationsTriees = etat
    ? [...etat.cotisations].sort((a, b) => (a.datePaiement < b.datePaiement ? 1 : -1))
    : [];

  return (
    <SubPageLayout
      role="marchand"
      title="Ma protection sociale"
      subtitle="CNPS retraite · CNAM santé"
      rightContent={
        <motion.button
          onClick={ecouter}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          whileTap={{ scale: 0.9 }}
          aria-label="Écouter"
        >
          <Volume2 className="w-4 h-4 text-white" />
        </motion.button>
      }
    >
      <div className="pb-32 space-y-4">
        {/* Bandeau : socle en attente des API officielles */}
        {!source.enLigne && (
          <div className="flex items-start gap-2 rounded-2xl bg-blue-50 border-2 border-blue-100 p-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Suivi personnel de vos cotisations. La synchronisation officielle avec la
              CNPS et la CNAM sera activée dès que la connexion sera disponible.
            </p>
          </div>
        )}

        {/* Cartes CNPS / CNAM */}
        {etat?.adhesions.map((a) => {
          const st = ORG_STYLE[a.organisme];
          const Icon = st.icon;
          const total = totalCotise(etat.cotisations, a.organisme);
          const derniere = derniereCotisation(etat.cotisations, a.organisme);
          const retard = moisEnRetard(a, etat.cotisations);
          return (
            <motion.div
              key={a.organisme}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border-2 p-4"
              style={{ borderColor: `${st.color}33`, backgroundColor: `${st.color}0A` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${st.color}22` }}>
                  <Icon className="w-6 h-6" style={{ color: st.color }} strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{LIBELLE_ORGANISME[a.organisme].nom}</p>
                  <p className="text-xs text-gray-500">{LIBELLE_ORGANISME[a.organisme].sousTitre}</p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    color: a.statut === 'actif' ? '#166534' : a.statut === 'en_cours' ? st.color : '#6B7280',
                    backgroundColor: a.statut === 'non_enrole' ? '#F3F4F6' : `${st.color}18`,
                  }}
                >
                  {a.statut === 'actif' ? 'Actif' : a.statut === 'en_cours' ? 'En cours' : 'Non enrôlé'}
                </span>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total cotisé</p>
                  <p className="text-2xl font-black" style={{ color: st.color }}>
                    {total.toLocaleString('fr-FR')} <span className="text-sm font-bold text-gray-400">FCFA</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Dernier versement</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {derniere ? libellePeriode(derniere.periode) : '—'}
                  </p>
                </div>
              </div>

              {retard > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {retard} mois à régulariser pour rester couvert(e).
                  </p>
                </div>
              )}

              <motion.button
                onClick={() => { setFormOrg(a.organisme); setShowForm(true); }}
                className="mt-3 w-full py-2.5 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-1.5"
                style={{ backgroundColor: st.color }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus className="w-4 h-4" />
                Enregistrer un versement
              </motion.button>
            </motion.div>
          );
        })}

        {/* Historique des cotisations */}
        <div>
          <p className="font-bold text-gray-800 mb-2 px-1">Historique</p>
          {cotisationsTriees.length === 0 ? (
            <div className="rounded-3xl border-2 border-gray-100 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">Aucun versement enregistré pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cotisationsTriees.map((c: Cotisation) => {
                const st = ORG_STYLE[c.organisme];
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 bg-white p-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${st.color}18` }}>
                      <Check className="w-4 h-4" style={{ color: st.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {c.organisme} · {libellePeriode(c.periode)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(c.datePaiement).toLocaleDateString('fr-FR')}{c.mode ? ` · ${c.mode}` : ''}
                      </p>
                    </div>
                    <p className="font-bold text-gray-800 flex-shrink-0">{c.montant.toLocaleString('fr-FR')} F</p>
                    <button onClick={() => supprimer(c.id)} className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0" aria-label="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Enregistrer un versement</h3>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Choix de l'organisme */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['CNPS', 'CNAM'] as Organisme[]).map((o) => {
                  const actif = formOrg === o;
                  const st = ORG_STYLE[o];
                  return (
                    <button
                      key={o}
                      onClick={() => setFormOrg(o)}
                      className="py-3 rounded-2xl border-2 font-semibold text-sm flex flex-col items-center gap-1"
                      style={{
                        borderColor: actif ? st.color : '#E5E7EB',
                        backgroundColor: actif ? `${st.color}12` : '#fff',
                        color: actif ? st.color : '#6B7280',
                      }}
                    >
                      {o}
                      <span className="text-[10px] font-normal">{LIBELLE_ORGANISME[o].sousTitre}</span>
                    </button>
                  );
                })}
              </div>

              <label className="block text-xs font-semibold text-gray-500 mb-1">Montant (FCFA)</label>
              <input
                type="number" inputMode="numeric" value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex : 5000"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 mb-3 text-lg font-semibold"
                style={{ boxSizing: 'border-box' }}
              />

              <label className="block text-xs font-semibold text-gray-500 mb-1">Mois couvert</label>
              <input
                type="month" value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 mb-3"
                style={{ boxSizing: 'border-box' }}
              />

              <label className="block text-xs font-semibold text-gray-500 mb-1">Mode de paiement</label>
              <div className="flex gap-2 mb-4">
                {['espèces', 'keiwa', 'mobile money'].map((mp) => (
                  <button
                    key={mp}
                    onClick={() => setMode(mp)}
                    className="flex-1 py-2 rounded-xl border-2 text-xs font-semibold capitalize"
                    style={{
                      borderColor: mode === mp ? COLOR : '#E5E7EB',
                      backgroundColor: mode === mp ? `${COLOR}12` : '#fff',
                      color: mode === mp ? COLOR : '#6B7280',
                    }}
                  >
                    {mp}
                  </button>
                ))}
              </div>

              <motion.button
                onClick={ajouterCotisation}
                disabled={saving}
                className="w-full py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: ORG_STYLE[formOrg].color }}
                whileTap={{ scale: 0.97 }}
              >
                <Check className="w-5 h-5" />
                Valider le versement
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}
