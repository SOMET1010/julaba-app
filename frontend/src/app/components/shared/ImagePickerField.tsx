/**
 * JÙLABA — ImagePickerField
 * ==========================
 * Composant partagé de sélection d'image utilisé dans tous les formulaires
 * d'ajout de la plateforme (produit, stock, acteur, module, etc.)
 *
 * Fonctionnalités :
 *  - Bouton "Galerie" : ouvre l'explorateur de fichiers
 *  - Bouton "Appareil photo" : ouvre la caméra (mobile)
 *  - Preview de l'image choisie avec possibilité de supprimer
 *  - Animations fluides
 *  - Accessible (label, aria)
 */

import React, { useRef, useState } from 'react';
import { compressImage, estimateSizeKb } from '../../utils/imageCompression';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Images, Trash2, ImagePlus, CheckCircle } from 'lucide-react';

interface ImagePickerFieldProps {
  /** URL ou dataURL de l'image courante */
  value: string;
  /** Callback quand l'image change (dataURL ou '') */
  onChange: (dataUrl: string) => void;
  /** Couleur primaire du profil pour l'accentuation */
  primaryColor?: string;
  /** Label affiché au-dessus du picker */
  label?: string;
  /** Forme de l'aperçu : 'circle' (avatar) ou 'rect' (produit) */
  shape?: 'circle' | 'rect';
  /** Taille de l'aperçu en pixels */
  size?: number;
  /** Aligne preview + actions sur la hauteur (items-stretch, gap resserré) */
  stretchRow?: boolean;
}

export function ImagePickerField({
  value,
  onChange,
  primaryColor = '#9F8170',
  label = 'Photo',
  shape = 'rect',
  size = 100,
  stretchRow = false,
}: ImagePickerFieldProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setCompressing(true);
    setSizeInfo('');
    try {
      const originalKb = Math.round(file.size / 1024);
      const compressed = await compressImage(file, { maxWidthPx: 1024, maxSizeKb: 200, quality: 0.82, format: 'image/webp' });
      const compressedKb = estimateSizeKb(compressed);
      const ratio = Math.round((1 - compressedKb / originalKb) * 100);
      setSizeInfo(ratio > 5 ? originalKb + 'KB -> ' + compressedKb + 'KB (-' + ratio + '%)' : compressedKb + 'KB');
      onChange(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => { onChange(e.target?.result as string); };
      reader.readAsDataURL(file);
    } finally {
      setCompressing(false);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    // reset input pour permettre re-sélection du même fichier
    e.target.value = '';
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const previewClass = shape === 'circle'
    ? 'rounded-full'
    : 'rounded-2xl';

  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      {label && (
        <p className="text-sm font-bold text-gray-700">{label}</p>
      )}

      <div className={`flex ${stretchRow ? 'items-stretch gap-3' : 'items-start gap-4'}`}>
        {/* ── Aperçu / Drop zone ── */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          animate={isDragging ? { scale: 1.04, borderColor: primaryColor } : { scale: 1 }}
          className={`relative flex-shrink-0 border-2 border-dashed bg-gray-50 overflow-hidden transition-all ${previewClass}`}
          style={{
            width: size,
            height: size,
            borderColor: value ? primaryColor : isDragging ? primaryColor : '#d1d5db',
          }}
        >
          <AnimatePresence mode="wait">
            {value ? (
              <motion.img
                key="preview"
                src={value}
                alt="Aperçu"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full object-cover"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center gap-1"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ImagePlus className="w-7 h-7 text-gray-300" />
                </motion.div>
                <span className="text-xs text-gray-400 font-semibold px-1 text-center">
                  Photo
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Badge "validé" si image présente */}
          <AnimatePresence>
            {value && !compressing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow"
              >
                <CheckCircle className="w-4 h-4" style={{ color: primaryColor }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Boutons d'action ── */}
        <div className="flex flex-col gap-2 flex-1">
          {/* Galerie */}
          <motion.button
            type="button"
            onClick={() => galleryRef.current?.click()}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 bg-white font-semibold text-sm transition-all shadow-sm"
            style={{ borderColor: `${primaryColor}50`, color: primaryColor }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Images className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <span>Galerie</span>
          </motion.button>

          {/* Appareil photo */}
          <motion.button
            type="button"
            onClick={() => cameraRef.current?.click()}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 bg-white font-semibold text-sm transition-all shadow-sm"
            style={{ borderColor: `${primaryColor}50`, color: primaryColor }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Camera className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <span>Appareil photo</span>
          </motion.button>

          {/* Supprimer */}
          <AnimatePresence>
            {value && !compressing && (
              <motion.button
                type="button"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => onChange('')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-semibold text-sm transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <span>Supprimer</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Inputs cachés */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
    </div>
  );
}