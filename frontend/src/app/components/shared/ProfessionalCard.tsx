/**
 * 🎴 JULABA PROFESSIONAL CARD
 * 
 * Carte professionnelle avec effet flip 3D (recto/verso).
 * Adaptée pour Marchand, Producteur, Coopérative.
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, RotateCw } from 'lucide-react';
import { getRoleColor, UserRole } from '../../styles/design-tokens';
import { SharedButton } from './Button';
import { cn } from '../ui/utils';

export interface ProfessionalCardData {
  // Informations personnelles
  id: string;
  nom: string;
  prenoms: string;
  dateNaissance: string;
  nationalite: string;
  photo?: string;
  
  // Informations professionnelles
  marche?: string;
  commune?: string;
  cooperative?: string;
  zone?: string;
  
  // Documents officiels
  cni?: string;
  cmu?: string;
  rsti?: string;
  
  // Contact
  email: string;
  telephone: string;
  telephone2?: string;
  
  // Autres
  categorie?: 'A' | 'B' | 'C';
  recepisse?: string;
  boitePostale?: string;
}

export interface ProfessionalCardProps {
  data: ProfessionalCardData;
  role: UserRole;
  roleLabel: string; // "MARCHAND", "PRODUCTEUR", "COOPÉRATIVE"
}

export function ProfessionalCard({ data, role, roleLabel }: ProfessionalCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const roleColor = getRoleColor(role);
  
  // Générer les données pour le QR Code
  const qrData = JSON.stringify({
    id: data.id,
    nom: data.nom,
    prenoms: data.prenoms,
    telephone: data.telephone,
    role: roleLabel,
  });
  
  // Télécharger la carte (à implémenter)
  const handleDownload = () => {
    alert('Fonctionnalité de téléchargement à venir');
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 mb-4">
        <SharedButton
          variant="secondary"
          role={role}
          size="sm"
          leftIcon={<RotateCw className="w-4 h-4" />}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          Retourner
        </SharedButton>
        <SharedButton
          variant="primary"
          role={role}
          size="sm"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleDownload}
        >
          Télécharger
        </SharedButton>
      </div>
      
      {/* Container 3D */}
      <div className="perspective-1000">
        <motion.div
          className="relative w-full aspect-[1.586/1] cursor-pointer"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* RECTO */}
          <div
            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
            style={{ 
              backfaceVisibility: 'hidden',
              background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}DD 100%)`,
            }}
          >
            {/* Motif décoratif */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
            </div>
            
            {/* Contenu Recto */}
            <div className="relative h-full p-8 flex flex-col text-white">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                    <p className="text-xs font-bold tracking-wider">JULABA</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-90">N° ID</p>
                    <p className="text-lg font-bold tracking-wider">{data.id}</p>
                  </div>
                </div>
                <h2 className="text-sm font-semibold opacity-90 leading-tight">
                  Plateforme nationale des acteurs du vivrier<br />
                  <span className="uppercase">{roleLabel}</span> de Côte d'Ivoire
                </h2>
              </div>
              
              {/* Corps */}
              <div className="flex-1 flex gap-6">
                {/* Photo */}
                {data.photo ? (
                  <div className="flex-shrink-0">
                    <div className="w-32 h-40 rounded-2xl overflow-hidden border-4 border-white/30 bg-white/10">
                      <img 
                        src={data.photo} 
                        alt={`${data.nom} ${data.prenoms}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-32 h-40 rounded-2xl bg-white/10 border-4 border-white/30 flex items-center justify-center">
                    <span className="text-6xl opacity-50">👤</span>
                  </div>
                )}
                
                {/* Informations */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs opacity-75 mb-0.5">Nom</p>
                    <p className="font-bold text-lg tracking-wide">{data.nom}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75 mb-0.5">Prénoms</p>
                    <p className="font-semibold">{data.prenoms}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs opacity-75 mb-0.5">Date de naissance</p>
                      <p className="font-semibold text-sm">{data.dateNaissance}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-75 mb-0.5">Nationalité</p>
                      <p className="font-semibold text-sm">{data.nationalite}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {data.marche && (
                      <div>
                        <p className="text-xs opacity-75 mb-0.5">Marché</p>
                        <p className="font-semibold text-sm">{data.marche}</p>
                      </div>
                    )}
                    {data.commune && (
                      <div>
                        <p className="text-xs opacity-75 mb-0.5">Commune</p>
                        <p className="font-semibold text-sm">{data.commune}</p>
                      </div>
                    )}
                    {data.cooperative && (
                      <div>
                        <p className="text-xs opacity-75 mb-0.5">Coopérative</p>
                        <p className="font-semibold text-sm">{data.cooperative}</p>
                      </div>
                    )}
                    {data.zone && (
                      <div>
                        <p className="text-xs opacity-75 mb-0.5">Zone</p>
                        <p className="font-semibold text-sm">{data.zone}</p>
                      </div>
                    )}
                  </div>
                  {data.cni && (
                    <div>
                      <p className="text-xs opacity-75 mb-0.5">N° CNI</p>
                      <p className="font-semibold text-sm">{data.cni}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-center font-bold text-sm tracking-wider">
                  CARTE DU VIVRIER {roleLabel}
                </p>
              </div>
            </div>
          </div>
          
          {/* VERSO */}
          <div
            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            }}
          >
            {/* Contenu Verso */}
            <div className="relative h-full p-8 flex flex-col">
              {/* Header */}
              <div className="mb-6 pb-4 border-b-2" style={{ borderColor: roleColor }}>
                <div className="flex items-start justify-between mb-2">
                  <div 
                    className="rounded-2xl px-4 py-2"
                    style={{ backgroundColor: `${roleColor}15` }}
                  >
                    <p className="text-xs font-bold tracking-wider" style={{ color: roleColor }}>
                      JULABA
                    </p>
                  </div>
                  {data.categorie && (
                    <div 
                      className="rounded-xl px-4 py-2"
                      style={{ backgroundColor: roleColor }}
                    >
                      <p className="text-white font-bold text-sm">
                        CATÉGORIE {data.categorie}
                      </p>
                    </div>
                  )}
                </div>
                <h3 
                  className="text-xs font-bold leading-tight uppercase"
                  style={{ color: roleColor }}
                >
                  Plateforme des acteurs du vivrier<br />
                  {roleLabel} de Côte d'Ivoire - JULABA
                </h3>
              </div>
              
              {/* Corps */}
              <div className="flex-1 flex gap-6">
                {/* Informations */}
                <div className="flex-1 space-y-4">
                  {data.recepisse && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Récépissé</p>
                      <p className="font-semibold text-gray-900">{data.recepisse}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900 text-sm">{data.email}</p>
                  </div>
                  
                  {data.boitePostale && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Boîte Postale</p>
                      <p className="font-semibold text-gray-900">{data.boitePostale}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Contacts</p>
                    <p className="font-semibold text-gray-900">{data.telephone}</p>
                    {data.telephone2 && (
                      <p className="font-semibold text-gray-900">{data.telephone2}</p>
                    )}
                  </div>
                  
                  {data.cmu && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">N° CMU</p>
                      <p className="font-semibold text-gray-900">{data.cmu}</p>
                    </div>
                  )}
                  
                  {data.rsti && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">N° RSTI</p>
                      <p className="font-semibold text-gray-900">{data.rsti}</p>
                    </div>
                  )}
                </div>
                
                {/* QR Code */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center">
                  <div 
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: 'white' }}
                  >
                    <QRCodeSVG
                      value={qrData}
                      size={140}
                      level="H"
                      includeMargin={false}
                      fgColor={roleColor}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Scanner pour<br />voir le profil
                  </p>
                </div>
              </div>
              
              {/* Footer */}
              <div className="mt-6 pt-4 border-t-2 border-gray-200">
                <p className="text-center text-xs text-gray-600">
                  Cette carte est la propriété de JULABA et doit être présentée sur demande
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Instruction */}
      <p className="text-center text-sm text-gray-600 mt-4">
        💡 Cliquez sur la carte pour la retourner
      </p>
    </div>
  );
}