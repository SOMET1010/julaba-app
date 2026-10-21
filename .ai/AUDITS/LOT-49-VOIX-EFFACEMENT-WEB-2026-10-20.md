# LOT 49 — EFFACEMENT QUI SE DIT + DICTÉE WEB (20/10/2026)

| | |
|---|---|
| date | 20/10/2026 |
| déclencheur | Patrick : (1) la phrase d'effacement ivoirienne à prononcer « pour chaque suppression » ; (2) « Pour vendre je vois "La dictée n'est disponible que dans l'application…" — je veux la dictée en web, regarde si Sherpa est correctement implémenté » ; (3) « avons-nous un dictionnaire de produits ? » |
| périmètre | `services/entreeVoix.ts`, `services/loginVoiceScript.ts`, `services/tataUiClips.ts`, `i18n/voice/catalog.ts`, `components/auth/LoginPassword.tsx`, `services/voixConnexionLotA.test.mts`, `hooks/useVoiceCore.ts`, clip `login-41.mp3`, registre + inventaire |
| base | dev@75d2a51 |
| verdict | **Clip AUTH_41 en place et joué à chaque effacement du numéro ; effacement du CODE reparle (AUTH_24, était muet) ; message web dit la vraie cause ; verify 150/2/152 — 0 rouge nouveau.** |

---

## 1. LE CLIP D'EFFACEMENT — AUTH_41 (décision Patrick, 20/10)

- Phrase EXACTE (les cinq endroits que la garde [4] exige — table, écran,
  script, catalogue, manifest) : **« Mmmh… Tu es en train d'effacer le
  numéro, un ? Hein ! »**
- Clip `login-41.mp3` : TTS du 20/10 (voix tongtong, « Mmmh » tenu ~1 s,
  pauses comprimées à ~0,43 s, atempo 1,25 → **5,9 s**, mono 24 kHz 64 kbps).
  `atteste: false` — personne ne l'a écoutée ; une locutrice pourra la
  refaire au studio. Dioula à enregistrer (règle lot B).
- La règle du lot A (« un effacement ne nomme pas le numéro ») est détendue
  ICI SEULEMENT par la décision datée ; l'effacement du CODE garde AUTH_24
  « C'est effacé net. » — et PARLE désormais (il était muet : écart noté
  dans AUDIT-CORRECTIONS-ROUGES-2026-10-20 §3.5, fermé ici).
- Garde `voixConnexionLotA` recalée : [5] verrouille AUTH_24 (anonymat du
  code) ET AUTH_41 (texte exact, aucun chiffre écrit, le `parle()` vit dans
  le geste).

## 2. LA DICTÉE WEB — LE VRAI DIAGNOSTIC

- La dictée web EXISTE depuis la décision du 19/10 (`voice-offline/webReco.ts`,
  reconnaissance du NAVIGATEUR, traitement local inchangé) — Chrome, Edge,
  Safari ≥ 14.1, APK exclue (sherpa garde la main).
- Sherpa est **correctement implémenté** : `nativeStt.ts` → plugin Capacitor
  `SherpaSttPlugin.kt`, strictement Android, non-opération sur web (décision
  du 11/08, moteur unique, zéro téléchargement surprise).
- Le message « La dictée n'est disponible que dans l'application… »
  (`useVoiceCore.ts:975`) ne sortait que quand le navigateur lui-même ne sait
  pas écouter (Firefox, vieux Safari, WebView d'applis sociales) — mais il
  était DEVENNU FAUX depuis le 19/10 : il démentait la dictée web.
- Correctif : le message ne sort plus que si sherpa ABSENT **ET**
  `recoWebDispo()` FAUX, et dit la vraie cause : « Ton navigateur ne sait pas
  écouter la voix. Ouvre Jùlaba dans Chrome, ou touche les produits. »

## 3. LE DICTIONNAIRE DE PRODUITS — LA RÉPONSE (aucun défaut trouvé)

Trois couches, par ordre de reconnaissance à la VENTE :
1. le lexique du moteur (28 formes en dur, `vocabulaire.ts PRODUITS_FORMES`) ;
2. SON étal (les produits QU'ELLE a enregistrés — `nomDeSonEtal` +
   `apparierProduit`, ambiguïté → refus, on ne devine pas l'argent) ;
3. hors des deux → « Je n'ai pas bien compris » — elle le crée d'abord
   (dictée du nom libre : `nomLibreDicte` accepte TOUT nom, cf. 1aa133c ;
   tactile « Autre article », cf. e3e3a63), puis il est reconnu pour toujours.

## 4. Gates

- `tsc -b --force` exit 0 ; eslint 0 erreur (7 fichiers)
- 12 suites vertes (voix-connexion-lot-a, i18n-source, i18n-locales,
  i18n-empreintes-argent, clips-embarques, registre-voix, auth-charte,
  parole-entree, web-reco, lien-activation, micro-contraint + fcfa)
- **verify complet : 150 vert / 2 rouge (2 CONNUS) / 152 — 0 rouge nouveau**

## 5. Ce que ce lot NE fait PAS

- La voix TTS est une voix de TRAVAIL (`atteste: false`) — l'oreille de
  Patrick/une locutrice tranche ; le studio peut refaire le clip sans toucher
  le code (même chemin de fichier).
- La traduction dioula d'AUTH_41 (règle lot B : jamais de traduction de
  travail non validée sur un écran d'entrée).
- Recette appareil P3 : inchangée, ouverte.
