# BACKLOG JÙLABA

> Source de vérité partagée entre agents. Mise à jour au fil des lots.
> Dernière mise à jour : **2026-08-17** (après la nuit des 8 lots, tous mergés + recettés).
> Contraintes permanentes : **argent gelé** (aucun déplacement d'argent/wallet ; corrections
> d'affichage OK) · **gouvernance schéma** (toute évolution de schéma passe par la chaîne de
> migrations, plus de DDL via DbInit) · **ne jamais clobber** les branches de l'autre agent.

---

## ✅ Fait & recetté en prod (nuit du 2026-08-17)

Recette réelle sur compte Adjoua Kouamé (marchand demi-grossiste) : **6/6 PASS**.

| PR | Lot | Statut |
|---|---|---|
| #140 | **Modale de suppression visible** (P0) : `ModalPortal` + `z-[210]` — la modale était sous la fiche (`z-50` vs `z-200`) | ✅ mergé + recetté |
| #141 | **Endpoints marchand → `API_URL`** : objectifs/today, raccourcis, rapport-hebdo (fini le 200+HTML) + `credentials` sur 2 POST | ✅ mergé + recetté |
| #143 | **Endpoints backoffice → `API_URL`** : auth/me, partner/api-keys, identifications/geo·zones | ✅ mergé (recette BO en attente, cf. ci-dessous) |
| #142 | **Accent « bénéfice »** dans la fiche produit | ✅ mergé + recetté |
| #144 | **Vrais « Derniers mouvements » par produit** : lecture du ledger `stock_mouvements` (ventes+annulations), endpoints `GET /stocks/mouvements` et `/stocks/:id/mouvements`, wiring `GestionStock`, tests (backend `mouvement-mapper` + front `mouvementsStock`) | ✅ mergé + recetté |
| #145 | **Dates « aujourd'hui » en jour LOCAL** (caisse) : helper `jourLocal` testé, des deux côtés de la comparaison (no-op à Abidjan UTC+0) | ✅ mergé + recetté |
| #146 | **Cibler le produit par ID exact** (supprime/édite le bon, fini l'homonyme) | ✅ mergé + recetté |
| #147 | **Guidage vocal en « Automatique »** : le guidage n'est coupé que si « Je lis et j'écris » est choisi explicitement | ✅ mergé (⚠️ **proposition** — à re-cadrer, cf. « Résidus ») |

---

## 🔴 Ouvert — priorité (décision / action requise)

- **[P1] recette — Backoffice non recetté.** Les endpoints BO (#143 : auth/me, clés API, carte
  acteurs) sont en prod mais **jamais recettés faute de compte BO admin**. → Fournir un compte
  Super Admin / admin_national pour jouer la recette (session BO tient, page Clés API charge,
  carte des acteurs charge, appels en JSON vers julaba-api).

- **[P1] dette d'intégration — UX d'ENTRÉE / auth (branches autre agent).** À trancher +
  séquencer par l'utilisateur (NE PAS clobber). Deux générations sur le remote :
  - **Récente / cohérente** (base ~#127-#129) : `claude/p0-activation` & `claude/ecran-activation`
    (**P0.0 : enrôlement inerte + activation marchande**, ADR-002) ; `claude/decisions-entree`
    (docs §8 décisions d'entrée). ← point de départ recommandé pour l'intégration.
  - **Ancienne / très périmée** : `claude/julaba-conversation-6zfdaz` (parcours d'entrée v0.3,
    base ~#84) ; `claude/session-ticgbm` (spéc auth + APK/Sherpa). Rebase lourd.
  - **À rattacher ici** : le guidage vocal #147 (même surface accessibilité).

- **[P2] finition backend — `POST /raccourcis` renvoie 500 au lieu de 400** sur body invalide
  (pas de validation → la base tranche sur NOT NULL). Ajouter un DTO + `ValidationPipe` → 400 propre.
  Pré-existant, non bloquant. **Payload nominal** (pour référence / recette) :
  `{ "nom", "declencheur", "type", "action": { "type": "vendre"|"depense"|"stock"|"autre", "produit"?, "montant"?, "quantite"?, "description"? } }`.

---

## 🟠 Résidus / finitions (faible risque)

- **« Derniers mouvements » — réappros absents.** Le ledger `stock_mouvements` n'enregistre que
  les ventes/annulations (écrites par la caisse) ; les réapprovisionnements manuels (PATCH stock)
  n'y passent pas → ils n'apparaissent pas dans le panneau. Ajout = évolution backend (écrire au
  ledger au réappro, ou 2e source) — touche le ledger testé par les invariants.
- **Clé de date de SESSION en UTC.** `AppContext` openDay / `GET /caisse/session/:date` utilisent
  encore le jour UTC (paire client↔serveur cohérente). No-op à Abidjan ; à passer en local **avec
  supervision** (cross-tier), séparément de #145.
- **Guidage « Complet » — proposition livrée (#147) à re-cadrer.** Il n'existe pas d'option
  « Complet » dans le modèle des 4 modes (Auto / Je lis / Je lis un peu / Je préfère parler). #147
  a corrigé le vrai défaut (« Automatique » ne devient plus muet). Si un vrai niveau « Complet »
  distinct est voulu, c'est une décision produit du chantier accessibilité.
- **Dictée « Dis le nom » du produit** (création simplifiée #138) : à valider sur téléphone réel (micro).
- **Confirmation de suppression hors écran en desktop** : normalement réglé incidemment par le
  portail (#140) ; à reconfirmer en largeur desktop.
- **Balayage accents résiduel** : surtout backoffice (faible valeur mission) + cas identifiants à
  ne pas toucher. Réf : `docs/AUDIT_ACCENTS_UI.md`.

## 🟡 Plus tard / conditionnel

- **Lot 2 création produit (wizard / écran express)** : seulement **si** le formulaire simplifié
  #138 se révèle insuffisant en recette terrain.
- **Parcours métier profonds non recettés** : négociation d'achat grossiste→producteur bout en
  bout ; validation dossier identificateur. Réf : `docs/RECETTE.md`.
- **« Vente guidée » v0.3** (produit→quantité→panier→encaisser→confirmation) : design validé,
  zéro code (track autre agent).

---

## Comptes seed (recette)

- Marchand : **Adjoua Kouamé — `07 25 25 25 25` / code `0000`** (demi-grossiste, a des données).
- Producteur : **Bénito — `09 60 60 60 60` / `0000`**.
- Backoffice admin : **à fournir** (bloque la recette BO).

## Prod & recette

- Front **https://julaba-web.onrender.com** · API **https://julaba-api.onrender.com** (`/health`).
- Render redéploie à chaque merge sur `main`. Le front est une **PWA** : pour voir un nouveau
  déploiement → désenregistrer le service worker + vider les caches + hard reload.
- La recette réelle est jouée par un **agent « Claude dans Chrome »** (l'utilisateur est le pont).
