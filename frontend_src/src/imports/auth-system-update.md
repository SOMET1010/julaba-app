CHANGEMENT DU SYSTÈME D’AUTHENTIFICATION

Nous abandonnons complètement la connexion par OTP.

Le système doit maintenant fonctionner avec un mot de passe classique.

OBJECTIF
Connexion par téléphone + mot de passe.

Le mot de passe est créé lors de l’enrôlement par l’identificateur, puis modifiable par l’utilisateur dans son profil.

--------------------------------------------------

1️⃣ MODIFICATION DU PROCESSUS D’ENRÔLEMENT (IDENTIFICATEUR)

Lorsqu’un identificateur crée un nouvel utilisateur :

Ajouter un champ obligatoire dans la fiche d’identification :

• Mot de passe par défaut

Contraintes :

• minimum 6 ou 8 caractères
• champ masqué
• confirmation du mot de passe

Workflow attendu :

Identificateur crée l’utilisateur
↓
renseigne :
- nom
- téléphone
- rôle
- autres informations
- mot de passe par défaut

↓
Le compte est créé avec ce mot de passe.

IMPORTANT :
Le mot de passe ne doit jamais être stocké en clair.

Il doit être :
• hashé
• sécurisé
• prêt pour Supabase Auth.

--------------------------------------------------

2️⃣ MODIFICATION DE L’ÉCRAN DE CONNEXION

Supprimer totalement le système OTP.

Nouveau formulaire login :

• Numéro de téléphone
• Mot de passe
• Bouton "Se connecter"

Gestion des erreurs :

• mot de passe incorrect
• utilisateur inexistant

--------------------------------------------------

3️⃣ MODIFICATION DU MENU "MOI" (PROFIL UTILISATEUR)

Dans la section "MOI" accessible depuis la Bottom Bar :

Ajouter une option :

"Modifier mon mot de passe"

Cette action ouvre un modal sécurisé contenant :

• Mot de passe actuel
• Nouveau mot de passe
• Confirmation du nouveau mot de passe

Règles :

• validation obligatoire
• minimum 8 caractères
• message de succès après modification

--------------------------------------------------

4️⃣ SÉCURITÉ

Vérifier que :

• aucun mot de passe n’est stocké en clair
• le mot de passe est hashé
• aucune trace du mot de passe dans console.log
• aucune donnée sensible dans localStorage

--------------------------------------------------

5️⃣ VÉRIFICATION GLOBALE

Faire un audit complet après modification :

• enrôlement avec mot de passe
• connexion avec mot de passe
• modification du mot de passe dans "MOI"
• validation des erreurs
• fonctionnement sur tous les profils

--------------------------------------------------

6️⃣ RAPPORT FINAL

Me fournir un rapport confirmant :

• suppression complète du système OTP
• ajout du mot de passe à l’enrôlement
• modification du menu "MOI"
• sécurité des mots de passe
• test du flux complet