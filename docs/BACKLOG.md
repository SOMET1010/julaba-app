# BACKLOG JÙLABA — items ouverts

> Source de vérité partagée entre agents. Mise à jour au fil des lots.
> Format : `[priorité] type — intitulé (côté utilisatrice) · contexte/écran · qui l'a remonté`
>
> État de référence : post-#139. Recette caisse espèces + vérité argent + création
> produit lot 1 = **FAITES et validées en réel** (#131 → #139), à ne pas re-traiter.

## Axes de développement

| Axe | Items | Ordre |
|---|---|---|
| **A — Suppression réellement utilisable** | P0 modale invisible · #9 desktop | 1er |
| **B — Vérité fiche produit** | #3 mouvements non filtrés · #4 dates UTC · endpoints relatifs | 2e |
| **C — Accessibilité / voix** | #2 « Complet » force le guidage · #5 dictée à valider | 3e (arbitrage requis) |
| **D — Dette d'intégration (autre agent)** | #6 UX entrée + PR #85 · #7 sécurité PR #86 · #12 vente guidée | décision utilisateur |
| **E — Finitions** | #8 accents UI | plus tard |
| **F — Recette métier profonde** | #10 (conditionnel) · #11 grossiste/identificateur | plus tard |

---

## P0 — opérationnel, en vol

- **[P0] bug — Modale de confirmation de suppression invisible.** La modale
  « Supprimer ce produit ? » était en `z-50`, peinte SOUS la fiche produit
  (`zIndex:200`) → invisible et non cliquable : la suppression était inutilisable
  depuis l'UI, malgré l'API réparée en #139. Écran : `GestionStock` fiche produit.
  Remonté : recette #139. **→ En cours (Axe A, ce lot).**

- **[P0] bug — « Supprimer un produit le supprime vraiment ».** `DELETE /stocks`
  renvoyait **401** et l'UI annonçait « supprimé » à tort. **Corrigé #139**,
  **API revalidée en prod** (DELETE 200, purge des 3 produits test faite,
  contre-épreuve 500 honnête). Reste la boucle UI ci-dessus.
  Écran : `GestionStock` fiche produit.

## P1 — prioritaire

- **[P1] arbitrage/évolution — Guidage vocal « Complet » doit forcer le guidage**
  quel que soit le profil de lecture (« Automatique » → `lecture` → tout est muet).
  Cœur de cible non-lectrices. Écran : Paramètres accessibilité. Recette #138 (test 4).
- **[P1] bug — Fiche produit « Derniers mouvements » non filtrés par produit**
  (affiche ceux d'autres produits). Écran : `GestionStock` fiche. Recette #138.
- **[P1] bug — Dates de mouvement fausses** (« hier » pour aujourd'hui). Racine =
  jour calculé en **UTC** (`toISOString().split('T')[0]`) dans `getTodayStats` et
  les mouvements. Sans effet à Abidjan (UTC+0) mais faux + fragile. Recette #138.
- **[P1] dette d'intégration — endpoints relatifs.** `GET /objectifs/today` et
  `GET /raccourcis` partent en relatif vers `julaba-web` au lieu de `julaba-api`
  → renvoient le `index.html` du SPA au lieu du JSON. Silencieux aujourd'hui,
  inopérants tant que non corrigé. Remonté : recette #139.
- **[P1] évolution (livrée, à valider appareil) — Dictée « Dis le nom » du produit.**
  Non exerçable sans micro, à valider sur téléphone réel. Modale d'ajout `GestionStock` (#138).
- **[P1] dette d'intégration (track autre agent) — UX d'ENTRÉE.** Branches périmées
  vs `main` : Lot 1 entrée (`claude/julaba-conversation-6zfdaz`, sans PR) + **PR #85**
  repeigne. Rebase sur `main` + revue. **Décision utilisateur.**
- **[P1] bug sécurité (track autre agent) — M6+M8 (escalade de rôle).** **PR #86**,
  testé rouge→vert, ouverte non fusionnée, périmée. À rebaser/évaluer. **Décision utilisateur.**

## P2 — plus tard

- **[P2] bug cosmétique — Balayage accents** (« benefice »→bénéfice, « Quantite »,
  « Unite », « Parametres avances », « Total recolte », « Publiees »,
  « Recoltes proches »). Réf : `docs/AUDIT_ACCENTS_UI.md`.
- **[P2] bug — Confirmation de suppression hors écran en desktop** (viewport large).
  Cible = mobile. Recette #139. *(Traité incidemment par le portail de l'Axe A — à
  reconfirmer en largeur desktop.)*
- **[P2] évolution (conditionnelle) — Lot 2 création produit** (wizard / écran express) :
  **seulement si** le formulaire simplifié #138 se révèle insuffisant en recette terrain.
- **[P2] évolution/recette — Parcours métier profonds non recettés** : négociation
  d'achat grossiste→producteur bout en bout ; validation dossier identificateur.
  Réf : `docs/RECETTE.md` séance 3.
- **[P2] évolution (track autre agent) — « Vente guidée » v0.3**
  (produit→quantité→panier→encaisser→confirmation) : design validé, zéro code.
