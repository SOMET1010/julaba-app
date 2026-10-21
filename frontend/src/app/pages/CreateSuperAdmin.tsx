/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Page de Bootstrap : Création du Premier Super Admin
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ⚠️ USAGE UNIQUE : Cette page est utilisée une seule fois pour créer
 * le premier compte Super Admin. Après création, elle sera désactivée.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { API_URL } from '../utils/api';

export default function CreateSuperAdmin() {
  const [phone, setPhone] = useState('0700000001');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/create-super-admin`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, password, firstName, lastName })
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        const errorMsg = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Erreur lors de la création';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(`Erreur de connexion au serveur: ${err instanceof Error ? err.message : 'Inconnu'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,2}/g)?.join(' ') || cleaned;
    return formatted;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Super Admin Créé avec Succès !
          </h1>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left">
            <p className="text-sm text-gray-600 mb-2">Téléphone</p>
            <p className="text-lg font-bold text-gray-900 mb-4">{formatPhoneNumber(phone)}</p>

            <p className="text-sm text-gray-600 mb-2">Nom complet</p>
            <p className="text-lg font-bold text-gray-900">{firstName} {lastName}</p>
          </div>

          <a
            href="/backoffice/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#E6A817] text-white font-semibold rounded-2xl hover:bg-[#d09615] transition-colors"
          >
            Se connecter maintenant
            <ArrowRight className="w-5 h-5" />
          </a>

          <p className="text-xs text-gray-500 mt-4">
            Cette page sera automatiquement désactivée
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#E6A817] to-[#FFD700] mb-4"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>

          <h1 
            className="text-3xl font-bold mb-2 text-[#E6A817]"
            style={{ fontFamily: 'Calisga Bold, system-ui, sans-serif' }}
          >
            Jùlaba
          </h1>
          <p className="text-gray-600">Création du Super Admin</p>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Usage Unique</p>
              <p className="text-xs text-amber-700 mt-1">
                Cette page permet de créer le premier compte Super Admin. 
                Elle sera automatiquement désactivée après la création.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone
            </label>
            <div className="flex items-center h-14 border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#E6A817] transition-colors bg-white">
              <span 
                className="h-full flex items-center px-4 text-lg font-medium select-none text-white"
                style={{ backgroundColor: '#E6A817' }}
              >
                +225
              </span>
              <input
                type="tel"
                value={formatPhoneNumber(phone)}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(value);
                }}
                placeholder="07 00 00 00 01"
                className="flex-1 h-full px-3 text-lg outline-none border-none bg-transparent"
                required
              />
            </div>
          </div>

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom du Super Admin"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-[#E6A817] focus:ring-0 transition-colors"
              required
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom du Super Admin"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-[#E6A817] focus:ring-0 transition-colors"
              required
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe sécurisé"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-[#E6A817] focus:ring-0 transition-colors"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 8 caractères
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl text-white font-semibold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #E6A817, #FFD700)' }}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                Créer le Super Admin
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}