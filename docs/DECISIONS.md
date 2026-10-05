# Décisions structurantes

Une ligne par décision : **date · décision · raison**. On ajoute, on ne
réécrit pas. Une décision qu'on annule reste écrite, avec sa date
d'annulation — c'est ce qui évite de la reprendre six mois plus tard en
croyant l'inventer.

Ce fichier ne remplace pas `docs/adr/` (les ADR portent les choix
d'architecture détaillés) ni `JULABA_DECISIONS.md` (l'historique produit). Il
les complète : ici, la trace courte et datée.

---

| date | décision | raison |
|---|---|---|
| 2026-08-15 | **ADR-0002** — convergence du schéma vers des migrations reproductibles, par étapes. `migrationsRun` reste OFF ; le schéma réel se construit par `synchronize` initial + `DbInitService`. Règle « DbInit ⊆ migrations ». | La base de production est vivante et ne se reconstruit jamais de zéro. Les migrations existantes ne tournent pas (« historique incomplet »). |
| 2026-09-17 | Plans Render alignés sur la réalité dans `render.yaml` : `julaba-db` en `basic_256mb`, `julaba-api` en `starter`. **Ne plus les remettre en `free`.** | Le fichier déclarait `free` alors que les services tournaient en payant. Une synchronisation Blueprint aurait voulu les y ramener — un redéploiement pour le service, **des données** pour la base. |
| 2026-09-18 | `fetchCaisseTransactions` pagine jusqu'au bout (plafond 50 pages). | Sans page ni limite, le serveur renvoyait ses 500 dernières transactions : à 501 ventes de 1 000 F, Tata annonçait 500 000 F au lieu de 501 000. Une caisse qui se trompe d'autant plus qu'on l'utilise n'est pas une caisse. |
| 2026-09-19 | **ARGENT-1** — la marge se calcule **ligne par ligne**, et une vente à perte est enregistrée telle quelle. Le plancher à 0 ne reste que pour un **coût inconnu**. | Agréger le coût sur toutes les lignes faisait du prix de vente entier d'un article sans coût un bénéfice. Et `Math.max(0, …)` rendait une vente à perte invisible : « ne jamais masquer une réalité économique ». |
| 2026-09-21 | Refigeage de la seule empreinte `vendreVocal`, sur autorisation explicite. | Tout montant dicté était lu comme le TOTAL : « trois tas de tomates à 500 », catalogue à 500 le tas, entrait à 500 F — le tiers. La grammaire décide désormais, puis le catalogue ; ce que rien ne tranche est **demandé**. |
| 2026-09-25 | Une journée de caisse déjà fermée ne se referme pas : le geste est **empêché**, pas rattrapé. | L'écran annonçait « Journée clôturée avec succès » alors que le serveur refusait. La marchande repartait avec un chiffre que la base ne portait pas. |
| 2026-10-02 | **Keiwa hors pilote** · 198 références `VIV-*` ni renommées ni modifiées (STK-03) · **PR #245 interdite de merge** · pilote **en espèces**, `CAISSE_CREDIT_ACTIF = false` en dur. | Tenir le périmètre du pilote. Le verrou ferme l'**écriture** du crédit, pas la **lecture** de l'historique. |
| 2026-10-02 | **Règle d'arrêt des spikes** : preuve en 1 à 3 expériences, puis ADOPTER / REJETER / BACKLOG. Et : aucun nouveau framework ni harnais sans démonstration préalable d'un gain produit ou de code supprimé. | OSS-01 avait dépassé son point de rendement utile. |
| 2026-10-03 | **ACC-03** — la caisse du jour repose sur **deux** lectures réseau (transactions **et** journée de caisse). Tant que les deux ne sont pas revenues, le montant n'est **pas affirmable** : le champ est **absent**, pas à zéro. | La voix a dit « Ta caisse aujourd'hui : zéro franc » à une marchande qui avait 100 F. L'écran se corrige au rendu suivant ; **une phrase dite ne se reprend pas**. |
| 2026-10-03 | **VER-01** — `verify` n'est plus une chaîne `&&` : un runner exécute les 132 maillons et sort 1 s'il en reste un rouge. | La chaîne s'arrêtait au 59ᵉ maillon, sur les 4 rouges permanents VOICE-01. **70 gardes ne s'exécutaient jamais**, dont trois gardes d'argent déjà rouges que personne n'avait vues. |
| 2026-10-03 | **VER-02** — tout script `test:*` doit être dans `verify`, dans `test:ci`, ou déclaré hors-verify **avec un motif écrit**. | Six bancs n'étaient dans aucune chaîne : écrits, commités, relus, jamais exécutés une seule fois. Deux étaient rouges. |
| 2026-10-03 | **MIC-01** — un réglage de micro unique (`services/contraintesMicro.ts`), avec `echoCancellation`. `sampleRate: 16000` **écarté sur preuve**. | Trois chemins ouvraient le micro nu juste après que l'application a parlé : le moteur transcrivait l'application elle-même. `startLiveDictation` ne lit jamais le taux de la piste — forcer 16 kHz n'apportait rien et risquait une `OverconstrainedError`. |
| 2026-10-04 | **ERPNext écarté** comme moteur. Odoo retenu, puis **mis en suspens** le 05/10. | Le dépôt porte déjà une passerelle Odoo complète — contrat, mock, client réel, flag, mapping, journal. Recréer cette architecture pour ERPNext n'avait aucun bénéfice démontré. |
| 2026-10-05 | **IDEM-01/02** — l'idempotence se juge **par marchande** : index `(user_id, idempotency_key)`. Variante composite retenue plutôt qu'un rejet propre. | L'unicité de la clé seule est strictement plus forte que celle du couple : la migration ne peut pas échouer sur l'existant, rien à nettoyer. L'autre variante rendait l'échec lisible **sans rien corriger**. |
| 2026-10-05 | **Auth agent — voie A** : compte de service + délégation explicite. Code à usage unique **par SMS, jamais par WhatsApp**. | Le code doit voyager par un canal que l'agent **ne contrôle pas** : envoyé sur WhatsApp, quiconque tient le WhatsApp s'auto-délègue. Même règle que SEC-2 pour le PIN. |
| 2026-10-05 | **Invariant d'agent** : aucune portée ne donne accès au compte, au mot de passe, au PIN, au numéro ni à la récupération (`PORTEES_INTERDITES`). | Un agent compromis qui enregistre de fausses ventes est grave, réparable et tracé. Un agent qui prend le compte ne se répare pas. |
| 2026-10-05 | **Plafonds d'agent non renseignés**, et `null` veut dire « pas encore décidé », **jamais « illimité »** : l'écriture est refusée. | Les montants se choisissent sur des données réelles, pas dans le code. Refuser force la décision ; laisser passer ouvrirait une porte que personne n'aurait choisi d'ouvrir. |
| 2026-10-05 | Doctrine **`CONCURRENTLY`** : migration normale par défaut, opération manuelle préparatoire en période sensible, **aucune logique hybride cachée** dans une migration. | Un `DROP INDEX` retire une entrée du catalogue : son coût ne dépend pas de la taille de la table. Une procédure spéciale permanente coûterait plus que la gêne qu'elle éviterait une fois. |
| 2026-10-05 | **Cadre de travail** : session principale = chef de chantier, cinq agents dans `.claude/agents/`, garde-fous réglés **au niveau actuel** pour empêcher l'aggravation sans bloquer. | « Écrire moins, corriger plus. » Des seuils idéaux auraient bloqué tout le dépôt le premier jour. |
