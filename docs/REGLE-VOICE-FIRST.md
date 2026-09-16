# Règle voice-first — et pourquoi elle n'est pas tenue aujourd'hui

> Règle posée par Patrick le 16/09/2026, après une séance sur appareil réel.

## La règle

**Aucune information importante ne doit exister uniquement sous forme de
texte.** Pour les étapes critiques — vente, paiement, fond de caisse,
fermeture, erreur, confirmation — il faut toujours au moins une voie non
textuelle : voix, pictogramme, image, geste, ou combinaison des quatre.

La voix n'est pas un module ajouté : c'est la colonne vertébrale du parcours.
**L'écran est un support visuel de la voix, pas l'inverse.**

Le défaut transversal à corriger, formulé par Patrick : *« la voix disparaît
précisément au moment où la charge cognitive augmente »*. Un écran de résumé de
journée qui aligne « Caisse théorique » et « Comptage réel » en silence demande
à une marchande peu lectrice exactement ce qu'elle ne peut pas faire, au moment
où l'enjeu est le plus fort.

## Pourquoi la règle n'est pas tenable en l'état

La chaîne de synthèse compte trois maillons. **Les trois sont hors service.**

| Maillon | État au 16/09/2026 |
|---|---|
| **Piper** — neuronal, local, voix « Tata Nanti Lou » ivoirienne | `scripts/setup-piper.sh` **n'existe pas**, alors que `render.yaml` l'appelle au build du backend. Les variables `PIPER_BIN` / `PIPER_VOICE` ne peuvent donc pas être satisfaites. |
| **Cloud** (ElevenLabs) | Coupé **volontairement** — souveraineté, zéro coût. Ne s'active qu'avec `TTS_ENABLE_CLOUD=true`. |
| **Navigateur** (`speechSynthesis`) | **Muet dans la WebView Android.** Prouvé par comparaison : même build, Chrome parle, l'APK non. |

`voice.controller.ts` nomme le troisième maillon `"navigateur (gratuit)"` comme
moteur par défaut. C'est le socle de toute la voix du produit, et il ne produit
aucun son sur l'appareil cible.

**Conséquence directe : seuls les 137 clips `ui-*.mp3` déjà enregistrés
s'entendent.** Toute phrase sans clip est un silence — y compris les correctifs
écrits le 16/09.

## Le verrou particulier des montants

« Aujourd'hui tu as vendu pour **1 500** francs » contient une valeur variable.
Elle ne peut pas être un clip : il en faudrait un par montant possible. Dire un
nombre exige donc, au choix :

1. **une synthèse qui fonctionne sur l'appareil** (Piper embarqué, ou une voix
   système française installée et exposée à la WebView) ;
2. **une composition à partir de clips de nombres** — en français, environ
   trente-cinq enregistrements (`zéro` à `seize`, les dizaines, `cent`,
   `mille`, `francs`) couvrent tous les montants, assemblés à la volée. Rendu
   plus haché, mais totalement hors ligne et dans la vraie voix.

**Tant que l'un des deux n'existe pas, aucun écran d'argent ne peut parler.**
C'est le verrou qui commande la règle voice-first, pas les écrans eux-mêmes.

## Ce qui reste applicable dès maintenant

La règle ne se réduit pas à la voix. Sur chaque écran critique, sans dépendre
d'un seul son :

- **pictogramme et couleur** portant l'information, pas seulement le libellé ;
- **saisie par l'objet réel** plutôt que par le chiffre — toucher les billets
  et les pièces reçus au lieu de taper un montant ;
- **geste et vibration** pour confirmer, pour signaler une erreur ;
- **bouton de réécoute** sur chaque bloc porteur d'information — silencieux
  aujourd'hui, audible dès que la chaîne vocale est réparée, sans rien
  réécrire.

## Décision attendue

Trois chemins pour rebrancher la colonne vertébrale :

- **A — Piper au build.** Écrire `setup-piper.sh`, obtenir le modèle de voix
  `tata-lou.onnx`, et **pré-générer les clips manquants au moment du build**
  plutôt que de les enregistrer en studio. Hors ligne, voix constante, et
  chaque nouvelle phrase devient une étape de build et non une séance.
- **B — Clips de nombres enregistrés.** Une séance studio bornée (~35 fichiers)
  qui règle définitivement les montants, sans dépendre d'aucun moteur.
- **C — Piper sur l'appareil.** Le projet embarque déjà un moteur ONNX natif
  (sherpa-onnx pour l'écoute). Ajouter Piper pour la parole donnerait une voix
  hors ligne complète. Le plus ambitieux, et la vraie réponse « voice-first ».

Aucune ne peut être choisie par une instance IA : coût, studio, souveraineté et
délai sont des arbitrages de Patrick.
