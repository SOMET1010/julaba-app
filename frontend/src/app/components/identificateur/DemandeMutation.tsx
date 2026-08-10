import { SubPageLayout } from '../layout/SubPageLayout';
import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  MapPin,
  Send,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useUser } from '../../contexts/UserContext';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import { useZones } from '../../contexts/ZoneContext';
import { toast } from 'sonner';

const PRIMARY_COLOR = '#9F8170';
const RAISON_MIN_LENGTH = 20;
const prefersReducedMotion = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type StatutDemande = 'en_attente' | 'approuve' | 'rejete' | 'inconnu';

function normalizeStatutDemande(statut: string): StatutDemande {
  if (statut === 'en_attente') return 'en_attente';
  if (statut === 'approuve' || statut === 'approuvee') return 'approuve';
  if (statut === 'rejete' || statut === 'rejetee') return 'rejete';
  if (import.meta.env.DEV) {
    console.warn('[DemandeMutation] statut inattendu:', statut);
  }
  return 'inconnu';
}

function formatZoneType(type: string): string {
  if (type === 'marche') return 'Marché';
  if (type === 'village') return 'Village';
  if (type === 'region') return 'Région';
  return 'Zone';
}

function formatDateSafe(iso: string | undefined | null): string {
  if (!iso) return 'Date inconnue';
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'Date inconnue';
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function DemandeMutation() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { demanderMutation, getMesDemandes } = useIdentificateur();
  const { zones } = useZones();

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    zoneDemandeeId: '',
    raison: '',
  });

  const cardsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const zoneDemandeeInputId = useId();
  const raisonInputId = useId();
  const raisonCompteurId = useId();

  const zoneActuelle = user?.zoneNom || user?.market || 'Zone non définie';
  const zoneActuelleId = user?.zoneId || '';
  const hasValidZone = Boolean(user?.zoneId);
  const mesDemandes = getMesDemandes();

  const mesDemandesEnAttente = useMemo(
    () => mesDemandes.filter((demande) => normalizeStatutDemande(demande.statut) === 'en_attente'),
    [mesDemandes],
  );

  const mesDemandesSorted = useMemo(() => {
    return mesDemandes.slice().sort((a, b) => {
      const dateA = new Date(a.dateDemande || a.date || '').getTime();
      const dateB = new Date(b.dateDemande || b.date || '').getTime();
      const safeDateA = Number.isFinite(dateA) ? dateA : 0;
      const safeDateB = Number.isFinite(dateB) ? dateB : 0;
      return safeDateB - safeDateA;
    });
  }, [mesDemandes]);

  const zonesSorted = useMemo(() => {
    return zones
      .filter((zone) => zone.id !== zoneActuelleId && zone.actif)
      .slice()
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [zones, zoneActuelleId]);

  const raisonTrimLength = formData.raison.trim().length;
  const compteurColor = raisonTrimLength === 0
    ? 'text-gray-500'
    : raisonTrimLength < RAISON_MIN_LENGTH
      ? 'text-red-500'
      : 'text-green-600';

  const closeForm = useCallback(() => {
    setShowForm(false);
    setFormData({ zoneDemandeeId: '', raison: '' });
  }, []);

  const handleVoirDemandeEnCours = useCallback(() => {
    const demandeEnCours = mesDemandesEnAttente[0];
    if (!demandeEnCours) return;
    cardsRef.current[demandeEnCours.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [mesDemandesEnAttente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!hasValidZone) {
      toast.error('Ta zone n’est pas définie. Contacte ton superviseur.');
      return;
    }
    if (!formData.zoneDemandeeId) {
      toast.error('Choisis une zone de destination');
      return;
    }
    if (raisonTrimLength < RAISON_MIN_LENGTH) {
      toast.error('La raison doit faire au moins 20 caractères');
      return;
    }

    const zoneDemandee = zones.find((zone) => zone.id === formData.zoneDemandeeId);
    if (!zoneDemandee) {
      toast.error('Choisis une zone de destination');
      return;
    }

    setIsSubmitting(true);
    try {
      await demanderMutation({
        identificateurId: user?.id || user?.telephone || '',
        identificateurNom: `${user?.prenoms ?? ''} ${user?.nom ?? ''}`.trim() || 'Identificateur',
        zoneActuelle,
        zoneActuelleId,
        zoneDemandee: zoneDemandee.nom,
        zoneDemandeeId: zoneDemandee.id,
        raison: formData.raison.trim(),
      });
      toast.success('Demande envoyée, en attente de validation');
      closeForm();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Impossible d\u2019envoyer la demande';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const betaBanner = (
    <div
      role="status"
      aria-live="polite"
      className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3"
    >
      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-700" aria-hidden="true" />
      <p className="text-sm text-orange-900">
        Fonctionnalité en bêta. Les demandes sont enregistrées et traitées par le superviseur.
      </p>
    </div>
  );

  if (showForm) {
    return (
      <SubPageLayout role="identificateur" title="Demande de mutation">
        <div className="min-h-screen bg-gray-50 pb-24 lg:pl-[320px]">
          <div className="p-6">
            {betaBanner}

            <button
              type="button"
              aria-label="Retour"
              onClick={closeForm}
              className="flex items-center gap-2 text-gray-600 mb-6"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              <span>Retour</span>
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Demande de changement de zone
            </h1>
            <p className="text-gray-600 mb-6">
              Remplis le formulaire pour demander ta mutation
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone actuelle
                </label>
                <div className="px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" aria-hidden="true" />
                    <span className="font-bold text-gray-900">{zoneActuelle}</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor={zoneDemandeeInputId} className="block text-sm font-medium text-gray-700 mb-2">
                  Nouvelle zone souhaitée <span className="text-red-500">*</span>
                </label>
                <select
                  id={zoneDemandeeInputId}
                  value={formData.zoneDemandeeId}
                  onChange={(e) => setFormData({ zoneDemandeeId: e.target.value, raison: formData.raison })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:ring-2 focus:ring-opacity-50"
                  required
                  aria-required="true"
                >
                  <option value="">Choisis une zone</option>
                  {zonesSorted.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.nom} ({formatZoneType(zone.type)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={raisonInputId} className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de la demande <span className="text-red-500">*</span>
                </label>
                <textarea
                  id={raisonInputId}
                  value={formData.raison}
                  onChange={(e) => setFormData({ zoneDemandeeId: formData.zoneDemandeeId, raison: e.target.value })}
                  placeholder="Explique pourquoi tu souhaites changer de zone…"
                  rows={5}
                  maxLength={500}
                  aria-required="true"
                  aria-describedby={raisonCompteurId}
                  aria-invalid={raisonTrimLength > 0 && raisonTrimLength < RAISON_MIN_LENGTH ? true : undefined}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:ring-2 focus:ring-opacity-50 resize-none"
                  required
                />
                <p id={raisonCompteurId} role="status" aria-live="polite" className={`text-xs mt-2 ${compteurColor}`}>
                  {raisonTrimLength}/{RAISON_MIN_LENGTH} caractères minimum
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    <strong>{'À savoir\u202f:'}</strong> Ta demande est enregistrée et transmise au superviseur pour examen.
                  </span>
                </p>
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting || raisonTrimLength < RAISON_MIN_LENGTH}
                aria-busy={isSubmitting ? 'true' : undefined}
                className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: PRIMARY_COLOR }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                <Send className="w-5 h-5" aria-hidden="true" />
                Envoyer la demande
                {isSubmitting && <span className="sr-only">Envoi en cours</span>}
              </motion.button>
            </form>
          </div>
        </div>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout role="identificateur" title="Demande de mutation">
      <div className="min-h-screen bg-gray-50 pb-24 lg:pl-[320px]">
        <div className="p-6">
          {betaBanner}

          <button
            type="button"
            aria-label="Retour"
            onClick={() => navigate('/identificateur/profil')}
            className="flex items-center gap-2 text-gray-600 mb-6"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span>Retour au profil</span>
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Changement de zone
          </h1>
          <p className="text-gray-600 mb-6">
            Gère tes demandes de mutation de zone
          </p>

          <div className="mb-6 p-4 rounded-2xl border-2 bg-white" style={{ borderColor: PRIMARY_COLOR }}>
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6" style={{ color: PRIMARY_COLOR }} aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-600">Zone actuelle</p>
                <p className="text-lg font-bold text-gray-900">{zoneActuelle}</p>
              </div>
            </div>
          </div>

          {mesDemandesEnAttente.length === 0 ? (
            <motion.button
              type="button"
              onClick={() => {
                if (!hasValidZone) {
                  toast.error('Ta zone n’est pas définie. Contacte ton superviseur.');
                  return;
                }
                setShowForm(true);
              }}
              disabled={!hasValidZone}
              className="w-full mb-6 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: PRIMARY_COLOR }}
              whileHover={!prefersReducedMotion && hasValidZone ? { scale: 1.02 } : {}}
              whileTap={!prefersReducedMotion && hasValidZone ? { scale: 0.98 } : {}}
            >
              <Send className="w-5 h-5" aria-hidden="true" />
              Nouvelle demande de mutation
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={handleVoirDemandeEnCours}
              className="w-full mb-6 py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg"
              style={{ backgroundColor: PRIMARY_COLOR }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <Eye className="w-5 h-5" aria-hidden="true" />
              Voir ma demande en cours
            </motion.button>
          )}

          {mesDemandesEnAttente.length > 0 && (
            <div role="status" aria-live="polite" className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-sm text-orange-900 flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>Tu as une demande en cours d’examen. Tu ne peux pas soumettre une nouvelle demande.</span>
              </p>
            </div>
          )}

          <h2 className="text-lg font-bold text-gray-900 mb-4">Mes demandes</h2>

          <div className="space-y-3">
            {mesDemandesSorted.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-600 font-medium">Aucune demande</p>
                <p className="text-sm text-gray-500 mt-1">
                  Tu n’as pas encore demandé de changement de zone
                </p>
              </div>
            ) : (
              mesDemandesSorted.map((demande) => {
                const statutNormalise = normalizeStatutDemande(demande.statut);
                const statutClassName = statutNormalise === 'en_attente'
                  ? 'bg-orange-100 text-orange-700'
                  : statutNormalise === 'approuve'
                    ? 'bg-green-100 text-green-700'
                    : statutNormalise === 'rejete'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700';

                return (
                  <motion.div
                    key={demande.id}
                    ref={(el) => {
                      cardsRef.current[demande.id] = el;
                    }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">De&nbsp;:</span>
                          <span className="font-bold text-gray-900">{demande.zoneActuelle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Vers&nbsp;:</span>
                          <span className="font-bold text-gray-900">{demande.zoneDemandee}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${statutClassName}`}>
                        {statutNormalise === 'en_attente' && <Clock className="w-3 h-3" aria-hidden="true" />}
                        {statutNormalise === 'approuve' && <CheckCircle2 className="w-3 h-3" aria-hidden="true" />}
                        {statutNormalise === 'rejete' && <XCircle className="w-3 h-3" aria-hidden="true" />}
                        {statutNormalise === 'inconnu' && <AlertCircle className="w-3 h-3" aria-hidden="true" />}
                        {statutNormalise === 'en_attente'
                          ? 'En attente'
                          : statutNormalise === 'approuve'
                            ? 'Approuvée'
                            : statutNormalise === 'rejete'
                              ? 'Rejetée'
                              : 'Statut inconnu'}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl mb-3">
                      <p className="text-sm text-gray-600 mb-1">Raison</p>
                      <p className="text-sm text-gray-900">{demande.raison}</p>
                    </div>

                    {demande.commentaireInstitution && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-3">
                        <p className="text-sm text-blue-900 mb-1 font-medium">
                          Commentaire de l’Institution
                        </p>
                        <p className="text-sm text-blue-800">{demande.commentaireInstitution}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Demandé le {formatDateSafe(demande.dateDemande || demande.date)}
                      </span>
                      {demande.dateTraitement && (
                        <span>
                          Traité le {formatDateSafe(demande.dateTraitement)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </SubPageLayout>
  );
}