import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Camera, Image as ImageIcon, Upload, Check, AlertCircle, ZoomIn, 
  RotateCw, Download, Share2, Lock, ShieldCheck, Trash2, Clock, 
  XCircle, Info, Sparkles, CheckCircle2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DocumentData, DocumentStatus } from '../../types/document';
import { PinConfirmModal } from './PinConfirmModal';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface DocumentModalProps {
  onClose: () => void;
  speak: (text: string) => void;
  document: DocumentData;
  icon: any;
  onUpdate?: (document: DocumentData) => void;
  totalDocuments?: number;
  completedDocuments?: number;
}

export function DocumentModal({ 
  onClose, 
  speak, 
  document,
  icon: Icon,
  onUpdate,
  totalDocuments = 3,
  completedDocuments = 1
}: DocumentModalProps) {
  const [localDocument, setLocalDocument] = useState<DocumentData>(document);
  const [rotation, setRotation] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const statusColors = {
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  };

  // Generate QR Code for verified documents
  useEffect(() => {
    if (localDocument.status === 'verified' && localDocument.imageUrl) {
      const generateQR = async () => {
        try {
          const qrData = JSON.stringify({
            documentId: localDocument.id,
            type: localDocument.type,
            verifiedAt: localDocument.verifiedAt,
            verifiedBy: localDocument.verifiedBy,
          });
          const url = await QRCode.toDataURL(qrData, {
            width: 150,
            margin: 1,
            color: { dark: '#059669', light: '#FFFFFF' },
          });
          setQrCodeUrl(url);
        } catch (err) {
          console.error('[DocumentModal] erreur génération QR', err);
        }
      };
      generateQR();
    }
  }, [localDocument]);

  // Show confetti on first view of verified document
  useEffect(() => {
    if (localDocument.status === 'verified' && !sessionStorage.getItem(`confetti-${localDocument.id}`)) {
      setShowConfetti(true);
      sessionStorage.setItem(`confetti-${localDocument.id}`, 'true');
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [localDocument]);

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'verified': return 'green';
      case 'pending': return 'orange';
      case 'rejected': return 'red';
      case 'empty': return 'orange';
    }
  };

  const getStatusLabel = (status: DocumentStatus) => {
    switch (status) {
      case 'verified': return 'Vérifié';
      case 'pending': return 'En vérification';
      case 'rejected': return 'Rejeté';
      case 'empty': return 'À compléter';
    }
  };

  const colors = statusColors[getStatusColor(localDocument.status)];

  const canEdit = !localDocument.isLocked && localDocument.status !== 'verified';
  const canDelete = !localDocument.isLocked;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      speak('Chargement du document en cours');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTimeout(() => {
          const updatedDoc = {
            ...localDocument,
            imageUrl: reader.result as string,
            status: 'pending' as DocumentStatus,
            uploadedAt: new Date().toISOString(),
            rejectionReason: null,
          };
          setLocalDocument(updatedDoc);
          setIsUploading(false);
          setUploadSuccess(true);
          speak('Document chargé avec succès. En attente de vérification');
          
          setTimeout(() => setUploadSuccess(false), 3000);
          onUpdate?.(updatedDoc);
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    speak('Document tourné');
  };

  const handleSave = () => {
    speak('Document sauvegardé avec succès');
    onUpdate?.(localDocument);
    setTimeout(() => onClose(), 500);
  };

  const handleDelete = () => {
    if (canDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    const updatedDoc = {
      ...localDocument,
      imageUrl: null,
      status: 'empty' as DocumentStatus,
      uploadedAt: null,
      rejectionReason: null,
    };
    setLocalDocument(updatedDoc);
    setShowDeleteConfirm(false);
    speak('Document supprimé');
    onUpdate?.(updatedDoc);
  };

  const handleReupload = () => {
    fileInputRef.current?.click();
    speak('Choisissez un nouveau document');
  };

  const handleTelecharger = () => {
    toast.info('Téléchargement PDF disponible prochainement');
  };

  const handlePartager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: localDocument?.title || 'Document',
          text: 'Mon document JÙLABA',
        });
      } catch {
        // annulé par l'utilisateur
      }
    } else {
      toast.info('Partage non supporté sur cet appareil');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto relative"
        >
          {/* Confetti effect for verified documents */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-3xl">
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-green-500"
                  initial={{ 
                    top: -20, 
                    left: `${Math.random() * 100}%`,
                    opacity: 1 
                  }}
                  animate={{ 
                    top: '100%', 
                    opacity: 0,
                    rotate: Math.random() * 360
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    delay: Math.random() * 0.5
                  }}
                />
              ))}
            </div>
          )}

          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-3xl z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    localDocument.status === 'verified' ? 'bg-green-100' : 'bg-orange-100'
                  }`}
                >
                  <Icon 
                    className="w-6 h-6" 
                    style={{ color: localDocument.status === 'verified' ? '#059669' : '#C46210' }} 
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{localDocument.title}</h2>
                  <p className="text-xs text-gray-500">
                    {localDocument.details['Numéro'] || localDocument.details['Numéro de certification'] || localDocument.details['Numéro de demande']}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>
            
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${colors.bg} ${colors.text} border ${colors.border} flex items-center gap-2`}>
                {localDocument.status === 'pending' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full"
                  />
                )}
                {localDocument.status === 'verified' && <Lock className="w-4 h-4" />}
                {localDocument.status === 'rejected' && <XCircle className="w-4 h-4" />}
                {getStatusLabel(localDocument.status)}
              </span>
              
              {uploadSuccess && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Enregistré
                </motion.span>
              )}

              {localDocument.isLocked && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Protégé
                </span>
              )}
            </div>

            {/* Progress indicator for empty status */}
            {localDocument.status === 'empty' && (
              <motion.div 
                className="mt-3 p-3 rounded-xl bg-orange-50 border-2 border-orange-200"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-orange-700">
                    Complétion du profil
                  </span>
                  <span className="text-xs font-bold text-orange-700">
                    {completedDocuments}/{totalDocuments}
                  </span>
                </div>
                <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedDocuments / totalDocuments) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* SCÉNARIO 1: EMPTY - No document uploaded */}
            {localDocument.status === 'empty' && !localDocument.imageUrl && (
              <div className="space-y-4">
                {/* Warning message */}
                <motion.div 
                  className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 flex items-start gap-3"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      Document obligatoire pour activation complète
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Veuillez charger votre {localDocument.title.toLowerCase()} pour compléter votre dossier Jùlaba
                    </p>
                  </div>
                </motion.div>

                {/* Upload buttons with pulsing animation */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Camera */}
                  <motion.button
                    onClick={() => {
                      cameraInputRef.current?.click();
                    }}
                    className="p-6 rounded-2xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-white flex flex-col items-center justify-center gap-3 hover:border-orange-400 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                      boxShadow: [
                        '0 0 0 0 rgba(196, 98, 16, 0.4)',
                        '0 0 0 10px rgba(196, 98, 16, 0)',
                      ] 
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C4621020' }}>
                      <Camera className="w-7 h-7" style={{ color: '#C46210' }} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 text-sm">Prendre une photo</p>
                      <p className="text-xs text-gray-500 mt-1">Avec la caméra</p>
                    </div>
                  </motion.button>

                  {/* Gallery */}
                  <motion.button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="p-6 rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center gap-3 hover:border-orange-400 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                      boxShadow: [
                        '0 0 0 0 rgba(156, 163, 175, 0.4)',
                        '0 0 0 10px rgba(156, 163, 175, 0)',
                      ] 
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-gray-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 text-sm">Galerie</p>
                      <p className="text-xs text-gray-500 mt-1">Choisir une photo</p>
                    </div>
                  </motion.button>
                </div>

                {/* Loading state */}
                <AnimatePresence>
                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-4 rounded-2xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center gap-3"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full"
                      />
                      <p className="text-sm font-bold text-orange-700">Chargement en cours...</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Help tips */}
                <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
                  <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Conseils de Tata Nanti Lou
                  </p>
                  <ul className="space-y-1 text-xs text-blue-700">
                    <li>• Placez votre document à plat sur une surface</li>
                    <li>• Assurez-vous d'avoir un bon éclairage</li>
                    <li>• Évitez les reflets et les ombres</li>
                    <li>• Toutes les informations doivent être lisibles</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SCÉNARIO 4: REJECTED - Document rejected */}
            {localDocument.status === 'rejected' && localDocument.imageUrl && (
              <div className="space-y-4">
                {/* Rejection reason */}
                <motion.div 
                  className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 flex items-start gap-3"
                  animate={{ x: [-5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Document refusé</p>
                    <p className="text-sm text-red-700 mt-1">
                      {localDocument.rejectionReason || 'Le document ne répond pas aux critères de validation'}
                    </p>
                  </div>
                </motion.div>

                {/* Rejected document preview with red overlay */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-red-300 bg-gray-100">
                  <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] z-10" />
                  <img
                    src={localDocument.imageUrl}
                    alt={localDocument.title}
                    className="w-full h-auto object-contain max-h-[40vh] opacity-60"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease'
                    }}
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
                      <XCircle className="w-5 h-5" />
                      REFUSÉ
                    </div>
                  </div>
                </div>

                {/* Re-upload button */}
                <motion.button
                  onClick={handleReupload}
                  className="w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#C46210' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-5 h-5" />
                  Charger un nouveau document
                </motion.button>

                {/* Tips */}
                <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
                  <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Assurez-vous que :
                  </p>
                  <ul className="space-y-1 text-xs text-blue-700">
                    <li>• Le document est bien éclairé et net</li>
                    <li>• Toutes les informations sont lisibles</li>
                    <li>• Il n'y a pas de reflets ou d'ombres</li>
                    <li>• Le document est à jour et valide</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SCÉNARIO 2: PENDING - Document awaiting verification */}
            {localDocument.status === 'pending' && localDocument.imageUrl && (
              <div className="space-y-4">
                {/* Status message */}
                <div className="p-4 rounded-2xl bg-orange-50 border-2 border-orange-200 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">
                      En cours de vérification par l'équipe Jùlaba
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Envoyé le {new Date(localDocument.uploadedAt!).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })} • Validation sous 3-5 jours
                    </p>
                  </div>
                </div>

                {/* Document preview */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-orange-300 bg-gray-100">
                  <img
                    src={localDocument.imageUrl}
                    alt={localDocument.title}
                    className="w-full h-auto object-contain max-h-[50vh]"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease'
                    }}
                  />
                  
                  {/* Rotation button */}
                  {canEdit && (
                    <motion.button
                      onClick={handleRotate}
                      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-gray-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <RotateCw className="w-5 h-5 text-gray-700" />
                    </motion.button>
                  )}

                  {/* Zoom hint */}
                  <div className="absolute bottom-3 left-3 px-3 py-2 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-white" />
                    <span className="text-xs font-bold text-white">Pincer pour zoomer</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  {canEdit && (
                    <>
                      <motion.button
                        onClick={handleReupload}
                        className="py-3 rounded-xl font-bold bg-gray-100 text-gray-900 shadow-md flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Upload className="w-4 h-4" />
                        Remplacer
                      </motion.button>

                      <motion.button
                        onClick={handleDelete}
                        className="py-3 rounded-xl font-bold bg-red-100 text-red-700 shadow-md flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Share and Download */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={handleTelecharger}
                    className="py-3 rounded-xl font-bold bg-gray-100 text-gray-900 shadow-md flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </motion.button>

                  <motion.button
                    onClick={handlePartager}
                    className="py-3 rounded-xl font-bold bg-gray-100 text-gray-900 shadow-md flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Share2 className="w-4 h-4" />
                    Partager
                  </motion.button>
                </div>
              </div>
            )}

            {/* SCÉNARIO 3: VERIFIED - Certified document (read-only) */}
            {localDocument.status === 'verified' && localDocument.imageUrl && (
              <div className="space-y-4">
                {/* Verification badge */}
                <div className="p-4 rounded-2xl bg-green-50 border-2 border-green-300 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">
                      Document certifié et protégé
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Vérifié le {new Date(localDocument.verifiedAt!).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })} par {localDocument.verifiedBy || 'Jùlaba'}
                    </p>
                    {localDocument.expirationDate && (
                      <p className="text-xs text-green-700 mt-1">
                        Expire le {new Date(localDocument.expirationDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Document with watermark */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-green-300 bg-gray-100">
                  <img
                    src={localDocument.imageUrl}
                    alt={localDocument.title}
                    className="w-full h-auto object-contain max-h-[50vh]"
                  />
                  
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div 
                      className="text-green-600/20 font-bold text-4xl rotate-[-30deg] select-none"
                      style={{ 
                        textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                        letterSpacing: '0.1em'
                      }}
                    >
                      CERTIFIÉ JULABA
                    </div>
                  </div>

                  {/* Lock indicator */}
                  <div className="absolute top-3 right-3 px-3 py-2 rounded-full bg-green-600 text-white flex items-center gap-2 shadow-lg">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-bold">Protégé</span>
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-3 left-3 px-3 py-2 rounded-full bg-black/60 backdrop-blur-sm flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-white" />
                    <span className="text-xs font-bold text-white">Pincer pour zoomer</span>
                  </div>
                </div>

                {/* QR Code verification */}
                {qrCodeUrl && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-white border-2 border-green-200">
                    <div className="flex items-start gap-4">
                      <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded-xl border-2 border-green-300" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-green-900 mb-1 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          QR Code de vérification
                        </p>
                        <p className="text-xs text-green-700">
                          Scannez ce code pour vérifier l'authenticité de ce document certifié JULABA
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Read-only actions */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={handleTelecharger}
                    className="py-3 rounded-xl font-bold bg-green-100 text-green-700 shadow-md flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </motion.button>

                  <motion.button
                    onClick={handlePartager}
                    className="py-3 rounded-xl font-bold bg-green-100 text-green-700 shadow-md flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Share2 className="w-4 h-4" />
                    Partager
                  </motion.button>
                </div>

                {/* Security notice */}
                <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">Document certifié et protégé.</span> Contactez JULABA pour toute modification ou mise à jour nécessaire.
                  </p>
                </div>
              </div>
            )}

            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Document information (always visible) */}
            {localDocument.imageUrl && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Informations</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(localDocument.details).slice(0, 4).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">{key}</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* PIN Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <PinConfirmModal
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={confirmDelete}
            speak={speak}
            title="Supprimer le document"
            message="Cette action est définitive"
          />
        )}
      </AnimatePresence>
    </>
  );
}