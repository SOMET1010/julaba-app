import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  MapPin,
  Snowflake,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  boGetTransactions,
  boGetTransactionsByActeurGeo,
  boGetTransactionsGeoAggregation,
  type Transaction,
  type TransactionsActeurGeoItem,
  type TransactionsGeoAggregationItem,
} from '../../services/backoffice-api';
import { BO_PRIMARY } from './bo-theme';
import { UniversalDrawerBO } from './universal/UniversalDrawerBO';
import { UniversalSectionCardBO } from './universal/UniversalSectionCardBO';
import { CIV_NATIONAL_CENTER, getRegionCenter } from './utils/civ-regions-centers';

const ROLE_COLORS: Record<string, string> = {
  marchand: '#C46210',
  producteur: '#2E8B57',
  cooperative: '#2072AF',
  identificateur: '#7C3AED',
};

const ROLE_LABELS: Record<string, string> = {
  marchand: 'Marchand',
  producteur: 'Producteur',
  cooperative: 'Cooperative',
  identificateur: 'Identificateur',
};

const getIntensityColor = (volume: number): { fill: string; stroke: string; label: string } => {
  if (volume >= 100000) return { fill: '#A32D2D', stroke: '#7F1D1D', label: 'Eleve' };
  if (volume >= 30000) return { fill: '#D97706', stroke: '#92400E', label: 'Moyen' };
  return { fill: '#16A34A', stroke: '#15803D', label: 'Faible' };
};

const getCircleRadius = (volume: number): number => {
  const min = 8000;
  const max = 50000;
  if (volume <= 0) return min;
  return min + Math.min(max - min, Math.log10(volume) * 10000);
};

interface BOSupervisionMapProps {
  dateFrom?: string;
  dateTo?: string;
  periodLabel: string;
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function optionalString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeDomId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getStableOffset(userId: string): { lat: number; lng: number } {
  const hash = Array.from(userId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    lat: ((hash % 100) - 50) * 0.001,
    lng: (((hash * 7) % 100) - 50) * 0.001,
  };
}

function getTransactionTitle(tx: Transaction): string {
  return optionalString(tx.libelle) || optionalString(tx.produit) || optionalString(tx.description) || 'Transaction';
}

function getTransactionDate(tx: Transaction): string {
  const value = optionalString(tx.created_at) || optionalString(tx.date);
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
}

export const BOSupervisionMap: React.FC<BOSupervisionMapProps> = ({ dateFrom, dateTo, periodLabel }) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<typeof L.map> | null>(null);
  const heatLayerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);
  const markersLayerRef = useRef<ReturnType<typeof L.layerGroup> | null>(null);

  const [geoRegions, setGeoRegions] = useState<TransactionsGeoAggregationItem[]>([]);
  const [geoActeurs, setGeoActeurs] = useState<TransactionsActeurGeoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActeur, setSelectedActeur] = useState<TransactionsActeurGeoItem | null>(null);
  const [acteurTransactions, setActeurTransactions] = useState<Transaction[]>([]);
  const [acteurTxLoading, setActeurTxLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView(
      [CIV_NATIONAL_CENTER.lat, CIV_NATIONAL_CENTER.lng],
      CIV_NATIONAL_CENTER.zoom,
    );
    mapInstanceRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO',
      maxZoom: 19,
    }).addTo(map);

    heatLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    const invalidateTimer = window.setTimeout(() => {
      if (mapInstanceRef.current === map) map.invalidateSize();
    }, 0);

    return () => {
      window.clearTimeout(invalidateTimer);
      if (mapInstanceRef.current === map) {
        map.remove();
        mapInstanceRef.current = null;
      }
      heatLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const filters = { date_from: dateFrom, date_to: dateTo };
        const [regions, acteurs] = await Promise.all([
          boGetTransactionsGeoAggregation(filters, controller.signal),
          boGetTransactionsByActeurGeo(filters, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setGeoRegions(regions);
        setGeoActeurs(acteurs);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') toast.error('Erreur chargement carte');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!heatLayerRef.current) return;
    heatLayerRef.current.clearLayers();

    geoRegions.forEach((region) => {
      const center = getRegionCenter(region.region);
      if (!center) return;

      const intensity = getIntensityColor(region.volume);
      const circle = L.circle([center.lat, center.lng], {
        radius: getCircleRadius(region.volume),
        color: intensity.stroke,
        fillColor: intensity.fill,
        fillOpacity: 0.15,
        weight: 1.5,
        opacity: 0.4,
      });

      circle.bindTooltip(
        `<strong>${escapeHtml(region.region)}</strong><br/>${region.count} transaction(s)<br/>Volume : ${region.volume.toLocaleString('fr-FR')} FCFA<br/>Niveau : ${intensity.label}`,
        { direction: 'top', sticky: true },
      );
      circle.addTo(heatLayerRef.current!);
    });
  }, [geoRegions]);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    geoActeurs.forEach((acteur) => {
      const center = getRegionCenter(acteur.region);
      if (!center) return;

      const offset = getStableOffset(acteur.userId);
      const color = ROLE_COLORS[acteur.role] || BO_PRIMARY;
      const letter = (acteur.fullName || '?').charAt(0).toUpperCase();
      const buttonId = `bo-supervision-acteur-${safeDomId(acteur.userId)}`;
      const roleLabel = ROLE_LABELS[acteur.role] || acteur.role;

      let strokeColor = '#FFFFFF';
      let strokeWidth = 2;
      if (acteur.litiges > 0) {
        strokeColor = '#A32D2D';
        strokeWidth = 3;
      } else if (acteur.gelees > 0) {
        strokeColor = '#2563EB';
        strokeWidth = 3;
      }

      const icon = L.divIcon({
        className: 'bo-supervision-marker',
        html: `
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:${color};color:white;
            display:flex;align-items:center;justify-content:center;
            font-weight:700;font-size:13px;
            border:${strokeWidth}px solid ${strokeColor};
            box-shadow:0 2px 6px rgba(0,0,0,0.2);
            cursor:pointer;
          ">${escapeHtml(letter)}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([center.lat + offset.lat, center.lng + offset.lng], { icon });
      marker.bindPopup(
        `
          <div style="min-width:200px;font-family:system-ui,sans-serif;">
            <div style="font-weight:600;font-size:14px;color:#1F1F1F;margin-bottom:4px;">${escapeHtml(acteur.fullName)}</div>
            <div style="display:inline-block;padding:2px 8px;background:${color}22;color:${color};border-radius:8px;font-size:11px;font-weight:500;margin-bottom:8px;">
              ${escapeHtml(roleLabel)}
            </div>
            <div style="font-size:12px;color:#4B5563;margin-bottom:2px;"><strong>${acteur.count}</strong> transaction(s)</div>
            <div style="font-size:12px;color:#4B5563;margin-bottom:8px;">Volume : <strong>${acteur.volume.toLocaleString('fr-FR')} FCFA</strong></div>
            ${acteur.litiges > 0 ? `<div style="font-size:11px;color:#A32D2D;margin-bottom:4px;">${acteur.litiges} litige(s)</div>` : ''}
            ${acteur.gelees > 0 ? `<div style="font-size:11px;color:#2563EB;margin-bottom:4px;">${acteur.gelees} gelee(s)</div>` : ''}
            <button id="${buttonId}" style="margin-top:6px;padding:6px 12px;background:#5B5248;color:white;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;width:100%;">
              Voir plus
            </button>
          </div>
        `,
        { maxWidth: 250 },
      );

      marker.on('popupopen', () => {
        const button = document.getElementById(buttonId);
        if (!button) return;
        button.onclick = () => {
          setSelectedActeur(acteur);
          marker.closePopup();
        };
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [geoActeurs]);

  useEffect(() => {
    if (!selectedActeur) {
      setActeurTransactions([]);
      return;
    }

    const controller = new AbortController();

    const fetchActeurTransactions = async () => {
      setActeurTxLoading(true);
      try {
        const res = await boGetTransactions({
          user_id: selectedActeur.userId,
          date_from: dateFrom,
          date_to: dateTo,
          limit: 50,
        });
        if (controller.signal.aborted) return;
        setActeurTransactions(res.data);
      } catch (error) {
        if ((error as { name?: string })?.name !== 'AbortError') toast.error('Erreur chargement transactions');
      } finally {
        if (!controller.signal.aborted) setActeurTxLoading(false);
      }
    };

    void fetchActeurTransactions();
    return () => controller.abort();
  }, [selectedActeur, dateFrom, dateTo]);

  const topRegions = useMemo(() => [...geoRegions].sort((a, b) => b.volume - a.volume).slice(0, 5), [geoRegions]);
  const alertes = useMemo(() => geoActeurs.filter((acteur) => acteur.litiges > 0 || acteur.gelees > 0), [geoActeurs]);
  const acteursActifs = useMemo(() => [...geoActeurs].sort((a, b) => b.count - a.count).slice(0, 5), [geoActeurs]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 relative min-w-0">
        <div
          ref={mapRef}
          style={{ height: 600, borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}
          aria-label="Carte des transactions"
        />

        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl border border-gray-200 p-3 text-xs z-[1000]">
          <div className="font-semibold text-gray-900 mb-2">Volume par zone</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full bg-[#A32D2D]" />
            <span className="text-gray-600">Eleve</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-[#D97706]" />
            <span className="text-gray-600">Moyen</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
            <span className="text-gray-600">Faible</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-white border-2 border-[#A32D2D]" />
              <span className="text-gray-600">Litige</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white border-2 border-[#2563EB]" />
              <span className="text-gray-600">Gelee</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[1000] rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-gray-600 text-sm">Chargement de la carte...</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full lg:w-72 flex flex-col gap-3">
        <UniversalSectionCardBO title="Top regions" icon={MapPin} variant="default">
          {topRegions.length === 0 ? (
            <div className="text-xs text-gray-500 py-3 text-center">Aucune donnee</div>
          ) : (
            <ul className="space-y-2">
              {topRegions.map((region, index) => (
                <li key={region.region} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{index + 1}</span>
                    <span className="font-medium text-gray-900 truncate">{region.region}</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{region.count} tx</span>
                </li>
              ))}
            </ul>
          )}
        </UniversalSectionCardBO>

        <UniversalSectionCardBO title={`Alertes (${alertes.length})`} icon={AlertTriangle} variant={alertes.length > 0 ? 'warning' : 'default'}>
          {alertes.length === 0 ? (
            <div className="text-xs text-gray-500 py-3 text-center">Aucune alerte active</div>
          ) : (
            <ul className="space-y-2">
              {alertes.slice(0, 5).map((acteur) => (
                <li key={acteur.userId} className="text-xs">
                  <button type="button" onClick={() => setSelectedActeur(acteur)} className="w-full text-left hover:bg-gray-50 rounded-lg p-2 -mx-2">
                    <div className="font-medium text-gray-900 truncate">{acteur.fullName}</div>
                    <div className="text-gray-500 mt-0.5 flex gap-2">
                      {acteur.litiges > 0 && <span className="text-[#A32D2D]">{acteur.litiges} litige(s)</span>}
                      {acteur.gelees > 0 && <span className="text-[#2563EB]">{acteur.gelees} gelee(s)</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </UniversalSectionCardBO>

        <UniversalSectionCardBO title="Acteurs actifs" icon={Users} variant="default">
          {acteursActifs.length === 0 ? (
            <div className="text-xs text-gray-500 py-3 text-center">Aucune activite</div>
          ) : (
            <ul className="space-y-2">
              {acteursActifs.map((acteur) => (
                <li key={acteur.userId} className="text-xs">
                  <button type="button" onClick={() => setSelectedActeur(acteur)} className="w-full text-left hover:bg-gray-50 rounded-lg p-2 -mx-2">
                    <div className="font-medium text-gray-900 truncate">{acteur.fullName}</div>
                    <div className="text-gray-500 mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {acteur.count} tx · {acteur.region}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </UniversalSectionCardBO>
      </div>

      <UniversalDrawerBO
        open={selectedActeur !== null}
        onClose={() => setSelectedActeur(null)}
        width={480}
        ariaLabel="Detail acteur"
        title={
          selectedActeur ? (
            <div>
              <div className="text-lg font-black text-gray-900">{selectedActeur.fullName}</div>
              <div className="text-sm text-gray-500">
                {ROLE_LABELS[selectedActeur.role] || selectedActeur.role} · {selectedActeur.region}
              </div>
            </div>
          ) : (
            'Detail acteur'
          )
        }
      >
        {selectedActeur && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Transactions</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{selectedActeur.count}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Volume</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{selectedActeur.volume.toLocaleString('fr-FR')}</div>
                <div className="text-xs text-gray-500 mt-0.5">FCFA</div>
              </div>
            </div>

            {(selectedActeur.litiges > 0 || selectedActeur.gelees > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-amber-800 mb-2">Alertes en cours</div>
                {selectedActeur.litiges > 0 && (
                  <div className="text-xs text-[#A32D2D] flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> {selectedActeur.litiges} transaction(s) en litige
                  </div>
                )}
                {selectedActeur.gelees > 0 && (
                  <div className="text-xs text-[#2563EB] flex items-center gap-2 mt-1">
                    <Snowflake className="w-3 h-3" /> {selectedActeur.gelees} transaction(s) gelee(s)
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Transactions sur la periode ({periodLabel})
              </div>
              {acteurTxLoading ? (
                <div className="text-xs text-gray-500 py-4 text-center">Chargement...</div>
              ) : acteurTransactions.length === 0 ? (
                <div className="text-xs text-gray-500 py-4 text-center">Aucune transaction</div>
              ) : (
                <ul className="space-y-1.5 max-h-96 overflow-y-auto">
                  {acteurTransactions.map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">{getTransactionTitle(tx)}</div>
                        <div className="text-xs text-gray-500">{getTransactionDate(tx)}</div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 ml-2 flex-shrink-0">
                        {parseAmount(tx.montant ?? tx.amount).toLocaleString('fr-FR')} FCFA
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate(`/backoffice/acteurs/${selectedActeur.userId}`)}
              className="w-full flex items-center justify-center gap-2 bg-[#5B5248] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#4A4338]"
            >
              <ExternalLink className="w-4 h-4" />
              Voir le profil complet
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </UniversalDrawerBO>

    </div>
  );
};

export default BOSupervisionMap;
