import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Home, MapPin, TrendingUp, Users } from 'lucide-react';
import type { BOZone } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_TINT } from './bo-theme';
import { CIV_NATIONAL_CENTER } from './utils/civ-regions-centers';
import { CIV_REGIONS_GEOJSON, type CIVRegionProperties } from './utils/civ-regions-geojson';
import { civDistrictForSubregion } from './utils/civ-gadm-district-mapping';

export interface BOZonesMapProps {
  zones: BOZone[];
  /** Filtre `filterValue.region` côté parent (district ou sous-région). */
  mapRegionFilter: string | null;
  onZoneSelect: (zone: BOZone) => void;
  onRegionDetail: (regionName: string) => void;
  onMapRegionFilterChange: (regionKey: string | null) => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const REGION_NON_DEFINIE_MAP = 'Région non définie';

function isLegacyPseudoRegionMap(raw: string): boolean {
  const n = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const legacyInterior = String.fromCodePoint(105, 110, 116, 101, 114, 105, 101, 117, 114);
  return n === legacyInterior || n === 'autre';
}

function groupeRegionLibelleMap(z: BOZone): string {
  const r = String(z.region ?? '').trim();
  if (!r || isLegacyPseudoRegionMap(r)) return REGION_NON_DEFINIE_MAP;
  return r;
}

function formatFcfaFull(v: number): string {
  const n = Math.round(Number(v) || 0);
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
  return `${formatted}\u00a0FCFA`;
}

function getFillColorByTaux(taux: number): string {
  if (taux <= 0) return '#FECACA';
  if (taux <= 10) return '#FED7AA';
  return '#A07845';
}

function districtKeyForZone(z: BOZone): string | null {
  const sub = groupeRegionLibelleMap(z);
  if (sub === REGION_NON_DEFINIE_MAP) return null;
  return civDistrictForSubregion(sub);
}

export default function BOZonesMap({
  zones,
  mapRegionFilter,
  onZoneSelect,
  onRegionDetail,
  onMapRegionFilterChange,
}: BOZonesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(mapRegionFilter);

  useEffect(() => {
    setSelectedRegion(mapRegionFilter);
  }, [mapRegionFilter]);

  const aggsMap = useMemo(() => {
    const m = new Map<string, BOZone[]>();
    zones.forEach((z) => {
      const dk = districtKeyForZone(z);
      const key = dk ?? '__hors__';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(z);
    });
    const out = new Map<
      string,
      { region: string; nbActeurs: number; volume: number; tauxMoyen: number; nbCommunes: number }
    >();
    m.forEach((list, key) => {
      if (key === '__hors__') return;
      const nbActeurs = list.reduce((s, z) => s + (Number(z.nbActeurs) || 0), 0);
      const volume = list.reduce((s, z) => s + (Number(z.volumeTotal) || 0), 0);
      const tauxSum = list.reduce((s, z) => s + (Number(z.tauxActivite) || 0), 0);
      const tauxMoyen = list.length ? Math.round(tauxSum / list.length) : 0;
      out.set(key, {
        region: key,
        nbActeurs,
        volume,
        tauxMoyen,
        nbCommunes: list.length,
      });
    });
    return out;
  }, [zones]);

  const zonesInSelectedDistrict = useMemo(() => {
    if (!selectedRegion) return [];
    return zones.filter((z) => districtKeyForZone(z) === selectedRegion);
  }, [zones, selectedRegion]);

  const makePathStyle = useCallback(
    (feature: GeoJSON.Feature | undefined, sel: string | null): L.PathOptions => {
      const props = feature?.properties as CIVRegionProperties | undefined;
      const regionName = props?.name ?? '';
      const agg = aggsMap.get(regionName);
      const taux = agg?.tauxMoyen ?? 0;
      const isSelected = sel === regionName;
      return {
        fillColor: getFillColorByTaux(taux),
        fillOpacity: isSelected ? 0.55 : 0.35,
        color: isSelected ? '#5B5248' : '#9CA3AF',
        weight: isSelected ? 3 : 1.5,
        dashArray: agg ? undefined : '3',
      };
    },
    [aggsMap],
  );

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
    const invalidateTimer = window.setTimeout(() => {
      if (mapInstanceRef.current === map) map.invalidateSize();
    }, 0);
    return () => {
      window.clearTimeout(invalidateTimer);
      if (geoJsonRef.current) {
        map.removeLayer(geoJsonRef.current);
        geoJsonRef.current = null;
      }
      if (mapInstanceRef.current === map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (geoJsonRef.current) {
      map.removeLayer(geoJsonRef.current);
      geoJsonRef.current = null;
    }
    const layer = L.geoJSON(CIV_REGIONS_GEOJSON as unknown as GeoJSON.GeoJsonObject, {
      style: (feature) => makePathStyle(feature as GeoJSON.Feature, selectedRegion),
      onEachFeature: (feature, lyr) => {
        const props = feature.properties as CIVRegionProperties;
        const regionName = props.name;
        const agg = aggsMap.get(regionName);
        const tip = agg
          ? `<div style="font-size:11px;font-family:system-ui,sans-serif;"><div style="font-weight:600;color:#1F1F1F;">${escapeHtml(regionName)}</div><div style="color:#666;">${agg.nbActeurs} acteurs · ${agg.tauxMoyen}%</div></div>`
          : `<div style="font-size:11px;font-family:system-ui,sans-serif;"><div style="font-weight:600;color:#1F1F1F;">${escapeHtml(regionName)}</div><div style="color:#9CA3AF;">Aucune donnée</div></div>`;
        lyr.bindTooltip(tip, { sticky: true, className: 'bo-zones-map-geo-tt' });
        lyr.on({
          mouseover: (e) => {
            const t = e.target as L.Path;
            t.setStyle({ weight: 2.5, fillOpacity: 0.5 });
            t.bringToFront();
          },
          mouseout: (e) => {
            const t = e.target as L.Path;
            t.setStyle(makePathStyle(feature as GeoJSON.Feature, selectedRegion));
          },
          click: () => {
            setSelectedRegion(regionName);
            onMapRegionFilterChange(regionName);
            const b = (lyr as L.Polygon).getBounds?.();
            if (b && b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 9 });
          },
        });
      },
    });
    layer.addTo(map);
    geoJsonRef.current = layer;
    return () => {
      if (geoJsonRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(geoJsonRef.current);
        geoJsonRef.current = null;
      }
    };
  }, [zones, selectedRegion, aggsMap, makePathStyle, onMapRegionFilterChange]);

  const topRegions = useMemo(
    () =>
      [...aggsMap.values()]
        .sort((a, b) => b.tauxMoyen - a.tauxMoyen)
        .slice(0, 4)
        .map((v) => ({ region: v.region, tauxMoyen: v.tauxMoyen })),
    [aggsMap],
  );

  const regionsSansActivite = useMemo(
    () => [...aggsMap.values()].filter((a) => a.tauxMoyen === 0).length,
    [aggsMap],
  );

  const zonesSansActeur = useMemo(
    () => zones.filter((z) => (Number(z.nbActeurs) || 0) === 0).length,
    [zones],
  );

  const selAgg = selectedRegion ? aggsMap.get(selectedRegion) ?? null : null;

  const formatVol = (v: number) => formatFcfaFull(v);

  const resetMapView = useCallback(() => {
    setSelectedRegion(null);
    onMapRegionFilterChange(null);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([CIV_NATIONAL_CENTER.lat, CIV_NATIONAL_CENTER.lng], CIV_NATIONAL_CENTER.zoom, {
        duration: 0.45,
      });
    }
  }, [onMapRegionFilterChange]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 12,
        height: 520,
        minHeight: 520,
        width: '100%',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #E5E1D8',
          background: BO_TINT,
        }}
      >
        {selectedRegion ? (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              background: '#fff',
              border: '1px solid #E5E1D8',
              borderRadius: 999,
              padding: '8px 12px',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 12,
              color: '#5B5248',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Région sélectionnée : {selectedRegion}
              <span style={{ fontWeight: 500, color: '#6B7280' }}>
                {' '}
                · Cliquez sur × pour réinitialiser
              </span>
            </span>
            <button
              type="button"
              aria-label="Réinitialiser la sélection carte"
              onClick={() => resetMapView()}
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: '#F5F3EF',
                borderRadius: 999,
                width: 26,
                height: 26,
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                color: '#5B5248',
              }}
            >
              ×
            </button>
          </div>
        ) : null}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        <button
          type="button"
          onClick={() => resetMapView()}
          title="Réinitialiser la carte"
          style={{
            position: 'absolute',
            bottom: 52,
            right: 10,
            zIndex: 1000,
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid #E5E1D8',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Home size={16} color="#5B5248" strokeWidth={2.2} />
        </button>
        <div
          style={{
            position: 'absolute',
            top: selectedRegion ? 56 : 10,
            left: 10,
            zIndex: 999,
            background: '#fff',
            border: '1px solid #E5E1D8',
            borderRadius: 8,
            padding: '8px 10px',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: 220,
          }}
        >
          <div style={{ fontWeight: 500, color: '#1F1F1F', fontSize: 12, marginBottom: 6 }}>
            Activité par district
          </div>
          {[
            { c: '#A07845', t: 'Élevée (>10%)' },
            { c: '#FED7AA', t: 'Moyenne (1-10%)' },
            { c: '#FECACA', t: 'Faible (0%)' },
          ].map((row) => (
            <div
              key={row.t}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#444', marginBottom: 4 }}
            >
              <span style={{ width: 11, height: 11, borderRadius: 4, background: row.c, flexShrink: 0 }} />
              {row.t}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #E5E1D8',
            padding: '12px 14px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
            Top districts actifs
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {topRegions.map((r) => {
              const fill = getFillColorByTaux(r.tauxMoyen);
              return (
                <li
                  key={r.region}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    padding: '4px 0',
                    borderBottom: '1px solid #F0EBE3',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#1F1F1F' }}>{r.region}</span>
                  <span style={{ fontWeight: 700, color: fill }}>{r.tauxMoyen}%</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #E5E1D8',
            padding: '12px 14px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
            Alertes territoriales
          </div>
          <div
            style={{
              background: '#FCEBEB',
              border: '1px solid #F7C1C1',
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              fontSize: 11,
              color: '#A32D2D',
            }}
          >
            <strong>{regionsSansActivite}</strong> districts sans activité
            <div style={{ fontWeight: 500, marginTop: 4, color: '#7F1D1D' }}>Taux 0 % sur les 30 derniers jours</div>
          </div>
          <div
            style={{
              background: '#FAEEDA',
              border: '1px solid #FAC775',
              borderRadius: 8,
              padding: 8,
              fontSize: 11,
              color: '#854F0B',
            }}
          >
            <strong>{zonesSansActeur}</strong> zones sans acteur
            <div style={{ fontWeight: 500, marginTop: 4 }}>Identification à prévoir</div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #E5E1D8',
            padding: '12px 14px',
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 }}>
            Région sélectionnée
          </div>
          {!selAgg && (
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
              Cliquez sur un district sur la carte pour voir les détails.
            </p>
          )}
          {selAgg && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MapPin size={18} style={{ color: BO_PRIMARY }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1F1F1F' }}>{selAgg.region}</span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#6B7280' }}>
                {selAgg.nbCommunes} commune{selAgg.nbCommunes > 1 ? 's' : ''}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: BO_TINT, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                  <Users size={14} style={{ color: BO_PRIMARY, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: '#6B7280' }}>Acteurs</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: BO_PRIMARY }}>{selAgg.nbActeurs}</div>
                </div>
                <div style={{ background: '#E6F1FB', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                  <TrendingUp size={14} style={{ color: '#185FA5', marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: '#6B7280' }}>Volume</div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#185FA5' }}>{formatVol(selAgg.volume)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRegionDetail(selAgg.region)}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 10,
                  border: `2px solid ${BO_PRIMARY}`,
                  background: '#fff',
                  color: BO_PRIMARY,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: 8,
                }}
              >
                Voir détails {selAgg.region}
              </button>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }}>Communes</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {zonesInSelectedDistrict.slice(0, 6).map((z) => (
                  <li key={String(z.id)}>
                    <button
                      type="button"
                      onClick={() => onZoneSelect(z)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        marginBottom: 4,
                        borderRadius: 8,
                        border: '1px solid #E5E1D8',
                        background: '#FAFAF8',
                        fontSize: 11,
                        fontWeight: 600,
                        color: BO_PRIMARY,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {z.nom}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
