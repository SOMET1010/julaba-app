/**
 * JÙLABA — Veille 30 jours : fournisseur de demonstration
 * =======================================================
 * Genere des preuves realistes et deterministes (sans reseau ni cle API)
 * pour que l'outil soit pleinement demontrable, y compris en CI.
 *
 * Le contenu est oriente marches agricoles ivoiriens. Un vrai backend
 * (scraping/API last30days) peut remplacer ce fournisseur : il suffit
 * d'implementer l'interface VeilleProvider.
 *
 * Determinisme : une graine derivee du sujet alimente un PRNG (mulberry32),
 * donc une meme recherche renvoie toujours le meme resultat. Aucune
 * dependance a Date.now() ni Math.random().
 */
import type {
  VeilleEvidence,
  VeilleProvider,
  VeilleQuery,
  VeilleSourceId,
} from './types';

/* ── PRNG deterministe ──────────────────────────────────────────── */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Profils par filiere ────────────────────────────────────────── */

type Sentiment = 'hausse' | 'baisse' | 'neutre' | 'alerte';

interface ThemeTemplate {
  key: string;
  titre: string;
  sentiment: Sentiment;
  /** Preuves candidates par source. */
  preuves: Partial<
    Record<
      VeilleSourceId,
      { titre: string; extrait?: string; origine: string }
    >
  >;
}

interface DomainProfile {
  match: RegExp;
  produit: string;
  themes: ThemeTemplate[];
}

const DOMAINS: DomainProfile[] = [
  {
    match: /cacao|cocoa|feve/i,
    produit: 'cacao',
    themes: [
      {
        key: 'prix-bord-champ',
        titre: 'Le prix bord champ du cacao reste tire vers le haut',
        sentiment: 'hausse',
        preuves: {
          gouv: {
            titre: 'Le Conseil du Cafe-Cacao confirme le prix garanti de la campagne',
            extrait: 'Prix bord champ maintenu, primes producteurs revalorisees.',
            origine: 'Conseil du Cafe-Cacao',
          },
          news: {
            titre: 'Cacao : le prix bord champ dope les revenus des planteurs ivoiriens',
            origine: 'Agence Ecofin',
          },
          marches: {
            titre: 'Le contrat cacao Londres se maintient au-dessus des moyennes saisonnieres',
            origine: 'ICE Futures',
          },
          x: {
            titre: 'Campagne qui demarre fort cote prix, les pisteurs se bousculent dans ma zone',
            extrait: 'Campagne qui demarre fort cote prix, les pisteurs se bousculent dans ma zone',
            origine: '@filiere_ci',
          },
        },
      },
      {
        key: 'meteo-recolte',
        titre: 'La meteo fait craindre pour le calibre des feves',
        sentiment: 'alerte',
        preuves: {
          news: {
            titre: 'Pluies irregulieres : les exportateurs surveillent le calibre des feves',
            origine: 'Reuters Africa',
          },
          web: {
            titre: 'Point meteo cacao : deficit hydrique localise dans le Sud-Ouest',
            origine: 'meteo-agri.ci',
          },
          reddit: {
            titre: 'Quelqu un a des retours sur la qualite des feves cette annee ?',
            extrait: 'Chez nous le sechage est compromis par l humidite, gros stress sur le grade.',
            origine: 'r/agriculture',
          },
        },
      },
      {
        key: 'tracabilite-eudr',
        titre: 'La tracabilite EUDR devient incontournable a l export',
        sentiment: 'neutre',
        preuves: {
          gouv: {
            titre: 'Deploiement de la carte du planteur et geolocalisation des parcelles',
            origine: 'Conseil du Cafe-Cacao',
          },
          news: {
            titre: 'Reglement europeen sur la deforestation : la filiere ivoirienne accelere',
            origine: 'Jeune Afrique',
          },
          youtube: {
            titre: 'Reportage : comment les cooperatives se preparent a l EUDR',
            origine: 'Chaine Agri CI',
          },
        },
      },
    ],
  },
  {
    match: /anacarde|cajou|cashew|noix de cajou/i,
    produit: 'anacarde',
    themes: [
      {
        key: 'prix-kg',
        titre: 'Le prix du kilo d anacarde repart a la hausse a l ouverture',
        sentiment: 'hausse',
        preuves: {
          gouv: {
            titre: 'Le Conseil Coton-Anacarde fixe le prix plancher de la campagne',
            origine: 'Conseil Coton-Anacarde',
          },
          marches: {
            titre: 'Demande asiatique soutenue sur la noix brute, primes en hausse',
            origine: 'Place de Bouake',
          },
          x: {
            titre: 'Les acheteurs indiens sont deja tres actifs, les prix bougent vite',
            extrait: 'Les acheteurs indiens sont deja tres actifs, les prix bougent vite',
            origine: '@anacarde_infos',
          },
        },
      },
      {
        key: 'transformation',
        titre: 'La transformation locale monte en puissance',
        sentiment: 'hausse',
        preuves: {
          news: {
            titre: 'Cote d Ivoire : nouvelles unites de transformation de cajou inaugurees',
            origine: 'Agence Ecofin',
          },
          gouv: {
            titre: 'Incitations fiscales pour les transformateurs d anacarde',
            origine: 'Ministere du Commerce',
          },
        },
      },
    ],
  },
  {
    match: /cafe|coffee|robusta/i,
    produit: 'cafe',
    themes: [
      {
        key: 'cours-robusta',
        titre: 'Le robusta soutient les cours et interesse les planteurs',
        sentiment: 'hausse',
        preuves: {
          marches: {
            titre: 'Le robusta Londres reste ferme sur fond de stocks tendus',
            origine: 'ICE Futures',
          },
          news: {
            titre: 'Cafe : la Cote d Ivoire veut relancer sa production de robusta',
            origine: 'Commodafrica',
          },
        },
      },
      {
        key: 'replantation',
        titre: 'Les programmes de replantation prennent de l ampleur',
        sentiment: 'neutre',
        preuves: {
          gouv: {
            titre: 'Distribution de plants ameliores aux cooperatives cafeieres',
            origine: 'Conseil du Cafe-Cacao',
          },
          web: {
            titre: 'Guide replantation cafe : rendements et bonnes pratiques',
            origine: 'agri-conseil.ci',
          },
        },
      },
    ],
  },
  {
    match: /hevea|caoutchouc|rubber|latex/i,
    produit: 'hevea',
    themes: [
      {
        key: 'prix-fonds-tasse',
        titre: 'Le prix du fond de tasse suit la remontee du caoutchouc',
        sentiment: 'hausse',
        preuves: {
          marches: {
            titre: 'Caoutchouc naturel : rebond sur les places asiatiques',
            origine: 'SICOM Singapour',
          },
          gouv: {
            titre: 'Le mecanisme de prix de l hevea revise a la hausse',
            origine: 'APROMAC',
          },
        },
      },
    ],
  },
  {
    match: /riz|rice|paddy/i,
    produit: 'riz',
    themes: [
      {
        key: 'autosuffisance',
        titre: 'Le plan riz vise l autosuffisance et securise les prix',
        sentiment: 'neutre',
        preuves: {
          gouv: {
            titre: 'Strategie nationale de developpement de la riziculture actualisee',
            origine: 'Ministere de l Agriculture',
          },
          news: {
            titre: 'Riz local : les rizeries montent en cadence avant la soudure',
            origine: 'Fratmat',
          },
          reddit: {
            titre: 'Le riz local est il vraiment competitif face a l importe ?',
            extrait: 'Sur mon marche le riz local part bien quand le prix tient la route.',
            origine: 'r/CotedIvoire',
          },
        },
      },
    ],
  },
];

/* ── Profil generique (sujet non reconnu) ───────────────────────── */

function genericThemes(sujet: string): ThemeTemplate[] {
  const s = sujet.trim() || 'ce sujet';
  return [
    {
      key: 'tendance',
      titre: `Interet en hausse autour de ${s} sur les 30 derniers jours`,
      sentiment: 'hausse',
      preuves: {
        web: {
          titre: `Ce qui se dit sur ${s} en ce moment`,
          origine: 'recherche web',
        },
        news: {
          titre: `Dossier : ${s}, les points qui font debat`,
          origine: 'revue de presse',
        },
        x: {
          titre: `Beaucoup d echanges sur ${s} ces jours-ci`,
          extrait: `Beaucoup d echanges sur ${s} ces jours-ci`,
          origine: '@veille_ci',
        },
      },
    },
    {
      key: 'signaux',
      titre: `Signaux de marche a surveiller sur ${s}`,
      sentiment: 'neutre',
      preuves: {
        marches: {
          titre: `Indicateurs et cours lies a ${s}`,
          origine: 'places de marche',
        },
        gouv: {
          titre: `Cadre officiel et annonces concernant ${s}`,
          origine: 'sources officielles',
        },
      },
    },
  ];
}

/* ── Fournisseur ────────────────────────────────────────────────── */

const ENGAGEMENT_LABELS: Record<VeilleSourceId, string> = {
  web: 'liens',
  news: 'reprises',
  marches: 'variations suivies',
  gouv: 'references',
  x: 'reposts',
  reddit: 'upvotes',
  youtube: 'vues',
  hackernews: 'points',
};

function pickThemes(sujet: string): { produit: string; themes: ThemeTemplate[] } {
  const domain = DOMAINS.find((d) => d.match.test(sujet));
  if (domain) return { produit: domain.produit, themes: domain.themes };
  return { produit: sujet.trim() || 'sujet', themes: genericThemes(sujet) };
}

function slugHost(id: VeilleSourceId): string {
  const hosts: Record<VeilleSourceId, string> = {
    web: 'exemple.ci',
    news: 'presse.example',
    marches: 'marches.example',
    gouv: 'gouv.ci',
    x: 'x.com',
    reddit: 'reddit.com',
    youtube: 'youtube.com',
    hackernews: 'news.ycombinator.com',
  };
  return hosts[id];
}

export class DemoVeilleProvider implements VeilleProvider {
  readonly id = 'demo';

  async collect(query: VeilleQuery): Promise<VeilleEvidence[]> {
    const rand = mulberry32(hashSeed(query.sujet.toLowerCase().trim()));
    const { themes } = pickThemes(query.sujet);
    const active = new Set(query.sources);
    const out: VeilleEvidence[] = [];

    themes.forEach((theme, ti) => {
      const entries = Object.entries(theme.preuves) as [
        VeilleSourceId,
        { titre: string; extrait?: string; origine: string },
      ][];
      entries.forEach(([sourceId, tpl], pi) => {
        if (!active.has(sourceId)) return;
        const base = 40 + Math.floor(rand() * 900);
        const scaleBySource: Record<VeilleSourceId, number> = {
          web: 12,
          news: 30,
          marches: 8,
          gouv: 6,
          x: 55,
          reddit: 22,
          youtube: 140,
          hackernews: 9,
        };
        const engagement = base * scaleBySource[sourceId];
        const ageJours = 1 + Math.floor(rand() * (query.fenetreJours - 1));
        out.push({
          sourceId,
          titre: tpl.titre,
          extrait: tpl.extrait,
          origine: tpl.origine,
          url: `https://${slugHost(sourceId)}/${theme.key}-${ti}${pi}`,
          engagement,
          engagementLabel: ENGAGEMENT_LABELS[sourceId],
          ageJours,
          cluster: theme.key,
          clusterTitre: theme.titre,
          sentiment: theme.sentiment,
        });
      });
    });

    return out;
  }
}
