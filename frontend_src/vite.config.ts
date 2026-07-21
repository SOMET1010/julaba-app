import { defineConfig, type Plugin } from "vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
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

// Tamponne l'identifiant de build dans le service worker COPIÉ dans dist.
// Sans ça, sw.js ne change jamais entre deux déploiements → le navigateur ne
// détecte aucune nouvelle version et continue de faire tourner l'ancienne page
// jusqu'à un rechargement manuel. En changeant ses octets à chaque build, le
// navigateur voit une mise à jour et l'appli se rafraîchit toute seule.
function stampServiceWorker(outDir: string): Plugin {
  return {
    name: "julaba-stamp-sw",
    apply: "build",
    closeBundle() {
      try {
        const swPath = join(outDir, "sw.js")
        const src = readFileSync(swPath, "utf-8")
        writeFileSync(swPath, src.replace(/__SW_BUILD__/g, buildId))
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
