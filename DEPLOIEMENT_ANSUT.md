# Déploiement de JULABA sur ANSUT dev

Cible : `julaba-dev.ansut.ci`

Ce document décrit le déploiement de l’environnement ANSUT dev avec Docker Compose.
Il ne lance aucune commande distante et ne contient aucun secret.

## Architecture

```text
Client
  |
  v
Nginx du serveur
  |-- /api/       -> 127.0.0.1:3004 -> conteneur backend:3000
  |-- /socket.io/ -> 127.0.0.1:3004 -> conteneur backend:3000
  `-- /           -> 127.0.0.1:8080 -> conteneur frontend nginx:80
```

Les services sont définis dans `docker-compose.ansut.yml` :

- `backend` : image construite depuis `backend/Dockerfile` ;
- `frontend` : `nginx:alpine`, servant `frontend/dist` ;
- uploads persistants dans `/var/www/julaba/uploads` ;
- cache Piper dans `/tmp/piper-cache` ;
- healthcheck backend sur `/api/v1/health`.

## Pré-requis serveur

Sur le serveur ANSUT :

- Docker et Docker Compose v2 installés ;
- dépôt présent dans `/var/www/julaba` ;
- fichier `/var/www/julaba/backend/.env.production` présent ;
- répertoires persistants créés :

```bash
sudo mkdir -p /var/www/julaba/uploads /tmp/piper-cache
sudo chown -R "$USER":"$USER" /var/www/julaba/uploads /tmp/piper-cache
```

Le fichier `.env.production` doit contenir au minimum les paramètres de connexion PostgreSQL et les secrets applicatifs nécessaires au backend. Ne jamais versionner ce fichier.

## Déployer les modifications

Depuis une machine autorisée à accéder au serveur, synchroniser les sources validées dans `/var/www/julaba`, puis exécuter sur le serveur :

```bash
cd /var/www/julaba

docker compose -f docker-compose.ansut.yml config

docker compose -f docker-compose.ansut.yml up -d --build --force-recreate
```

La commande `config` permet de détecter les erreurs de syntaxe Compose avant la reconstruction des conteneurs.

Pour reconstruire uniquement le backend :

```bash
docker compose -f docker-compose.ansut.yml build --no-cache backend
docker compose -f docker-compose.ansut.yml up -d --force-recreate backend
```

Pour reconstruire uniquement le frontend, le dossier `frontend/dist` doit d'abord être produit :

```bash
cd /var/www/julaba/frontend
npm ci
npm run build

cd /var/www/julaba
docker compose -f docker-compose.ansut.yml up -d --force-recreate frontend
```

## Vérifications après déploiement

### État des conteneurs

```bash
docker compose -f /var/www/julaba/docker-compose.ansut.yml ps
```

Les conteneurs attendus sont :

- `julaba_backend` ;
- `julaba_frontend`.

### Logs

```bash
docker compose -f /var/www/julaba/docker-compose.ansut.yml logs --tail=100 backend
docker compose -f /var/www/julaba/docker-compose.ansut.yml logs --tail=100 frontend
```

### Healthcheck backend local

```bash
curl -i http://127.0.0.1:3004/api/v1/health
```

Résultat attendu : HTTP `200`.

### Vérification publique

```bash
curl -i http://julaba-dev.ansut.ci/api/v1/health
curl -I http://julaba-dev.ansut.ci/
```

Résultats attendus :

- API : HTTP `200` ;
- frontend : HTTP `200` ou réponse SPA équivalente ;
- routes React directes : retour vers `index.html` ;
- Socket.IO : vérifier depuis le back-office si le ticker temps réel est utilisé.

### Configuration Nginx

Le vhost est défini dans `nginx/julaba-dev.ansut.ci.conf`.
Après toute modification de cette configuration :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Retour arrière

Avant une mise à jour importante, sauvegarder au minimum le dossier des uploads et noter l'image actuellement utilisée :

```bash
docker image ls
sudo tar -czf /var/backups/julaba-uploads-$(date +%Y%m%d-%H%M%S).tar.gz /var/www/julaba/uploads
```

Pour revenir au code précédent :

1. restaurer la version validée du dépôt ;
2. reconstruire les images ;
3. recréer les services ;
4. rejouer les healthchecks ci-dessus.

```bash
docker compose -f /var/www/julaba/docker-compose.ansut.yml up -d --build --force-recreate
```

Ne pas utiliser `docker compose down -v` en production : cette commande peut supprimer des volumes Docker.

## Déploiement Android

Les modifications du dossier `android/` ne sont pas publiées par le déploiement web Docker. Elles nécessitent un build APK séparé sur une machine équipée d'Android SDK :

```bash
npm run android:sync
cd android
./gradlew assembleDebug
```

L'APK est généré dans :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Checklist

- [ ] Les modifications attendues sont présentes dans la branche à déployer.
- [ ] Les tests et le build frontend passent.
- [ ] `backend/.env.production` est présent sur le serveur.
- [ ] `docker compose ... config` passe sans erreur.
- [ ] Le backend répond localement sur le port `3004`.
- [ ] Le frontend répond sur le port `8080`.
- [ ] Nginx répond sur `julaba-dev.ansut.ci`.
- [ ] `/api/v1/health` retourne HTTP `200`.
- [ ] Les logs backend ne montrent pas d'erreur de connexion à la base.
- [ ] Les routes SPA et le back-office sont vérifiés.
- [ ] Les changements Android ont été traités séparément si nécessaire.
