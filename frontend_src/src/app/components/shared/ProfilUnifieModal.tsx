import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Phone, Mail, MapPin, Shield, Edit3, Save,
  Camera, Download, RotateCw, Lock, ChevronDown, ChevronRight, ChevronUp, Briefcase, X,
} from 'lucide-react';
import { API_URL } from '../../utils/api';
import { getRoleColor } from '../../styles/design-tokens';
import type { UserData } from '../../contexts/UserContext';

/* ─── Config rôle ─────────────────────────── */
function getRoleConfig(role: string): { color: string; gradient: string; label: string } {
  const color = getRoleColor(role);
  const labels: Record<string, string> = {
    marchand: 'Marchand agréé',
    producteur: 'Producteur agréé',
    cooperative: 'Coopérative agréée',
    cooperateur: 'Coopérative agréée',
    identificateur: 'Identificateur agréé',
    grossiste: 'Grossiste agréé',
    transporteur: 'Transporteur agréé',
    collecteur: 'Collecteur agréé',
  };
  return {
    color,
    gradient: `linear-gradient(135deg, ${color}CC, ${color})`,
    label: labels[role] ?? 'Acteur agréé',
  };
}

function getNumero(user: UserData): string {
  return user.numeroMarchand || '';
}

/* ─── Types locaux ────────────────────────── */
interface IdentiteForm {
  nom: string;
  prenoms: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  situationMatrimoniale: string;
  numCNI: string;
  numCMU: string;
  rsti: string;
  marche: string;
  commune: string;
  produitCommercial: string;
}

interface DetailsForm {
  numCNPS: string;
  estMembreCooperative: boolean;
  boitePostale: string;
  statutEntrepreneur: string;
  categorie: string;
  typePointVente: string;
  typePointVenteAutre: string;
  districtAutre: string;
  regionAutre: string;
  departementAutre: string;
  communeAutre: string;
  quartierVillage: string;
  region: string;
  genre: string;
}

interface ContactForm {
  telephone: string;
  telephoneUrgence: string;
  email: string;
  localisation: string;
  typeActivite: string;
}

/* ─── Props ───────────────────────────────── */
interface ProfilUnifieModalProps {
  onClose: () => void;
  speak: (text: string) => void;
  user: UserData;
  onSave: (updates: Partial<UserData>) => void;
  onOpenDocuments: () => void;
}

/* ═══════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════ */
export function ProfilUnifieModal({
  onClose, speak, user, onSave, onOpenDocuments,
}: ProfilUnifieModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isEditingIdentite, setIsEditingIdentite] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const role = user.role ?? 'marchand';
  const cfg = getRoleConfig(role);
  const numero = getNumero(user);
  const u = user as any;
  // Le composant lit des cles backend (lastName, firstName, activity...) mais l'objet user
  // du UserContext expose des cles UI (nom, prenoms, typeActivite...). On tolere les deux.
  const KEY_ALIASES: Record<string, string[]> = {
    lastName: ['lastName', 'nom'],
    firstName: ['firstName', 'prenoms'],
    prenoms: ['prenoms', 'firstName'],
    activity: ['activity', 'typeActivite'],
    phone: ['phone', 'telephone'],
  };
  const getStr = (key: string, fallback = '') => {
    const candidates = KEY_ALIASES[key] || [key];
    for (const k of candidates) {
      const v = u?.[k];
      if (v !== undefined && v !== null && v !== '') return v as string;
    }
    return fallback;
  };
  const getBool = (key: string, fallback = false) => (u?.[key] as boolean) ?? fallback;

  const [identite, setIdentite] = useState<IdentiteForm>({
    nom: (user.lastName as string) || '',
    prenoms: (user.prenoms as string) || (user.firstName as string) || '',
    dateNaissance: (user.dateNaissance as string) || '',
    lieuNaissance: (user.lieuNaissance as string) || '',
    nationalite: user.nationalite || 'Ivoirienne',
    situationMatrimoniale: (user.situationMatrimoniale as string) || '',
    numCNI: (user.nin as string) || '',
    numCMU: (user.numCMU as string) || '',
    rsti: (user.recepisse as string) || '',
    marche: user.market || user.localisation || '',
    commune: user.commune || '',
    produitCommercial: (user.activity as string) || '',
  });

  const [details, setDetails] = useState<DetailsForm>({
    numCNPS: (user.numCNPS as string) || '',
    estMembreCooperative: (user.estMembreCooperative as boolean) ?? false,
    boitePostale: (user.boitePostale as string) || '',
    statutEntrepreneur: (user.statutEntrepreneur as string) || '',
    categorie: (user.categorie as string) || '',
    typePointVente: (user.typePointVente as string) || '',
    typePointVenteAutre: (user.typePointVenteAutre as string) || '',
    districtAutre: (user.districtAutre as string) || '',
    regionAutre: (user.regionAutre as string) || '',
    departementAutre: (user.departementAutre as string) || '',
    communeAutre: (user.communeAutre as string) || '',
    quartierVillage: (user.quartierVillage as string) || '',
    region: (user.region as string) || '',
    genre: (user.genre as string) || '',
  });

  useEffect(() => {
    if (!user) return;
    setIdentite({
      nom: getStr('lastName'),
      prenoms: getStr('prenoms') || getStr('firstName'),
      dateNaissance: getStr('dateNaissance'),
      lieuNaissance: getStr('lieuNaissance'),
      nationalite: getStr('nationalite', 'Ivoirienne'),
      situationMatrimoniale: getStr('situationMatrimoniale'),
      numCNI: getStr('nin'),
      numCMU: getStr('numCMU'),
      rsti: getStr('recepisse'),
      marche: getStr('market'),
      commune: getStr('commune'),
      produitCommercial: getStr('activity'),
    });
  }, [user, isEditingIdentite]);

  useEffect(() => {
    if (!user) return;
    setDetails({
      numCNPS: getStr('numCNPS'),
      estMembreCooperative: getBool('estMembreCooperative'),
      boitePostale: getStr('boitePostale'),
      statutEntrepreneur: getStr('statutEntrepreneur'),
      categorie: getStr('categorie'),
      typePointVente: getStr('typePointVente'),
      typePointVenteAutre: getStr('typePointVenteAutre'),
      districtAutre: getStr('districtAutre'),
      regionAutre: getStr('regionAutre'),
      departementAutre: getStr('departementAutre'),
      communeAutre: getStr('communeAutre'),
      quartierVillage: getStr('quartierVillage'),
      region: getStr('region'),
      genre: getStr('genre'),
    });
  }, [user, isEditingIdentite]);

  const [contact, setContact] = useState<ContactForm>({
    telephone: user.telephone ?? '',
    telephoneUrgence: user.telephone2 ?? '',
    email: user.email ?? '',
    localisation: user.localisation ?? '',
    typeActivite: user.typeActivite ?? '',
  });

  /* Calcul complétion */
  useEffect(() => {
    const fields = [
      getStr('lastName'), getStr('prenoms') || getStr('firstName'), getStr('dateNaissance'), getStr('lieuNaissance'),
      getStr('nationalite'), getStr('situationMatrimoniale'),
      getStr('nin'), getStr('numCMU'), getStr('recepisse'), getStr('numCNPS'),
      getStr('market'), getStr('commune'), getStr('activity'),
      contact.telephone, contact.email, contact.localisation,
    ];
    const filled = fields.filter(Boolean).length;
    const pct = Math.round((filled / fields.length) * 100);
    const t = setTimeout(() => setCompletionPct(pct), 400);
    return () => clearTimeout(t);
  }, [user, contact]);

  /* Scores sections */
  const etatCivilScore = [
    getStr('lastName'), getStr('prenoms') || getStr('firstName'), getStr('dateNaissance'),
    getStr('lieuNaissance'), getStr('nationalite'), getStr('situationMatrimoniale'),
  ].filter(Boolean).length;
  const docsScore = [getStr('nin'), getStr('numCMU'), getStr('recepisse'), getStr('numCNPS')].filter(Boolean).length;
  const activiteScore = [getStr('market'), getStr('commune'), getStr('activity')].filter(Boolean).length;

  /* Handlers */
  const handleSaveIdentite = async () => {
    const rawUpdates: Record<string, unknown> = {
      firstName: identite.prenoms || user.firstName || undefined,
      lastName: identite.nom || user.lastName || undefined,
      dateNaissance: identite.dateNaissance,
      lieuNaissance: identite.lieuNaissance,
      nationalite: identite.nationalite,
      situationMatrimoniale: identite.situationMatrimoniale,
      numCMU: identite.numCMU,
      numCNPS: details.numCNPS,
      estMembreCooperative: details.estMembreCooperative,
      commune: identite.commune,
      market: identite.marche,
      activity: identite.produitCommercial,
      boitePostale: details.boitePostale,
      statutEntrepreneur: details.statutEntrepreneur,
      categorie: details.categorie,
      genre: details.genre,
      typePointVente: details.typePointVente,
      typePointVenteAutre: details.typePointVenteAutre,
      districtAutre: details.districtAutre,
      regionAutre: details.regionAutre,
      departementAutre: details.departementAutre,
      communeAutre: details.communeAutre,
      quartierVillage: details.quartierVillage,
      region: details.region,
    };
    const updates = Object.fromEntries(
      Object.entries(rawUpdates).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    ) as Partial<UserData>;
    onSave(updates);
    if (user.id) {
      try {
        await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        });
      } catch (e: any) { console.warn('[ProfilUnifieModal] saveIdentite failed:', e?.message); }
    }
    setIsEditingIdentite(false);
    speak('Identité mise à jour');
  };

  const handleSaveContact = async () => {
    const updates: Partial<UserData> = {
      telephone: contact.telephone,
      telephone2: contact.telephoneUrgence,
      email: contact.email,
      localisation: contact.localisation,
      typeActivite: contact.typeActivite,
    };
    onSave(updates);
    if (user.id) {
      try {
        await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        });
      } catch (e: any) { console.warn('[ProfilUnifieModal] saveContact failed:', e?.message); }
    }
    setIsEditingContact(false);
    speak('Contact mis à jour');
  };

  const handleCopy = (val: string, field: string) => {
    navigator.clipboard.writeText(val).catch((e: any) => {
      console.warn('[ProfilUnifieModal] clipboard failed:', e?.message);
      setCopiedField(null);
    });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      speak('Format de fichier invalide. Utilise une image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      speak('Image trop lourde. Maximum 2 mégaoctets.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onSave({ photo: reader.result as string });
      speak('Photo modifiée');
    };
    reader.readAsDataURL(file);
  };

  /* Shimmer animation */
  const shimmerStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',
    animation: 'julaba-sh 2.5s infinite ease-in-out',
    pointerEvents: 'none',
  };

  const TAB_LABELS = ['Carte', 'Identité', 'Contact'];

  return (
    <>
      {/* Keyframes globaux */}
      <style>{`
        @keyframes julaba-sh { 0%{left:-100%} 100%{left:150%} }
        @keyframes julaba-shield { 0%,100%{transform:rotateY(0deg)} 25%{transform:rotateY(22deg)} 75%{transform:rotateY(-22deg)} }
        @keyframes julaba-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(39,174,96,0.4)} 50%{box-shadow:0 0 0 6px rgba(39,174,96,0)} }
        @keyframes julaba-flip { 0%,70%,100%{transform:rotate(0deg)} 35%{transform:rotate(180deg)} }
        @keyframes julaba-dl { 0%,100%{transform:translateY(0)} 40%{transform:translateY(3px)} 70%{transform:translateY(-2px)} }
        @keyframes julaba-blink { 0%,85%,100%{opacity:1;transform:scaleY(1)} 90%{opacity:0.3;transform:scaleY(0.1)} }
        @keyframes julaba-chevron { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        .julaba-field-input {
          width:100%; padding:8px 12px; border-radius:10px;
          border:1.5px solid #E5E7EB; font-size:14px; font-weight:500;
          color:#1a1a1a; outline:none; font-family:inherit; background:#FAFAFA;
          box-sizing:border-box;
        }
        .julaba-field-input:focus { border-color:${cfg.color}; box-shadow:0 0 0 3px ${cfg.color}22; }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', height: '95dvh',
            background: '#F5F0E8',
            borderRadius: '28px 28px 0 0',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* HANDLE */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
          </div>

          {/* MASQUER MA CARTE — 60% centré */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 20px 0' }}>
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '60%', background: cfg.color, color: 'white',
                border: 'none', borderRadius: 14, padding: '12px 18px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={shimmerStyle} />
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'relative', zIndex: 1, flexShrink: 0, animation: 'julaba-blink 3s ease-in-out infinite' }}
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <span style={{ position: 'relative', zIndex: 1 }}>Masquer ma carte</span>
            </motion.button>
          </div>

          {/* SEGMENTED CONTROL */}
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', gap: 8, position: 'relative', overflow: 'hidden' }}>
              {/* Shimmer global */}
              <div style={{
                ...shimmerStyle,
                animation: 'julaba-sh 3s infinite ease-in-out',
                zIndex: 3, borderRadius: 12,
              }} />
              {TAB_LABELS.map((label, i) => (
                <motion.button
                  key={label}
                  onClick={() => setActiveTab(i)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    padding: '11px 6px',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: `2px solid ${cfg.color}`,
                    background: activeTab === i ? cfg.color : 'white',
                    color: activeTab === i ? 'white' : cfg.color,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'background 0.2s, color 0.2s',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  {activeTab === i && <div style={shimmerStyle} />}
                  <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* BARRE COMPLÉTION */}
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{
              background: 'white', borderRadius: 12,
              padding: '10px 14px', border: '1px solid rgba(196,98,16,0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: '#aaa' }}>Complète ton profil</span>
                <strong style={{ fontSize: 12, color: cfg.color }}>{completionPct}%</strong>
              </div>
              <div style={{ height: 6, background: '#F0EDE8', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: `linear-gradient(90deg,${cfg.color},${cfg.color}99)`, borderRadius: 3 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
            </div>
          </div>

          {/* CONTENU SCROLLABLE */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 32px' }}>
            <AnimatePresence mode="wait">

              {/* ── CARTE ── */}
              {activeTab === 0 && (
                <motion.div key="carte"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {/* CARTE JULABA */}
                  <div style={{
                    borderRadius: 20, overflow: 'hidden',
                    border: `1.5px solid ${cfg.color}26`,
                    boxShadow: `0 4px 20px ${cfg.color}1F`,
                    position: 'relative',
                  }}>
                    {/* FOND ORANGE */}
                    <div style={{
                      background: cfg.gradient,
                      padding: '16px 18px 18px',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={shimmerStyle} />
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginBottom: 3 }}>
                            République de Côte d'Ivoire
                          </p>
                          <p style={{ fontSize: 22, color: 'white', fontFamily: "'Calisga', sans-serif", textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                            Jùlaba
                          </p>
                        </div>
                        <Shield
                          size={44}
                          color="rgba(255,255,255,0.9)"
                          strokeWidth={1.5}
                          style={{ animation: 'julaba-shield 4s ease-in-out infinite', filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))' }}
                        />
                      </div>
                    </div>

                    {/* CORPS BLANC */}
                    <div style={{ background: 'white', padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ ...shimmerStyle, background: `linear-gradient(90deg,transparent,${cfg.color}08,rgba(255,255,255,0.6),${cfg.color}08,transparent)`, animationDelay: '0.8s' }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', gap: 14, marginBottom: 0 }}>
                          {/* PHOTO */}
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                              width: 88, height: 108, borderRadius: 12, overflow: 'hidden',
                              border: `2.5px solid ${cfg.color}`,
                              boxShadow: `0 4px 12px ${cfg.color}33`,
                              background: '#F5F0E8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {user.photo
                                ? <img src={user.photo} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <User size={36} color={cfg.color} strokeWidth={1.5} />
                              }
                            </div>
                            <motion.button
                              onClick={() => fileInputRef.current?.click()}
                              whileTap={{ scale: 0.9 }}
                              style={{
                                position: 'absolute', bottom: -7, right: -7,
                                width: 26, height: 26, borderRadius: '50%',
                                background: cfg.color, border: '2.5px solid white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Camera size={12} color="white" />
                            </motion.button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                          </div>

                          {/* INFOS */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 2 }}>
                            <div>
                              <p style={{ fontSize: 19, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.15, marginBottom: 5 }}>
                                {user.prenoms} {user.lastName}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Shield size={11} color={cfg.color} />
                                <p style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>{numero}</p>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                              <div>
                                <p style={{ fontSize: 9, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 3 }}>Naissance</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{user.dateNaissance || identite.dateNaissance || '—'}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 9, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 3 }}>Nationalité</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{user.nationalite || identite.nationalite || '—'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FOOTER CARTE */}
                        <div style={{ borderTop: `0.5px solid ${cfg.color}1A`, paddingTop: 12, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</p>
                          <motion.div
                            style={{ background: '#27AE60', color: 'white', fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 20 }}
                            animate={{ boxShadow: ['0 0 0 0 rgba(39,174,96,0.4)', '0 0 0 6px rgba(39,174,96,0)', '0 0 0 0 rgba(39,174,96,0)'] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                          >
                            {user.statut || 'Validé'}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOUTONS VERSO / TÉLÉCHARGER */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      { label: 'Voir le verso', icon: <RotateCw size={16} color={cfg.color} style={{ animation: 'julaba-flip 3s ease-in-out infinite' }} />, onClick: () => speak('Verso de la carte') },
                      { label: 'Télécharger', icon: <Download size={16} color={cfg.color} style={{ animation: 'julaba-dl 2.5s ease-in-out infinite' }} />, onClick: () => speak('Téléchargement de la carte') },
                    ] as const).map(({ label, icon, onClick }) => (
                      <motion.button key={label} onClick={onClick} whileTap={{ scale: 0.97 }} style={{
                        background: `${cfg.color}14`, border: `1px solid ${cfg.color}33`,
                        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                        borderRadius: 13, padding: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        fontSize: 13, fontWeight: 600, color: cfg.color,
                        cursor: 'pointer', fontFamily: 'inherit',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={shimmerStyle} />
                        <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>{icon}{label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── IDENTITÉ ── */}
              {activeTab === 1 && (
                <motion.div key="identite"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <SectionCard title="État civil" score={`${etatCivilScore} / 6`} warn={etatCivilScore < 6} color={cfg.color}>
                    <FieldRow label="Nom" locked last={false}><span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{getStr('lastName')}</span></FieldRow>
                    <FieldRow label="Prénoms" locked last={false}><span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{user.prenoms}</span></FieldRow>
                    <FieldRow label="Date de naissance" last={false}>
                      {isEditingIdentite
                        ? <input type="date" className="julaba-field-input" value={identite.dateNaissance} onChange={e => setIdentite(p => ({ ...p, dateNaissance: e.target.value }))} />
                        : <FVal value={getStr('dateNaissance')} />}
                    </FieldRow>
                    <FieldRow label="Lieu de naissance" last={false}>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="Lieu de naissance" value={identite.lieuNaissance} onChange={e => setIdentite(p => ({ ...p, lieuNaissance: e.target.value }))} />
                        : <FVal value={getStr('lieuNaissance')} />}
                    </FieldRow>
                    <FieldRow label="Nationalité" last={false}>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="Nationalité" value={identite.nationalite} onChange={e => setIdentite(p => ({ ...p, nationalite: e.target.value }))} />
                        : <FVal value={getStr('nationalite', 'Ivoirienne')} />}
                    </FieldRow>
                    <FieldRow label="Sit. matrimoniale" last>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="Ex: Marié(e)" value={identite.situationMatrimoniale} onChange={e => setIdentite(p => ({ ...p, situationMatrimoniale: e.target.value }))} />
                        : <FVal value={getStr('situationMatrimoniale')} />}
                    </FieldRow>
                  </SectionCard>

                  <SectionCard title="Documents officiels" score={`${docsScore} / 4`} warn={docsScore < 4} color={cfg.color}>
                    <FieldRow label="N° CNI" last={false}>
                      {isEditingIdentite
                        ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FVal value={identite.numCNI} />
                              <Lock size={12} color="#999" />
                            </div>
                            <span style={{ fontSize: 11, color: '#999' }}>Modifiable par administrateur uniquement</span>
                          </div>
                        : <FVal value={getStr('nin')} />}
                    </FieldRow>
                    <FieldRow label="N° CMU" last={false}>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="N° CMU" value={identite.numCMU} onChange={e => setIdentite(p => ({ ...p, numCMU: e.target.value }))} />
                        : <FVal value={getStr('numCMU')} />}
                    </FieldRow>
                    <FieldRow label="N° RSTI" last>
                      {isEditingIdentite
                        ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FVal value={identite.rsti} />
                              <Lock size={12} color="#999" />
                            </div>
                            <span style={{ fontSize: 11, color: '#999' }}>Modifiable par administrateur uniquement</span>
                          </div>
                        : <FVal value={getStr('recepisse')} />}
                    </FieldRow>
                  </SectionCard>

                  <SectionCard title="Activité" score={`${activiteScore} / 3`} warn={activiteScore < 3} color={cfg.color}>
                    <FieldRow label="Marché" last={false}>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="Marché" value={identite.marche} onChange={e => setIdentite(p => ({ ...p, marche: e.target.value }))} />
                        : <FVal value={getStr('market')} />}
                    </FieldRow>
                    <FieldRow label="Commune" last={false}>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="Commune" value={identite.commune} onChange={e => setIdentite(p => ({ ...p, commune: e.target.value }))} />
                        : <FVal value={getStr('commune')} />}
                    </FieldRow>
                    <FieldRow label="Produits" last>
                      {isEditingIdentite
                        ? <input type="text" className="julaba-field-input" placeholder="Ex: Riz, tomates..." value={identite.produitCommercial} onChange={e => setIdentite(p => ({ ...p, produitCommercial: e.target.value }))} />
                        : <FVal value={getStr('activity')} />}
                    </FieldRow>
                  </SectionCard>

                  <div style={{ background: 'white', borderRadius: 16, padding: '12px 14px', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowMoreDetails(prev => !prev)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'inherit',
                        color: cfg.color,
                        fontWeight: 700,
                        fontSize: 13,
                        padding: 0,
                      }}
                    >
                      <span>Plus de détails</span>
                      {showMoreDetails ? <ChevronUp size={16} color={cfg.color} /> : <ChevronDown size={16} color={cfg.color} />}
                    </motion.button>

                    <AnimatePresence initial={false}>
                      {showMoreDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.05)', paddingTop: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Documents complémentaires</p>
                            <FieldRow label="N° CNPS" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="N° CNPS" value={details.numCNPS} onChange={e => setDetails(p => ({ ...p, numCNPS: e.target.value }))} />
                                : <FVal value={getStr('numCNPS')} />}
                            </FieldRow>
                            <FieldRow label="Boîte postale" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Boîte postale" value={details.boitePostale} onChange={e => setDetails(p => ({ ...p, boitePostale: e.target.value }))} />
                                : <FVal value={getStr('boitePostale')} />}
                            </FieldRow>
                            <FieldRow label="Catégorie" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Catégorie" value={details.categorie} onChange={e => setDetails(p => ({ ...p, categorie: e.target.value }))} />
                                : <FVal value={getStr('categorie')} />}
                            </FieldRow>
                            <FieldRow label="Statut entrepreneur" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Statut entrepreneur" value={details.statutEntrepreneur} onChange={e => setDetails(p => ({ ...p, statutEntrepreneur: e.target.value }))} />
                                : <FVal value={getStr('statutEntrepreneur')} />}
                            </FieldRow>
                            <FieldRow label="Genre" last={role === 'marchand' || role === 'producteur' ? false : true}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Genre" value={details.genre} onChange={e => setDetails(p => ({ ...p, genre: e.target.value }))} />
                                : <FVal value={getStr('genre')} />}
                            </FieldRow>
                            {(role === 'marchand' || role === 'producteur') && (
                              <FieldRow label="Membre coopérative" last>
                                {isEditingIdentite ? (
                                  <input
                                    type="checkbox"
                                    checked={details.estMembreCooperative}
                                    onChange={e => setDetails(p => ({ ...p, estMembreCooperative: e.target.checked }))}
                                  />
                                ) : (
                                  <FVal value={getBool('estMembreCooperative') ? 'Oui' : 'Non'} />
                                )}
                              </FieldRow>
                            )}

                            <p style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 12, marginBottom: 8 }}>Point de vente</p>
                            <FieldRow label="Type point vente" last={details.typePointVente === 'autre' ? false : true}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Type point vente" value={details.typePointVente} onChange={e => setDetails(p => ({ ...p, typePointVente: e.target.value }))} />
                                : <FVal value={getStr('typePointVente')} />}
                            </FieldRow>
                            {details.typePointVente === 'autre' && (
                              <FieldRow label="Précision type" last>
                                {isEditingIdentite
                                  ? <input type="text" className="julaba-field-input" placeholder="Précision type" value={details.typePointVenteAutre} onChange={e => setDetails(p => ({ ...p, typePointVenteAutre: e.target.value }))} />
                                  : <FVal value={getStr('typePointVenteAutre')} />}
                              </FieldRow>
                            )}

                            <p style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 12, marginBottom: 8 }}>Localisation détaillée</p>
                            <FieldRow label="District" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="District" value={details.districtAutre} onChange={e => setDetails(p => ({ ...p, districtAutre: e.target.value }))} />
                                : <FVal value={getStr('districtAutre')} />}
                            </FieldRow>
                            <FieldRow label="Région" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Région" value={details.region || details.regionAutre} onChange={e => setDetails(p => ({ ...p, region: e.target.value }))} />
                                : <FVal value={getStr('region') || getStr('regionAutre')} />}
                            </FieldRow>
                            <FieldRow label="Département" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Département" value={details.departementAutre} onChange={e => setDetails(p => ({ ...p, departementAutre: e.target.value }))} />
                                : <FVal value={getStr('departementAutre')} />}
                            </FieldRow>
                            <FieldRow label="Commune (détail)" last={false}>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Commune détaillée" value={details.communeAutre} onChange={e => setDetails(p => ({ ...p, communeAutre: e.target.value }))} />
                                : <FVal value={getStr('communeAutre')} />}
                            </FieldRow>
                            <FieldRow label="Quartier/Village" last>
                              {isEditingIdentite
                                ? <input type="text" className="julaba-field-input" placeholder="Quartier/Village" value={details.quartierVillage} onChange={e => setDetails(p => ({ ...p, quartierVillage: e.target.value }))} />
                                : <FVal value={getStr('quartierVillage')} />}
                            </FieldRow>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {isEditingIdentite ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <ActionBtn label="Enregistrer" icon={<Save size={15} color="white" />} color={cfg.color} onClick={handleSaveIdentite} flex />
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setIsEditingIdentite(false)}
                        style={{ padding: '13px 16px', borderRadius: 13, border: '2px solid #E5E7EB', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <X size={16} color="#666" />
                      </motion.button>
                    </div>
                  ) : (
                    <ActionBtn label="Modifier l'identité" icon={<Edit3 size={15} color="white" />} color={cfg.color} onClick={() => setIsEditingIdentite(true)} />
                  )}

                  <motion.button whileTap={{ scale: 0.98 }} onClick={onOpenDocuments} style={{
                    background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.2)',
                    borderRadius: 13, padding: '13px 16px', width: '100%',
                    fontSize: 13, fontWeight: 600, color: '#378ADD',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: 'inherit',
                  }}>
                    <span>Gérer mes documents</span>
                    <ChevronRight size={15} color="#378ADD" style={{ animation: 'julaba-chevron 2s ease-in-out infinite' }} />
                  </motion.button>
                </motion.div>
              )}

              {/* ── CONTACT ── */}
              {activeTab === 2 && (
                <motion.div key="contact"
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Coordonnées</p>
                    {([
                      { id: 'phone', label: 'Téléphone — identifiant de connexion', value: contact.telephone, field: 'telephone', bg: '#EAF4FF', color: '#378ADD', icon: Phone },
                      { id: 'email', label: 'Email', value: contact.email, field: 'email', bg: '#E8F8EF', color: '#1D9E75', icon: Mail },
                      { id: 'loc', label: 'Localisation', value: contact.localisation, field: 'localisation', bg: '#FEF3E8', color: cfg.color, icon: MapPin },
                      { id: 'urgence', label: 'Tél. urgence', value: contact.telephoneUrgence, field: 'telephoneUrgence', bg: '#FEF2F2', color: '#DC2626', icon: Phone },
                    ] as const).map(({ id, label, value, field, bg, color, icon: Icon }, idx, arr) => (
                      <div
                        key={id}
                        onClick={() => value && !isEditingContact && handleCopy(value, id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 13,
                          padding: idx === 0 ? '0 0 12px' : '12px 0',
                          borderBottom: idx < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
                          cursor: value && !isEditingContact ? 'pointer' : 'default',
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ ...shimmerStyle, animationDelay: `${idx * 0.4}s` }} />
                          <Icon size={18} color={color} style={{ position: 'relative', zIndex: 1 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</p>
                          {isEditingContact ? (
                            <>
                              <input
                                type={field === 'email' ? 'email' : 'text'}
                                className="julaba-field-input"
                                placeholder={label}
                                value={value}
                                onChange={e => setContact(p => ({ ...p, [field]: e.target.value }))}
                              />
                              {field === 'telephone' && (
                                <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                  <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, lineHeight: 1.4 }}>
                                    ⚠️ Ce numéro est votre identifiant de connexion. Le modifier vous déconnectera immédiatement.
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <p style={{ fontSize: 15, fontWeight: 600, color: value ? '#111827' : '#ccc', fontStyle: value ? 'normal' : 'italic' }}>
                                {value || 'Non renseigné'}
                              </p>
                              {copiedField === id && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 10, color: '#27AE60', fontWeight: 600, marginTop: 2 }}>
                                  ✓ Copié
                                </motion.p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Activité</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Briefcase size={18} color="#7C3AED" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Type d'activité</p>
                        {isEditingContact ? (
                          <input type="text" className="julaba-field-input" placeholder="Type d'activité" value={contact.typeActivite} onChange={e => setContact(p => ({ ...p, typeActivite: e.target.value }))} />
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 600, color: contact.typeActivite ? '#1a1a1a' : '#ddd', fontStyle: contact.typeActivite ? 'normal' : 'italic' }}>
                            {contact.typeActivite || 'Non renseigné'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEditingContact ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <ActionBtn label="Enregistrer" icon={<Save size={15} color="white" />} color={cfg.color} onClick={handleSaveContact} flex />
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setIsEditingContact(false)}
                        style={{ padding: '13px 16px', borderRadius: 13, border: '2px solid #E5E7EB', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <X size={16} color="#666" />
                      </motion.button>
                    </div>
                  ) : (
                    <ActionBtn label="Modifier le contact" icon={<Edit3 size={15} color="white" />} color={cfg.color} onClick={() => setIsEditingContact(true)} />
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

/* ─── Sous-composants ─────────────────────── */

function SectionCard({ title, score, warn, color, children }: {
  title: string; score: string; warn: boolean; color: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', border: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</p>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
          color: warn ? '#F59E0B' : '#aaa',
          background: warn ? 'rgba(245,158,11,0.1)' : '#F5F0E8',
        }}>{score}</span>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children, last, locked }: {
  label: string; children: React.ReactNode; last: boolean; locked?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: last ? 'none' : '0.5px solid rgba(0,0,0,0.05)',
      paddingBottom: last ? 0 : undefined,
    }}>
      <span style={{ fontSize: 14, color: '#999', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {locked && <Lock size={11} color="#ddd" />}
        {children}
      </div>
    </div>
  );
}

function FVal({ value }: { value: string }) {
  if (!value) return <span style={{ fontSize: 14, color: '#ccc', fontStyle: 'italic', fontWeight: 400 }}>Non renseigné</span>;
  return <span style={{ fontSize: 15, fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</span>;
}

function ActionBtn({ label, icon, color, onClick, flex }: {
  label: string; icon: React.ReactNode; color: string; onClick: () => void; flex?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      style={{
        background: color, color: 'white', border: 'none',
        borderRadius: 13, padding: 13,
        width: flex ? undefined : '100%',
        flex: flex ? 1 : undefined,
        fontSize: 14, fontWeight: 600,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)',
        animation: 'julaba-sh 2.5s infinite ease-in-out',
      }} />
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>{icon}{label}</span>
    </motion.button>
  );
}
