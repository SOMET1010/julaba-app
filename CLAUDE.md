# JULABA — le projet

Caisse **offline-first** pour des marchandes de vivrier en Côte d'Ivoire,
**dont beaucoup ne savent pas lire**. Elle enregistre ventes et dépenses, tient
un stock, et se pilote **à la voix**, sans réseau.

**La règle qui tranche toutes les autres :** *est-ce qu'une femme qui ne lit
pas peut s'en servir seule ?* Si la réponse dépend d'un texte à l'écran, la
décision est fausse.

## Stack

| | |
|---|---|
| front | React 18.3 · TypeScript · Vite 6 · `frontend_src/` · styles maison (`styles/commerce.css`) |
| back | NestJS 11.1 · TypeORM 0.3 · PostgreSQL · `backend/` · 47 entités |
| voix | Sherpa-ONNX **natif** embarqué (`SherpaSttPlugin.kt`, `SherpaTtsPlugin.kt`, voix Piper/SIWIS). `speechSynthesis` du navigateur est **muet en WebView** : ne pas compter dessus |
| mobile | Capacitor 8 · `com.julaba.app` |
| hébergement | Render — `julaba-db` (PostgreSQL), `julaba-api` (Node), `julaba-web` (statique) |
| API | `https://julaba-api.onrender.com/api/v1` |

## Commandes

```bash
cd frontend_src && npm run verify   # ~200 s, 132 maillons
                                    # attendu : exit 1, 3 rouges CONNUS (🟠), AUCUN rouge nouveau (❌)
cd backend && npx jest -c jest-unit.config.cjs      # tests unitaires
cd backend && npx jest -c jest-invariants.config.cjs # exige un Postgres de test
node ci/garde-argent.mjs            # état de référence : 12 entrés / 14 perdues
npm run check                       # garde-fous (racine)
```

## Règles permanentes du propriétaire — elles ne se négocient pas

- **Aucune pull request sans qu'il la demande.**
- **Les nouveaux tests frontend vont dans `verify`, JAMAIS dans `test:ci`** —
  `test:ci` est **figé à 44 maillons**.
- **Une garde ajoutée doit être inscrite dans
  `frontend_src/scripts/maillons-verify.json`**, sinon
  `test:maillons-orphelins` la refuse. Un banc qui ne s'exécute pas est pire
  qu'absent : il rassure.
- **Quatre refigeages lui sont réservés, jamais lancés par un agent :**
  `test-voix-trace-source.mjs --regenerer` (VOICE-01),
  `empreintesArgent.mts --calculer`,
  `garde-argent.mjs --figer-perimetre` / `--figer-gardes`.
- **Fichiers FIGÉS par empreinte** (VOICE-01) : `hooks/useVoiceCore.ts`,
  `components/layout/AppLayout.tsx`, `contexts/ObjectifContext.tsx`,
  `contexts/AppContext.tsx`. Une information à noter se note **ailleurs** —
  c'est pourquoi `services/lectureHistorique.ts` existe.
- **ALERTE-SEC-01** : 29 identifiants en clair dorment dans le dépôt **public**
  `akoun-dev/julaba`. **Ne jamais écrire un identifiant dans un fichier du
  dépôt**, ni le transmettre par un canal qui l'archive.
- **SEC-2** : le PIN arrive **strictement par SMS**, aucun repli back-office.
  Ne jamais renvoyer `pin` / `pinGenere`.
- **Verrous du pilote** : `CAISSE_CREDIT_ACTIF = false` (en dur),
  `ODOO_REAL_WRITE_ENABLED = false`, `ODOO_PONT_VENTE_ENABLED` absent,
  **Keiwa hors pilote**, les 198 `VIV-*` ni renommées ni modifiées (STK-03),
  **PR #245 interdite de merge**.
- **Jamais deux suites d'invariants en parallèle** sur le Postgres partagé.
- **Un projet = une session + un repo dédié.**
- **Répondre en français**, concis : ce qui est fait, ce qui marche ou non, la
  prochaine étape.

## Doctrines, citées telles qu'elles ont été posées

- « **Pas de correction parce que ça semble faux : reproduction d'abord.** »
- « **On ne compile pas pour répondre à une question que le code tranche
  déjà.** » Logique déterministe → tracer le code. Micro réel, bruit, TTS
  entendu → terrain.
- « **Ne jamais donner deux sens à la même donnée.** »
- « **Sur l'argent, la preuve doit TRAVERSER.** »
- « **Aucune information importante uniquement en texte.** »
- « Documenter une dette ne la ferme pas. »
- « On ne remplace jamais une consigne par une plus pauvre. »
- « Un FAIL ne rouvre pas le produit, il rouvre une ligne. »
- **Arrêt des spikes** : « Preuve en 1 à 3 expériences. Ensuite : ADOPTER /
  REJETER / BACKLOG. Pas dix itérations. »
- « Aucun nouveau framework ou harnais sans démonstration préalable du gain
  produit ou de code supprimé. »
- Et son avertissement, à garder en tête : « ma crainte est que tu fasses
  cadrage et surcadrage et qu'on n'arrive jamais au bout du projet. Je
  simplifierais brutalement. » → **écrire moins, corriger plus.**

## Pièges d'argent déjà payés — ne pas les rouvrir

- **`|| 0` sur un montant est interdit.** `Number(x) || 0` déguise une donnée
  illisible en réponse. C'est ACC-03 : « Ta caisse aujourd'hui : zéro franc »
  dit à une marchande qui avait 100 F. **Une phrase dite ne se reprend pas.**
- **L'idempotence se juge PAR MARCHANDE**, index sur
  `(user_id, idempotency_key)` — jamais sur la clé seule (IDEM-01/02).
- **Trois sécurités, toujours les trois** : lecture préalable, index unique en
  base, rattrapage de la violation `23505`. Seule la deuxième tient sous la
  concurrence.
- **Créer un index avant de supprimer l'ancien.** L'inverse ouvre une fenêtre.
- **Aucun appel réseau dans une transaction SQL.**
- **`POST /caisse/vente` est le SEUL chemin de vente.** On l'appelle, on ne le
  réimplémente pas.
- **Le schéma se construit par `DbInitService`**, pas par les migrations
  (`migrationsRun` est OFF). Toute table nouvelle : DDL dans `DbInitService`
  **et** migration miroir (ADR-0002).

---

# Règles de travail

## Rôle
- Session principale = chef de chantier : enquête, plan, délégation aux agents de .claude/agents/, vérification, livraison.
- Design → designer. Interface → dev-frontend. Base/API → dev-backend. Vérification → recette. Relecture → relecteur.

## Enquête avant question
- Chercher d'abord dans git, la base, Lovable, les mails, Drive et la preview.
- Réponse trouvée = décision appliquée avec sa source. Réponse probable = hypothèse prudente appliquée et signalée.
- Me remonter uniquement les arbitrages ou l'introuvable, en précisant où tu as cherché.

## Livrable d'abord
- Chaque session sert UN livrable, inscrit dans STATUS.md avec sa DoD : critères vérifiables, URL de preview, ce que j'ouvre pour constater.
- Ce qui sort du livrable va au backlog de STATUS.md.
- Fini = chaque critère de la DoD vérifié par l'agent recette sur la preview déployée, avec preuve.

## Une seule validation
- Au démarrage : plan court + questions regroupées. Après mon arbitrage, exécution jusqu'au bout en autonomie.
- Points d'arrêt : changement d'architecture, sortie du périmètre, action irréversible en production, dépense d'argent.

## Autonomie technique
- Sur la branche du livrable : commits fréquents, push, migrations sur la preview, déploiement preview, en autonomie.
- Pull request et merge sur main : sur ma demande explicite.
- Lovable : uniquement pour prévisualiser l'interface quand je le demande.

## Anti-spaghetti
Structure
- Architecture unique décrite dans docs/ARCHITECTURE.md (dossiers, couches, rôle de chacun). Tout nouveau code s'y range ; si rien ne convient, on met d'abord le document à jour.
- Couches séparées : interface (écrans, composants) → logique métier (services, hooks) → accès aux données (un module par source). Les écrans passent par la logique métier pour accéder aux données.
- Dépendances sans cycle.
Une seule source de vérité
- Avant de créer un fichier, un composant, une fonction, une table ou un style : chercher l'existant, le réutiliser ou l'étendre.
- Une seule version par écran ou fonction : on modifie l'original, sans copie « v2 », « new », « copy » ou « old ».
- Couleurs, typographies, espacements : uniquement via le design system.
- Constantes, libellés et règles métier centralisés.
Taille et lisibilité
- Fichier de plus de 300 lignes ou fonction de plus de 50 lignes : on découpe.
- Un composant = une responsabilité. Noms explicites et cohérents dans tout le dépôt.
- Typage strict ; le code inutile est supprimé, pas commenté.
Changements
- Une branche = un livrable. Commits petits et lisibles.
- Ce qu'un changement rend inutile (code, fichier, dépendance, colonne) est supprimé dans le même lot.
- Décision structurante = une ligne dans docs/DECISIONS.md (date, décision, raison).
- Base : toute modification passe par une migration versionnée dans le dépôt.
Contrôle
- Le relecteur vérifie chaque lot : doublon, code mort, couches, taille, design system, migration. Un lot conforme est pushé ; sinon il est corrigé.
- Le script « check » passe avant chaque push.

## Passation
- STATUS.md = source de vérité : livrable, DoD, fait / reste à faire, décisions (sources), hypothèses, À DÉFINIR, backlog, PR, agents mobilisés.
- Mise à jour à chaque étape franchie et avant toute fin de session.
- Contexte long (résumé automatique) : mets à jour STATUS.md et dis-moi « Ouvre une nouvelle session ».

## Clôture de session
- Agents et tâches de fond terminés ou arrêtés : aucun ne reste actif.
- STATUS.md à jour, tout commité et pushé.
- État du chantier remis au format ci-dessous.

## État du chantier (en français, concis)
- Livrable ✅/❌
- Tableau DoD : critère / statut / preuve
- URL preview + branche + dernier commit
- Agents mobilisés et ce que chacun a rendu
- Résultat du script « check »
- Agents et tâches de fond : tous fermés ✅ (sinon lesquels et pourquoi)
- Backlog, À DÉFINIR, prochaine étape
