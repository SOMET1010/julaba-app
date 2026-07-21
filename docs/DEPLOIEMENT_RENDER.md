# Déployer Julaba V2 indépendant sur Render — guide pas à pas

Un serveur **à toi**, séparé de la V1. Render monte les 3 briques (base + backend +
frontend) depuis ce dépôt grâce au fichier `render.yaml`.

> 💡 Le cœur du produit (vendre / dépenser, même hors-ligne) marche **sans clé API
> payante**. Les clés OpenAI / ElevenLabs sont optionnelles (voir §5).

## 1. Créer le compte et lancer le blueprint

1. Va sur **render.com** → **Get Started** → connecte-toi **avec GitHub**.
2. Autorise Render à voir le dépôt `somet1010/julaba-app`.
3. **New +** → **Blueprint** → choisis le dépôt `somet1010/julaba-app`.
4. Render lit `render.yaml` et propose de créer **3 ressources** (julaba-db, julaba-api,
   julaba-web). Clique **Apply**.
5. Patiente : la base se crée, puis le backend et le frontend se construisent
   (quelques minutes). Les secrets (JWT…) sont générés automatiquement.

## 2. Récupérer les 2 URLs

Une fois créés, chaque service a une URL :
- **julaba-api** → ex. `https://julaba-api.onrender.com`
- **julaba-web** → ex. `https://julaba-web.onrender.com`

(Les noms exacts peuvent varier ; prends ceux affichés dans ton tableau de bord Render.)

## 3. Saisir les 2 valeurs qui relient frontend et backend

**a) Backend — autoriser le frontend**
`julaba-api` → onglet **Environment** → la variable **`CORS_ORIGIN`** →
mets l'URL du frontend, ex. `https://julaba-web.onrender.com` → **Save**.

**b) Frontend — pointer vers le backend**
`julaba-web` → onglet **Environment** → la variable **`VITE_API_URL`** →
mets l'URL du backend **+ `/api/v1`**, ex. `https://julaba-api.onrender.com/api/v1` → **Save**.

## 4. Relancer le build du frontend

`VITE_API_URL` est utilisé **au moment du build**. Donc après l'avoir saisie :
`julaba-web` → **Manual Deploy** → **Clear build cache & deploy**.

Quand c'est vert, ouvre l'URL de **julaba-web** : c'est ton Julaba indépendant. 🎉

## 5. (Optionnel) Activer la voix cloud

Pour la conversation libre et la belle voix cloud, ajoute sur **julaba-api** →
Environment : `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (tes propres
clés). Sans elles, la vente et le cœur du produit marchent quand même.

## Notes honnêtes

- **Base gratuite** : la Postgres gratuite de Render expire ~90 jours ; pour durer,
  passe la base en plan payant (quelques $/mois).
- **Première fois** : un déploiement full-stack peut demander **1-2 petits ajustements**
  (comme Vercel au début). Si Render affiche une erreur, **envoie-moi la capture** et je
  corrige `render.yaml` en conséquence.
- **Migrations** : la colonne `idempotency_key` et le schéma se créent **tout seuls** au
  démarrage du backend (`DB_MIGRATIONS_RUN=true`).
- **Cookies** : `COOKIE_SAMESITE=none` est déjà réglé pour que la connexion marche entre
  les deux domaines Render.
