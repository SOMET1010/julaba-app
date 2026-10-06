import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { DocumentData, DocumentStatus, getStatusColor, getStatusLabel } from '../../types/document';

interface DocumentsCertificationsModalUniversalProps {
  onClose: () => void;
  speak: (text: string) => void;
  documents: { [key: string]: DocumentData };
  onDocumentClick: (documentType: string) => void;
  totalDocuments: number;
  completedDocuments: number;
  roleColor: string;
}

export function DocumentsCertificationsModalUniversal({
  onClose,
  speak,
  documents,
  onDocumentClick,
  totalDocuments,
  completedDocuments,
  roleColor,
}: DocumentsCertificationsModalUniversalProps) {
  const completionPercentage = totalDocuments > 0 ? Math.round((completedDocuments / totalDocuments) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4 lg:items-center lg:justify-center"
      onClick={onClose}
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
              <FileText className="w-6 h-6" style={{ color: roleColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Documents & Certifications</h2>
              <p className="text-xs text-gray-600">Gérez vos documents officiels</p>
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
          {/* Progression */}
          <div 
            className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-2"
            style={{ borderColor: `${roleColor}40` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-700">Progression des documents</p>
                <p className="text-xs text-gray-600">
                  {completedDocuments} sur {totalDocuments} documents complétés
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black" style={{ color: roleColor }}>
                  {completionPercentage}%
                </p>
              </div>
            </div>
            {/* Barre de progression */}
            <div className="w-full h-3 bg-white rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ 
                  background: completionPercentage === 100 
                    ? 'linear-gradient(90deg, #16A34A, #22C55E)' 
                    : `linear-gradient(90deg, ${roleColor}, ${roleColor}DD)`
                }}
              />
            </div>
          </div>

          {/* Liste des documents */}
          <div className="space-y-3">
            {/* Carte d'identité */}
            {documents['carte-identite'] && (
              <DocumentCardModal
                icon={FileText}
                label={documents['carte-identite']?.title || 'Carte d\'identité'}
                status={documents['carte-identite']?.status || 'empty'}
                date={
                  documents['carte-identite']?.verifiedAt
                    ? new Date(documents['carte-identite'].verifiedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'
                }
                onClick={() => {
                  onDocumentClick('carte-identite');
                  speak('Ouverture des détails de la carte d\'identité');
                }}
              />
            )}

            {/* Certification JULABA */}
            {documents['certification-julaba'] && (
              <DocumentCardModal
                icon={Shield}
                label={documents['certification-julaba']?.title || 'Certification JULABA'}
                status={documents['certification-julaba']?.status || 'empty'}
                date={
                  documents['certification-julaba']?.uploadedAt
                    ? new Date(documents['certification-julaba'].uploadedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'
                }
                onClick={() => {
                  onDocumentClick('certification-julaba');
                  speak('Ouverture des détails de la certification JULABA');
                }}
              />
            )}

            {/* Attestation d'activité */}
            {documents['attestation-activite'] && (
              <DocumentCardModal
                icon={FileText}
                label={documents['attestation-activite']?.title || 'Attestation d\'activité'}
                status={documents['attestation-activite']?.status || 'empty'}
                date={
                  documents['attestation-activite']?.uploadedAt
                    ? new Date(documents['attestation-activite'].uploadedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'
                }
                onClick={() => {
                  onDocumentClick('attestation-activite');
                  speak('Ouverture des détails de l\'attestation d\'activité');
                }}
              />
            )}
          </div>

          {/* Note informative */}
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800 font-medium">
              🔒 Vos documents sont sécurisés et vérifiés par les identificateurs JULABA. 
              Assurez-vous que tous vos documents sont à jour pour profiter pleinement de la plateforme.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== DOCUMENT CARD COMPONENT ==========
interface DocumentCardModalProps {
  icon: any;
  label: string;
  status: DocumentStatus;
  date: string;
  onClick: () => void;
}

function DocumentCardModal({ icon: Icon, label, status, date, onClick }: DocumentCardModalProps) {
  const statusLabel = getStatusLabel(status);

  const getStatusIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'verified':
        return '#16A34A';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#DC2626';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'verified':
        return '#16A34A';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#DC2626';
      default:
        return '#9CA3AF';
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-white border-2 shadow-sm flex items-center gap-4 text-left"
      style={{ borderColor: getBorderColor() }}
      whileHover={{ scale: 1.02, y: -2, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
        style={{ backgroundColor: `${getBorderColor()}20` }}
      >
        <Icon className="w-7 h-7" style={{ color: getBorderColor() }} />
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-900 mb-1 truncate">{label}</h4>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: getStatusBgColor(),
              color: 'white',
            }}
          >
            {getStatusIcon()}
            <span>{statusLabel}</span>
          </div>
          <span className="text-xs text-gray-500">• {date}</span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </motion.button>
  );
}