import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Truck, MapPin, Clock, CheckCircle, AlertTriangle,
  User, Package, Phone, Navigation, BarChart3, Search,
  Play, Pause, RefreshCw, XCircle,
} from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp, hoverGlow } from './bo-animations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

type CourseStatut = 'en_attente' | 'en_cours' | 'livree' | 'annulee';
type LivreurStatut = 'actif' | 'inactif' | 'en_course';

interface Course {
  id: string;
  commande: string;
  expediteur: string;
  destinataire: string;
  livreur: string | null;
  depart: string;
  arrivee: string;
  statut: CourseStatut;
  dateCreation: string;
  tempsEstime: number;
}

interface Livreur {
  id: string;
  nom: string;
  telephone: string;
  zone: string;
  statut: LivreurStatut;
  coursesAujourdhui: number;
  noteMoyenne: number;
  tempsMoyen: number;
}

const STATUT_COURSE: Record<CourseStatut, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB' },
  en_cours: { label: 'En cours', color: '#3B82F6', bg: '#EFF6FF' },
  livree: { label: 'Livrée', color: '#10B981', bg: '#F0FDF4' },
  annulee: { label: 'Annulée', color: '#EF4444', bg: '#FEF2F2' },
};

export function BOLivraison() {
  const { refreshTransactions } = useBackOffice();
  const [tab, setTab] = useState<'courses' | 'livreurs' | 'stats'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [tempsParZone, setTempsParZone] = useState<Array<{ zone: string; temps: number }>>([]);

  useEffect(() => {
    void refreshTransactions();
  }, [refreshTransactions]);

  React.useEffect(() => {
    fetch(`${API_URL}/admin/livraison`, {
      credentials: 'include',
    })
      .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
      .then(d => {
        const courses = Array.isArray(d?.courses) ? d.courses : Array.isArray(d) ? d : [];
        if (courses.length === 0) toast.info('Aucune livraison disponible');
        setCourses(courses);
        const livraisons = Array.isArray(d?.livraisons) ? d.livraisons : [];
        const mapped: Course[] = livraisons.map((l: any) => ({
            id: l.id,
            commande: l.commande_id || l.commandeId || l.id,
            expediteur: l.expediteur || '',
            destinataire: l.destinataire || '',
            livreur: typeof l.livreur === 'string' ? l.livreur : l.livreur?.nom || null,
            depart: l.depart || l.localite || '',
            arrivee: l.arrivee || l.destination || '',
            statut: l.statut || 'en_attente',
            dateCreation: l.created_at || l.createdAt || '',
            tempsEstime: Number(l.temps_estime || l.tempsEstime || l.duree_minutes || 0),
          }));
        setCourses(mapped);

        const byLivreur = new Map<string, Livreur>();
        livraisons.forEach((l: any) => {
          const livreurRaw = l.livreur;
          const nom = typeof livreurRaw === 'string' ? livreurRaw.trim() : String(livreurRaw?.nom || '').trim();
          if (!nom) return;
          const current = byLivreur.get(nom);
          const statutLivraison = String(l.statut || '').toLowerCase();
          const statut: LivreurStatut =
            statutLivraison === 'en_cours' || statutLivraison === 'en_livraison' ? 'en_course' : 'actif';
          const temps = Number(l.temps_estime || l.tempsEstime || l.duree_minutes || 0);
          if (!current) {
            byLivreur.set(nom, {
              id: String(l.livreur_id || l.livreurId || nom),
              nom,
              telephone: String(
                (typeof livreurRaw === 'object' ? livreurRaw?.telephone || livreurRaw?.phone : null) ||
                l.livreur_telephone ||
                ''
              ),
              zone: String(l.region || l.zone || l.localite || ''),
              statut,
              coursesAujourdhui: 1,
              noteMoyenne: Number(
                (typeof livreurRaw === 'object' ? livreurRaw?.note_moyenne || livreurRaw?.noteMoyenne : null) || 0
              ),
              tempsMoyen: temps > 0 ? temps : 0,
            });
            return;
          }
          current.coursesAujourdhui += 1;
          if (temps > 0) {
            const total = current.tempsMoyen * (current.coursesAujourdhui - 1) + temps;
            current.tempsMoyen = Math.round(total / current.coursesAujourdhui);
          }
          if (current.statut !== 'en_course' && statut === 'en_course') {
            current.statut = 'en_course';
          }
        });
        setLivreurs(Array.from(byLivreur.values()));

        const zoneMap = new Map<string, { total: number; count: number }>();
        livraisons.forEach((l: any) => {
          const zone = String(l.region || l.zone || l.localite || l.depart || '').trim();
          const temps = Number(l.temps_estime || l.tempsEstime || l.duree_minutes || 0);
          if (!zone || !Number.isFinite(temps) || temps <= 0) return;
          const prev = zoneMap.get(zone) || { total: 0, count: 0 };
          prev.total += temps;
          prev.count += 1;
          zoneMap.set(zone, prev);
        });
        setTempsParZone(
          Array.from(zoneMap.entries()).map(([zone, agg]) => ({
            zone,
            temps: Math.round(agg.total / agg.count),
          })),
        );
      })
      .catch(() => { toast.error('Erreur chargement livraison'); });
  }, []);
  const [search, setSearch] = useState('');

  const countsCourses = {
    total: courses.length,
    enAttente: courses.filter(c => c.statut === 'en_attente').length,
    livrees: courses.filter(c => c.statut === 'livree').length,
    annulees: courses.filter(c => c.statut === 'annulee').length,
  };

  const handleAssign = async (courseId: string, livreurNom: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/livraison/${courseId}/assign`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ livreur: livreurNom }),
      });
      if (!res.ok) throw new Error('Erreur assignation livreur');
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, livreur: livreurNom, statut: 'en_cours' as const } : c));
      toast.success(`Course assignee a ${livreurNom}`);
    } catch {
      toast.error('Impossible d\'assigner le livreur');
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Livraison</h1>
        <p className="text-sm text-gray-500 mt-0.5">Suivi des courses, livreurs et performances</p>
      </motion.div>

      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="Total courses" animatedTarget={countsCourses.total} icon={Truck} color="#712864" />
        <UniversalKPI label="En attente" animatedTarget={countsCourses.enAttente} icon={Clock} color="#F59E0B" />
        <UniversalKPI label="Livrées" animatedTarget={countsCourses.livrees} icon={CheckCircle} color="#16a34a" />
        <UniversalKPI label="Annulées" animatedTarget={countsCourses.annulees} icon={XCircle} color="#dc2626" />
      </KPIGrid>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ key: 'courses', label: 'Courses' }, { key: 'livreurs', label: 'Livreurs' }, { key: 'stats', label: 'Statistiques' }].map(t => (
          <motion.button key={t.key} onClick={() => setTab(t.key as any)} whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 rounded-2xl border-2 text-sm font-bold"
            style={tab === t.key ? { backgroundColor: BO_PRIMARY, color: '#fff', borderColor: BO_PRIMARY } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
            {t.label}
          </motion.button>
        ))}
      </div>

      {tab === 'courses' && (
        <div className="space-y-3">
          {courses.map((c, i) => {
            const statut = STATUT_COURSE[c.statut];
            return (
              <motion.div key={c.id} {...fadeInUp(i * 0.04)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4" {...hoverGlow(BO_PRIMARY)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statut.bg }}>
                    <Truck className="w-5 h-5" style={{ color: statut.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-xs text-gray-600">{c.commande}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statut.bg, color: statut.color }}>{statut.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      <MapPin className="w-3 h-3 text-green-500" />
                      <span>{c.depart}</span>
                      <Navigation className="w-3 h-3 text-gray-400" />
                      <span>{c.arrivee}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{c.expediteur} → {c.destinataire}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{c.tempsEstime} min</span>
                    </div>
                    {c.livreur && <p className="text-xs font-bold mt-1" style={{ color: BO_PRIMARY }}>Livreur: {c.livreur}</p>}
                  </div>
                  {c.statut === 'en_attente' && (
                    <motion.button
                      onClick={() => {
                        const selected = livreurs.find(l => l.statut === 'actif')?.nom || '';
                        if (!selected) return;
                        handleAssign(c.id, selected);
                      }}
                      disabled={!livreurs.some(l => l.statut === 'actif')}
                      whileTap={{ scale: 0.95 }} className="flex items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold text-white" style={{ backgroundColor: BO_PRIMARY }}>
                      <Play className="w-3 h-3" /> {livreurs.some(l => l.statut === 'actif') ? 'Assigner' : 'Aucun livreur'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === 'livreurs' && (
        <div className="space-y-3">
          {livreurs.map((l, i) => {
            const statutColor = l.statut === 'actif' ? '#10B981' : l.statut === 'en_course' ? '#3B82F6' : '#6B7280';
            const statutLabel = l.statut === 'actif' ? 'Disponible' : l.statut === 'en_course' ? 'En course' : 'Inactif';
            return (
              <motion.div key={l.id} {...fadeInUp(i * 0.06)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4" {...hoverGlow(BO_PRIMARY)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${statutColor}15` }}>
                    <User className="w-6 h-6" style={{ color: statutColor }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-gray-900">{l.nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statutColor}15`, color: statutColor }}>{statutLabel}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{l.telephone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.zone}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-sm font-black text-gray-900">{l.coursesAujourdhui} courses</p>
                    <p className="text-xs text-gray-500">Moy. {l.tempsMoyen} min</p>
                    <p className="text-xs font-bold text-amber-500">Note: {l.noteMoyenne}/5</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === 'stats' && (
        <motion.div {...fadeInUp(0.2)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Temps moyen de livraison par zone (minutes)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Array.isArray(tempsParZone) ? tempsParZone : []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="zone" fontSize={11} tick={{ fill: '#6B7280' }} />
              <YAxis fontSize={11} tick={{ fill: '#6B7280' }} unit=" min" domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '12px' }} formatter={(v: any) => `${v} min`} />
              <Bar dataKey="temps" fill={`${BO_PRIMARY}90`} radius={[8, 8, 0, 0]} name="Temps moyen" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}