/**
 * LA PHOTO DE LA CARTE — PRENDRE OU CHOISIR. Retour terrain PIE, 07/10/2026.
 *
 * LE DÉFAUT QU'ON FERME. Le profil n'avait qu'un `<input type="file">` sans
 * `capture` : sous Android il n'ouvrait que la galerie. Une marchande qui n'a
 * pas déjà sa photo dans le téléphone ne pouvait pas en mettre une.
 *
 * Deux gros boutons, deux gestes : l'appareil photo (`capture="user"`, la
 * caméra de face — c'est une photo d'identité) et la galerie. La consigne est
 * DITE à l'ouverture : les libellés ne servent qu'à celle qui lit.
 *
 * LE POIDS. Une photo d'appareil fait plusieurs mégaoctets ; elle part en
 * base64 dans `PATCH /users/:id`. Elle est donc réduite par l'utilitaire
 * existant (`utils/imageCompression`) avant `onPhoto`, au lieu d'être refusée
 * au-delà de 2 Mo — refus qui aurait rendu la caméra inutilisable.
 */
import React, { useRef } from 'react';
import { Camera, Images } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';

/** Une photo de carte : 600 px de large suffisent, 150 Ko au plus. */
const PHOTO_CARTE = { maxWidthPx: 600, maxSizeKb: 150, quality: 0.85, format: 'image/jpeg' } as const;

interface ChoixPhotoCarteProps {
  color: string;
  speak: (text: string) => void;
  onPhoto: (dataUrl: string) => void;
}

export function ChoixPhotoCarte({ color, speak, onPhoto }: ChoixPhotoCarteProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);

  const recevoir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      speak('Format de fichier invalide. Utilise une image.');
      return;
    }
    try {
      onPhoto(await compressImage(file, PHOTO_CARTE));
    } catch {
      speak('La photo ne passe pas. Essaie encore.');
    }
  };

  const bouton: React.CSSProperties = {
    flex: 1, minHeight: 64, borderRadius: 14, border: `2px solid ${color}`,
    background: 'var(--commerce-surface)', color, fontWeight: 700, fontSize: 14,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    cursor: 'pointer', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
      <button type="button" style={bouton} onClick={() => cameraRef.current?.click()} aria-label="Prendre une photo">
        <Camera size={26} aria-hidden="true" />
        Prendre une photo
      </button>
      <button type="button" style={bouton} onClick={() => galerieRef.current?.click()} aria-label="Choisir une photo">
        <Images size={26} aria-hidden="true" />
        Choisir une photo
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={recevoir} style={{ display: 'none' }} />
      <input ref={galerieRef} type="file" accept="image/*" onChange={recevoir} style={{ display: 'none' }} />
    </div>
  );
}
