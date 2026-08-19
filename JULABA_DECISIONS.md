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

13/08/2026, lot Marche B1, durcissement de la cascade de visibilite (Option A) :
- Option A actee : le grossiste publie explicitement son offre vers sa cooperative via POST /publications/republier. Aucune exposition automatique du stock des grossistes. Le demi-grossiste ne voit que ces republications, scopees sur sa cooperative active.
- Garde d'autorite de publication ajoutee sur POST /publications (backend/src/publications-rest/publications-rest.controller.ts, methode create). Creer une offre du marche producteur est desormais reserve aux roles producteur et cooperateur, via la constante ROLES_PUBLICATION_MARCHE_PRODUCTEUR. Avant ce correctif l'endpoint n'avait que JwtAuthGuard : tout compte authentifie, y compris detaillant, demi-grossiste ou institution, pouvait creer une offre visible par tous les grossistes, car le marche grossiste filtre p.type_marche='producteur' sans filtre d'auteur (getMarche).
- Resolveur unique de cooperative active introduit : backend/src/cooperatives-rest/cooperative-resolver.service.ts (CooperativeResolverService.getActiveCooperativeId), expose par cooperative-resolver.module.ts. Les deux sites de visibilite de publications-rest (getMarche demi-grossiste et republier) passent desormais par ce resolveur au lieu de dupliquer la requete cooperative_membres ... actif=true.
- Cascade de visibilite deja enforcee cote serveur avant ce lot (getMarche) : confirme par inspection. Aucune re-derivation cote client ; frontend_src/src/app/components/marchand/MarcheVirtuel.tsx ne fait que du comptage d'onglets sur l'ensemble deja filtre serveur.
- Aucun argent deplace, No-Go Keiwa maintenu.
- Tests : garde et cascade valides par test unitaire local (11 cas, DataSource mockee, verts). Test d'integration ajoute : backend/test/invariants/publication-authorship.spec.ts (harnais test:invariants, Postgres). A executer en CI ou en local avec base ; non execute en environnement de developpement sans Postgres. Verifie vert en CI (job Invariants) sur la PR #90.

13/08/2026, lot Marche B2, reservation de stock sur commande, sans mouvement d'argent :
- Modele choisi : table dediee stock_reservations (une ligne par commande, cle unique commande_id). Nouvelle entite backend/src/commandes/entities/stock-reservation.entity.ts et migration backend/src/database/migrations/1779200000000-AddStockReservations.ts (a executer manuellement en prod, cf. section 5). Colonnes uuid nues, sans FK (integrite geree par le service), pour eviter la dette FK varchar/uuid vue sur cooperative_membres.
- Service backend/src/commandes/stock-reservation.service.ts, transactionnel et idempotent (cle commande_id), verrou FOR UPDATE sur la publication : reserver (reduit publications.quantite_disponible, ligne 'active' ; bloque 409 si disponible insuffisant), convertir (finalise en vente ferme, decrement des recoltes liees, 'epuise' si vide, ligne 'convertie'), liberer (restitue le disponible, ligne 'liberee').
- Cablage dans commandes-rest.controller.ts : POST /commandes reserve a la creation en_attente (ou convertit si creee confirmee) dans une transaction ; PATCH /commandes/:id convertit a la confirmation (remplace l'ancien decrement SQL brut, sans transaction ni idempotence) et libere a l'annulation. Le disponible du marche reflete donc immediatement les commandes en attente.
- Choix actes : reserver a la creation ; bloquer si stock insuffisant (on ne reserve pas ce qui n'existe pas) ; convertir a la confirmation.
- Aucun argent deplace : le paiement reste isole dans POST /commandes/:id/paiement, jamais touche par ce lot. No-Go Keiwa maintenu.
- Tests : service valide par test unitaire local (9 cas, EntityManager mocke, verts). Test d'integration ajoute : backend/test/invariants/stock-reservation.spec.ts (reserve, blocage 409, liberation, conversion, idempotence). A executer en CI / local avec Postgres.
- Lecture demi-grossiste confirmee en Option A (13/08/2026) : le demi-grossiste ne voit que les republications explicites des grossistes de sa cooperative active (aucune exposition automatique). Deja enforce cote serveur (getMarche, lot B1).
- Regle argent gele actee pour ce lot et gravee en garde-fou executable : backend/test/invariants/argent-gele-b2.spec.ts verifie qu'un cycle complet (creation, reservation, confirmation, annulation) ne cree aucune ligne wallet_transactions et ne modifie aucun solde. L'argent ne bouge qu'a POST /commandes/:id/paiement, jamais exerce par ce lot.

13/08/2026, deploiement : etape migration controlee ajoutee a .github/workflows/deploy.yml :
- deploy.yml reste en workflow_dispatch (declenchement manuel, un clic, jamais auto sur push). Nouvel input booleen run_migrations (decoche par defaut) : un deploiement de code seul ne touche pas la base ; cocher la case execute les migrations en attente.
- Une etape 'Migrations en attente (lecture seule)' liste toujours l'etat (migration:show) ; l'etape 'Executer les migrations' (migration:run, idempotent) ne s'execute que si run_migrations est coche. Ordre : rebuild backend, attente conteneur, show, run conditionnel, health check. Backend d'abord, conforme section 5.
- Commande utilisee dans le conteneur julaba_backend : node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js. Raison : le conteneur runtime est bati npm ci --omit=dev et npm/npx y sont retires (Dockerfile) ; ni ts-node ni le script npm ne sont disponibles. typeorm est une dependance runtime et nest build compile data-source.ts et les migrations en JS dans dist/, d'ou l'appel direct au CLI compile.
- Ceci reste dans la regle section 5 (migrations manuelles en prod) : le declenchement est un acte humain delibere (Run workflow + case cochee), jamais automatique. Applique notamment la migration B2 1779200000000-AddStockReservations.

13/08/2026, clarification chaine de prod : la production reelle est RENDER, pas le VPS OVH.
- render.yaml (blueprint) monte julaba-db (Postgres manage), julaba-api (backend NestJS, autoDeploy: true) et julaba-web (front statique, autoDeploy: true). Un push sur main redeploie automatiquement. Le VPS OVH et .github/workflows/deploy.yml (SSH/Docker) sont une seconde chaine, non utilisee pour servir la prod Render.
- Gestion du schema sur Render : prepareDatabase() dans main.ts active synchronize UNIQUEMENT si la base est vierge ; sur base peuplee, synchronize et migrationsRun sont OFF (DB_MIGRATIONS_RUN non defini, historique de migrations incomplet qui echouerait). Le schema reel est complete au boot par DbInitService.runInit() (CREATE TABLE IF NOT EXISTS idempotents), appele depuis main.ts a chaque demarrage.
- Consequence B2 : la table stock_reservations n'etait creee ni par synchronize ni par migration sur la base peuplee. Ajoutee a DbInitService.runInit() (miroir de la migration 1779200000000). Au prochain autoDeploy Render (declenche par le merge), la table se cree automatiquement, sans acces DB ni SSH. La migration TypeORM et l'entite restent en place pour les autres environnements et les tests.

19/08/2026, audit deploiement : GPS communes / distance recoltes-prevues (grossiste) reparee sur base neuve ET base existante.
- Cause racine : la migration qui ajoute communes.latitude/longitude et cooperatives.commune_id vivait dans migrations/_archive/ (hors du glob de migration actif depuis l'archivage ADR-0002 Etape 1) — elle ne tournait plus jamais. Sur une base VIERGE, en plus, migrationsRun reste force a false quel que soit l'emplacement du fichier (schema-flags.ts, computeBootDbFlags) : synchronize construit le schema depuis les entites Commune/Cooperative, qui NE declarent PAS ces colonnes (design volontaire, deja documente dans l'ancienne migration). GET /producteurs/recoltes-prevues (haversineKm) plantait donc en SQL ("column does not exist") sur tout environnement neuf (ex. ANSUT), pas seulement sur une base existante avec migrations OFF.
- Meme mecanique que la resolution stock_reservations du 13/08/2026 ci-dessus : ajoutee, EN PLUS d'une migration active, a DbInitService.runInit() (miroir exact) — seul mecanisme garanti de s'executer inconditionnellement au boot, base neuve ET existante. Nouvelle migration ACTIVE (post-baseline) : backend/src/database/migrations/1780900000000-AddCoordsToCommunesAndCommuneIdToCooperatives.ts, recreation fidele (memes ALTER/FK/coordonnees, aucune valeur inventee) de l'ancienne migration archivee du meme nom. `npm run verify:dbinit-subsumed` confirme 0 objet ajoute/retire par DbInit par-dessus la chaine de migrations (belt-and-suspenders coherent avec la regle ADR-0002 « toute future modification de schema passe par une migration »).
- Bug connexe decouvert et corrige au passage (meme endpoint, empechait le calcul de distance de fonctionner meme apres l'ajout des colonnes GPS) : users.commune_id est type varchar (drift entite pre-existant, comme district_id/region_id/departement_id) alors que communes.id est uuid. producteurs-rest.controller.ts comparait directement les deux types ("operator does not exist: uuid = character varying", 500 systematique des que la requete s'execute). Corrige par un cast SQL cote lecture (cm.id::text = u.commune_id), sans toucher au type de la colonne (pas de risque sur d'autres usages de users.commune_id).
- Couverture : backend/test/invariants/communes-gps-distance.spec.ts reconstruit un schema depuis zero (synchronize + DbInit, comme le reste du harnais) et verifie de bout en bout : colonnes + FK presentes, coordonnees WGS84 exactes (recopiees de l'ancienne migration), et GET /producteurs/recoltes-prevues renvoie/trie la vraie distance Haversine (oracle independant), y compris le cas producteur sans commune resolue (distance null, relegue en fin de liste).
- Perimetre assume, hors de ce lot : sur une base neuve, seules les 13 communes d'Abidjan sont creees par AdminDivisionsSeedService (COMMUNES_ABIDJAN_SEED) ; les 28 communes "chef-lieu" (codes CHL-*) de l'ex-migration n'existent comme lignes que sur les bases ou elles ont ete inserees hors versionning (comme documente dans l'ancienne migration archivee). Le seed de coordonnees etant un UPDATE cible par "code", c'est un no-op silencieux pour un code absent — aucune erreur, mais ces 28 communes ne recoivent pas de coordonnees tant que leurs lignes n'existent pas. Compléter le seed des 28 chef-lieux (creation des lignes, pas seulement leurs coordonnees) est un chantier separe si des producteurs hors Abidjan doivent apparaitre dans recoltes-prevues sur un environnement neuf.

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
- Resolution de cooperative encore dupliquee hors du chemin de visibilite (constate le 13/08/2026). producteurs-rest.controller.ts (recoltes-prevues) et scores.controller.ts gardent leur propre requete ; recoltes-prevues joint la commune et filtre bien actif=true. En revanche cooperatives-rest.controller.ts ma-cooperative lit la derniere adhesion par created_at SANS filtre actif=true : il peut afficher une cooperative inactive, divergent du resolveur canonique. C'est un endpoint d'affichage, sans impact sur la cascade de visibilite du marche. A reconcilier prudemment : une adhesion en attente ne doit pas disparaitre de l'ecran.
- L'upsert de POST /publications utilise ON CONFLICT (user_id, LOWER(TRIM(produit))). Aucune migration TypeORM ne cree l'index d'expression unique correspondant ; il doit exister en prod par DDL manuelle. A verifier en base de prod et a inscrire dans une migration pour reproductibilite. Le test d'integration publication-authorship.spec.ts cree cet index dans son setup pour rester deterministe sous synchronize.
- B2, voie negociation non couverte par la reservation (constate le 13/08/2026). Les commandes creees par negociation acceptee (commandes-rest.controller.ts, repondreNegociation et marchandRepondreContreOffre) n'ont pas de publication_id : l'entite negociations ne le stocke pas et le front ne l'envoie pas. Elles ne reservent donc ni ne decrementent aucun stock. Corriger demande d'ajouter publication_id aux negociations (colonne + migration + front) : chantier separe, hors B2.
- B2, pas d'auto-expiration des reservations. Une commande en_attente jamais confirmee ni annulee garde son stock reserve indefiniment (aucun planificateur d'expiration TTL aujourd'hui). A ajouter en suivi (balayage periodique liberant les reservations 'active' trop anciennes).
- B2, annulation d'une commande deja confirmee : la liberation n'agit que sur une reservation 'active'. Annuler une commande convertie ne restitue pas le stock (ce serait un retour/restock, hors perimetre). Comportement voulu et documente.

---

## Sections a completer par inspection reelle

- Section 4, schemas de donnees : tables, colonnes, relations, valeurs d'enums.
- Section 7, inventaire des composants et leur etat.
- Section 8, statuts exacts de la roadmap back-office.
