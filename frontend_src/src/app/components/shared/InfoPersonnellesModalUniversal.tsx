import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Edit3,
  CheckCircle,
  User,
  Save,
} from 'lucide-react';

interface InfoPersonnellesModalUniversalProps {
  onClose: () => void;
  speak: (text: string) => void;
  roleColor: string;
  user: any;
  onSave: (updatedData: any) => void;
}

export function InfoPersonnellesModalUniversal({ onClose, speak, roleColor, user, onSave }: InfoPersonnellesModalUniversalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    telephone: user?.telephone || '',
    email: user?.email || '',
    localisation: user?.localisation || '',
    typeActivite: user?.typeActivite || '',
  });

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
    speak('Informations personnelles enregistrées avec succès');
  };

  const handleCancel = () => {
    setFormData({
      telephone: user?.telephone || '',
      email: user?.email || '',
      localisation: user?.localisation || '',
      typeActivite: user?.typeActivite || '',
    });
    setIsEditing(false);
    speak('Modifications annulées');
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4 lg:items-center lg:justify-center"
      onClick={onClose}
      onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-h-[90vh] overflow-y-auto lg:max-w-2xl"
      >
        {/* Header */}
        <div 
          className="sticky top-0 bg-gradient-to-r from-gray-50 to-white border-b-2 px-6 py-5 flex items-center justify-between rounded-t-3xl z-10"
          style={{ borderColor: `${roleColor}40` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: `${roleColor}20` }}
            >
              <User className="w-6 h-6" style={{ color: roleColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Informations personnelles</h2>
              <p className="text-xs text-gray-600">Gérez vos coordonnées</p>
            </div>
          </div>
          <motion.button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center"
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profil Header */}
          <div 
            className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-2"
            style={{ borderColor: `${roleColor}40` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl border-4 shadow-xl flex items-center justify-center overflow-hidden bg-white"
                style={{ borderColor: roleColor }}
              >
                {user.photo ? (
                  <img src={user.photo} alt={`${user.prenoms} ${user.nom}`} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10" style={{ color: roleColor }} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900">
                  {user.prenoms} {user.nom}
                </h3>
                <p className="text-sm font-bold text-gray-600">{user.numeroMarchand || user.numeroProducteur || user.numeroCooperative || 'N/A'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border-2 border-green-300">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-bold text-green-700">{user.statut || 'Actif'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton Modifier */}
          {!isEditing && (
            <div className="mb-6 flex justify-end">
              <motion.button
                onClick={() => {
                  setIsEditing(true);
                  speak('Mode édition activé');
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg text-white"
                style={{ backgroundColor: roleColor }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Edit3 className="w-4 h-4" />
                Modifier
              </motion.button>
            </div>
          )}

          {/* Champs */}
          <div className="space-y-4">
            {/* Téléphone */}
            <InfoCard
              icon={Phone}
              label="Téléphone"
              value={formData.telephone}
              isEditing={isEditing}
              onChange={(val) => setFormData({ ...formData, telephone: val })}
              color="#2072AF"
              type="tel"
            />

            {/* Email */}
            <InfoCard
              icon={Mail}
              label="Email"
              value={formData.email}
              isEditing={isEditing}
              onChange={(val) => setFormData({ ...formData, email: val })}
              color="#16A34A"
              type="email"
            />

            {/* Localisation */}
            <InfoCard
              icon={MapPin}
              label="Localisation"
              value={formData.localisation}
              isEditing={isEditing}
              onChange={(val) => setFormData({ ...formData, localisation: val })}
              color={roleColor}
            />

            {/* Type d'activité */}
            <InfoCard
              icon={Briefcase}
              label="Type d'activité"
              value={formData.typeActivite}
              isEditing={isEditing}
              onChange={(val) => setFormData({ ...formData, typeActivite: val })}
              color="#702963"
            />
          </div>

          {/* Boutons d'action */}
          {isEditing && (
            <div className="flex gap-3 mt-6">
              <motion.button
                onClick={handleSave}
                className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2"
                style={{ backgroundColor: '#00563B' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </motion.button>

              <motion.button
                onClick={handleCancel}
                className="px-6 py-4 rounded-2xl font-bold border-2 border-gray-300 text-gray-700 shadow-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-5 h-5" />
                Annuler
              </motion.button>
            </div>
          )}

          {/* Note informative */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-800 font-medium">
              💡 Ces informations sont utilisées pour vous contacter et localiser votre activité sur la plateforme JULABA.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== INFO CARD COMPONENT ==========
interface InfoCardProps {
  icon: any;
  label: string;
  value: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
  color: string;
  type?: string;
}

function formatPhone(v: string): string {
  return v.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function InfoCard({ icon: Icon, label, value, isEditing, onChange, color, type = 'text' }: InfoCardProps) {
  const normalizedLabel = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const shouldFormatIvorianPhone = type === 'tel' && normalizedLabel.includes('telephone');

  const valueDigits = (value || '').replace(/\D/g, '').slice(0, 10);
  const formattedValue = shouldFormatIvorianPhone ? formatPhone(valueDigits) : value;

  return (
    <motion.div
      className="p-4 rounded-2xl bg-white border-2 border-gray-200"
      whileHover={!isEditing ? { scale: 1.01, borderColor: color } : {}}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <label className="text-sm font-bold text-gray-700">{label}</label>
      </div>
      {isEditing && onChange ? (
        shouldFormatIvorianPhone ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              aria-hidden
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#2a1a0a',
                background: 'rgba(198,106,44,0.08)',
                borderRadius: 12,
                padding: '10px 12px',
                letterSpacing: 0.5,
                userSelect: 'none',
                flexShrink: 0,
              }}
            >
              +225
            </span>
            <input
              type="tel"
              value={formattedValue}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                onChange(digits ? formatPhone(digits) : '');
              }}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900 bg-gray-50"
              placeholder="07 00 00 00 00"
              maxLength={14}
              inputMode="numeric"
            />
          </div>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900 bg-gray-50"
            placeholder={label}
          />
        )
      ) : (
        <p className="text-base font-bold text-gray-900 pl-[52px]">{value || 'N/A'}</p>
      )}
    </motion.div>
  );
}