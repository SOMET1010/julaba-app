import { useProducteur } from '../../contexts/ProducteurContext';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sprout, MapPin, Calendar, Camera, ImagePlus, Trash2, Scale, ChevronDown, RefreshCw } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  IMG_PRODUIT_TOMATE, IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO,
  IMG_PRODUIT_MANIOC, IMG_PRODUIT_IGNAME, IMG_PRODUIT_MAIS, IMG_PRODUIT_RIZ,
  IMG_PRODUIT_BANANE, IMG_PRODUIT_OIGNON, IMG_PRODUIT_AVOCAT, IMG_PRODUIT_AUTRE
} from '../../assets/images';
const imgTomate    = IMG_PRODUIT_TOMATE;
const imgAubergine = IMG_PRODUIT_AUBERGINE;
const imgPiment    = IMG_PRODUIT_PIMENT;
const imgGombo     = IMG_PRODUIT_GOMBO;
const imgManioc    = IMG_PRODUIT_MANIOC;
const imgIgname    = IMG_PRODUIT_IGNAME;
const imgMais      = IMG_PRODUIT_MAIS;
const imgRiz       = IMG_PRODUIT_RIZ;
const imgBanane    = IMG_PRODUIT_BANANE;
const imgOignon    = IMG_PRODUIT_OIGNON;
const imgAvocat    = IMG_PRODUIT_AVOCAT;
const imgAutre     = IMG_PRODUIT_AUTRE;

// ── Icônes SVG inline pour chaque culture ─────────────────────────────────
function IconTomate({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <circle cx="20" cy="22" r="13" fill={color} opacity="0.15" stroke={color} strokeWidth="2"/>
      <ellipse cx="20" cy="22" r="9" rx="9" ry="8" fill={color} opacity="0.3"/>
      <path d="M20 9 C20 9 17 5 15 6 C17 7 18 9 20 9Z" fill={color}/>
      <path d="M20 9 C20 9 23 5 25 6 C23 7 22 9 20 9Z" fill={color}/>
      <path d="M20 9 L20 13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="20" cy="22" r="5" fill={color} opacity="0.5"/>
    </svg>
  );
}
function IconAubergine({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <ellipse cx="20" cy="24" rx="10" ry="13" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <ellipse cx="20" cy="25" rx="7" ry="9" fill={color} opacity="0.35"/>
      <path d="M20 11 C20 11 18 7 20 6 C22 7 20 11 20 11Z" fill={color}/>
      <path d="M20 11 C18 9 15 8 14 10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconPiment({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <path d="M22 10 C24 12 28 18 26 26 C25 30 22 33 19 32 C16 31 14 28 15 24 C16 18 20 12 22 10Z" fill={color} opacity="0.25" stroke={color} strokeWidth="2"/>
      <path d="M22 10 C24 12 27 17 25 24 C24 28 21 31 19 30" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M22 10 C22 8 24 6 23 5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M23 5 C25 4 27 5 26 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconGombo({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <path d="M20 32 C16 28 13 20 15 13 C16 9 19 7 21 8 C23 9 24 12 23 17 C22 23 21 28 20 32Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <path d="M20 32 C22 27 26 21 25 14 C24 10 22 8 21 8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M21 8 C21 6 22 5 21 4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 15 L13 13 M16 20 L13 20 M17 25 L14 26" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
function IconManioc({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <ellipse cx="20" cy="26" rx="7" ry="11" fill={color} opacity="0.2" stroke={color} strokeWidth="2" transform="rotate(-15 20 26)"/>
      <ellipse cx="20" cy="26" rx="4" ry="7" fill={color} opacity="0.35" transform="rotate(-15 20 26)"/>
      <path d="M18 15 C17 12 18 9 20 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 8 C22 6 24 6 24 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M22 16 C24 15 26 13 25 11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconIgname({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <path d="M10 28 C10 20 14 12 20 10 C26 12 30 20 30 28 C28 32 24 34 20 34 C16 34 12 32 10 28Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <path d="M13 22 C14 18 17 14 20 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M20 10 L20 7" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 7 C19 5 17 5 17 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconMais({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <rect x="15" y="10" width="10" height="22" rx="5" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <line x1="17" y1="14" x2="23" y2="14" stroke={color} strokeWidth="1.2" opacity="0.7"/>
      <line x1="17" y1="17" x2="23" y2="17" stroke={color} strokeWidth="1.2" opacity="0.7"/>
      <line x1="17" y1="20" x2="23" y2="20" stroke={color} strokeWidth="1.2" opacity="0.7"/>
      <line x1="17" y1="23" x2="23" y2="23" stroke={color} strokeWidth="1.2" opacity="0.7"/>
      <line x1="17" y1="26" x2="23" y2="26" stroke={color} strokeWidth="1.2" opacity="0.7"/>
      <path d="M20 10 C18 8 16 6 18 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M20 10 C22 8 24 6 22 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconRiz({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <path d="M20 32 L20 12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="17" cy="15" rx="4" ry="2.5" fill={color} opacity="0.4" transform="rotate(-30 17 15)"/>
      <ellipse cx="23" cy="18" rx="4" ry="2.5" fill={color} opacity="0.4" transform="rotate(30 23 18)"/>
      <ellipse cx="16" cy="22" rx="4" ry="2.5" fill={color} opacity="0.4" transform="rotate(-20 16 22)"/>
      <ellipse cx="24" cy="25" rx="4" ry="2.5" fill={color} opacity="0.4" transform="rotate(20 24 25)"/>
      <ellipse cx="20" cy="12" rx="3" ry="2" fill={color} opacity="0.5"/>
    </svg>
  );
}
function IconBanane({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <path d="M12 28 C10 22 12 15 17 11 C22 7 28 8 30 12 C28 10 23 10 19 14 C15 18 14 25 16 30 C14 30 12 29 12 28Z" fill={color} opacity="0.25" stroke={color} strokeWidth="1.5"/>
      <path d="M13 27 C12 21 14 15 19 12 C24 9 29 11 30 13" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M30 12 C31 10 30 8 28 8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconOignon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <ellipse cx="20" cy="24" rx="12" ry="11" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <ellipse cx="20" cy="24" rx="8" ry="7" fill={color} opacity="0.2" stroke={color} strokeWidth="1.2"/>
      <ellipse cx="20" cy="24" rx="4" ry="3.5" fill={color} opacity="0.3"/>
      <path d="M20 13 L20 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 8 C19 6 17 5 18 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M20 8 C21 6 23 5 22 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconAvocat({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
      <path d="M20 32 C16 28 13 20 15 13 C16 9 19 7 21 8 C23 9 24 12 23 17 C22 23 21 28 20 32Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <path d="M20 32 C22 27 26 21 25 14 C24 10 22 8 21 8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M21 8 C21 6 22 5 21 4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 15 L13 13 M16 20 L13 20 M17 25 L14 26" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

// ── Données cultures ───────────────────────────────────────────────────────
const CULTURES = [
  { id: 'tomate',    name: 'Tomate',          img: imgTomate    },
  { id: 'aubergine', name: 'Aubergine',       img: imgAubergine },
  { id: 'piment',    name: 'Piment',          img: imgPiment    },
  { id: 'gombo',     name: 'Gombo',           img: imgGombo     },
  { id: 'manioc',    name: 'Manioc',          img: imgManioc    },
  { id: 'igname',    name: 'Igname',          img: imgIgname    },
  { id: 'mais',      name: 'Maïs',            img: imgMais      },
  { id: 'riz',       name: 'Riz',             img: imgRiz       },
  { id: 'banane',    name: 'Banane plantain', img: imgBanane    },
  { id: 'oignon',    name: 'Oignon',          img: imgOignon    },
  { id: 'avocat',    name: 'Avocat',          img: imgAvocat    },
  { id: 'autre',     name: 'Autre',           img: imgAutre     },
];

const QUALITE_OPTIONS = ['Excellente', 'Bonne', 'Moyenne'];
const COLOR = '#2E8B57';

// ── Unités disponibles ──────────────────────────────────────────────────────
const UNITES = [
  { id: 'kg',    label: 'Kilogramme',   abbr: 'kg',   facteur: 1,      placeholder: '0',    hint: 'Ex : 150 kg',       step: 1    },
  { id: 'tonne', label: 'Tonne',        abbr: 't',    facteur: 1000,   placeholder: '0.0',  hint: 'Ex : 1.5 tonne',    step: 0.1  },
  { id: 'tas',   label: 'Tas',          abbr: 'tas',  facteur: 50,     placeholder: '0',    hint: 'Ex : 3 tas (≈50 kg/tas)', step: 1 },
  { id: 'sac',   label: 'Sac (100 kg)', abbr: 'sac',  facteur: 100,    placeholder: '0',    hint: 'Ex : 5 sacs (≈100 kg/sac)', step: 1 },
  { id: 'cagette', label: 'Cagette',    abbr: 'cag',  facteur: 20,     placeholder: '0',    hint: 'Ex : 8 cagettes (≈20 kg)', step: 1 },
  { id: 'panier', label: 'Panier',      abbr: 'pan',  facteur: 10,     placeholder: '0',    hint: 'Ex : 12 paniers (≈10 kg)', step: 1 },
  { id: 'botte',  label: 'Botte',       abbr: 'bot',  facteur: 0.5,    placeholder: '0',    hint: 'Ex : 20 bottes (≈0.5 kg)', step: 1 },
];

export function RecolteForm() {
  const { createRecolte, cycles } = useProducteur();
  const navigate = useNavigate();
  const { user, addTransaction, speak } = useApp();

  // Lire cycleId depuis les query params
  const searchParams = new URLSearchParams(window.location.search);
  const cycleIdFromUrl = searchParams.get('cycleId');
  const cycleFromUrl = cycleIdFromUrl ? cycles.find(c => c.id === cycleIdFromUrl) : null;

  // Trouver la culture correspondante dans CULTURES
  const cultureIdFromCycle = cycleFromUrl
    ? (CULTURES.find(c => c.name === cycleFromUrl.culture)?.id || 'autre')
    : 'riz';

  const [visible, setVisible] = useState(false);
  const [culture, setCulture]           = useState(cultureIdFromCycle);

  useEffect(() => {
    if (cycleFromUrl && cultureIdFromCycle !== 'riz') {
      setCulture(cultureIdFromCycle);
    }
  }, [cycleFromUrl?.id]);

  const [quantite, setQuantite]         = useState('');
  const [unite, setUnite]               = useState('kg');
  const [showUniteDropdown, setShowUniteDropdown] = useState(false);
  const [location, setLocation]         = useState(user?.commune || '');
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0]);
  const [qualite, setQualite]           = useState('Bonne');
  const [autreCulture, setAutreCulture] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  const uniteObj = UNITES.find(u => u.id === unite) || UNITES[0];
  const quantiteEnKg = quantite ? Math.round(Number(quantite) * uniteObj.facteur * 10) / 10 : 0;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.onerror = () => {
      console.warn('[RecolteForm] FileReader failed:', reader.error?.message);
      toast.error('Erreur lors de la lecture de la photo');
    };
    reader.readAsDataURL(file);
    // speak disabled;
  };

  // Déclenche l'animation d'entrée après le montage
  useEffect(() => {
    scheduleTimeout(() => setVisible(true), 20);
    return () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  const cultureName = culture === 'autre'
    ? (autreCulture.trim() || 'Autre')
    : (CULTURES.find(c => c.id === culture)?.name || culture);
  const dateRecolte = date;
  const localisation = location;

  const scheduleTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter(timeoutId => timeoutId !== id);
      fn();
    }, delay);
    timeoutIdsRef.current.push(id);
    return id;
  };

  const handleClose = () => {
    setVisible(false);
    scheduleTimeout(() => navigate(-1), 320);
  };

  const handleSubmit = async () => {
    if (!quantite) {
      toast.error('Veuillez saisir une quantité');
      speak('Dis-moi la quantité que tu as récoltée.'); // voix : le producteur ne lit pas le bandeau
      return;
    }
    setIsSubmitting(true);
    try {
      await createRecolte({
        cycle_id: cycleIdFromUrl || undefined,
        produit: cultureName,
        quantite: quantiteEnKg,
        unite: 'kg',
        qualite: qualite || 'standard',
        date_recolte: dateRecolte || new Date().toISOString().split('T')[0],
        localisation: localisation || '',
        prix_unitaire: prixUnitaire !== '' ? Number(prixUnitaire) : 0,
        parcelle: undefined,
        notes: undefined,
        photo_url: photoPreview || undefined,
      });
      setIsSubmitting(false);
      setVisible(false);
      // Confirmation PARLÉE : sans ça, une non-lectrice ne sait même pas que sa
      // récolte est enregistrée (l'écran se ferme simplement).
      speak(`C'est enregistré ! ${quantiteEnKg} kilos de ${cultureName}.`);
      scheduleTimeout(() => navigate('/producteur/production'), 320);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement de la récolte';
      console.warn('[RecolteForm] createRecolte failed:', err instanceof Error ? err.message : err);
      toast.error(message);
      speak("Ça n'a pas marché. Réessaie, s'il te plaît.");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — couvre tout, y compris la bottom bar */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Bottom sheet modal */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-[210] bg-white rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '95dvh' }}
          >
            {/* ── Header vert ── */}
            <div
              className="px-6 py-5 flex items-start justify-between flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${COLOR}, #3BA869)` }}
            >
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Sprout className="w-6 h-6" strokeWidth={2.5} />
                  Déclarer une récolte
                </h2>
                <p className="text-white/85 text-sm mt-1">Enregistre ta production</p>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40 transition-colors mt-0.5"
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* ── Contenu scrollable ── */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(95dvh - 90px)' }}>
              <div className="px-5 pt-5 pb-8 space-y-6 max-w-md mx-auto">

                {/* Culture */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Quel produit tu as récolté ?
                  </label>

                  {/* Grille 4 colonnes */}
                  <div className="grid grid-cols-4 gap-2">
                    {CULTURES.map((c) => {
                      const isSelected = culture === c.id;
                      const isAutre    = c.id === 'autre';
                      return (
                        <motion.button
                          key={c.id}
                          onClick={() => { setCulture(c.id); }}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 border-2 transition-all ${
                            isSelected
                              ? 'border-transparent shadow-lg'
                              : 'bg-white border-gray-200 hover:border-green-300'
                          }`}
                          style={isSelected ? { backgroundColor: `${COLOR}18`, borderColor: COLOR } : {}}
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.04, y: -2 }}
                        >
                          {/* Icône */}
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-white shadow-sm' : 'bg-gray-50'
                            }`}
                          >
                            {isAutre ? (
                              <img
                                src={(c as any).img}
                                alt={c.name}
                                className="w-9 h-9 object-contain"
                              />
                            ) : (c as any).img ? (
                              <img
                                src={(c as any).img}
                                alt={c.name}
                                className="w-9 h-9 object-contain"
                              />
                            ) : (
                              (c as any).Icon && (() => { const I = (c as any).Icon; return <I color={isSelected ? COLOR : '#9ca3af'} />; })()
                            )}
                          </div>
                          {/* Label */}
                          <span
                            className="text-[10px] font-bold leading-tight text-center"
                            style={{ color: isSelected ? COLOR : '#6b7280' }}
                          >
                            {c.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Champ saisie manuelle si "Autre" sélectionné */}
                  <AnimatePresence>
                    {culture === 'autre' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <input
                          type="text"
                          placeholder="Ex: Tomate cerise, Piment oiseau..."
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-semibold text-base text-gray-900 bg-white placeholder:text-gray-400"
                          autoFocus
                          value={autreCulture}
                          onChange={e => setAutreCulture(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Photo de la récolte ── */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Photo de ta récolte
                  </label>
                  <p className="text-xs text-gray-500 mb-3 -mt-1">
                    Cette photo sera visible sur le marché digital
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />

                  <AnimatePresence mode="wait">
                    {photoPreview ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative rounded-2xl overflow-hidden border-2 border-green-400 shadow-lg"
                      >
                        <img
                          src={photoPreview}
                          alt="Aperçu récolte"
                          className="w-full h-48 object-cover"
                        />
                        {/* Badge "Visible sur le marché" */}
                        <div className="absolute top-3 left-3 bg-green-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                          <Camera className="w-3 h-3" />
                          Visible sur le marché
                        </div>
                        {/* Boutons action */}
                        <div className="absolute bottom-3 right-3 flex gap-2">
                          <motion.button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
                            whileTap={{ scale: 0.9 }}
                          >
                            <ImagePlus className="w-4 h-4 text-green-700" strokeWidth={2.5} />
                          </motion.button>
                          <motion.button
                            onClick={() => { setPhotoPreview(null); }}
                            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="upload"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-3 hover:border-green-400 hover:bg-green-50 transition-all"
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                          className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${COLOR}18` }}
                        >
                          <Camera className="w-7 h-7" style={{ color: COLOR }} strokeWidth={2} />
                        </motion.div>
                        <div className="text-center">
                          <p className="font-black text-gray-700">Ajouter une photo</p>
                          <p className="text-xs text-gray-400 mt-0.5">Galerie ou appareil photo</p>
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quantité + Unité */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Quelle quantité as-tu récoltée ?
                  </label>

                  {/* Sélecteur d'unité */}
                  <div className="relative mb-3">
                    <motion.button
                      type="button"
                      onClick={() => setShowUniteDropdown(!showUniteDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-gray-200 bg-white focus:outline-none transition-all"
                      style={showUniteDropdown ? { borderColor: COLOR } : {}}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}18` }}>
                          <Scale className="w-5 h-5" style={{ color: COLOR }} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-gray-900">{uniteObj.label}</p>
                          <p className="text-xs text-gray-500">1 {uniteObj.abbr} = {uniteObj.facteur} kg</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${showUniteDropdown ? 'rotate-180' : ''}`}
                        strokeWidth={2.5}
                      />
                    </motion.button>

                    {/* Dropdown unités */}
                    <AnimatePresence>
                      {showUniteDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
                          animate={{ opacity: 1, y: 0, scaleY: 1 }}
                          exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-gray-200 shadow-2xl overflow-hidden z-50 origin-top"
                        >
                          {UNITES.map((u, i) => (
                            <motion.button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setUnite(u.id);
                                setQuantite('');
                                setShowUniteDropdown(false);
                                // speak disabled;
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors border-b border-gray-100 last:border-0 ${
                                unite === u.id ? 'bg-green-50' : 'hover:bg-gray-50'
                              }`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                                  style={{
                                    backgroundColor: unite === u.id ? `${COLOR}20` : '#f3f4f6',
                                    color: unite === u.id ? COLOR : '#6b7280',
                                  }}
                                >
                                  {u.abbr}
                                </div>
                                <div className="text-left">
                                  <p className={`font-bold text-sm ${unite === u.id ? 'text-green-700' : 'text-gray-800'}`}>
                                    {u.label}
                                  </p>
                                  <p className="text-xs text-gray-400">{u.hint}</p>
                                </div>
                              </div>
                              {unite === u.id && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: COLOR }}>
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                              )}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Saisie quantité */}
                  <div className="relative">
                    <input
                      type="number"
                      value={quantite}
                      onChange={(e) => setQuantite(e.target.value)}
                      placeholder={uniteObj.placeholder}
                      min={0}
                      step={uniteObj.step}
                      inputMode="decimal"
                      className="w-full pl-5 pr-24 py-5 rounded-2xl border-2 border-gray-200 focus:outline-none font-black text-4xl text-gray-900 bg-white placeholder:text-gray-200 transition-all"
                      style={{ borderColor: quantite ? COLOR : undefined }}
                    />
                    <div
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-sm font-black"
                      style={{ backgroundColor: `${COLOR}15`, color: COLOR }}
                    >
                      {uniteObj.abbr}
                    </div>
                  </div>

                  {/* Conversion en kg */}
                  <AnimatePresence>
                    {quantite && Number(quantite) > 0 && unite !== 'kg' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-200 bg-green-50"
                      >
                        <RefreshCw className="w-4 h-4 text-green-600 flex-shrink-0" strokeWidth={2.5} />
                        <p className="text-sm font-bold text-green-700">
                          {quantite} {uniteObj.abbr} = <span className="text-green-900">{(quantiteEnKg || 0).toLocaleString()} kg</span>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-xs text-gray-400 mt-2">{uniteObj.hint}</p>
                </div>

                {/* Qualité */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Quelle est la qualité ?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUALITE_OPTIONS.map((q) => (
                      <motion.button
                        key={q}
                        onClick={() => { setQualite(q); }}
                        className={`py-3 rounded-full font-bold text-sm border-2 transition-all ${
                          qualite === q
                            ? 'text-white shadow-md border-transparent'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                        }`}
                        style={qualite === q ? { backgroundColor: COLOR } : {}}
                        whileTap={{ scale: 0.95 }}
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Prix */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Prix par {uniteObj.abbr} (FCFA) — optionnel
                  </label>
                  <input
                    type="number"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(e.target.value)}
                    placeholder="0"
                    min={0}
                    inputMode="numeric"
                    className="w-full px-4 py-4 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-black text-3xl text-gray-900 bg-white placeholder:text-gray-300"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Tu pourras modifier le prix plus tard
                  </p>
                </div>

                {/* Localisation */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Où as-tu récolté ?
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Bouaké"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-semibold text-lg text-gray-900 bg-white placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Quand as-tu récolté ?
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-semibold text-lg text-gray-900 bg-white"
                    />
                  </div>
                </div>

                {/* Récapitulatif */}
                <AnimatePresence>
                  {quantite && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-2xl p-4 border-2"
                      style={{ backgroundColor: 'rgba(46,139,87,0.07)', borderColor: 'rgba(46,139,87,0.25)' }}
                    >
                      <p className="text-sm text-gray-600 mb-1 font-semibold">Récapitulatif</p>
                      <p className="text-2xl font-black" style={{ color: COLOR }}>
                        {quantite} {uniteObj.abbr} de {cultureName}
                      </p>
                      {unite !== 'kg' && (
                        <p className="text-sm font-bold text-green-600 mt-0.5">
                          soit {(quantiteEnKg || 0).toLocaleString()} kg au total
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{location || 'Localisation non renseignée'}</p>
                      </div>
                      {prixUnitaire && (
                        <p className="text-sm font-bold mt-1" style={{ color: COLOR }}>
                          Prix : {Number(prixUnitaire).toLocaleString()} FCFA / {uniteObj.abbr}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Boutons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors text-base"
                  >
                    Annuler
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !quantite}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 text-base"
                    style={{ backgroundColor: COLOR }}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </motion.button>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}