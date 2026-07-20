OBJECTIF : MIGRATION TOTALE VERS SUPABASE (0% LOCAL – 100% SERVEUR)

La plateforme doit maintenant basculer vers une architecture 100% serveur avec Supabase.

Aucune donnée métier ne doit rester dans le navigateur.

But final :
**0% de données en localStorage / state React**
**100% des données stockées et manipulées via Supabase**

Cette règle s’applique à **tous les profils** :

* Marchand
* Producteur
* Coopérative
* Identificateur
* Institution
* BackOffice
* Administrateur

Aucune exception.

────────────────
1️⃣ SUPPRESSION TOTALE DU STOCKAGE LOCAL
────────────────

Supprimer toute persistance de données métier dans :

* localStorage
* sessionStorage
* IndexedDB
* mock data
* fallback démo
* states React utilisés comme base de données

Interdiction de stocker localement :

* utilisateurs
* commandes
* identifications
* transactions
* stocks
* récoltes
* scores
* coopératives
* notifications métier
* historiques
* logs
* analytics
* tickets support
* missions
* academy progress métier

Les seuls localStorage autorisés :

UI uniquement :

* langue
* préférences d’affichage
* onboarding vu
* cache UI
* état sidebar

Aucune donnée métier.

────────────────
2️⃣ MIGRATION DE TOUS LES CONTEXTS VERS SUPABASE
────────────────

Tous les Contexts React doivent devenir des **connecteurs Supabase**.

Remplacer les logiques locales par :

supabase.from().select()
supabase.from().insert()
supabase.from().update()
supabase.from().delete()

Contexts concernés :

AppContext
UserContext
CommandeContext
RecolteContext
WalletContext
CaisseContext
ScoreContext
AuditContext
CooperativeContext
InstitutionContext
ZoneContext
IdentificateurContext
ProducteurContext
NotificationsContext
BackOfficeContext
SupportConfigContext
TicketsContext

Chaque context doit :

* lire les données depuis Supabase
* écrire les données dans Supabase
* gérer les erreurs
* gérer les loading states

────────────────
3️⃣ AUTHENTIFICATION SUPABASE
────────────────

Remplacer complètement l’authentification mock.

Implémenter :

Supabase Auth

Connexion :

email + mot de passe

OU

téléphone + mot de passe

Fonctions nécessaires :

* login
* logout
* création utilisateur
* récupération session
* changement mot de passe
* reset mot de passe

Associer chaque utilisateur à :

* un rôle
* un profil
* un user_id unique Supabase

────────────────
4️⃣ STRUCTURE BASE DE DONNÉES SUPABASE
────────────────

Créer les tables principales :

users
roles
profiles

commandes
transactions
wallets
caisse

recoltes
stocks

cooperatives
cooperative_members

identifications
zones

scores

notifications

academy_progress

audit_logs
ia_logs

tickets_support
missions

analytics

Toutes les relations doivent être basées sur :

user_id

et des clés étrangères cohérentes.

────────────────
5️⃣ RLS (ROW LEVEL SECURITY)
────────────────

Activer **Row Level Security** sur toutes les tables.

Chaque utilisateur ne doit voir que :

ses données
ou les données autorisées par son rôle.

Exemples :

Producteur
→ voit uniquement ses récoltes

Marchand
→ voit uniquement ses commandes

Identificateur
→ voit uniquement ses identifications

Institution
→ voit les données agrégées

BackOffice
→ accès global

────────────────
6️⃣ MIGRATION DES ACTIONS MÉTIER
────────────────

Toutes les actions doivent maintenant appeler Supabase :

Créer commande
Modifier commande
Créer récolte
Valider identification
Modifier profil
Envoyer notification
Créer ticket support
Créer mission
Ajouter stock

Plus aucune action ne doit modifier uniquement le state React.

Le state React doit seulement refléter les données venant de Supabase.

────────────────
7️⃣ SUPPRESSION DES MOCK DATA
────────────────

Supprimer :

MOCK_USERS
MOCK_COMMANDES
MOCK_IDENTIFICATIONS
MOCK_RECOLTES
MOCK_STOCK
MOCK_BO_USERS
mockUsers.ts
mockBO.ts

Aucune donnée simulée ne doit rester dans le flux principal.

────────────────
8️⃣ NOTIFICATIONS
────────────────

Les notifications doivent être stockées dans Supabase.

Table :

notifications

Colonnes :

id
user_id
role
type
message
priority
read
created_at

Le frontend lit simplement la table.

────────────────
9️⃣ JOURNAL IA TANTIE SAGESSE
────────────────

Créer une table :

ia_logs

Contenant :

id
user_id
role
action_requested
action_executed
confirmation_required
status
timestamp

Chaque action exécutée par l’IA doit être enregistrée.

────────────────
🔟 BACKOFFICE
────────────────

Le BackOffice doit aussi utiliser Supabase :

* gestion utilisateurs
* gestion missions
* support
* analytics
* audit
* academy

Aucune donnée locale.

────────────────
1️⃣1️⃣ RÈGLE ABSOLUE
────────────────

Après migration :

0% données locales
100% Supabase

Le frontend devient uniquement :

* interface
* visualisation
* interaction

Supabase devient :

* base de données
* logique serveur
* authentification
* sécurité

────────────────
1️⃣2️⃣ RAPPORT FINAL OBLIGATOIRE
────────────────

Une fois la migration terminée, fournir un rapport :

1. Liste complète des tables Supabase créées
2. Liste des contexts migrés
3. Liste des fichiers modifiés
4. Vérification que localStorage ne contient plus de données métier
5. Vérification qu’aucune mock data n’est encore utilisée
6. Vérification que toutes les actions passent par Supabase

Score final de conformité attendu :

100% architecture serveur.
