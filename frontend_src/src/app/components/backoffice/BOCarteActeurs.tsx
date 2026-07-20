import React, { useEffect, useRef, useState, useCallback } from "react";
import { UniversalKPI, KPIGrid } from "../ui/UniversalKPI";
import { Users, MapPin, Map, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useBackOffice } from "../../contexts/BackOfficeContext";
import { BO_PRIMARY } from "./bo-theme";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const COLORS: Record<string, string> = {
  marchand: "#C66A2C",
  producteur: "#2E8B57",
  cooperative: "#1D4ED8",
  identificateur: "#7C3AED",
};

const ROLES = ["marchand", "producteur", "cooperative", "identificateur"];

function makeIcon(color: string, letter: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:32px;height:42px">
        <style>
          @keyframes julaba-pulse {
            0% { transform: scale(1); opacity: 0.6; }
            70% { transform: scale(2.2); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
          .julaba-pulse-ring {
            position:absolute;
            top:4px;left:4px;
            width:24px;height:24px;
            border-radius:50%;
            background:${color};
            animation: julaba-pulse 2s ease-out infinite;
          }
        </style>
        <div class="julaba-pulse-ring"></div>
        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.16 24.84 0 16 0Z" fill="${color}"/>
          <circle cx="16" cy="16" r="10" fill="rgba(0,0,0,0.15)"/>
          <circle cx="16" cy="16" r="9" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="21" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="white" text-anchor="middle">${letter}</text>
        </svg>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });
}

export function BOCarteActeurs() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.LayerGroup>>({});

  const [geoPoints, setGeoPoints] = useState<any[]>([]);
  const [allActeurs, setAllActeurs] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoles, setActiveRoles] = useState<Record<string, boolean>>({
    marchand: true, producteur: true, cooperative: true, identificateur: true,
  });
  const [activeKPI, setActiveKPI] = useState<string | null>(null);
  const [selectedActeur, setSelectedActeur] = useState<any | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerActeurs, setDrawerActeurs] = useState<any[]>([]);
  const [locForm, setLocForm] = useState<{ id: string; adresse: string; lat: number | null; lng: number | null } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [geoRes, allRes, zonesRes] = await Promise.all([
        fetch("/api/v1/identifications/geo", { credentials: "include" }),
        fetch("/api/v1/identifications?limit=100", { credentials: "include" }),
        fetch("/api/v1/zones", { credentials: "include" }),
      ]);
      if (!geoRes.ok) throw new Error(`Erreur HTTP ${geoRes.status}`);
      if (!allRes.ok) throw new Error(`Erreur HTTP ${allRes.status}`);
      if (!zonesRes.ok) throw new Error(`Erreur HTTP ${zonesRes.status}`);
      const geoData = await geoRes.json();
      const allData = await allRes.json();
      const zonesData = await zonesRes.json();
      setGeoPoints(geoData.data || []);
      const acteurs = Array.isArray(allData?.acteurs) ? allData.acteurs : Array.isArray(allData) ? allData : Array.isArray(allData?.data) ? allData.data : [];
      if (acteurs.length === 0) toast.info('Aucun acteur disponible');
      setAllActeurs(acteurs);
      setZones(Array.isArray(zonesData) ? zonesData : []);
    } catch {
      toast.error('Erreur chargement carte acteurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([5.355, -4.002], 12);
    mapInstanceRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO",
      maxZoom: 19,
    }).addTo(map);
    ROLES.forEach(role => {
      layersRef.current[role] = L.layerGroup().addTo(map);
    });
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    ROLES.forEach(role => layersRef.current[role]?.clearLayers());
    const filtered = activeKPI && activeKPI !== "all" && activeKPI !== "zones"
      ? geoPoints.filter(p => p.type_acteur === activeKPI)
      : geoPoints;
    filtered.forEach(p => {
      if (!activeRoles[p.type_acteur]) return;
      const color = COLORS[p.type_acteur as keyof typeof COLORS] || BO_PRIMARY;
      const letter = ({ marchand: 'M', producteur: 'P', cooperative: 'C', identificateur: 'I' } as Record<string, string>)[p.type_acteur] || '?';
      const marker = L.marker([Number(p.latitude), Number(p.longitude)], { icon: makeIcon(color, letter) });
      marker.bindPopup(`
        <div style="padding:12px 14px;min-width:180px;font-family:system-ui,sans-serif">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:${color};margin-bottom:3px">${p.type_acteur}</div>
          <div style="font-size:14px;font-weight:800;color:#1a1a1a;margin-bottom:2px">${p.acteur_nom || "Acteur"}</div>
          <div style="font-size:11px;color:#888;margin-bottom:8px">${p.commune || p.region || ""}</div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="display:inline-block;font-size:10px;font-weight:700;border-radius:20px;padding:2px 8px;background:#DCFCE7;color:#16a34a">${p.statut || "Actif"}</span>
            <button onclick="window.__selectActeur && window.__selectActeur(\'${p.id}\')" style="font-size:10px;font-weight:700;color:${color};background:none;border:1px solid ${color};border-radius:8px;padding:2px 8px;cursor:pointer">Voir la fiche</button>
          </div>
        </div>
      `, { maxWidth: 220 });
      layersRef.current[p.type_acteur]?.addLayer(marker);
    });
  }, [geoPoints, activeRoles, activeKPI]);

  useEffect(() => {
    (window as any).__selectActeur = (id: string) => {
      const p = geoPoints.find(x => x.id === id);
      if (p) setSelectedActeur(p);
    };
    return () => { delete (window as any).__selectActeur; };
  }, [geoPoints]);

  const toggleRole = (role: string) => {
    const next = { ...activeRoles, [role]: !activeRoles[role] };
    setActiveRoles(next);
    if (next[role]) layersRef.current[role]?.addTo(mapInstanceRef.current!);
    else mapInstanceRef.current?.removeLayer(layersRef.current[role]);
  };

  const sansGPS = allActeurs.filter(a => !geoPoints.find(g => g.acteur_id === a.acteur_id));
  const totalActeurs = allActeurs.length;
  const totalGeo = geoPoints.length;
  const zonesActives = zones.filter(z => Number(z.nbActeurs) > 0).length;
  const pctGeo = totalActeurs > 0 ? Math.round((totalGeo / totalActeurs) * 100) : 0;
  const recents = [...allActeurs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const kpis = [
    { key: "all", label: "Total acteurs", value: totalActeurs, sub: "Tous roles confondus", subColor: "#16a34a", subBg: "#DCFCE7" },
    { key: "geo", label: "Géolocalisés", value: totalGeo, sub: `${pctGeo}% de couverture`, subColor: "#888", subBg: "#f5f5f5" },
    { key: "zones", label: "Zones actives", value: zonesActives, sub: `sur ${zones.length} zones`, subColor: "#888", subBg: "#f5f5f5" },
    { key: "sans_gps", label: "Sans GPS", value: sansGPS.length, sub: "A géolocaliser", subColor: "#d97706", subBg: "#FEF3C7" },
  ];

  const handleKPI = (key: string) => {
    if (key === "sans_gps") { setShowDrawer(true); setDrawerActeurs(sansGPS); return; }
    if (key === "all") { setActiveKPI(null); return; }
    setActiveKPI(activeKPI === key ? null : key);
  };

  const handleSearchAdresse = async () => {
    if (!locForm?.adresse) return;
    setLocLoading(true);
    setLocError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locForm.adresse + ", Cote d'Ivoire")}&format=json&limit=1`);
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const data = await res.json();
      if (!data.length) { setLocError("Adresse introuvable. Précisez davantage."); setLocLoading(false); return; }
      setLocForm({ ...locForm, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } catch { setLocError("Erreur de recherche."); }
    setLocLoading(false);
  };

  const handleValiderLoc = async () => {
    if (!locForm?.lat || !locForm?.lng) return;
    setLocLoading(true);
    try {
      const res = await fetch(`/api/v1/identifications/${locForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ latitude: locForm.lat, longitude: locForm.lng }),
      });
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      setLocForm(null);
      await fetchAll();
    } catch { setLocError("Erreur lors de la sauvegarde."); }
    setLocLoading(false);
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - dt.getTime()) / 86400000);
    if (diff === 0) return "Auj.";
    if (diff === 1) return "Hier";
    if (diff < 7) return `${diff}j`;
    return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const initiales = (nom: string) => {
    const parts = (nom || "").split(" ").filter(Boolean);
    return parts.slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%", fontFamily: "system-ui,sans-serif" }}>

      <div style={{ padding: "20px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Carte des Acteurs</h1>
          <p style={{ fontSize: 13, color: "#888", margin: "3px 0 0" }}>
            {loading ? "Chargement..." : `${totalGeo} acteur${totalGeo > 1 ? "s" : ""} géolocalisé${totalGeo > 1 ? "s" : ""} sur ${totalActeurs} enregistré${totalActeurs > 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ROLES.map(role => (
            <button key={role} onClick={() => toggleRole(role)} style={{
              border: `1.5px solid ${activeRoles[role] ? COLORS[role] : "#e0d8d0"}`,
              background: activeRoles[role] ? COLORS[role] : "white",
              color: activeRoles[role] ? "white" : "#888",
              borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: activeRoles[role] ? "white" : COLORS[role], display: "inline-block" }} />
              {role.charAt(0).toUpperCase() + role.slice(1)}s
            </button>
          ))}
          <button onClick={fetchAll} style={{
            border: "1.5px solid #e0d8d0", background: "white", borderRadius: 8,
            padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#555", fontFamily: "inherit",
          }}>
            Actualiser
          </button>
        </div>
      </div>

      <div style={{ padding: "0 28px" }}>
        <KPIGrid cols={4}>
          <UniversalKPI
            label="Total acteurs"
            animatedTarget={totalActeurs}
            icon={Users}
            color={BO_PRIMARY}
            iconAnimation="bounce"
            active={activeKPI === "all"}
            onClick={() => handleKPI("all")}
          />
          <UniversalKPI
            label="Géolocalisés"
            animatedTarget={totalGeo}
            icon={MapPin}
            color="#10B981"
            iconAnimation="float"
            active={activeKPI === "geo"}
            onClick={() => handleKPI("geo")}
          />
          <UniversalKPI
            label="Zones actives"
            animatedTarget={zonesActives}
            icon={Map}
            color="#3B82F6"
            iconAnimation="float"
            active={activeKPI === "zones"}
            onClick={() => handleKPI("zones")}
          />
          <UniversalKPI
            label="Sans GPS"
            animatedTarget={sansGPS.length}
            icon={AlertCircle}
            color="#F59E0B"
            iconAnimation={sansGPS.length > 0 ? "pulse" : "none"}
            active={activeKPI === "sans_gps"}
            onClick={() => handleKPI("sans_gps")}
          />
        </KPIGrid>
      </div>

      <div style={{ display: "flex", gap: 12, padding: "0 28px 20px", flex: 1, minHeight: 0 }}>

        <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", position: "relative", border: "1px solid #e0d8d0", minHeight: 400 }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, background: "rgba(255,255,255,0.96)", borderRadius: 10, padding: "8px 12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
            {ROLES.map(role => (
              <div key={role} onClick={() => toggleRole(role)} style={{
                display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600,
                color: "#555", marginBottom: 5, cursor: "pointer", padding: "2px 4px",
                borderRadius: 6, opacity: activeRoles[role] ? 1 : 0.3, transition: "opacity 0.15s",
              }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS[role], display: "inline-block", flexShrink: 0 }} />
                {role.charAt(0).toUpperCase() + role.slice(1)}s ({geoPoints.filter(p => p.type_acteur === role).length})
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", alignSelf: "stretch" }}>

          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #f0ebe3", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Acteurs par zone</div>
            {zones.sort((a, b) => Number(b.nbActeurs) - Number(a.nbActeurs)).slice(0, 6).map((z: any) => {
              const max = Math.max(...zones.map((x: any) => Number(x.nbActeurs)), 1);
              return (
                <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f0ea" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{z.nom}</div>
                    <div style={{ height: 3, background: "#f0ebe3", borderRadius: 2, marginTop: 3 }}>
                      <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${BO_PRIMARY},#e8893a)`, width: `${Math.round((Number(z.nbActeurs) / max) * 100)}%` }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: BO_PRIMARY }}>{z.nbActeurs || 0}</div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #f0ebe3", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Alertes terrain</div>
            {[
              { bg: "#FEE2E2", dot: "#ef4444", text: `${sansGPS.length} acteurs sans géolocalisation`, action: () => { setShowDrawer(true); setDrawerActeurs(sansGPS); } },
              { bg: "#FEF3C7", dot: "#d97706", text: `${zones.filter((z: any) => Number(z.nbIdentificateurs) === 0).length} zones sans identificateur`, action: null },
              { bg: "#EFF6FF", dot: "#3b82f6", text: `${allActeurs.filter(a => a.statut === "en_attente").length} dossiers en attente`, action: null },
            ].map((al, i) => (
              <div key={i} onClick={al.action || undefined} style={{
                display: "flex", alignItems: "flex-start", gap: 7, padding: "6px 8px",
                borderRadius: 8, marginBottom: 5, background: al.bg, cursor: al.action ? "pointer" : "default",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: al.dot, flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#555", lineHeight: 1.3 }}>{al.text}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #f0ebe3", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Derniers enrolements</div>
            {recents.map((a: any, i: number) => (
              <div key={i} onClick={() => setSelectedActeur(a)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < recents.length - 1 ? "1px solid #f5f0ea" : "none", cursor: "pointer" }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS[a.type_acteur] || BO_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white", flexShrink: 0 }}>
                  {initiales(a.acteur_nom)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.acteur_nom || "Acteur"}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>{a.type_acteur} — {a.commune || a.region || ""}</div>
                </div>
                <div style={{ fontSize: 10, color: "#aaa", whiteSpace: "nowrap" }}>{formatDate(a.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedActeur && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", justifyContent: "flex-end" }} onClick={() => setSelectedActeur(null)}>
          <div style={{ width: 360, background: "white", height: "100%", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: COLORS[selectedActeur.type_acteur] || BO_PRIMARY, padding: "24px 20px 20px", position: "relative" }}>
              <button onClick={() => setSelectedActeur(null)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.2)", border: "none", borderRadius: 8, width: 30, height: 30, color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>X</button>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", marginBottom: 10 }}>
                {initiales(selectedActeur.acteur_nom)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 4 }}>{selectedActeur.acteur_nom || "Acteur"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{selectedActeur.type_acteur}</div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Statut", value: selectedActeur.statut || "en_attente" },
                { label: "Region", value: selectedActeur.region || "Non renseigne" },
                { label: "Commune", value: selectedActeur.commune || "Non renseignee" },
                { label: "Identificateur", value: selectedActeur.identificateur_nom || "Non assigne" },
                { label: "Date identification", value: selectedActeur.created_at ? new Date(selectedActeur.created_at).toLocaleDateString("fr-FR") : "Non renseigne" },
                { label: "Géolocalisé", value: selectedActeur.latitude ? "Oui" : "Non" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f5f0ea" }}>
                  <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end" }} onClick={() => { setShowDrawer(false); setLocForm(null); }}>
          <div style={{ width: 400, background: "white", height: "100%", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>Acteurs sans GPS</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{drawerActeurs.length} acteur{drawerActeurs.length > 1 ? "s" : ""} a géolocaliser</div>
              </div>
              <button onClick={() => { setShowDrawer(false); setLocForm(null); }} style={{ background: "none", border: "1px solid #e0d8d0", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#555", fontFamily: "inherit" }}>X</button>
            </div>

            {locForm && (
              <div style={{ margin: "0 20px 16px", background: "#FFF8F3", border: `1.5px solid ${BO_PRIMARY}`, borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>Localiser cet acteur</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <input
                    value={locForm.adresse}
                    onChange={e => setLocForm({ ...locForm, adresse: e.target.value })}
                    placeholder="Ex: Marche Adjame, Abidjan"
                    style={{ flex: 1, border: "1.5px solid #EDE7DE", borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  />
                  <button onClick={handleSearchAdresse} disabled={locLoading} style={{ background: BO_PRIMARY, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    {locLoading ? "..." : "Chercher"}
                  </button>
                </div>
                {locError && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0" }}>{locError}</p>}
                {locForm.lat && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                      <div style={{ background: "white", borderRadius: 8, border: "1px solid #EDE7DE", padding: "6px 10px" }}>
                        <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, marginBottom: 2 }}>Latitude</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{locForm.lat.toFixed(5)}</div>
                      </div>
                      <div style={{ background: "white", borderRadius: 8, border: "1px solid #EDE7DE", padding: "6px 10px" }}>
                        <div style={{ fontSize: 9, color: "#aaa", fontWeight: 700, marginBottom: 2 }}>Longitude</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{locForm.lng!.toFixed(5)}</div>
                      </div>
                    </div>
                    <button onClick={handleValiderLoc} disabled={locLoading} style={{ width: "100%", background: "#16a34a", color: "white", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {locLoading ? "Sauvegarde..." : "Valider la localisation"}
                    </button>
                  </div>
                )}
                <button onClick={() => setLocForm(null)} style={{ width: "100%", background: "white", color: "#888", border: "1px solid #EDE7DE", borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Annuler
                </button>
              </div>
            )}

            <div style={{ padding: "0 20px 20px" }}>
              {drawerActeurs.map((a: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f0ea" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS[a.type_acteur] || BO_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", flexShrink: 0 }}>
                    {initiales(a.acteur_nom)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.acteur_nom || "Acteur"}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{a.type_acteur} — {a.commune || a.region || "Zone inconnue"}</div>
                  </div>
                  <button onClick={() => setLocForm({ id: a.id, adresse: `${a.commune || ""} ${a.region || ""}`.trim(), lat: null, lng: null })}
                    style={{ background: "white", border: `1.5px solid ${BO_PRIMARY}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: BO_PRIMARY, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Localiser
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
