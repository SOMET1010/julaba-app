# 🚀 JULABA — Guide de Déploiement OVH VPS

## Architecture cible

```
OVH VPS Ubuntu 22.04
│
├── Nginx (reverse proxy + SSL)
│   ├── https://julaba.online        → Frontend React
│   └── https://julaba.online/api/  → Backend NestJS
│
├── NestJS (port 3000, interne)
│   └── Connecté à PostgreSQL
│
└── PostgreSQL (port 5432, interne uniquement)
```

---

## 📋 ÉTAPE 1 — Préparer ton VPS OVH

Connecte-toi en SSH à ton VPS :
```bash
ssh root@TON_IP_OVH
```

Copie et exécute le script d'installation :
```bash
bash install-server.sh
```

---

## 📋 ÉTAPE 2 — Copier les fichiers sur le serveur

Depuis ton ordinateur local :
```bash
# Copier tous les fichiers de déploiement
scp -r JULABA_DEPLOY/* root@TON_IP_OVH:/var/www/julaba/

# Copier le code source du backend NestJS
scp -r "JULABA V2.0/backend-julaba/" root@TON_IP_OVH:/var/www/julaba/backend/

# Copier le code source du frontend
scp -r "JULABA V2.0/" root@TON_IP_OVH:/var/www/julaba/frontend_src/
```

---

## 📋 ÉTAPE 3 — Configurer les variables d'environnement

Sur le serveur OVH :
```bash
nano /var/www/julaba/backend/.env.production
```

Remplace toutes les valeurs `REMPLACER_PAR_...` :

| Variable | Description | Où l'obtenir |
|---|---|---|
| `DB_PASSWORD` | Mot de passe PostgreSQL | Génère un mot de passe fort |
| `JWT_SECRET` | Clé secrète JWT | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Clé refresh token | `openssl rand -hex 32` |
| `ANSUT_BASE_URL | URL base de l API ANSUT | Fournie par ANSUT |
| `OPENAI_API_KEY` | Clé API OpenAI | platform.openai.com |
| `ELEVENLABS_API_KEY` | Clé API ElevenLabs | elevenlabs.io |
| `ELEVENLABS_VOICE_ID` | ID de la voix Tantie | Dashboard ElevenLabs |
| `CORS_ORIGIN` | Ton domaine | `https://julaba.online` |

Générer les clés secrètes rapidement :
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "DB_PASSWORD=$(openssl rand -base64 24)"
```

---

## 📋 ÉTAPE 4 — Configurer ton domaine

Dans le panneau OVH (zone DNS), ajoute ces enregistrements :
```
A    julaba.online       → TON_IP_OVH
A    www.julaba.online   → TON_IP_OVH
```

Dans les fichiers Nginx, remplace `julaba.online` par ton vrai domaine :
```bash
sed -i 's/julaba.online/TON_DOMAINE/g' /var/www/julaba/nginx/julaba.conf
```

---

## 📋 ÉTAPE 5 — Mettre à jour l'URL API dans le frontend

Dans le code frontend, l'API appelle ton backend.
Mets à jour l'URL de base dans le fichier d'API :
```bash
nano /var/www/julaba/frontend_src/src/app/utils/api.ts
```
Remplace l'URL Supabase par :
```
https://TON_DOMAINE/api/v1
```

---

## 📋 ÉTAPE 6 — Lancer le déploiement

```bash
cd /var/www/julaba
bash scripts/deploy.sh
```

---

## 📋 ÉTAPE 7 — Vérifier que tout fonctionne

```bash
# Status des containers
docker-compose ps

# Logs du backend
docker-compose logs -f backend

# Logs de Nginx
docker-compose logs -f nginx

# Test de l'API
curl https://TON_DOMAINE/api/v1/health

# Test de la base de données
docker-compose exec postgres psql -U julaba_user -d julaba_db -c "\dt"
```

---

## 🔄 Mettre à jour l'application (après modifications)

```bash
cd /var/www/julaba
git pull  # ou re-copier les fichiers modifiés
bash scripts/deploy.sh
```

---

## 🛟 Commandes utiles

```bash
# Redémarrer un service
docker-compose restart backend

# Voir les logs en temps réel
docker-compose logs -f

# Accéder à la base de données
docker-compose exec postgres psql -U julaba_user -d julaba_db

# Sauvegarde de la base de données
docker-compose exec postgres pg_dump -U julaba_user julaba_db > backup_$(date +%Y%m%d).sql

# Restaurer une sauvegarde
cat backup.sql | docker-compose exec -T postgres psql -U julaba_user -d julaba_db
```

---

## ⚙️ Variables d'environnement — Référence complète

### Base de données
```env
DB_HOST=postgres          # Nom du container Docker
DB_PORT=5432
DB_USERNAME=julaba_user
DB_PASSWORD=***
DB_NAME=julaba_db
```

### JWT
```env
JWT_SECRET=***            # openssl rand -hex 32
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=***    # openssl rand -hex 32
JWT_REFRESH_EXPIRES_IN=7d
```

### SMS OTP — Wassoya
```env
WASSOYA_API_KEY=***
WASSOYA_API_URL=https://api.wassoya.com/sms/messages
WASSOYA_SENDER_ID=JULABA  # Max 11 caractères
```

### OpenAI
```env
OPENAI_API_KEY=sk-***
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
```

### ElevenLabs (voix Tantie Sagesse)
```env
ELEVENLABS_API_KEY=***
ELEVENLABS_VOICE_ID=***   # ID dans le dashboard ElevenLabs
ELEVENLABS_MODEL=eleven_multilingual_v2
```

### OTP
```env
OTP_EXPIRES_IN_MINUTES=10
OTP_LENGTH=6
```
