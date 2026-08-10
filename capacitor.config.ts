import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
    appId: "ci.julaba.app",
    appName: "julaba-app",
    // Build Vite → frontend/dist (cf. vite.config.ts outDir). Le chemin est
    // relatif à CE fichier (racine du repo).
    webDir: "frontend/dist",
}

export default config
