// ── Météo & conseils agricoles (écart CDC 8.1.3 « Alertes météo et conseils ») ──
// Source : Open-Meteo (https://open-meteo.com) — API 100% GRATUITE, SANS CLÉ,
// sans inscription. L'appel part directement du navigateur de la productrice ;
// aucun serveur payant, aucune OPEX cloud. Le dernier bulletin est mis en cache
// (localStorage) pour rester lisible hors-ligne.

export interface JourMeteo {
  date: string;          // AAAA-MM-JJ
  tmax: number;
  tmin: number;
  pluieMm: number;       // cumul de précipitations (mm)
  pluieProba: number;    // probabilité max de précipitation (%)
  code: number;          // code météo WMO
}

export interface Meteo {
  latitude: number;
  longitude: number;
  actuel: { temperature: number; humidite: number; code: number } | null;
  jours: JourMeteo[];
  releveLe: string;      // ISO — quand le bulletin a été récupéré
  horsLigne?: boolean;   // true si servi depuis le cache
}

// ── Codes météo WMO → libellé + emoji (icône-first, adapté à la faible littératie) ──

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: 'Ciel clair', emoji: '☀️' },
  1:  { label: 'Plutôt clair', emoji: '🌤️' },
  2:  { label: 'Partiellement nuageux', emoji: '⛅' },
  3:  { label: 'Couvert', emoji: '☁️' },
  45: { label: 'Brouillard', emoji: '🌫️' },
  48: { label: 'Brouillard givrant', emoji: '🌫️' },
  51: { label: 'Bruine légère', emoji: '🌦️' },
  53: { label: 'Bruine', emoji: '🌦️' },
  55: { label: 'Bruine dense', emoji: '🌧️' },
  61: { label: 'Pluie faible', emoji: '🌦️' },
  63: { label: 'Pluie modérée', emoji: '🌧️' },
  65: { label: 'Pluie forte', emoji: '🌧️' },
  66: { label: 'Pluie verglaçante', emoji: '🌧️' },
  67: { label: 'Pluie verglaçante', emoji: '🌧️' },
  80: { label: 'Averses faibles', emoji: '🌦️' },
  81: { label: 'Averses modérées', emoji: '🌧️' },
  82: { label: 'Averses violentes', emoji: '⛈️' },
  95: { label: 'Orage', emoji: '⛈️' },
  96: { label: 'Orage avec grêle', emoji: '⛈️' },
  99: { label: 'Orage avec grêle', emoji: '⛈️' },
};

export function libelleMeteo(code: number): { label: string; emoji: string } {
  return WMO[code] || { label: 'Temps variable', emoji: '🌡️' };
}

// ── Localisation : Abidjan par défaut (centre économique CI) si GPS indisponible ──

const DEFAUT = { latitude: 5.35, longitude: -4.02 }; // Abidjan
const CACHE_KEY = 'julaba_meteo_cache_v1';
const COORDS_KEY = 'julaba_meteo_coords_v1';

function chargerCache(): Meteo | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Meteo) : null;
  } catch { return null; }
}

async function resoudreCoords(): Promise<{ latitude: number; longitude: number }> {
  // 1) dernières coordonnées connues (rapide, sans redemander la permission)
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // 2) géolocalisation du navigateur
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 3600_000 });
      });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      try { localStorage.setItem(COORDS_KEY, JSON.stringify(coords)); } catch { /* ignore */ }
      return coords;
    } catch { /* permission refusée / indisponible */ }
  }
  // 3) repli : Abidjan
  return DEFAUT;
}

/**
 * Récupère le bulletin météo (4 jours) pour la position de la productrice.
 * En cas d'échec réseau, renvoie le dernier bulletin en cache (marqué horsLigne).
 */
export async function getMeteo(): Promise<Meteo | null> {
  const { latitude, longitude } = await resoudreCoords();
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weathercode` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode` +
    `&timezone=Africa%2FAbidjan&forecast_days=4`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const dailyTime: string[] = d?.daily?.time || [];
    const jours: JourMeteo[] = dailyTime.map((date: string, i: number) => ({
      date,
      tmax: Math.round(d.daily.temperature_2m_max?.[i] ?? 0),
      tmin: Math.round(d.daily.temperature_2m_min?.[i] ?? 0),
      pluieMm: Math.round((d.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
      pluieProba: Math.round(d.daily.precipitation_probability_max?.[i] ?? 0),
      code: d.daily.weathercode?.[i] ?? 0,
    }));
    const meteo: Meteo = {
      latitude,
      longitude,
      actuel: d?.current
        ? {
            temperature: Math.round(d.current.temperature_2m ?? 0),
            humidite: Math.round(d.current.relative_humidity_2m ?? 0),
            code: d.current.weathercode ?? 0,
          }
        : null,
      jours,
      releveLe: new Date().toISOString(),
    };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(meteo)); } catch { /* ignore */ }
    return meteo;
  } catch {
    const cache = chargerCache();
    return cache ? { ...cache, horsLigne: true } : null;
  }
}

// ── Conseils agricoles dérivés du bulletin (règles locales, cultures ivoiriennes) ──

export interface ConseilMeteo {
  urgence: 'haute' | 'moyenne' | 'info';
  emoji: string;
  titre: string;
  texte: string;
}

/**
 * Génère des conseils agricoles à partir du bulletin. Orienté cultures CI
 * (cacao, café, hévéa, igname, manioc, maraîchage) : séchage, semis, arrosage,
 * drainage, protection des récoltes.
 */
export function conseilsAgricoles(meteo: Meteo | null): ConseilMeteo[] {
  if (!meteo || meteo.jours.length === 0) return [];
  const conseils: ConseilMeteo[] = [];
  const prochains = meteo.jours.slice(0, 2); // aujourd'hui + demain

  const grossePluie = prochains.some((j) => j.pluieMm >= 20 || j.code >= 80);
  const orage = prochains.some((j) => j.code >= 95);
  const pluieModeree = prochains.some((j) => j.pluieMm >= 5 && j.pluieMm < 20);
  const secEtChaud = meteo.jours.slice(0, 3).every((j) => j.pluieProba < 25) &&
    meteo.jours.slice(0, 3).some((j) => j.tmax >= 34);
  const beauTemps = prochains.every((j) => j.pluieMm < 3 && j.code <= 3);

  if (orage) {
    conseils.push({
      urgence: 'haute', emoji: '⛈️',
      titre: 'Orage attendu',
      texte: "Mettez les récoltes séchées (cacao, café) à l'abri, sécurisez les bâches et ne traitez pas aujourd'hui.",
    });
  } else if (grossePluie) {
    conseils.push({
      urgence: 'haute', emoji: '🌧️',
      titre: 'Fortes pluies attendues',
      texte: "Rentrez le cacao et le café en séchage, différez les semis et vérifiez le drainage des parcelles.",
    });
  }

  if (pluieModeree && !grossePluie) {
    conseils.push({
      urgence: 'info', emoji: '🌦️',
      titre: 'Pluies modérées',
      texte: 'Bon pour les cultures. Surveillez le drainage et profitez-en pour repiquer le maraîchage.',
    });
  }

  if (secEtChaud) {
    conseils.push({
      urgence: 'moyenne', emoji: '🌡️',
      titre: 'Temps sec et chaud',
      texte: "Arrosez tôt le matin ou en soirée, paillez les planches pour garder l'humidité du sol.",
    });
  }

  if (beauTemps && !secEtChaud) {
    conseils.push({
      urgence: 'info', emoji: '☀️',
      titre: 'Beau temps',
      texte: 'Bon moment pour récolter, sécher le cacao/café et livrer au marché.',
    });
  }

  if (conseils.length === 0) {
    conseils.push({
      urgence: 'info', emoji: '🌤️',
      titre: 'Temps calme',
      texte: 'Aucune alerte particulière. Poursuivez vos travaux habituels.',
    });
  }
  return conseils;
}

/** Résumé vocal court (pour le bouton « Écouter »). */
export function resumeVocalMeteo(meteo: Meteo | null): string {
  if (!meteo) return "La météo n'est pas disponible pour le moment.";
  const auj = meteo.jours[0];
  const info = libelleMeteo(auj?.code ?? 0);
  const conseils = conseilsAgricoles(meteo);
  const parts: string[] = [];
  if (meteo.actuel) parts.push(`Il fait ${meteo.actuel.temperature} degrés.`);
  if (auj) parts.push(`Aujourd'hui : ${info.label.toLowerCase()}, de ${auj.tmin} à ${auj.tmax} degrés.`);
  if (conseils[0]) parts.push(conseils[0].texte);
  return parts.join(' ');
}
