import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag, Store, Package, Eye,
  CheckCircle2, XCircle, Ban, Clock, TrendingUp,
  Star, MapPin,
} from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp } from './bo-animations';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { UniversalRechercheBO } from './universal/UniversalRechercheBO';
import { UniversalFiltreBO } from './universal/UniversalFiltreBO';
import type { FilterGroup, FilterValue } from './universal/UniversalFiltreBO';
import { UniversalCardBO, type SubtitlePart } from './UniversalCardBO';
import { UniversalTabsBO, type TabItem } from './universal/UniversalTabsBO';

type ProduitStatut = 'publie' | 'en_attente' | 'rejete' | 'suspendu' | 'inactif';
type BoutiqueStatut = 'active' | 'suspendue' | 'en_validation';

interface Produit {
  id: string;
  nom: string;
  vendeur: string;
  vendeurType: string;
  prix: number;
  categorie: string;
  region: string;
  statut: ProduitStatut;
  datePublication: string;
  vues: number;
  commandes: number;
}

interface Boutique {
  id: string;
  nom: string;
  proprietaire: string;
  region: string;
  nbProduits: number;
  chiffreAffaires: number;
  statut: BoutiqueStatut;
  note: number;
}

const STATUT_PRODUIT: Record<ProduitStatut, { label: string; color: string; bg: string }> = {
  publie: { label: 'Publié', color: '#10B981', bg: '#F0FDF4' },
  en_attente: { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB' },
  rejete: { label: 'Rejeté', color: '#EF4444', bg: '#FEF2F2' },
  suspendu: { label: 'Suspendu', color: '#6B7280', bg: '#F9FAFB' },
  inactif: { label: 'Inactif', color: '#9CA3AF', bg: '#F3F4F6' },
};

const TAB_CONFIG: TabItem[] = [
  { id: 'produits', label: 'Produits', icon: Package },
  { id: 'boutiques', label: 'Boutiques', icon: Store },
];

export function BOMarketplace() {
  const [tab, setTab] = useState<'produits' | 'boutiques'>('produits');
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState<FilterValue>({});
  const [produits, setProduits] = useState<Produit[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);

  const filterGroups = useMemo<FilterGroup[]>(() => [
    {
      id: 'statut',
      label: 'Statut',
      type: 'options',
      options: [
        { value: 'tous', label: 'Tous statuts' },
        ...Object.entries(STATUT_PRODUIT).map(([key, value]) => ({ value: key, label: value.label })),
      ],
    },
  ], []);

  const filterStatut = (filterValue.statut as string) || 'tous';
  const handleResetFilters = () => setFilterValue({});

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetch(`${API_URL}/publications/admin/all`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isMountedRef.current || controller.signal.aborted) return;
        const pubs = data?.publications || data?.data || [];
        if (pubs.length > 0) {
          const mapStatut = (statut: string): ProduitStatut => {
            if (statut === 'active' || statut === 'disponible') return 'publie';
            if (statut === 'inactive') return 'inactif';
            if (statut === 'suspendu') return 'suspendu';
            if (statut === 'rejete') return 'rejete';
            return 'en_attente';
          };
          const mapped: Produit[] = pubs.map((publication: Record<string, unknown>) => ({
            id: String(publication.id),
            nom: String(publication.produit || publication.nom || ''),
            vendeur: `${String(publication.producteur_prenom || '')} ${String(publication.producteur_nom || '')}`.trim() || 'Producteur',
            vendeurType: 'producteur',
            prix: Number(publication.prix_unitaire || 0),
            categorie: String(publication.categorie || 'Autre'),
            region: String(publication.localisation || 'CI'),
            statut: mapStatut(String(publication.statut || '')),
            datePublication: publication.created_at ? new Date(String(publication.created_at)).toLocaleDateString('fr-FR') : '',
            vues: Number(publication.vues || 0),
            commandes: Number(publication.commandes || 0),
          }));
          const actives = mapped.filter((produit) => produit.statut !== 'inactif' && produit.statut !== 'suspendu' && produit.statut !== 'rejete');
          if (!isMountedRef.current) return;
          setProduits(actives);

          const boutiqueMap: Record<string, Boutique> = {};
          pubs.forEach((publication: Record<string, unknown>) => {
            const userId = String(publication.user_id);
            if (!boutiqueMap[userId]) {
              boutiqueMap[userId] = {
                id: userId,
                nom: `${String(publication.producteur_prenom || '')} ${String(publication.producteur_nom || '')}`.trim() || 'Vendeur',
                proprietaire: `${String(publication.producteur_prenom || '')} ${String(publication.producteur_nom || '')}`.trim(),
                region: String(publication.localisation || 'CI'),
                nbProduits: 0,
                chiffreAffaires: 0,
                statut: 'active' as BoutiqueStatut,
                note: 0,
              };
            }
            boutiqueMap[userId].nbProduits += 1;
            boutiqueMap[userId].chiffreAffaires += Number(publication.prix_unitaire || 0) * Number(publication.commandes || 0);
          });
          if (!isMountedRef.current) return;
          setBoutiques(Object.values(boutiqueMap));
        }
      })
      .catch((error: { name?: string }) => {
        if (error?.name === 'AbortError') return;
        if (!isMountedRef.current) return;
        toast.error('Erreur chargement marketplace');
      });

    return () => {
      isMountedRef.current = false;
      controller.abort();
    };
  }, []);

  const filteredProduits = produits.filter((produit) => {
    if (search && !produit.nom.toLowerCase().includes(search.toLowerCase()) && !produit.vendeur.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatut !== 'tous' && produit.statut !== filterStatut) return false;
    return true;
  });

  const handleProduitAction = async (id: string, action: 'valider' | 'rejeter' | 'suspendre') => {
    const statutMap: Record<string, ProduitStatut> = { valider: 'publie', rejeter: 'rejete', suspendre: 'suspendu' };
    const apiStatutMap: Record<'valider' | 'rejeter' | 'suspendre', string> = {
      valider: 'disponible',
      rejeter: 'rejete',
      suspendre: 'suspendu',
    };
    try {
      const response = await fetch(`${API_URL}/publications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: apiStatutMap[action] }),
      });
      if (!response.ok) throw new Error('Erreur moderation publication');
      setProduits((previous) => previous.map((produit) => (produit.id === id ? { ...produit, statut: statutMap[action] } : produit)));
      toast.success(`Produit ${action === 'valider' ? 'publié' : action === 'rejeter' ? 'rejeté' : 'suspendu'}`);
    } catch {
      toast.error('Impossible de mettre à jour la publication');
    }
  };

  const counts = {
    publie: produits.filter((produit) => produit.statut === 'publie').length,
    en_attente: produits.filter((produit) => produit.statut === 'en_attente').length,
    boutiques: boutiques.length,
    ca_total: produits.reduce((accumulator, produit) => accumulator + produit.commandes * produit.prix, 0),
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestion des produits, boutiques et commandes</p>
      </motion.div>

      {/* KPIs */}
      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI
          label="Produits publiés"
          animatedTarget={counts.publie}
          icon={Package}
          color="#16a34a"
        />
        <UniversalKPI
          label="En attente"
          animatedTarget={counts.en_attente}
          icon={Clock}
          color="#f59e0b"
        />
        <UniversalKPI
          label="Boutiques actives"
          animatedTarget={counts.boutiques}
          icon={Store}
          color="#2072AF"
        />
        <UniversalKPI
          label="CA total"
          animatedTarget={counts.ca_total}
          suffix="FCFA"
          icon={TrendingUp}
          color="#C66A2C"
        />
      </KPIGrid>

      <div className="mb-4">
        <UniversalTabsBO
          tabs={TAB_CONFIG}
          activeId={tab}
          onChange={(id) => setTab(id as 'produits' | 'boutiques')}
          orientation="horizontal"
        />
      </div>

      {tab === 'produits' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'nowrap', position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <UniversalRechercheBO
              placeholder="Rechercher produit ou vendeur..."
              debounceMs={200}
              onChange={(query) => setSearch(query)}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <UniversalFiltreBO
              groups={filterGroups}
              value={filterValue}
              onChange={setFilterValue}
              onReset={handleResetFilters}
              triggerLabel="Filtres"
            />
          </div>
        </div>
      )}

      {tab === 'produits' && (
        <div className="space-y-3">
          {filteredProduits.map((produit, index) => {
            const statut = STATUT_PRODUIT[produit.statut];
            const actions = produit.statut === 'en_attente'
              ? [
                { icon: CheckCircle2, label: 'Valider', onClick: () => { void handleProduitAction(produit.id, 'valider'); } },
                { icon: XCircle, label: 'Rejeter', onClick: () => { void handleProduitAction(produit.id, 'rejeter'); } },
              ]
              : produit.statut === 'publie'
                ? [
                  { icon: Ban, label: 'Suspendre', onClick: () => { void handleProduitAction(produit.id, 'suspendre'); } },
                ]
                : undefined;

            return (
              <UniversalCardBO
                key={produit.id}
                index={index}
                leading={{
                  type: 'icon',
                  icon: Package,
                  bgColor: `${BO_PRIMARY}15`,
                  iconColor: BO_PRIMARY,
                  iconAnimation: 'float',
                }}
                title={produit.nom}
                titleBadges={[{ label: statut.label, bg: statut.bg, text: statut.color }]}
                subtitleParts={[
                  { label: produit.vendeur, bold: true },
                  { icon: MapPin, label: produit.region },
                  { label: `${(produit.prix || 0).toLocaleString('fr-FR')} FCFA`, color: BO_PRIMARY, bold: true },
                  { icon: Eye, label: `${produit.vues} vues` },
                  { icon: ShoppingBag, label: `${produit.commandes} commandes` },
                  { label: produit.datePublication },
                ]}
                actions={actions}
              />
            );
          })}
        </div>
      )}

      {tab === 'boutiques' && (
        <div className="space-y-3">
          {boutiques.map((boutique, index) => {
            const statutConfig = boutique.statut === 'active'
              ? { label: 'Active', bg: '#DCFCE7', text: '#15803D' }
              : boutique.statut === 'en_validation'
                ? { label: 'En validation', bg: '#FEF3C7', text: '#B45309' }
                : { label: 'Suspendue', bg: '#F3F4F6', text: '#6B7280' };

            const subtitleParts: SubtitlePart[] = [
              { label: boutique.proprietaire },
              { icon: MapPin, label: boutique.region },
              { label: `${boutique.nbProduits} produits` },
              { label: `${(boutique.chiffreAffaires / 1000).toFixed(0)}k FCFA`, color: BO_PRIMARY, bold: true },
            ];
            if (boutique.note > 0) {
              subtitleParts.push({ icon: Star, label: String(boutique.note), color: '#F59E0B' });
            }

            return (
              <UniversalCardBO
                key={boutique.id}
                index={index}
                leading={{
                  type: 'icon',
                  icon: Store,
                  bgColor: '#EFF6FF',
                  iconColor: '#3B82F6',
                  iconAnimation: 'float',
                }}
                title={boutique.nom}
                titleBadges={[{ label: statutConfig.label, bg: statutConfig.bg, text: statutConfig.text }]}
                subtitleParts={subtitleParts}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
