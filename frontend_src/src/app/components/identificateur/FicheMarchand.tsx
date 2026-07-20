import { SubPageLayout } from '../layout/SubPageLayout';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Phone, MapPin, ShoppingBag, Edit, History, Calendar, Lock, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ROLE_COLORS } from '../../config/roleConfig';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';

/**
 * @deprecated FicheMarchand n'est routee nulle part dans routes.tsx au 14 mai 2026.
 * Aucun parent ne navigue vers /identificateur/fiche-marchand avec state.merchant
 * (verifie : SuiviIdentifications, Identifications, ActeurDetails, MesBrouillons).
 *
 * Le hub fiche acteur actuel est ActeurDetails (/identificateur/acteur/:numero).
 *
 * Statut : code dormant, page presque complete mais non branchee.
 *
 * Decision : minimal cleanup applique (triple dot ASCII -> Unicode).
 * Durcissement complet (PII bandeau, a11y modal PIN, photo reelle, prefersReducedMotion)
 * reporte tant que la page n'est pas branchee.
 *
 * A reevaluer : brancher cette page OU la supprimer au 14 aout 2026.
 */

const PRIMARY_COLOR = ROLE_COLORS.identificateur;
// Teinte secondaire pour le gradient en-tete fiche marchand
// TODO backlog : harmoniser les gradients secondaires identificateur cross-module
const SECONDARY_COLOR = '#DAC8AE';

export function FicheMarchand() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const { triggerInfo } = useNotifications();
  const merchant = location.state?.merchant;
  const [modifications, setModifications] = useState<Array<{id: string; date: string; type: string; description: string}>>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [savingFiche, setSavingFiche] = useState(false);
  const [editData, setEditData] = useState({
    firstName: merchant?.firstName || '',
    lastName: merchant?.lastName || '',
    commune: merchant?.commune || '',
    products: merchant?.activity || '',
  });

  // Refs annulation fetch + garde unmount
  const isMountedRef = useRef(true);
  const historiqueAbortRef = useRef<AbortController | null>(null);
  const verifyPinAbortRef = useRef<AbortController | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (historiqueAbortRef.current) historiqueAbortRef.current.abort();
      if (verifyPinAbortRef.current) verifyPinAbortRef.current.abort();
      if (saveAbortRef.current) saveAbortRef.current.abort();
    };
  }, []);

  const fetchHistorique = useCallback(async () => {
    if (!merchant?.id) return;

    if (historiqueAbortRef.current) historiqueAbortRef.current.abort();
    const controller = new AbortController();
    historiqueAbortRef.current = controller;

    setLoadingHistorique(true);
    try {
      let data: any = {};
      try {
        data = await apiRequest<any>(API_URL, `/users/${merchant.id}/historique`, { method: 'GET', signal: controller.signal });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('[FicheMarchand] historique HTTP error:', (err as Error)?.message);
        return;
      }
      if (isMountedRef.current && data && data.historique) {
        setModifications(data.historique);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[FicheMarchand] historique fetch failed:', err instanceof Error ? err.message : err);
    } finally {
      if (isMountedRef.current) setLoadingHistorique(false);
    }
  }, [merchant?.id]);

  useEffect(() => {
    void fetchHistorique();
  }, [fetchHistorique]);

  useEffect(() => {
    if (!merchant) {
      navigate('/identificateur');
    }
  }, [merchant, navigate]);

  if (!merchant) return null;

  const handleEditClick = () => {
    setShowCodeModal(true);
  };

  const handleCodeSubmit = async () => {
    if (verifyingPin) return;

    setCodeError('');

    if (securityCode.length !== 4) {
      setCodeError('Le code doit contenir 4 chiffres');
      return;
    }

    if (verifyPinAbortRef.current) verifyPinAbortRef.current.abort();
    const controller = new AbortController();
    verifyPinAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    setVerifyingPin(true);
    try {
      const res = await fetch(`${API_URL}/auth/identificateur/me/verify-pin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: securityCode }),
        signal: controller.signal,
      });

      let data: { valid?: boolean } = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        console.warn('[FicheMarchand] verify-pin JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr);
      }

      if (!isMountedRef.current) return;

      if (!res.ok || !data.valid) {
        console.warn('[FicheMarchand] verify-pin HTTP status:', res.status);
        setCodeError('Code incorrect. Vérifie ton PIN.');
        return;
      }
      setShowCodeModal(false);
      setIsEditing(true);
      setSecurityCode('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[FicheMarchand] verify-pin failed:', err instanceof Error ? err.message : err);
      if (isMountedRef.current) setCodeError('Erreur de vérification. Réessaie.');
    } finally {
      window.clearTimeout(timeoutId);
      if (isMountedRef.current) setVerifyingPin(false);
    }
  };

  const handleSave = async () => {
    if (savingFiche) return;

    if (saveAbortRef.current) saveAbortRef.current.abort();
    const controller = new AbortController();
    saveAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    setSavingFiche(true);
    try {
      const payload = {
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        commune: editData.commune.trim(),
        activity: editData.products.trim(),
      };

      try {
        await apiRequest(API_URL, `/users/${merchant.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        if (!isMountedRef.current) return;
        console.warn('[FicheMarchand] save HTTP error:', (err as Error)?.message);
        toast.error('Impossible de sauvegarder les modifications. Réessaie.');
        return;
      }

      if (!isMountedRef.current) return;
      toast.success('Fiche mise à jour', {
        description: 'Les modifications ont bien été enregistrées.',
      });
      setIsEditing(false);
      if (user?.id) {
        triggerInfo(
          user.id,
          'identificateur',
          'Profil mis à jour',
          `Le profil de ${payload.firstName} ${payload.lastName} a été mis à jour avec succès.`
        );
      }

      // Refetch historique pour refleter la nouvelle entree post-save
      void fetchHistorique();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[FicheMarchand] save failed:', err instanceof Error ? err.message : err);
      if (isMountedRef.current) toast.error('Erreur réseau. Vérifie ta connexion et réessaie.');
    } finally {
      window.clearTimeout(timeoutId);
      if (isMountedRef.current) setSavingFiche(false);
    }
  };

  return (
    <SubPageLayout role="identificateur" title="Fiche marchand">
      <div className="pb-32 lg:pb-8 pt-16 lg:pt-10 px-4 lg:pl-[320px] max-w-2xl mx-auto min-h-screen">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          type="button"
          aria-label="Retour"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-gray-100"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Fiche marchand</h1>
        </div>
      </div>

      {/* Carte principale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl shadow-xl mb-6 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${SECONDARY_COLOR})` }}
      >
        <div className="p-8 text-center">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
          >
            <User className="w-12 h-12 text-white" />
          </div>

          {/* Nom */}
          <h2 className="text-2xl font-bold text-white mb-1">
            {merchant.firstName} {merchant.lastName}
          </h2>
          <p className="text-white/80 mb-2">Marchand</p>
          
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-white text-sm">
              Créé le {new Date(merchant.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Informations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-md p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Informations</h3>
          {!isEditing && (
            <motion.button
              type="button"
              onClick={handleEditClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
              style={{ backgroundColor: `${PRIMARY_COLOR}20`, color: PRIMARY_COLOR }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Edit className="w-4 h-4" />
              Modifier
            </motion.button>
          )}
        </div>

        <div className="space-y-4">
          {/* Téléphone (non modifiable) */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Phone className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Téléphone</p>
              <p className="font-medium text-gray-900">{merchant.phone}</p>
            </div>
          </div>

          {/* Nom et Prénom (modifiable) */}
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="fiche-marchand-firstname" className="block text-xs text-gray-500 mb-1">Prénom</label>
                <Input
                  id="fiche-marchand-firstname"
                  name="fiche-marchand-firstname"
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="fiche-marchand-lastname" className="block text-xs text-gray-500 mb-1">Nom</label>
                <Input
                  id="fiche-marchand-lastname"
                  name="fiche-marchand-lastname"
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Nom complet</p>
                <p className="font-medium text-gray-900">
                  {editData.firstName} {editData.lastName}
                </p>
              </div>
            </div>
          )}

          {/* Commune (modifiable) */}
          {isEditing ? (
            <div>
              <label htmlFor="fiche-marchand-commune" className="block text-xs text-gray-500 mb-1">Commune</label>
              <Input
                id="fiche-marchand-commune"
                name="fiche-marchand-commune"
                type="text"
                value={editData.commune}
                onChange={(e) => setEditData({ ...editData, commune: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Commune</p>
                <p className="font-medium text-gray-900">{editData.commune}</p>
              </div>
            </div>
          )}

          {/* Produits (modifiable) */}
          {isEditing ? (
            <div>
              <label htmlFor="fiche-marchand-products" className="block text-xs text-gray-500 mb-1">Produits vendus</label>
              <Input
                id="fiche-marchand-products"
                name="fiche-marchand-products"
                type="text"
                value={editData.products}
                onChange={(e) => setEditData({ ...editData, products: e.target.value })}
                className="h-12 rounded-xl mb-2"
                placeholder="Riz, tomates, oignons…"
              />
              <p className="text-xs text-gray-500">Sépare les produits par des virgules</p>
              
              {/* Aperçu en temps réel */}
              {editData.products.trim() && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex flex-wrap gap-2">
                    {editData.products
                      .split(',')
                      .map((p: string) => p.trim())
                      .filter((p: string) => p.length > 0)
                      .map((product: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: PRIMARY_COLOR }}
                        >
                          {product}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-5 h-5 text-gray-400" />
                <p className="text-xs text-gray-500">Produits vendus</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editData.products
                  .split(',')
                  .map((p: string) => p.trim())
                  .filter((p: string) => p.length > 0)
                  .map((product: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      {product}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Boutons d’édition */}
        {isEditing && (
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  firstName: merchant.firstName,
                  lastName: merchant.lastName,
                  commune: merchant.commune,
                  products: merchant.activity,
                });
              }}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={savingFiche}
              className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {savingFiche ? (
                <>
                  <motion.span
                    className="inline-flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-4 h-4" />
                  </motion.span>
                  Enregistrement
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Historique des modifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-md p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
          <h3 className="font-semibold text-gray-900">Historique</h3>
        </div>

        <div className="space-y-3">
          {loadingHistorique && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}
          {!loadingHistorique && modifications.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Aucun historique disponible</p>
          )}
          {modifications.map((mod) => (
            <div key={mod.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
              >
                <Calendar className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{mod.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(mod.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  à{' '}
                  {new Date(mod.date).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Modal code de sécurité */}
      {showCodeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
          onClick={() => { if (!verifyingPin) { setShowCodeModal(false); setSecurityCode(''); setCodeError(''); } }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fiche-marchand-pin-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
            >
              <Lock className="w-8 h-8" style={{ color: PRIMARY_COLOR }} />
            </div>

            <h2 id="fiche-marchand-pin-title" className="text-xl font-bold text-gray-900 text-center mb-2">
              Code de sécurité
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Entre ton code à 4 chiffres pour modifier
            </p>

            <label htmlFor="fiche-marchand-pin-input" className="sr-only">Code de sécurité à 4 chiffres</label>
            <Input
              id="fiche-marchand-pin-input"
              name="fiche-marchand-pin"
              type="password"
              autoComplete="off"
              value={securityCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setSecurityCode(value);
                setCodeError('');
              }}
              placeholder="••••"
              className="text-lg h-14 rounded-2xl text-center tracking-widest mb-2"
              inputMode="numeric"
              maxLength={4}
              autoFocus
            />

            {codeError && (
              <p className="text-red-500 text-sm text-center mb-4">{codeError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowCodeModal(false);
                  setSecurityCode('');
                  setCodeError('');
                }}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={() => void handleCodeSubmit()}
                disabled={verifyingPin}
                className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {verifyingPin ? (
                  <>
                    <motion.span
                      className="inline-flex items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.span>
                    Vérification
                  </>
                ) : (
                  'Valider'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
    </SubPageLayout>
  );
}