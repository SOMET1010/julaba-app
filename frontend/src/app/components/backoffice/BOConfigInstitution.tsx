import React, { useState, useEffect, useCallback } from 'react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, Save, RotateCcw, AlertTriangle, MapPin,
  Info, XCircle, Layout, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { toast } from 'sonner';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../services/api/api-client';

// DGE-11 (20/10/2026) — CET ÉCRAN PERSISTE MAINTENANT VRAIMENT.
//
// Constat (AUDIT-PARCOURS-DGE-BACKOFFICE §DGE-11) : BOConfigInstitution
// éditait une liste locale de KPIs décoratifs, son bouton « Enregistrer »
// était condamné (isBackendReady=false, en attente d'un /api/v1/admin/config
// qui n'a jamais existé) et rien ne partait sur le réseau : le Super Admin
// croyait configurer, rien n'était configuré.
//
// Désormais l'écran administre LA VRAIE SOURCE : institutions.modules
// (jsonb, module -> NiveauAcces), celle qu'InstitutionScopeGuard applique
// fail-closed sur chaque route /institution/* (@RequireInstitutionModule :
// dashboard / acteurs / transactions / audit).
//   Lecture  : GET /institutions (liste complète pour super_admin/admin_general)
//   Écriture : PATCH /institutions/:id {modules} — validé, journalisé
//              (UPDATE_INSTITUTION_MODULES) et immédiatement opposable
//              (invariant dge-11-modules-persistes.spec.ts).

interface FicheInstitution {
  id: string;
  nom: string;
  type?: string;
  zone_id?: string | null;
  statut?: string;
  modules?: Record<string, string>;
}

// Les 4 modules que le serveur protège réellement (clés @RequireInstitutionModule).
const MODULES_SERVEUR: Array<{ key: string; label: string; description: string }> = [
  {
    key: 'dashboard',
    label: 'Tableau de bord & Analytics',
    description: 'KPIs du périmètre et analytics — GET /institution/dashboard et /institution/analytics (même clé serveur)',
  },
  {
    key: 'acteurs',
    label: 'Acteurs & Supervision',
    description: 'Acteurs enrôlés de la zone et leur suivi — GET /institution/acteurs',
  },
  {
    key: 'transactions',
    label: 'Transactions',
    description: 'Ventes de caisse du périmètre — GET /institution/transactions',
  },
  {
    key: 'audit',
    label: 'Piste d\u2019audit',
    description: 'Journal scopé du régulateur — GET /institution/audit (chaque lecture y est tracée)',
  },
];

// Niveaux d'accès compris par InstitutionScopeGuard.
const NIVEAUX: Array<{ value: string; label: string }> = [
  { value: 'aucun', label: 'Aucun (403)' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'ecriture', label: 'Écriture' },
  { value: 'complet', label: 'Complet' },
];

export function BOConfigInstitution() {
  const { boUser: _guardUser } = useBackOffice();
  if (_guardUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  return <ConfigurationModules />;
}

function ConfigurationModules() {
  const [fiches, setFiches] = useState<FicheInstitution[]>([]);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [modules, setModules] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const page = await apiRequest<any>(API_URL, '/institutions', { method: 'GET' });
      const data: FicheInstitution[] = Array.isArray(page?.data) ? page.data : [];
      setFiches(data);
      setSelectionId((courant) => {
        const garde = courant && data.some((f) => f.id === courant)
          ? courant
          : (data[0]?.id ?? null);
        const fiche = data.find((f) => f.id === garde);
        setModules({ ...(fiche?.modules ?? {}) });
        return garde;
      });
      setHasChanges(false);
    } catch (err) {
      console.warn('[BOConfigInstitution] chargement impossible :', err instanceof Error ? err.message : err);
      toast.error('Chargement impossible', {
        description: 'Les institutions n\u2019ont pas pu être lues côté serveur.',
      });
      setFiches([]);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const ficheSelectionnee = fiches.find((f) => f.id === selectionId) ?? null;

  const selectionner = (id: string) => {
    if (hasChanges) {
      toast.info('Modifications non enregistrées', {
        description: 'Enregistre ou réinitialise avant de changer d\u2019institution.',
      });
      return;
    }
    setSelectionId(id);
    const fiche = fiches.find((f) => f.id === id);
    setModules({ ...(fiche?.modules ?? {}) });
  };

  const changerNiveau = (moduleKey: string, niveau: string) => {
    setModules((prev) => ({ ...prev, [moduleKey]: niveau }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!ficheSelectionnee) return;
    setIsSaving(true);
    try {
      // LE vrai appel réseau : la source de vérité du guard serveur.
      const maj = await apiRequest<any>(API_URL, `/institutions/${ficheSelectionnee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      });
      const modulesPersistes = maj?.modules ?? modules;
      setFiches((prev) => prev.map((f) => (f.id === ficheSelectionnee.id ? { ...f, modules: modulesPersistes } : f)));
      setModules({ ...modulesPersistes });
      setHasChanges(false);
      toast.success('Configuration persistée', {
        description: `${ficheSelectionnee.nom} : modules enregistrés côté serveur, opposables immédiatement.`,
      });
    } catch (err: any) {
      console.warn('[BOConfigInstitution] PATCH échoué :', err instanceof Error ? err.message : err);
      toast.error('Erreur lors de la sauvegarde', {
        description: String(err?.message || 'Le serveur a refusé la configuration.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // « Réinitialiser » = revenir à l'état SERVEUR (plus jamais à des défauts locaux).
  const confirmReset = () => {
    const fiche = fiches.find((f) => f.id === selectionId);
    setModules({ ...(fiche?.modules ?? {}) });
    setHasChanges(false);
    setResetConfirmOpen(false);
    toast.info('Revenu à l\u2019état serveur', { description: 'Les modifications locales ont été abandonnées.' });
  };

  const modulesActifs = MODULES_SERVEUR.filter((m) => {
    const niveau = modules[m.key];
    return niveau && niveau !== 'aucun';
  }).length;
  const sansZone = fiches.filter((f) => !f.zone_id).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_DARK})` }}
              >
                <Settings className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Modules des institutions</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Source réelle : <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">institutions.modules</code> — appliqué fail-closed par l&rsquo;API
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => setResetConfirmOpen(true)}
                disabled={!hasChanges}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={hasChanges ? { scale: 1.02 } : {}}
                whileTap={hasChanges ? { scale: 0.98 } : {}}
              >
                <RotateCcw className="w-4 h-4" />
                Réinitialiser
              </motion.button>

              <motion.button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !ficheSelectionnee}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: hasChanges && ficheSelectionnee ? `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_DARK})` : '#9CA3AF' }}
                whileHover={hasChanges && ficheSelectionnee ? { scale: 1.02, y: -2 } : {}}
                whileTap={hasChanges && ficheSelectionnee ? { scale: 0.98 } : {}}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
              </motion.button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{modulesActifs}</span> modules actifs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{fiches.length}</span> institutions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-gray-600">
                <span className="font-bold text-gray-900">{sansZone}</span> sans zone (accès 403)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <KPIGrid cols={3} className="mb-6">
          <UniversalKPI label="Institutions" animatedTarget={fiches.length} icon={Layout} color="#712864" />
          <UniversalKPI label="Modules actifs (institution sélectionnée)" animatedTarget={modulesActifs} icon={ShieldCheck} color="#2072AF" />
          <UniversalKPI label="Institutions sans zone" animatedTarget={sansZone} icon={MapPin} color="#D97706" />
        </KPIGrid>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold">
              Ces niveaux sont la configuration RÉELLE que l&rsquo;API applique (fail-closed : clé absente ou « aucun » = 403).
              L&rsquo;écriture passe par PATCH /institutions/:id et est journalisée. Une institution sans zone configurée
              reste bloquée sur toutes ses routes, quel que soit ses modules.
            </p>
          </div>
        </motion.div>

        {chargement ? (
          <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-12 text-center text-gray-500">
            Chargement des institutions…
          </div>
        ) : fiches.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-12 text-center">
            <XCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-700">Aucune institution enregistrée</p>
            <p className="text-sm text-gray-500 mt-1">Les comptes institution apparaissent ici après leur inscription.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sélecteur d'institution */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg overflow-hidden lg:col-span-1">
              <div className="px-5 py-4 border-b-2 border-gray-100">
                <h2 className="font-bold text-gray-900">Institutions</h2>
                <p className="text-xs text-gray-500 mt-0.5">Sélectionne une fiche à configurer</p>
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                {fiches.map((f) => {
                  const actifs = MODULES_SERVEUR.filter((m) => f.modules?.[m.key] && f.modules[m.key] !== 'aucun').length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => selectionner(f.id)}
                      className={`w-full text-left px-5 py-4 border-b border-gray-100 transition-colors ${
                        f.id === selectionId ? 'bg-purple-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-gray-900 text-sm truncate">{f.nom || 'Sans nom'}</p>
                        <span className="text-xs font-bold text-gray-500 flex-shrink-0">{actifs}/4</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {f.type || 'dge'} · {f.zone_id ? 'zone configurée' : '⚠ sans zone'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Éditeur des modules */}
            <div className="lg:col-span-2 space-y-4">
              {ficheSelectionnee ? (
                <>
                  <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-5">
                    <h2 className="font-black text-gray-900 text-lg">{ficheSelectionnee.nom || 'Sans nom'}</h2>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {ficheSelectionnee.zone_id
                        ? `Périmètre : zone ${String(ficheSelectionnee.zone_id).slice(0, 8)}…`
                        : 'Aucune zone configurée — toutes les routes renvoient 403, même avec des modules actifs.'}
                    </p>
                  </div>

                  {MODULES_SERVEUR.map((m) => (
                    <div key={m.key} className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{m.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{m.description}</p>
                        </div>
                        <select
                          value={modules[m.key] ?? 'aucun'}
                          onChange={(e) => changerNiveau(m.key, e.target.value)}
                          className="px-3 py-2 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-900 bg-white focus:outline-none focus:border-purple-400"
                          aria-label={`Niveau d'accès pour ${m.label}`}
                        >
                          {NIVEAUX.map((n) => (
                            <option key={n.value} value={n.value}>{n.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg p-12 text-center text-gray-500">
                  Sélectionne une institution pour configurer ses modules.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmation Réinitialiser */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setResetConfirmOpen(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2"
              style={{ borderColor: BO_PRIMARY }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: '#D97706' }} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">Abandonner les modifications ?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Revenir à l&rsquo;état enregistré côté serveur</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Les modifications locales (non enregistrées) seront perdues. La configuration serveur, elle, ne change pas.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
                >
                  Continuer l&rsquo;édition
                </button>
                <button
                  type="button"
                  onClick={confirmReset}
                  className="flex-1 py-3 rounded-2xl font-bold text-white"
                  style={{ background: BO_PRIMARY }}
                >
                  Réinitialiser
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating save button mobile */}
      {hasChanges && ficheSelectionnee && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden"
        >
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 rounded-2xl text-white font-bold shadow-2xl flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_DARK})` }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
            <ChevronDown className="w-4 h-4 rotate-180" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
