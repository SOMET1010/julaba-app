# JULABA, document de reference

Source de verite du projet. A lire integralement en debut de chaque session avant toute autre action. A mettre a jour a chaque evolution mergee, dans la meme PR que le code quand c'est possible.

Regles de redaction : francais avec accents, aucun tiret long, aucun emoji, phrases courtes et factuelles, datees. Toute affirmation technique cite le fichier ou la source reelle. Les sections marquees "a completer" ne doivent pas etre remplies d'apres l'intention, mais par inspection reelle.

---

## 1. En-tete

- Nom : Julaba (julaba.online)
- Porteur : ICONE Solutions. Lead dev et product owner : Alex Degny (CEO). Co-developpeur : Marco Mancini (GitHub Desiralex25). Chef de projet : Marc Kouassi.
- Depot source de verite : github.com/Desiralex25/Julabaovh
- Miroir : Azure DevOps, organisation DevOps-ANSUT, projet Julaba (lecture seule, aucun deploiement)
- Environnement de production : VPS OVH 149.56.17.9, domaine julaba.online
- Environnement futur ANSUT : julaba.ansut.ci (non implemente)
- Date de derniere mise a jour : 13/06/2026
- Version : 1.0 (initialisation)

---

## 2. Contexte et vision

Plateforme agri-fintech destinee aux acteurs des marches agricoles en Cote d'Ivoire. Construite pour un pilote avec l'ANSUT.

Parties prenantes :
- ICONE Solutions : developpement et propriete produit. ICONE conserve les droits de modification de pipeline cote Azure.
- ANSUT : autorite reglementaire et partenaire. Contacts : Herve Pare, Youssouf Diakite.

---

## 3. Architecture

Frontend : React 18, Vite, TypeScript, Tailwind, motion/react, lucide-react, sonner, react-router. Build via Vite et esbuild (npm run build). chunkSizeWarningLimit a 600 dans vite.config.ts.

Backend : NestJS, TypeORM, PostgreSQL. API sous /api/v1. Conteneur julaba_backend.

Base de donnees : Supabase auto-heberge, PostgreSQL. Conteneur supabase_db_julaba, port 54322, utilisateur applicatif julaba_user, base julaba_db. L'utilisateur d'initialisation du conteneur est supabase_admin (verifie le 13/06/2026), distinct de julaba_user.

Infra : Docker Compose, GitHub Actions pour la CI/CD, VPS OVH.

Stockage des images : disque local du VPS, /var/www/julaba/uploads/. Cloudinary uniquement pour des donnees de test.

Voix et IA : OpenAI Whisper pour la reconnaissance vocale, ElevenLabs pour la synthese vocale en production.

Cartographie : polygones GeoJSON GADM 4.1 niveau 1 pour les regions de Cote d'Ivoire.

Generation de documents : python-docx (compatibilite Word Mac), cairosvg (SVG vers PNG).

Chemins :
- Local : ~/Desktop/Julabaovh/
- Frontend : frontend_src/
- Backend : backend/
- Depot : github.com/Desiralex25/Julabaovh.git
- SSH serveur : alias julaba vers ubuntu@149.56.17.9

Workflows GitHub Actions presents :
- .github/workflows/deploy.yml : deploiement production sur push master.
- .github/workflows/mirror-azure.yml : miroir vers Azure DevOps sur push master et en manuel.

Dependances externes a documenter : ElevenLabs, OpenAI, BICICI (paiement partenaire). A completer (cles, scopes, contacts).

---

## 4. Schemas de donnees

A completer par inspection reelle de la base (\d, pg_enum). Ne pas remplir d'apres l'intention.

Acces a la base, commande de reference :
docker exec -e PGPASSWORD=<mdp> supabase_db_julaba psql -h host.docker.internal -p 54322 -U julaba_user -d julaba_db

Elements connus en memoire, a verifier avant de les inscrire comme definitifs :
- commandes_statut_enum aurait 6 valeurs. receptionnee n'existerait pas dans cet enum. litige existerait en base mais pas dans l'enum TypeScript.
- Roles back-office, 5 roles annonces comme definitifs : super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain.

Tables, colonnes et relations : a completer.

---

## 5. Regles inviolables

Decisions actees qui ne se rediscutent pas.

Deploiement :
- GitHub Actions est le seul moteur de deploiement. Jamais de rsync ou ssh manuel pour reconstruire un conteneur Docker.
- Jamais de push direct sur master. Le travail se fait sur develop.
- La promotion de develop vers master declenche la production. Elle est reservee a Alex, en action consciente et distincte. Jamais executee par un assistant, jamais incluse dans une formule automatique.

Git :
- git add explicite par fichier. Jamais git add . ni git add -A.
- Ne jamais stager erreur.txt (ignore depuis le 13/06/2026).
- Jamais laisser de fichier .bak dans le depot.

Base de donnees et backend :
- Jamais de SQL speculatif. Verifier \d et pg_enum avant d'ecrire une requete qui touche un statut ou un enum.
- Les migrations TypeORM sont toujours executees manuellement en production, jamais en automatique.
- Jamais etendre une whitelist de role backend sans tester le scope reel au curl.
- Deployer le backend d'abord, le tester au curl en production, puis seulement le frontend qui en depend.

Miroir Azure DevOps (acte le 13/06/2026) :
- Le workflow .github/workflows/mirror-azure.yml pousse uniquement master, develop et les tags, par refspecs explicites.
- Ne jamais utiliser git push --mirror ni --prune vers Azure. --mirror echoue sur le namespace refs/pull/* qu'Azure refuse. --prune tente de supprimer la branche ansut (presente sur Azure, absente de GitHub), ce qui exige le droit ForcePush absent du PAT et fait echouer le run.

Securite des cles :
- PIN_ENCRYPTION_KEY (AES-256-GCM) : ne jamais tourner la cle sans migration de rechiffrement. Voir section 10.

Interface back-office :
- Tous les UniversalFilterPanelBO, dans tous les modules BO, utilisent presentation="dropdown". Jamais sheet ni collapsible.

Code :
- Jamais de window.confirm dans le code.
- TypeScript strict. Pas de any ni de valeur en dur non justifiee. Verifier les usages avant de modifier un import.

---

## 6. Workflow de travail

Branches : develop pour le travail, master pour la production (declenche la CI/CD).

Deploiement sur develop (Terminal 2, Mac) :
git status -s && git add <fichiers precis> && git commit -m "<msg>" && git pull origin develop --rebase && git push origin develop
La promotion vers master est ensuite faite par Alex seul, en action distincte.

En cas de divergence de master au push (travail parallele), reconcilier par merge :
git pull --no-rebase --no-edit origin master
git push origin master

Conventions de commit : prefixe fix:, feat: ou chore:, description en francais.

Suivi des runs : gh run watch, ou gh run list --workflow=<nom>.yml.

Terminaux, a ne jamais confondre :
- Terminal 1 : session SSH sur le serveur OVH (ssh julaba). Base de donnees, curl des endpoints, conteneurs.
- Terminal 2 : Mac local. Git, builds, depot.

---

## 7. Composants et briques

A completer et verifier par inspection du code. La liste ci-dessous vient de la memoire et doit etre confirmee (etat reel : code, en cours, a faire).

Modules back-office connus : BOEnrolement, BOActeurs, BOModeration, BOSupervision, BOZones, BOUtilisateurs, FicheIdentificationDynamiqueBO, et autres.

Migrations recentes annoncees : UniversalRechercheBO et UniversalFiltreBO appliques sur plusieurs modules BO, anciens UniversalSearchBarBO et UniversalFilterPanelBO legacy supprimes. Charte BO appliquee. A verifier dans le code.

Dossier frontend_src/src/imports/ : melange de fichiers .ts potentiellement importes (par exemple api-client.ts, backoffice-api.ts, server.ts, plusieurs *-api.ts) et de documentation ou prompts obsoletes. A trier, voir section 8.

---

## 8. Chantiers en cours et a venir

Securite et hygiene (ouvert le 13/06/2026) :
- Nettoyer frontend_src/src/imports/. Supprimer la documentation et les prompts du 28/03/2026, en preservant les .ts reellement importes. Verifier fichier par fichier les imports avant tout git rm. A faire a froid.
- Rapatrier la branche ansut depuis Azure vers le local pour lire et integrer les fichiers de Marco. La branche est sur Azure uniquement, pas sur GitHub.
- Purger node_modules de l'historique git (git filter-repo). Chantier separe.

Roadmap back-office (ordre annonce, statuts a confirmer) :
- 4D-7a, backend BOModeration.
- 4D-7b, UI BOModeration.
- 4D-8, BOSupervision. Note : un commit FEAT 4D-8a backend BOSupervision est present sur le serveur au 13/06/2026, a confirmer comme merge.
- 4D-9, BOCarteActeurs (carte nationale CIV par region, ville, commune, marche).
- 4D-10, BOUtilisateurs, matrice de 42 permissions.
- 4D-11, FicheIdentificationDynamiqueBO.

Migration Azure ANSUT :
- Specification VM remise a ANSUT (Ubuntu 22.04 LTS, 4 a 8 vCPU, 8 a 16 Go RAM, 512 Go SSD).
- Approche duplicata recommandee, VM preferee a un conteneur seul.
- Pipeline de deploiement vers l'environnement ANSUT : non decide. Voir note ci-dessous.

Note ouverte : aucune prod ANSUT n'existe a ce jour. Seul julaba.online (OVH) tourne. La cible julaba.ansut.ci n'est pas en place. La question du pipeline qui deploierait vers l'infra ANSUT reste a trancher (soit GitHub Actions deploie aussi vers ANSUT, soit ANSUT met en place ses propres pipelines depuis le miroir). Marco gere la partie infra ANSUT.

---

## 9. Historique des decisions

13/06/2026, session securite et miroir (operateur Alex) :
- Miroir GitHub vers Azure DevOps mis en place via .github/workflows/mirror-azure.yml, puis corrige en deux iterations. Version finale : push explicite de master, develop et tags, sans --mirror ni --prune. Regle actee en section 5.
- Rotation du mot de passe PostgreSQL de julaba_user. L'ancien Julaba2026 etait expose en clair dans l'historique git. Nouveau mot de passe genere par openssl rand -hex 24, applique en base, aligne dans .env.production, conteneur backend recree, production verifiee (health 200, DB connectee). Ancien mot de passe inactif donc inexploitable.
- Suppression des vestiges sur le serveur et dans le depot (anciens deploy.sh, ci-cd.yml, SECRETS.md, fichiers .bak). erreur.txt retire du suivi et ignore.
- Diagnostic secrets : seul le mot de passe PG etait reel et actif. Les JWT et cles API trouves dans imports/ sont des exemples ou des libelles sans valeur active (verifie par comparaison de hash pour les JWT).

Detail complet : voir la note de session du 13/06/2026.

---

## 10. Points de vigilance et dette technique

- PAT Azure (AZURE_DEVOPS_PAT, scope Code Read & Write) expire le 08/09/2026. A regenerer puis gh secret set AZURE_DEVOPS_PAT avant cette date, sinon le miroir s'arrete silencieusement.
- PIN_ENCRYPTION_KEY (AES-256-GCM) : ne jamais tourner la cle sans migration de rechiffrement. Changer la cle rend indechiffrables tous les PIN deja stockes en base. Rotation prevue au moment de l'installation Azure, avec dechiffrement par l'ancienne cle puis rechiffrement par la nouvelle. Generer une cle fraiche (openssl rand -hex 32), ne pas reutiliser la cle OVH.
- node_modules est trace dans l'historique git (plus de 24000 fichiers). Dette documentee, purge a faire en chantier separe.
- Le clone serveur /var/www/julaba contient un .github/ complet et des fichiers hors CI. Source possible de vieux secrets et de confusion. La CI ne synchronise que frontend/dist et backend/, pas la racine.
- Dossier frontend_src/src/imports/ a nettoyer (doc et prompts melanges a du code).
- Branche ansut sur Azure sans equivalent GitHub : ecart assume a la regle miroir strict, justifie par le travail ANSUT.
- Serveur : Swap usage observe a 99 pour cent le 13/06/2026. A surveiller.
- Anciens secrets (par exemple Julaba2026) restent dans l'historique git de GitHub et du miroir Azure, mais sont inactifs. Les depots sont prives. A garder en tete si une reecriture d'historique est envisagee.

---

## Sections a completer par inspection reelle

- Section 4, schemas de donnees : tables, colonnes, relations, valeurs d'enums.
- Section 7, inventaire des composants et leur etat.
- Section 8, statuts exacts de la roadmap back-office.
