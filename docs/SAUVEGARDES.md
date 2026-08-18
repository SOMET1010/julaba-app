# Sauvegardes de la base — runbook

La base `julaba-db` porte **l'argent des marchandes** (transactions, sessions de
caisse, stock). La perdre n'est pas une panne, c'est la fin de la confiance.
Ce runbook tient en trois règles :

1. **Passer la base en plan payant** avant tout pilote réel.
2. **Un dump quotidien** hors de Render, conservé ailleurs.
3. **Un test de restauration par mois** — une sauvegarde jamais restaurée
   n'existe pas.

## 1. Le plan gratuit ne protège rien

- Le plan `free` de Render **expire après ~90 jours** : la base est alors
  détruite, données comprises (voir `render.yaml`, service `julaba-db`).
- Le plan gratuit **n'a pas de sauvegardes automatiques**. Les plans payants
  ajoutent des snapshots quotidiens avec rétention ~7 jours et la restauration
  point-in-time selon le plan.

**Action requise (dashboard Render)** : julaba-db → *Upgrade* → plan payant le
plus petit. C'est le seul poste de dépense non négociable du pilote.

## 2. Sauvegarde manuelle (à faire dès aujourd'hui, puis chaque jour)

Récupérer l'URL externe : dashboard Render → julaba-db → *Connect* →
**External Database URL** (commence par `postgres://...render.com/julaba`).

```bash
# Dump compressé, cohérent, restaurable sélectivement (-Fc = format custom)
pg_dump "$EXTERNAL_DATABASE_URL" -Fc --no-owner -f "julaba-$(date +%F).dump"
```

- Cadence pilote : **1×/jour** (le soir, après la journée de marché).
- Rétention : garder 7 dumps quotidiens + 4 hebdomadaires.
- Stockage : PAS sur Render, PAS dans le dépôt git (données personnelles +
  argent). Un dossier chiffré Drive/objet S3 privé suffit.
- Automatisation possible : GitHub Actions `schedule` (cron quotidien) avec
  l'URL en secret `DATABASE_URL` et upload du dump en artefact privé — ou un
  simple cron sur un poste de l'équipe.

## 3. Restauration

Scénario : base perdue/corrompue, on repart d'un dump.

```bash
# 1) Créer une base NEUVE sur Render (ou réutiliser l'existante vidée).
# 2) Restaurer le dump dessus :
pg_restore --clean --if-exists --no-owner -d "$NOUVELLE_DATABASE_URL" julaba-2026-08-18.dump
# 3) Repointer le backend : dashboard julaba-api → variables DB_* (ou laisser
#    fromDatabase si c'est la même base recréée) → redémarrer le service.
# 4) Vérifier : GET /api/v1/health, puis connexion d'un compte réel et
#    lecture de son historique de caisse.
```

Points d'attention :

- `--clean --if-exists` supprime puis recrée les objets : ne JAMAIS lancer sur
  une base contenant des données plus récentes que le dump sans avoir
  d'abord dumpé cette base aussi.
- Le backend reconstruit un schéma seulement sur base **vierge**
  (`prepareDatabase` dans `backend/src/main.ts`) ; sur une base restaurée il ne
  touche à rien et les migrations (`DB_MIGRATIONS_RUN=true`) rattrapent un
  éventuel écart de version de schéma.

## 4. Test mensuel de restauration

Une fois par mois : restaurer le dernier dump sur une base jetable (locale via
Docker ou une base Render temporaire), lancer le backend dessus en local, ouvrir
l'historique d'un compte, comparer le total du jour du dump. Noter la date du
test dans ce fichier :

| Date test | Dump testé | Résultat |
|-----------|------------|----------|
| _(à remplir)_ | | |
