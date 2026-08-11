# Procès-verbal de recette runtime — Julaba

Recettes déroulées dans un NAVIGATEUR PILOTÉ (Chromium headless, mobile
390×844), frontend construit + backend NestJS + PostgreSQL 16 locaux, seed
de démonstration. Chaque ligne a été VUE à l'écran (captures partagées),
pas seulement testée en code.

## Séance 1 — 11/08/2026 (v5.0.0.18, base main)

### Infra de recette (reproductible)
- PostgreSQL 16 local (base vierge) → le backend CONSTRUIT son schéma tout
  seul (synchronize sur base vierge) et charge le seed démo au démarrage.
- Backend : `npm run build --workspace backend` puis `node dist/main.js`
  avec `DB_HOST/DB_PORT/DB_USERNAME/DB_NAME`, `JWT_SECRET`,
  `PIN_ENCRYPTION_KEY`, `REFRESH_TOKEN_SALT`, `NODE_ENV=development`.
- Frontend : `frontend/dist` servi avec un mini-proxy même-origine
  `/api/v1 → localhost:3000` (l'API_URL par défaut est relative).
- Comptes seed utiles : Adjoua Kouamé **07 25 25 25 25 / 0000**
  (demi-grossiste, avec données), Aya Koffi 07 90 90 90 90 / 0000
  (détaillante), Michelle Walebo 07 26 26 26 26 / 0000 (grossiste).

### Vérifié VERT (vu à l'écran)
- Atterrissage : maquette DGE × ANSUT, aucun débordement, zéro erreur JS.
- Onboarding 2 écrans (« Moi, c'est Tata », « Touche et parle ») : rendu
  conforme à la maquette, Passer fonctionne, choix du mode d'accès OK.
- Connexion au PAVÉ à gros chiffres : numéro 10 chiffres → étape code →
  entrée dans l'app. Zéro erreur JS.
- « Tata me reconnaît » Lot 2 : la proposition « Adjoua, veux-tu que Tata
  te reconnaisse la prochaine fois ? » apparaît après connexion ; le refus
  est respecté (pas de re-proposition dans la session).
- Accueil marchande : « Bonjour Maman Adjoua », caisse du jour 1 500 F
  (données seed), Nouvelle vente, Vendre à la voix.
- Caisse demi-grossiste (v5.0.0.11) : produits seed affichés, ajout au
  panier, **prix convenu par ligne** (15 000 → 14 000 tapé, total recalculé
  14 000), billets CFA colorés + « Compte juste », **vente validée**
  (« Vente réussie — 14 000 F — Espèces ») persistée au backend local.
- Confort visuel (v5.0.0.14/15/16) : sombre → `--encre` inversée ; soleil
  exclusif du sombre ; migration `julaba_dark_mode` ; soleil × taille de
  texte = zoom 1,43 mesuré (fix v5.0.0.18).
- CONTRE-ÉPREUVE détaillante (Aya, 07 90 90 90 90) : son panier n'a QUE
  quantité + montant reçu (2 champs) — AUCUN champ de prix, là où Adjoua
  (demi-grossiste) en a 3. Le parcours détaillante est bien inchangé.

### Trouvé et corrigé PENDANT la recette
- Deux règles `zoom` sur body (soleil et taille) ne se multipliaient pas :
  le curseur était écrasé en mode soleil → une seule règle
  `calc(var(--zoom-texte,1) * var(--zoom-soleil,1))` (v5.0.0.18).

### Restes à recetter (prochaines séances)
- Parcours voix (sherpa) : APK uniquement — hors navigateur.
- WebAuthn « Tata me reconnaît » Lot 1 : nécessite un authenticator
  (virtuel CDP possible) — non déroulé.
- Grossiste (Michelle) : marché virtuel et caisse négoce.
- Support : compteur local « réponses non vues » avec un ticket réel.
- Autres rôles : producteur, coopérative, identificateur, institution, BO.
