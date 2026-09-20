import { defineConfig, type Plugin } from "vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
// Version APPLICATIVE à 4 chiffres (MAJEUR.MINEUR.CORRECTIF.LIVRAISON, voir
// docs/VERSIONING.md) : portée par `appVersion` — le champ `version` npm reste
// un semver valide à 3 chiffres (npm refuse 4 segments).
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8")) as { version?: string; appVersion?: string }
const appVersion = pkg.appVersion ?? pkg.version ?? "1.0.0"

let gitHash = "unknown"
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim()
} catch {
  /* pas de repo git en CI ou environnement restreint */
}

// Date de build (AAAA-MM-JJ HH:mm en UTC) — lisible par un humain.
const buildDate = new Date().toISOString().slice(0, 16).replace("T", " ")
// Identifiant de version compact injecté partout : « <hash> · <date> ».
const buildId = `${gitHash} · ${buildDate}`

// Tamponne l'identifiant de build dans le service worker COPIÉ dans dist, ET y
// injecte la liste des assets à PRÉ-CHARGER pour le HORS-LIGNE.
//
// Sans ça : (1) sw.js ne change jamais entre deux déploiements → l'appli reste
// coincée sur l'ancienne version ; (2) les pages sont chargées à la demande
// (import dynamique) → hors-ligne, une page jamais ouverte ne se charge pas et
// l'appli plante (« Oops, une erreur est survenue »). On pré-cache donc TOUS les
// assets du build (JS, CSS, images et polices). Exclure les gros paquets communs
// (index, recharts…) laissait
// l'écran vide si le réseau disparaissait juste après la toute première ouverture,
// car le nouveau service worker ne contrôlait pas encore leurs requêtes initiales.

function listerMp3Recursivement(racine: string, dossier = racine): string[] {
  const fichiers: string[] = []
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const absolu = join(dossier, entree.name)
    if (entree.isDirectory()) fichiers.push(...listerMp3Recursivement(racine, absolu))
    else if (entree.isFile() && entree.name.endsWith(".mp3")) {
      const relatif = path.relative(racine, absolu).split(path.sep).join("/")
      fichiers.push(`/voix/${relatif}`)
    }
  }
  return fichiers
}

function stampServiceWorker(outDir: string): Plugin {
  return {
    name: "julaba-stamp-sw",
    apply: "build",
    closeBundle() {
      try {
        const assetsDir = join(outDir, "assets")
        let precache: string[] = []
        try {
          precache = readdirSync(assetsDir, { withFileTypes: true })
            .filter((entree) => entree.isFile())
            .map((entree) => `/assets/${entree.name}`)
        } catch (e) {
          console.warn("[stamp-sw] liste de pré-cache indisponible:", (e as Error)?.message)
        }
        // Clips de la VOIX de Tantie Nanti Lou (public/voix/**/*.mp3) : c'est l'ADN
        // vocal de l'appli. On les PRÉ-CACHE à l'installation du service worker pour
        // qu'une marchande hors-ligne DÈS LE PREMIER JOUR entende quand même Tata.
        // ~7 Mo, fichiers immuables → aucun coût récurrent, servis ensuite sans réseau.
        let voicePrecache: string[] = []
        try {
          const voiceDir = join(outDir, "voix")
          voicePrecache = listerMp3Recursivement(voiceDir)
        } catch (e) {
          console.warn("[stamp-sw] liste de pré-cache voix indisponible:", (e as Error)?.message)
        }
        const swPath = join(outDir, "sw.js")
        const src = readFileSync(swPath, "utf-8")
        const stamped = src
          .replace(/__SW_BUILD__/g, buildId)
          .replace(/__PRECACHE_JSON__/g, JSON.stringify(precache))
          .replace(/__PRECACHE_VOICE_JSON__/g, JSON.stringify(voicePrecache))
        writeFileSync(swPath, stamped)
        console.log(`[stamp-sw] ${precache.length} chunks + ${voicePrecache.length} clips voix pré-cachés pour le hors-ligne`)
      } catch (e) {
        console.warn("[stamp-sw] impossible de tamponner sw.js:", (e as Error)?.message)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker(path.resolve(__dirname, "../frontend/dist"))],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../frontend/dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router"],
          "vendor-leaflet": ["leaflet"],
          "vendor-lucide": ["lucide-react"],
          "vendor-motion": ["framer-motion"],
          "vendor-recharts": ["recharts"],
          "vendor-ui": ["sonner"],
        },
      },
    },
  },
})
