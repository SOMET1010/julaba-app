# BACKLOG JÙLABA — items ouverts

> Source de vérité partagée entre agents. Mise à jour au fil des lots.
> Format : `[priorité] type — intitulé (côté utilisatrice) · contexte/écran`
>
> État de référence : **post-recette UX marchande (août 2026)**. Le cœur du
> parcours marchande (caisse espèces, vérité argent, stock CRUD, suppression,
> guidage vocal) + une passe UX complète = **FAITS et recettés à l'écran**.
> Ne pas re-traiter les items de la section « Livré ».

---

## 🟢 Livré & recetté (ne pas re-traiter)

Parcours marchande — socle (#131 → #148) :
- Caisse espèces + vérité argent + création produit lot 1 (recette réelle 6/6).
- Suppression produit : API (#139) **et** modale UI (portail z-index) réparées.
- Fiche produit : « Derniers mouvements » filtrés par produit ; dates en jour
  **local** (plus d'UTC) ; endpoints `objectifs/today` + `raccourcis` en absolu.
- Guidage vocal : « Complet » force le guidage quel que soit le profil de lecture.
- Sécurité : escalade de rôle anonyme → super_admin **fermée** (PR #86, mergée).
- Validation body raccourcis → 400 propre (#148).

Passe UX marchande (août 2026, recette visuelle mesurée 390×844, 0 régression) :
- Cibles tactiles ≥44px : croix X + steppers fiche produit (#152), bouton retour
  de l'en-tête partagé sur 13 écrans (#154).
- Fiche produit : bouton « + Ajouter » du réappro non tronqué (#151).
- Caisse : « + » vente rapide lisible (blanc opaque, icône marque) puis cercle
  parfait (#153, #158).
- Accueil : « Bonjour Maman … » sur une ligne (#156) ; 4 tuiles refaites en
  **icônes vectorielles locales** — plus de double libellé, marche hors-ligne (#157).
- Ventes : filtre « Par la voix » (au lieu du jargon de marque) (#155) ; reçu par
  partage WhatsApp/SMS, retrait du PDF « à lire » pour non-lectrices (#149).
- Accents UI corrigés (« Réapprovisionner », aide « Stock bas », etc.).

---

## 🔴 À MERGER (prêt, CI verte, action utilisateur)

Batch UX ouvert, toutes `clean` + validées ensemble en recette finale :
- **#149** reçu par partage (sans PDF) · **#150** doc audit UI · **#151** « + Ajouter »
  non tronqué · **#152** cibles ≥44px fiche · **#154** retour ≥44px · **#155** « Par la voix ».

> Rien d'autre ne dépend de ces merges côté code ; ils peuvent partir en une fois.

---

## 🟠 À FINIR — cadrable sans décision (petits lots)

- **[P2] cible tactile — Cloche notifications 40→44px.** ✅ **FAIT** (#159, mergé).
- **[P2] recette — Suppression produit hors écran en desktop.** ✅ **VÉRIFIÉ CLOS** :
  recette visuelle 1280×800 ET 1920×1080 → confirmation parfaitement centrée,
  entièrement visible, boutons cliquables (overlay z-210 via ModalPortal). Le défaut
  n'est plus reproductible. Boutons de la confirmation passés à ≥44px au passage.
- **[P2] finitions — Balayage accents résiduel.** Vérifier les écrans des **autres
  rôles** (producteur, coopérative, institution) — la passe a couvert marchande.
  Réf : `docs/AUDIT_ACCENTS_UI.md`.

## 🔵 À FINIR — validation terrain / appareil (hors sandbox)

- **[P1] dictée « Dis le nom » du produit — livrée, à valider sur téléphone réel.**
  Non exerçable sans micro en sandbox. Modale d'ajout `GestionStock`.
  **→ recette utilisatrice sur appareil.**
- **[P1] recette réelle — parcours marchande de bout en bout sur téléphone**
  (réseau faible + hors-ligne) : confirmer que les tuiles/offline tiennent en vrai.

## 🟣 À CADRER — décision / périmètre requis

- **[décision] PR #85 (repeigne Profil & Paramètres aux tokens) — fermée sans merge.**
  Abandonner définitivement, ou refaire proprement en petit lot ? Écran : Profil /
  Paramètres marchande.
- **[P2] Lot 2 création produit (wizard / écran express).** **Conditionnel** : seulement
  si le formulaire simplifié se révèle insuffisant en recette terrain.
- **[P2] Vente guidée v0.3** (produit→quantité→panier→encaisser→confirmation) :
  design validé, **zéro code**. Décider si on la construit maintenant.
- **[P2] parcours métier profonds non recettés** : négociation d'achat
  grossiste→producteur bout en bout ; validation dossier identificateur.
  Nécessite données/flux réels. Réf : `docs/RECETTE.md` séance 3.

---

## Méthode (ce qui marche — à garder)

Petit lot → un défaut, un PR, une CI · yeux sur l'écran (agent visuel qui **mesure**)
· zéro risque argent/schéma · recette avant de déclarer « fait ». Reproductible
écran par écran, rôle par rôle.
