# 🧾 Dette architecturale — priorisée

> Registre vivant. Toute anomalie découverte hors du chantier en cours est
> **inscrite ici** (pas corrigée à la volée, pas oubliée). On la résorbe quand
> son parcours devient le chantier, ou par une tâche dédiée.
>
> Priorité : **P0** = casse la confiance / l'argent · **P1** = doublon ou faille
> structurelle · **P2** = propreté / dette de forme.

| Prio | Dette | Où | Pourquoi ça compte |
|------|-------|----|--------------------|
| **P0** | Tables `academy_*` non créées sur une base **existante** (ni migration ni db-init) | `backend/src/database/*` | En prod, `/academy/*` renvoie 500 (relation inexistante). |
| **P0** | Invariantes (argent + métier) à brancher en **continu** (cron/déploiement) contre la base réelle | `scripts/verifier-invariante-argent.mjs`, `verifier-invariantes-metier.mjs` | Un garde-fou ne protège que s'il tourne aussi sur la prod, pas seulement en CI. |
| **P1** | **Accueil télécharge TOUT le journal** (≈2,4 Mo à 5 000 mouvements, endpoint sans pagination) | GET `/caisse/transactions` + dérivations côté client | La dérivation SQL est gratuite (2–3 ms), mais expédier tout le journal au client grossit sans limite. À corriger : dérivations **côté serveur** (`/caisse/resume` = quelques nombres) + pagination de la liste. Aligné « la donnée est le produit ». |
| **P1** | **3 écrans d'accueil** concurrents (doublon sémantique) | `MarchandHome`, `MarchandAccueil`, `shared/universal/UniversalAccueil` | Viole §1. À réduire à une implémentation (parcours « commencer sa journée » / « accueil »). |
| **P1** | **3 écrans Academy** + hook cassé + code mort | `academy/JulabaAcademy` (+`MarchandAcademy`), `hooks/useAcademy` (importe 10 fns inexistantes), `imports/academy-api.ts` | Viole §1 et §5. Module évolutif : à repenser entièrement (voir audit Academy). |
| **P1** | Academy **backend vide** : 0 module/question ; 377 questions locales orphelines jamais chargées | `academyQuestions.ts` vs `academy_questions` | Le contenu existe mais n'atteint jamais l'apprenante. |
| **P1** | Calcul de caisse **résiduel** hors du journal | `contexts/CaisseContext.tsx` (`soldeJour = ventesJour − cahierJour`) | ADR-001 : toute vue doit dériver du journal. À supprimer/dériver. |
| **P1** | `useAcademyTracking` utilise des chemins **relatifs** `/api/v1/...` (ignore `API_URL`) | `hooks/useAcademyTracking.ts:4,23` | En prod à deux domaines, tape le site statique → suivi silencieusement cassé. |
| **P2** | Vues **multi-jours** du crédit calculées côté client (données partielles) | `getFinancialSummary` (7/30 j) | Le cash crédit multi-jours n'est pas dérivé du journal complet. |
| **P2** | `caisseTheorique = fond + ventes − cahier` (non affiché, mais faux car `ventes` inclut le crédit) | `contexts/AppContext.tsx` (closeDay) | Latent ; à dériver de `getTodayStats.caisse`. |
| **P2** | Erreurs TS **préexistantes** (n'empêchent pas `vite build` mais s'accumulent) | `getSalesHistory` (Date\|undefined), `MarchandAccueil` (index image), `GestionStock:337` (firstName), `LoginPassword:686/720` | Viole l'esprit de §3. À nettoyer parcours par parcours. |
