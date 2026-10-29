# Packs de voix — publier les clips de Tata sans reconstruire l'APK

Chantier V1 du Studio Voice. La voix de l'appli (clips « Tata Nanti Lou »)
peut être **mise à jour à distance** : nouvelles intros, corrections, clips par
rôle (« offre reçue » pour le producteur), demain d'autres langues — sans
repasser par un build ni par le Play Store.

## Comment ça marche

1. Au démarrage (différé, jamais bloquant), l'appli télécharge un **manifeste
   JSON** depuis `VITE_VOICE_MANIFEST_URL` (variable injectée au build ; sans
   elle, rien ne change : la voix embarquée fait tout).
2. Le manifeste est **validé** (`services/voicePacks.ts`) : URLs http(s)
   uniquement, fichiers relatifs sans `..`, packs invalides écartés. Le dernier
   manifeste valide est gardé en cache local pour les démarrages hors-ligne.
3. À la lecture d'une clé de clip, la hiérarchie est :
   **clip publié (pack) → clip embarqué (`public/voix/tata`) → synthèse du
   téléphone** — toujours via l'audioManager, dans le même créneau exclusif.

## Le manifeste

Exemple complet : `frontend_src/public/voix/manifeste.exemple.json`.

```json
{
  "manifest_version": 1,
  "packs": [{
    "lang": "fr", "voice": "tata_v2", "pack_version": 3,
    "base_url": "https://<hote>/voix/fr/tata_v2/3",
    "clips": [
      { "key": "intro_bienvenue", "file": "intro_bienvenue.mp3",
        "texte": "Bonjour, je suis Tata.", "duration_ms": 2400 }
    ]
  }]
}
```

Règles :

- **Une version de pack est immuable** : la version est dans `base_url`
  (`.../tata_v2/3/`). Publier une correction = nouveau dossier `4/` + nouveau
  manifeste. Retour arrière = repointer le manifeste sur `3/`. Les fichiers
  peuvent donc être servis avec un cache infini.
- `key` est la clé sémantique stable utilisée par le code
  (`vente_enregistree`, `intro_bienvenue`…). Un pack peut ne publier que
  quelques clés : les autres retombent sur l'embarqué.
- `texte` = la phrase EXACTE prononcée (affichée à l'écran pour coller à
  l'audio).
- Format audio : MP3 mono 64–96 kb/s (iso avec l'existant), master WAV 48 kHz
  archivé côté studio, normalisation −16 LUFS avant publication.
- Pour une langue, l'appli choisit le pack à la `pack_version` la plus haute.
  (v1 : seule la langue `fr` est consommée ; `dyu`/`bci` suivront.)

## Hébergement

Le manifeste est **agnostique de l'hébergeur** : l'appli ne connaît que l'URL
du manifeste, et chaque pack porte sa propre `base_url`.

- **Cible (plateforme équipe)** : Azure **Blob Storage** (+ CDN/Front Door),
  voir `docs/AZURE.md`. Un conteneur public `voix/`, dossiers versionnés,
  le manifeste à la racine.
- **Lab / démarrage immédiat** : n'importe quel hébergement statique HTTPS
  fait l'affaire (y compris le site `julaba-web` lui-même : déposer les
  fichiers dans `frontend_src/public/voix/packs/...` les publie — utile pour
  tester le mécanisme avant le Blob).
- CORS : le manifeste et les clips doivent être servis avec
  `Access-Control-Allow-Origin` couvrant le domaine de l'appli (les clips
  lus par `<audio>` tolèrent l'absence de CORS, le manifeste — `fetch` — non).

## Publier (checklist studio, en attendant la console V2)

1. Enregistrer/normaliser les clips, nommer les fichiers par leur clé.
2. Téléverser dans un NOUVEAU dossier de version (`.../tata_v2/<n>/`).
3. Mettre à jour le manifeste (`pack_version: <n>`, `base_url` du dossier).
4. Vérifier depuis un téléphone : vider l'appli des caches n'est PAS
   nécessaire — le manifeste est relu à chaque démarrage connecté.
