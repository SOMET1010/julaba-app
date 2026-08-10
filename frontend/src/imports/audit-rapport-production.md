AUDIT FINAL AVANT DÉPLOIEMENT — CONTRÔLE TOTAL APPLICATION

Nous sommes prêts pour le déploiement production sur Vercel.
Je veux un audit technique intégral, ligne par ligne, composant par composant, sans exception.

Objectif : zéro résidu, zéro incohérence, zéro bouton mort, zéro fichier inutile.
Tu dois tout vérifier et produire un rapport structuré.

1️⃣ AUDIT STRUCTURE PROJET
Vérifier :
* Arborescence complète
* Fichiers non importés
* Composants jamais appelés
* Pages sans route active
* Services inutilisés
* Context inutilisés
* Hooks non utilisés
* Assets orphelins
* Dossiers legacy encore présents
* Console.log oubliés
* Fichiers test restants
* Variables mortes
Livrable :
* Liste complète des fichiers inutilisés
* Liste des dépendances npm inutilisées
* Liste des imports morts

2️⃣ AUDIT ROUTING COMPLET
Vérifier :
* Toutes les routes déclarées
* Toutes les routes réellement accessibles
* Routes protégées par rôle
* Routes non sécurisées
* Routes sans page associée
* Pages existantes mais sans route
Tester :
* Navigation via URL directe
* Navigation via boutons
* Navigation mobile
* Navigation desktop

3️⃣ AUDIT BOUTONS & INTERACTIONS
Scanner l’application entière.
Pour chaque bouton :
* Vérifier qu’il déclenche une action
* Vérifier qu’il ouvre le bon écran
* Vérifier qu’il ne redirige pas vers une route inexistante
* Vérifier qu’il n’est pas désactivé sans raison
* Vérifier qu’il respecte les permissions
Inclure :
* Bottom bar
* Sidebar
* Modals
* Dropdown
* Cartes interactives
* Icônes cliquables
* Boutons secondaires
* CTA invisibles
Livrable :
Tableau complet :
| Composant | Bouton | Action attendue | Action réelle | OK/KO |

4️⃣ AUDIT MODALS
Vérifier :
* Fermeture correcte
* Overlay correct
* Focus trap
* Scroll bloqué
* Bottom bar masquée
* Réouverture correcte
* Aucun conflit z-index

5️⃣ AUDIT RESPONSIVE
Tester :
* Mobile < 375px
* Tablet
* Desktop
* Écrans larges
Vérifier :
* Headers non masqués (notch téléphone)
* Bottom bar fixe propre
* Sidebar responsive
* Overflow horizontal
* Scroll vertical
* Textes coupés
* Boutons hors écran

6️⃣ AUDIT IA “TANTIE SAGESSE”
Vérifier :
* Aucun ancien moteur IA présent
* Aucun doublon
* Aucun fichier legacy vocal
* Tous les services IA centralisés
* Logs IA fonctionnels
* Permissions respectées
* Confirmation actions critiques
* Désactivation par rôle effective
* Aucun accès cross-user

7️⃣ AUDIT SÉCURITÉ FRONTEND
Vérifier :
* Aucune clé API exposée
* Aucun service_role utilisé côté frontend
* Aucun accès direct Supabase admin
* Aucun fallback user hardcodé
* Aucun userId en dur
* Aucune donnée mock en production

8️⃣ AUDIT PERFORMANCE
Vérifier :
* Bundle size
* Code splitting
* Lazy loading pages
* Re-render inutiles
* Boucles infinies
* useEffect mal configurés
* State inutiles

9️⃣ AUDIT BASE DE DONNÉES SUPABASE
Vérifier :
* Toutes les requêtes passent par Supabase
* Plus aucune dépendance localStorage critique
* RLS activé
* Policies correctes
* Isolation par user.id respectée

🔟 AUDIT UX FINAL
Vérifier :
* Aucun écran vide
* Aucun écran partiellement implémenté
* Aucun placeholder oublié
* Aucun “Coming Soon”
* Aucun bouton sans retour visuel
* Aucun loader bloqué

1️⃣1️⃣ TESTS MANUELS OBLIGATOIRES
Simuler :
* Utilisateur Marchand
* Utilisateur Producteur
* Coopérative
* Institution
* Identificateur
Tester :
* Création
* Modification
* Suppression
* Navigation rapide
* Rafraîchissement navigateur
* Reconnexion
* Double clic rapide
* Changement de rôle

1️⃣2️⃣ NETTOYAGE FINAL
Supprimer :
* Fichiers legacy
* Commentaires inutiles
* TODO oubliés
* Code commenté
* console.log

LIVRABLE FINAL ATTENDU
1. Rapport complet structuré
2. Liste anomalies détectées
3. Liste corrections effectuées
4. Liste corrections restantes
5. Score stabilité global /100
6. Score sécurité /100
7. Score production readiness /100
8. Estimation risques post-déploiement
