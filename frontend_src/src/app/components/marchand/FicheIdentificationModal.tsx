import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Phone, Mail, MapPin, ShoppingBag, Users,
  FileText, Shield, Calendar, Edit3, Save, Camera,
  Heart, IdCard, Briefcase, Building2, Home, Baby,
  Store, Sprout, CheckCircle, RotateCcw, ShieldCheck,
  Truck, UserCheck, Package, ClipboardList, Tablet, Navigation,
} from 'lucide-react';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { useCooperativesListe } from '../../hooks/useCooperativesListe';

/* ─── Couleur selon rôle ────────────────────────────────────── */
function getRoleConfig(role: string) {
  if (role === 'producteur') return {
    color: '#2E8B57', gradient: 'linear-gradient(135deg,#2E8B57,#3BA869)',
    bgLight: '#F0FDF4', borderLight: '#BBF7D0', label: 'Producteur', icon: Sprout,
  };
  if (role === 'cooperative' || role === 'cooperateur') return {
    color: '#2072AF', gradient: 'linear-gradient(135deg,#2072AF,#3A8FCC)',
    bgLight: '#EFF6FF', borderLight: '#BFDBFE', label: 'Coopérative', icon: Building2,
  };
  if (role === 'identificateur') return {
    color: '#9F8170', gradient: 'linear-gradient(135deg,#9F8170,#B8977E)',
    bgLight: '#FDF8F5', borderLight: '#E8D5C4', label: 'Identificateur', icon: UserCheck,
  };
  if (role === 'grossiste') return {
    color: '#7C3AED', gradient: 'linear-gradient(135deg,#7C3AED,#9F67F5)',
    bgLight: '#F5F3FF', borderLight: '#DDD6FE', label: 'Grossiste', icon: Package,
  };
  if (role === 'transporteur') return {
    color: '#0369A1', gradient: 'linear-gradient(135deg,#0369A1,#0EA5E9)',
    bgLight: '#F0F9FF', borderLight: '#BAE6FD', label: 'Transporteur', icon: Truck,
  };
  if (role === 'collecteur') return {
    color: '#B45309', gradient: 'linear-gradient(135deg,#B45309,#D97706)',
    bgLight: '#FFFBEB', borderLight: '#FDE68A', label: 'Collecteur', icon: ClipboardList,
  };
  // Défaut : marchand
  return {
    color: '#C66A2C', gradient: 'linear-gradient(135deg,#C66A2C,#D97706)',
    bgLight: '#FFF7ED', borderLight: '#FED7AA', label: 'Marchand', icon: Store,
  };
}

/* ─── Préfixe du numéro de fiche selon rôle ────────────────── */
function getNumeroPrefix(role: string) {
  const MAP: Record<string, string> = {
    marchand: 'JLB-MRC',
    producteur: 'JLB-PRD',
    cooperative: 'JLB-COP',
    identificateur: 'JLB-IDE',
    grossiste: 'JLB-GRS',
    transporteur: 'JLB-TRP',
    collecteur: 'JLB-COL',
  };
  return MAP[role] ?? 'JLB-ACT';
}

interface FicheIdentificationModalProps {
  onClose: () => void;
  speak: (text: string) => void;
  user: any;
  onSave: (updatedUser: any) => void;
}

export function FicheIdentificationModal({ onClose, speak, user, onSave }: FicheIdentificationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  const { cooperatives: cooperativesListe } = useCooperativesListe();
  const roleKey = user.role || user.typeActeur || 'marchand';
  const cfg = getRoleConfig(roleKey);
  const Icon = cfg.icon || Store;

  const [formData, setFormData] = useState({
    nom: user.nom || '',
    prenoms: user.prenoms || '',
    lieuNaissance: user.lieuNaissance || '',
    dateNaissance: user.dateNaissance || '',
    nationalite: user.nationalite || 'Ivoirienne',
    situationMatrimoniale: user.situationMatrimoniale || '',
    nombreEnfants: user.nombreEnfants || '',
    telephone: user.telephone || '',
    telephoneUrgence: user.telephoneUrgence || '',
    email: user.email || '',
    lieuResidence: user.lieuResidence || '',
    commune: user.commune || user.localisation || '',
    marche: user.marche || user.localisation || '',
    emplacement: user.emplacement || '',
    box: user.box || '',
    nombreMagasin: user.nombreMagasin || '',
    nombreTable: user.nombreTable || '',
    servicesMarchand: user.servicesMarchand || '',
    produitCommercial: user.produitCommercial || user.produitsVendus || user.typeActivite || '',
    secteurCommercial: user.secteurCommercial || { grossiste: false, semiGrossiste: false, detaillant: false },
    numCNI: user.numCNI || '',
    numCNPS: user.numCNPS || '',
    numCMU: user.numCMU || '',
    membreMarche: user.membreMarche || '',
    membreCooperative: user.membreCooperative || '',
    nomResponsableMarche: user.nomResponsableMarche || '',
    nomResponsableCooperative: user.nomResponsableCooperative || '',
    statutEntrepreneur: user.statutEntrepreneur || '',
    dateArrivee: user.dateArrivee || '',
    recepisse: user.recepisse || 'N0167/PA/SG/D1',
    categorie: user.categorie || '',
    boitePostale: user.boitePostale || '',
    photo: user.photo || null,
    signature: user.signature || null,
    // Champs identificateur
    zoneIntervention: user.zoneIntervention || '',
    superviseur: user.superviseur || '',
    equipement: user.equipement || '',
    nbIdentificationsTotal: user.nbIdentificationsTotal || '',
    dateDebutMission: user.dateDebutMission || '',
    // Champs transporteur
    typeVehicule: user.typeVehicule || '',
    immatriculation: user.immatriculation || '',
    capaciteChargement: user.capaciteChargement || '',
    zonesLivraison: user.zonesLivraison || '',
    // Champs grossiste / collecteur
    zoneActivite: user.zoneActivite || '',
    entrepot: user.entrepot || '',
    capaciteStockage: user.capaciteStockage || '',
    produitsPrincipaux: user.produitsPrincipaux || user.typeActivite || '',
  });

  const prefix = getNumeroPrefix(roleKey);
  const numeroId = user.numeroMarchand || user.numeroProducteur || user.numeroIdentificateur
    || `${prefix}-${new Date().getFullYear()}-${user.id ? String(user.id).slice(-5).toUpperCase() : 'XXXXX'}`;
  const dateAujourdhui = new Date().toLocaleDateString('fr-FR');

  /* ─── Handlers photo ────────────────────────── */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData(p => ({ ...p, photo: reader.result as string })); speak('Photo modifiée'); };
      reader.readAsDataURL(file);
    }
  };

  /* ─── Handlers signature ────────────────────── */
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); setIsDrawing(true);
    const { x, y } = getCoords(e);
    const ctx = signatureCanvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    const ctx = signatureCanvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(x, y); ctx.strokeStyle = cfg.color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
  };
  const stopDrawing = () => {
    if (isDrawing && signatureCanvasRef.current) setFormData(p => ({ ...p, signature: signatureCanvasRef.current!.toDataURL() }));
    setIsDrawing(false);
  };
  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) { canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); setFormData(p => ({ ...p, signature: null })); }
  };

  /* ─── Save / Cancel ─────────────────────────── */
  const handleSave = async () => {
    const updatedData = { ...user, ...formData, localisation: formData.marche || formData.commune, produitsVendus: formData.produitCommercial };
    onSave(updatedData);
    // Sauvegarder en backend si userId disponible
    if (user?.id) {
      try {
        await apiRequest<unknown>(API_URL, `/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        void speak('Fiche mise à jour et synchronisée');
      } catch (e: any) {
        console.warn('[FicheIdentificationModal] handleSave failed:', e?.message);
        void speak('Erreur de synchronisation. Fiche sauvegardée localement.');
      }
    } else {
      void speak('Fiche mise à jour');
    }
    setIsEditing(false);
  };
  const handleCancel = () => {
    setFormData({
      nom: user.nom || user.last_name || '',
      prenoms: user.prenoms || user.prenom || user.first_name || '',
      lieuNaissance: user.lieuNaissance || '',
      dateNaissance: user.dateNaissance || '',
      nationalite: user.nationalite || 'Ivoirienne',
      situationMatrimoniale: user.situationMatrimoniale || '',
      nombreEnfants: user.nombreEnfants || '',
      telephone: user.telephone || user.phone || '',
      telephoneUrgence: user.telephoneUrgence || '',
      email: user.email || '',
      lieuResidence: user.lieuResidence || '',
      commune: user.commune || user.localisation || '',
      marche: user.marche || user.market || user.localisation || '',
      emplacement: user.emplacement || '',
      box: user.box || '',
      nombreMagasin: user.nombreMagasin || '',
      nombreTable: user.nombreTable || '',
      servicesMarchand: user.servicesMarchand || '',
      produitCommercial: user.produitCommercial || user.produitsPrincipaux || user.typeActivite || '',
      secteurCommercial: user.secteurCommercial || { grossiste: false, semiGrossiste: false, detaillant: false },
      numCNI: user.numCNI || '',
      numCNPS: user.numCNPS || '',
      numCMU: user.numCMU || '',
      membreMarche: user.membreMarche || '',
      membreCooperative: user.membreCooperative || '',
      nomResponsableMarche: user.nomResponsableMarche || '',
      nomResponsableCooperative: user.nomResponsableCooperative || '',
      statutEntrepreneur: user.statutEntrepreneur || '',
      dateArrivee: user.dateArrivee || '',
      recepisse: user.recepisse || 'N0167/PA/SG/D1',
      categorie: user.categorie || '',
      boitePostale: user.boitePostale || '',
      photo: user.photo_url || user.photoUrl || user.photo || null,
      signature: null,
      zoneIntervention: user.zoneIntervention || '',
      superviseur: user.superviseur || '',
      equipement: user.equipement || '',
      nbIdentificationsTotal: user.nbIdentificationsTotal || '',
      dateDebutMission: user.dateDebutMission || '',
      typeVehicule: user.typeVehicule || '',
      immatriculation: user.immatriculation || '',
      capaciteChargement: user.capaciteChargement || '',
      zonesLivraison: user.zonesLivraison || '',
      zoneActivite: user.zoneActivite || '',
      entrepot: user.entrepot || '',
      capaciteStockage: user.capaciteStockage || '',
      produitsPrincipaux: user.produitsPrincipaux || user.typeActivite || '',
    });
    setIsEditing(false);
  };

  /* ─── Status badge ──────────────────────────── */
  const statutVal = user.statutIdentification || 'valide';
  const STATUTS: Record<string, { cls: string; label: string }> = {
    valide: { cls: 'bg-green-100 text-green-700 border-green-300',   label: 'Validé' },
    soumis: { cls: 'bg-amber-100 text-amber-700 border-amber-300',   label: 'En attente' },
    rejete: { cls: 'bg-red-100   text-red-700   border-red-300',     label: 'Rejeté' },
    draft:  { cls: 'bg-gray-100  text-gray-700  border-gray-300',    label: 'Brouillon' },
  };
  const statutCfg = STATUTS[statutVal] || STATUTS.valide;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end lg:items-center lg:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="bg-[#FAFAF8] rounded-t-3xl lg:rounded-3xl w-full max-h-[93dvh] lg:max-w-2xl overflow-hidden flex flex-col shadow-2xl"
        >
          {/* ── Header gradient ── */}
          <div className="relative flex-shrink-0 px-5 pt-4 pb-6" style={{ background: cfg.gradient }}>
            {/* Handle */}
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-white/40" />
            </div>

            {/* Actions header */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {!isEditing && (
                <>
                  <motion.button
                    onClick={() => { setIsEditing(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/25 border border-white/40 text-white font-bold text-sm"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.35)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Edit3 className="w-4 h-4" />
                    Modifier
                  </motion.button>
                  <motion.button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.35)' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.button>
                </>
              )}
            </div>

            {/* Photo + Identité */}
            <div className="flex items-end gap-5 mt-2">
              {/* Photo */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-24 h-24 rounded-3xl border-4 border-white/50 overflow-hidden flex items-center justify-center shadow-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                >
                  {formData.photo ? (
                    <img src={formData.photo} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-white/80" />
                  )}
                </div>
                {isEditing && (
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl border-2 border-white flex items-center justify-center shadow-lg"
                    style={{ background: cfg.gradient }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </motion.button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

              {/* Infos */}
              <div className="flex-1 min-w-0 pb-1">
                <h2 className="text-2xl font-black text-white leading-tight">
                  {formData.prenoms} {formData.nom}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 border border-white/40 text-white text-xs font-black">
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </span>
                  <span className={`inline-block px-3 py-1 rounded-full border-2 text-xs font-black ${statutCfg.cls}`}>
                    {statutCfg.label}
                  </span>
                  {formData.categorie && (
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black border border-white/30">
                      Cat. {formData.categorie}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bande N° fiche */}
            <motion.div
              className="mt-4 flex items-center justify-between px-4 py-2.5 rounded-2xl border border-white/30"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div>
                <p className="text-xs text-white/70 font-semibold">N° de fiche</p>
                <p className="font-black text-white text-base">{numeroId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70 font-semibold">Enregistré le</p>
                <p className="font-bold text-white text-sm">
                  {user.dateIdentification
                    ? new Date(user.dateIdentification).toLocaleDateString('fr-FR')
                    : dateAujourdhui}
                </p>
              </div>
            </motion.div>
          </div>

          {/* ── Contenu scrollable ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* IDENTITÉ - commun à tous */}
            <Section title="Identité" color={cfg.color} icon={User}>
              <FieldGrid>
                <Field label="Nom" value={formData.nom} editing={isEditing} onChange={v => setFormData(p => ({ ...p, nom: v }))} color={cfg.color} />
                <Field label="Prénoms" value={formData.prenoms} editing={isEditing} onChange={v => setFormData(p => ({ ...p, prenoms: v }))} color={cfg.color} />
                <Field label="Lieu de naissance" value={formData.lieuNaissance} editing={isEditing} onChange={v => setFormData(p => ({ ...p, lieuNaissance: v }))} color={cfg.color} />
                <Field label="Date de naissance" value={formData.dateNaissance} type="date" editing={isEditing} onChange={v => setFormData(p => ({ ...p, dateNaissance: v }))} color={cfg.color} />
                <Field label="Nationalité" value={formData.nationalite} editing={isEditing} onChange={v => setFormData(p => ({ ...p, nationalite: v }))} color={cfg.color} />
                <Field label="Situation matrimoniale" value={formData.situationMatrimoniale} editing={isEditing} onChange={v => setFormData(p => ({ ...p, situationMatrimoniale: v }))} color={cfg.color} placeholder="Ex: Marié(e), Célibataire..." />
                <Field label="Nombre d'enfants" value={formData.nombreEnfants} type="number" editing={isEditing} onChange={v => setFormData(p => ({ ...p, nombreEnfants: v }))} color={cfg.color} />
              </FieldGrid>
            </Section>

            {/* CONTACT - commun à tous */}
            <Section title="Contact" color="#2072AF" icon={Phone}>
              <FieldGrid>
                <Field label="Téléphone" value={formData.telephone} type="tel" editing={isEditing} onChange={v => setFormData(p => ({ ...p, telephone: v }))} color="#2072AF" />
                <Field label="Téléphone urgence" value={formData.telephoneUrgence} type="tel" editing={isEditing} onChange={v => setFormData(p => ({ ...p, telephoneUrgence: v }))} color="#2072AF" />
                <Field label="Email" value={formData.email} type="email" editing={isEditing} onChange={v => setFormData(p => ({ ...p, email: v }))} color="#2072AF" />
                <Field label="Lieu de résidence" value={formData.lieuResidence} editing={isEditing} onChange={v => setFormData(p => ({ ...p, lieuResidence: v }))} color="#2072AF" />
              </FieldGrid>
            </Section>

            {/* ── SECTIONS SPÉCIFIQUES PAR RÔLE ── */}

            {/* IDENTIFICATEUR : Zone & Mission */}
            {roleKey === 'identificateur' && (
              <>
                <Section title="Mission & Zone" color={cfg.color} icon={Navigation}>
                  <FieldGrid>
                    <Field label="Zone d'intervention" value={formData.zoneIntervention} editing={isEditing} onChange={v => setFormData(p => ({ ...p, zoneIntervention: v }))} color={cfg.color} placeholder="Ex: Adjamé, Cocody..." />
                    <Field label="Superviseur" value={formData.superviseur} editing={isEditing} onChange={v => setFormData(p => ({ ...p, superviseur: v }))} color={cfg.color} placeholder="Nom du superviseur" />
                    <Field label="Date de début de mission" value={formData.dateDebutMission} type="date" editing={isEditing} onChange={v => setFormData(p => ({ ...p, dateDebutMission: v }))} color={cfg.color} />
                    <Field label="Identifications réalisées" value={formData.nbIdentificationsTotal} type="number" editing={isEditing} onChange={v => setFormData(p => ({ ...p, nbIdentificationsTotal: v }))} color={cfg.color} />
                  </FieldGrid>
                </Section>
                <Section title="Équipement" color="#16A34A" icon={Tablet}>
                  <FieldGrid>
                    <Field label="Type d'équipement" value={formData.equipement} editing={isEditing} onChange={v => setFormData(p => ({ ...p, equipement: v }))} color="#16A34A" placeholder="Ex: Tablette, Smartphone..." />
                  </FieldGrid>
                </Section>
              </>
            )}

            {/* MARCHAND : Lieu d'exercice + Activité */}
            {(roleKey === 'marchand' || roleKey === '') && (
              <>
                <Section title="Lieu d'exercice" color="#16A34A" icon={MapPin}>
                  <FieldGrid cols3>
                    <Field label="Commune" value={formData.commune} editing={isEditing} onChange={v => setFormData(p => ({ ...p, commune: v }))} color="#16A34A" />
                    <Field label="Marché" value={formData.marche} editing={isEditing} onChange={v => setFormData(p => ({ ...p, marche: v }))} color="#16A34A" />
                    <Field label="Emplacement" value={formData.emplacement} editing={isEditing} onChange={v => setFormData(p => ({ ...p, emplacement: v }))} color="#16A34A" />
                    <Field label="Box" value={formData.box} editing={isEditing} onChange={v => setFormData(p => ({ ...p, box: v }))} color="#16A34A" />
                    <Field label="Nombre de magasins" value={formData.nombreMagasin} type="number" editing={isEditing} onChange={v => setFormData(p => ({ ...p, nombreMagasin: v }))} color="#16A34A" />
                    <Field label="Nombre de tables" value={formData.nombreTable} type="number" editing={isEditing} onChange={v => setFormData(p => ({ ...p, nombreTable: v }))} color="#16A34A" />
                  </FieldGrid>
                </Section>
                <Section title="Activité commerciale" color="#702963" icon={ShoppingBag}>
                  <div className="space-y-3">
                    <Field label="Services" value={formData.servicesMarchand} editing={isEditing} onChange={v => setFormData(p => ({ ...p, servicesMarchand: v }))} color="#702963" placeholder="Ex: Vente en gros, Distribution..." />
                    <div>
                      <label className="block text-xs font-black mb-2" style={{ color: '#702963' }}>Produits commerciaux</label>
                      {isEditing ? (
                        <textarea
                          value={formData.produitCommercial}
                          onChange={(e) => setFormData(p => ({ ...p, produitCommercial: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900"
                          style={{ resize: 'none', fontSize: '0.95rem' }}
                          onFocus={(e) => e.target.style.borderColor = '#702963'}
                          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                          rows={2}
                          placeholder="Ex: Riz, tomates, oignons, plantain..."
                        />
                      ) : (
                        <ValueBox value={formData.produitCommercial} color="#702963" />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-black mb-2" style={{ color: '#702963' }}>Secteur commercial</label>
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          {(['grossiste', 'semiGrossiste', 'detaillant'] as const).map(k => (
                            <label key={k} className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-2xl border-2 border-gray-200 bg-white">
                              <input
                                type="checkbox"
                                checked={formData.secteurCommercial[k] || false}
                                onChange={e => setFormData(p => ({ ...p, secteurCommercial: { ...p.secteurCommercial, [k]: e.target.checked } }))}
                                className="w-4 h-4 rounded accent-[#702963]"
                              />
                              <span className="text-sm font-semibold text-gray-700">
                                {k === 'grossiste' ? 'Grossiste' : k === 'semiGrossiste' ? 'Semi-grossiste' : 'Détaillant'}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {formData.secteurCommercial?.grossiste    && <Tag label="Grossiste"      color="#702963" />}
                          {formData.secteurCommercial?.semiGrossiste && <Tag label="Semi-grossiste" color="#702963" />}
                          {formData.secteurCommercial?.detaillant    && <Tag label="Détaillant"     color="#702963" />}
                          {!formData.secteurCommercial?.grossiste && !formData.secteurCommercial?.semiGrossiste && !formData.secteurCommercial?.detaillant && (
                            <span className="px-3 py-1.5 rounded-2xl bg-gray-100 text-gray-500 text-xs font-bold border-2 border-gray-200">Non spécifié</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* PRODUCTEUR : Exploitation agricole */}
            {roleKey === 'producteur' && (
              <Section title="Exploitation agricole" color={cfg.color} icon={Sprout}>
                <FieldGrid>
                  <Field label="Zone de production" value={formData.zoneActivite} editing={isEditing} onChange={v => setFormData(p => ({ ...p, zoneActivite: v }))} color={cfg.color} placeholder="Ex: Daloa, Yamoussoukro..." />
                  <Field label="Produits cultivés" value={formData.produitsPrincipaux} editing={isEditing} onChange={v => setFormData(p => ({ ...p, produitsPrincipaux: v }))} color={cfg.color} placeholder="Ex: Manioc, Igname, Maïs..." />
                  <Field label="Surface cultivée (ha)" value={formData.capaciteStockage} editing={isEditing} onChange={v => setFormData(p => ({ ...p, capaciteStockage: v }))} color={cfg.color} type="number" />
                  <Field label="Coopérative membre" value={formData.membreCooperative} editing={isEditing} onChange={v => setFormData(p => ({ ...p, membreCooperative: v }))} color={cfg.color} />
                </FieldGrid>
              </Section>
            )}

            {/* GROSSISTE : Entrepôt & Stock */}
            {roleKey === 'grossiste' && (
              <Section title="Activité grossiste" color={cfg.color} icon={Package}>
                <FieldGrid>
                  <Field label="Zone d'activité" value={formData.zoneActivite} editing={isEditing} onChange={v => setFormData(p => ({ ...p, zoneActivite: v }))} color={cfg.color} placeholder="Ex: Port-Bouët, Adjamé..." />
                  <Field label="Adresse de l'entrepôt" value={formData.entrepot} editing={isEditing} onChange={v => setFormData(p => ({ ...p, entrepot: v }))} color={cfg.color} />
                  <Field label="Capacité stockage" value={formData.capaciteStockage} editing={isEditing} onChange={v => setFormData(p => ({ ...p, capaciteStockage: v }))} color={cfg.color} />
                  <Field label="Produits principaux" value={formData.produitsPrincipaux} editing={isEditing} onChange={v => setFormData(p => ({ ...p, produitsPrincipaux: v }))} color={cfg.color} />
                </FieldGrid>
              </Section>
            )}

            {roleKey === 'transporteur' && (
              <Section title="Transport" color={cfg.color} icon={Truck}>
                <FieldGrid>
                  <Field label="Type véhicule" value={formData.typeVehicule} editing={isEditing} onChange={v => setFormData(p => ({ ...p, typeVehicule: v }))} color={cfg.color} />
                  <Field label="Immatriculation" value={formData.immatriculation} editing={isEditing} onChange={v => setFormData(p => ({ ...p, immatriculation: v }))} color={cfg.color} />
                  <Field label="Capacité chargement" value={formData.capaciteChargement} editing={isEditing} onChange={v => setFormData(p => ({ ...p, capaciteChargement: v }))} color={cfg.color} />
                  <Field label="Zones livraison" value={formData.zonesLivraison} editing={isEditing} onChange={v => setFormData(p => ({ ...p, zonesLivraison: v }))} color={cfg.color} />
                </FieldGrid>
              </Section>
            )}

            {roleKey === 'collecteur' && (
              <Section title="Collecte" color={cfg.color} icon={ClipboardList}>
                <FieldGrid>
                  <Field label="Zone d'activité" value={formData.zoneActivite} editing={isEditing} onChange={v => setFormData(p => ({ ...p, zoneActivite: v }))} color={cfg.color} />
                  <Field label="Entrepôt / point de collecte" value={formData.entrepot} editing={isEditing} onChange={v => setFormData(p => ({ ...p, entrepot: v }))} color={cfg.color} />
                  <Field label="Produits" value={formData.produitsPrincipaux} editing={isEditing} onChange={v => setFormData(p => ({ ...p, produitsPrincipaux: v }))} color={cfg.color} />
                </FieldGrid>
              </Section>
            )}

            <Section title="Documents officiels" color="#DC2626" icon={IdCard}>
              <FieldGrid>
                <Field label="N° CNI" value={formData.numCNI} editing={isEditing} onChange={v => setFormData(p => ({ ...p, numCNI: v }))} color="#DC2626" />
                <Field label="N° CNPS" value={formData.numCNPS} editing={isEditing} onChange={v => setFormData(p => ({ ...p, numCNPS: v }))} color="#DC2626" />
                <Field label="N° CMU" value={formData.numCMU} editing={isEditing} onChange={v => setFormData(p => ({ ...p, numCMU: v }))} color="#DC2626" />
              </FieldGrid>
            </Section>

            {roleKey === 'marchand' && (
              <Section title="Affiliations & Responsables" color="#702963" icon={Users}>
                <FieldGrid>
                  <Field label="Membre d'un marché" value={formData.membreMarche} editing={isEditing} onChange={v => setFormData(p => ({ ...p, membreMarche: v }))} color="#702963" />
                  <motion.div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Membre d&apos;une coopérative</label>
                    {isEditing ? (
                      <select
                        value={formData.membreCooperative}
                        onChange={e => {
                          const v = e.target.value;
                          const found = cooperativesListe.find(c => c.nom === v);
                          setFormData(p => ({
                            ...p,
                            membreCooperative: v,
                            nomResponsableCooperative: found?.responsable_nom || p.nomResponsableCooperative,
                          }));
                        }}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900 bg-white"
                        style={{ fontSize: '0.9rem' }}
                        onFocus={e => { e.target.style.borderColor = '#702963'; e.target.style.boxShadow = '0 0 0 3px #70296315'; }}
                        onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="">Choisir une coopérative…</option>
                        {cooperativesListe.map(c => (
                          <option key={c.id} value={c.nom}>{c.nom}</option>
                        ))}
                      </select>
                    ) : (
                      <ValueBox value={formData.membreCooperative} color="#702963" />
                    )}
                  </motion.div>
                  <Field label="Responsable du marché" value={formData.nomResponsableMarche} editing={isEditing} onChange={v => setFormData(p => ({ ...p, nomResponsableMarche: v }))} color="#702963" />
                  <Field label="Responsable coopérative" value={formData.nomResponsableCooperative} editing={isEditing} onChange={v => setFormData(p => ({ ...p, nomResponsableCooperative: v }))} color="#702963" />
                </FieldGrid>
              </Section>
            )}

            {roleKey !== 'identificateur' && (
              <Section title="Statut & Dates" color="#2072AF" icon={Briefcase}>
                <FieldGrid cols3>
                  <Field label="Statut entrepreneur" value={formData.statutEntrepreneur} editing={isEditing} onChange={v => setFormData(p => ({ ...p, statutEntrepreneur: v }))} color="#2072AF" placeholder="Auto-entrepreneur, SARL..." />
                  <Field label="Date d'arrivée" value={formData.dateArrivee} type="date" editing={isEditing} onChange={v => setFormData(p => ({ ...p, dateArrivee: v }))} color="#2072AF" />
                  <Field label="Récépissé N°" value={formData.recepisse} editing={isEditing} onChange={v => setFormData(p => ({ ...p, recepisse: v }))} color="#2072AF" />
                  <Field label="Catégorie" value={formData.categorie} editing={isEditing} onChange={v => setFormData(p => ({ ...p, categorie: v }))} color="#2072AF" />
                  <Field label="Boîte postale" value={formData.boitePostale} editing={isEditing} onChange={v => setFormData(p => ({ ...p, boitePostale: v }))} color="#2072AF" />
                </FieldGrid>
              </Section>
            )}

            <Section title="Signature" color="#DC2626" icon={FileText}>
              <div
                className="rounded-3xl border-2 p-4 overflow-hidden"
                style={{ borderColor: `${cfg.color}30`, backgroundColor: cfg.bgLight }}
              >
                {isEditing ? (
                  <div className="relative">
                    <p className="text-xs font-bold text-gray-600 mb-2">Signez dans le cadre ci-dessous</p>
                    <canvas
                      ref={signatureCanvasRef}
                      width={600}
                      height={180}
                      className="w-full rounded-2xl bg-white border-2 border-gray-200 cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {formData.signature && (
                      <motion.button
                        type="button"
                        onClick={clearSignature}
                        className="absolute top-8 right-2 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
                        whileTap={{ scale: 0.95 }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Effacer
                      </motion.button>
                    )}
                  </div>
                ) : formData.signature ? (
                  <img src={formData.signature} alt="Signature" className="w-full h-28 object-contain" />
                ) : (
                  <div className="h-28 flex items-center justify-center text-gray-400 text-sm font-semibold">Signature non disponible</div>
                )}
              </div>
            </Section>

            <motion.div
              className="flex items-center gap-4 p-4 rounded-3xl border-2"
              style={{ borderColor: `${cfg.color}30`, backgroundColor: cfg.bgLight }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ background: cfg.gradient }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <ShieldCheck className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <p className="font-black text-gray-900" style={{ fontFamily: 'Calisga Bold, sans-serif' }}>
                  Acteur certifié Jùlaba
                </p>
                <p className="text-xs text-gray-500">Fait à Abidjan le {dateAujourdhui}</p>
              </div>
            </motion.div>
          </div>

          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-gray-100 bg-white/90">
            {isEditing ? (
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2"
                  style={{ background: cfg.gradient }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-4 rounded-2xl font-bold border-2 border-gray-200 text-gray-700"
                  whileTap={{ scale: 0.97 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 border-2 border-gray-200"
                whileTap={{ scale: 0.97 }}
              >
                Fermer
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ title, color, icon: Icon, children }: { title: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode }) {
  return (
    <motion.div
      className="rounded-3xl border-2 overflow-hidden"
      style={{ borderColor: `${color}25` }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b-2" style={{ borderColor: `${color}15`, backgroundColor: `${color}08` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h4 className="font-black text-sm uppercase tracking-wide" style={{ color }}>{title}</h4>
      </div>
      <div className="p-4 bg-white">{children}</div>
    </motion.div>
  );
}

function FieldGrid({ children, cols3 }: { children: React.ReactNode; cols3?: boolean }) {
  return <div className={`grid grid-cols-1 gap-3 ${cols3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>{children}</div>;
}

function Field({ label, value, type = 'text', editing, onChange, color, placeholder }: {
  label: string; value: string; type?: string; editing: boolean;
  onChange?: (v: string) => void; color: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>
      {editing && onChange ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900 bg-white"
          style={{ fontSize: '0.9rem' }}
          onFocus={e => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${color}15`; }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
        />
      ) : (
        <ValueBox value={value} color={color} />
      )}
    </div>
  );
}

function ValueBox({ value, color }: { value: string; color: string }) {
  return (
    <div
      className="px-4 py-3 rounded-2xl border-2 min-h-[46px] flex items-center"
      style={{ borderColor: `${color}15`, backgroundColor: `${color}06` }}
    >
      <p className="text-sm font-semibold text-gray-900">{value || <span className="text-gray-400 italic">Non renseigné</span>}</p>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-3 py-1.5 rounded-2xl text-xs font-bold border-2" style={{ backgroundColor: `${color}12`, color, borderColor: `${color}30` }}>
      {label}
    </span>
  );
}