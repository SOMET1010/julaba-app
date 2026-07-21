import { defineConfig, type Plugin } from "vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8")) as { version?: string }
const appVersion = pkg.version ?? "1.0.0"

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
// injecte la liste des chunks de route à PRÉ-CHARGER pour le HORS-LIGNE.
//
// Sans ça : (1) sw.js ne change jamais entre deux déploiements → l'appli reste
// coincée sur l'ancienne version ; (2) les pages sont chargées à la demande
// (import dynamique) → hors-ligne, une page jamais ouverte ne se charge pas et
// l'appli plante (« Oops, une erreur est survenue »). On pré-cache donc tous les
// petits chunks (< 200 Ko : les pages marchand, etc.). Les gros paquets communs
// (index, recharts, modèle vocal) sont chargés à la 1ʳᵉ visite et mis en cache
// normalement.
const PRECACHE_MAX_BYTES = 200 * 1024

function stampServiceWorker(outDir: string): Plugin {
  return {
    name: "julaba-stamp-sw",
    apply: "build",
    closeBundle() {
      try {
        const assetsDir = join(outDir, "assets")
        let precache: string[] = []
        try {
          precache = readdirSync(assetsDir)
            .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
            .filter((f) => {
              try { return statSync(join(assetsDir, f)).size <= PRECACHE_MAX_BYTES } catch { return false }
            })
            .map((f) => `/assets/${f}`)
        } catch (e) {
          console.warn("[stamp-sw] liste de pré-cache indisponible:", (e as Error)?.message)
        }
        const swPath = join(outDir, "sw.js")
        const src = readFileSync(swPath, "utf-8")
        const stamped = src
          .replace(/__SW_BUILD__/g, buildId)
          .replace(/__PRECACHE_JSON__/g, JSON.stringify(precache))
        writeFileSync(swPath, stamped)
        console.log(`[stamp-sw] ${precache.length} chunks pré-cachés pour le hors-ligne`)
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
