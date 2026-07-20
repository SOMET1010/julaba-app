# Correction des accents UI — rapport

Date : 2026-07-20. Source : `.audit_ui_SAFE_CORRECTIONS.md` (liste SAFE).

## Résultat

- **128 corrections appliquées** automatiquement (remplacement de la chaîne exacte,
  borné aux mots — jamais un identifiant de code, jamais une clé d'objet).
- Vérifications passées : aucune ligne hors chaîne/JSX modifiée, aucun identifiant
  camelCase accentué, les 11 fichiers parsent (esbuild).
- **1 fichier absent** du snapshot : `frontend_src/src/app/components/identificateur/FormulaireIdentificationMarchand.tsx`.

## Méthode

Pour chaque correction SAFE (fichier, ligne, AVANT, APRES), on cherche la chaîne AVANT
dans une fenêtre de ±40 lignes autour de la ligne indiquée (les numéros de l'audit ont
un décalage de 1-2 lignes vs ce snapshot), uniquement sur des lignes contenant une chaîne
ou du texte JSX, avec des bornes de mot pour ne jamais toucher un identifiant.

## À revoir manuellement (non appliqué)

La plupart de ces cas sont **déjà corrects dans ce snapshot** (l'audit datait d'une
version antérieure) ou concernent un **identifiant de code** à ne pas toucher
(ex : l'icône `Video`, la propriété `telephone`, la clé `publie`). À vérifier un par un :

```
frontend_src/src/app/components/backoffice/BOAcademy.tsx:40	Publie
frontend_src/src/app/components/backoffice/BOActeurDetail.tsx:334	Nationalite
frontend_src/src/app/components/backoffice/BOActeurDetail.tsx:338	Recepisse
frontend_src/src/app/components/backoffice/BOActeurDetail.tsx:339	Categorie
frontend_src/src/app/components/backoffice/BOActeurDetail.tsx:340	Boite postale
frontend_src/src/app/components/backoffice/BOActeurDetail.tsx:382	Ajout de document — a implementer avec upload
frontend_src/src/app/components/backoffice/BOCarteActeurs.tsx:180	Adresse introuvable. Precise davantage.
frontend_src/src/app/components/backoffice/BOCommunication.tsx:73	Campagne envoyee (simulation)
frontend_src/src/app/components/backoffice/BOCommunication.tsx:106	Envoyees
frontend_src/src/app/components/backoffice/BOCommunication.tsx:107	Programmees
frontend_src/src/app/components/backoffice/BOCommunication.tsx:109	Delivrabilite
frontend_src/src/app/components/backoffice/BOCommunication.tsx:150	Envoyee
frontend_src/src/app/components/backoffice/BOContenus.tsx:30	Ecran onboarding
frontend_src/src/app/components/backoffice/BOContenus.tsx:135	Contenu cree
frontend_src/src/app/components/backoffice/BOContenus.tsx:140	Contenu supprime
frontend_src/src/app/components/backoffice/BODashboard.tsx:50	Transaction enregistree
frontend_src/src/app/components/backoffice/BODashboard.tsx:398	enregistres
frontend_src/src/app/components/backoffice/BODashboard.tsx:422	enregistrees
frontend_src/src/app/components/backoffice/BODashboard.tsx:792	Indice de qualite
frontend_src/src/app/components/backoffice/BOEnrolement.tsx:138	dossier(s) approuve(s)
frontend_src/src/app/components/backoffice/BOEnrolement.tsx:184	acteur(s) cree(s) avec succes
frontend_src/src/app/components/backoffice/BOEnrolement.tsx:267	Creer un compte
frontend_src/src/app/components/backoffice/BOEnrolement.tsx:497	Erreur lors de l'agrement
frontend_src/src/app/components/backoffice/BOEnrolement.tsx:562	Telephone
frontend_src/src/app/components/backoffice/BOEnrolement.tsx:615	Telephone * (login app)
frontend_src/src/app/components/backoffice/BOMarketplace.tsx:42	Publie
frontend_src/src/app/components/backoffice/BOMonitoringIA.tsx:54	Requetes / jour
frontend_src/src/app/components/backoffice/BOMonitoringIA.tsx:55	Cout cumule (30j)
frontend_src/src/app/components/backoffice/BOParametres.tsx:64	Activer/desactiver des fonctionnalites
frontend_src/src/app/components/backoffice/BOParametres.tsx:692	Feature Flag "" modifie (simulation)
frontend_src/src/app/components/backoffice/BOProfil.tsx:38	Consultation et analyse de donnees
frontend_src/src/app/components/backoffice/BOProfil.tsx:47	Configurer les roles et droits d'acces
frontend_src/src/app/components/backoffice/BOProfil.tsx:48	Definir les regles de scoring des acteurs
frontend_src/src/app/components/backoffice/BOProfil.tsx:48	Parametrage scoring national
frontend_src/src/app/components/backoffice/BOProfil.tsx:49	Audit et conformite
frontend_src/src/app/components/backoffice/BOProfil.tsx:49	Tracer et verifier toutes les actions
frontend_src/src/app/components/backoffice/BOProfil.tsx:50	Activer/desactiver les fonctionnalites
frontend_src/src/app/components/backoffice/BOProfil.tsx:51	Superviser les webhooks et cles API
frontend_src/src/app/components/backoffice/BOProfil.tsx:57	Processus d'enrolement et verification
frontend_src/src/app/components/backoffice/BOProfil.tsx:67	Enrolement terrain
frontend_src/src/app/components/backoffice/BOProfil.tsx:75	Interpreter les donnees nationales
frontend_src/src/app/components/backoffice/BOProfil.tsx:76	Analyser les tendances du marche
frontend_src/src/app/components/backoffice/BOProfil.tsx:78	Export de donnees
frontend_src/src/app/components/backoffice/BOProfil.tsx:78	Generer des rapports CSV/Excel
frontend_src/src/app/components/backoffice/BOProfil.tsx:85	Creer et gerer les comptes
frontend_src/src/app/components/backoffice/BOProfil.tsx:98	Voir enrolement
frontend_src/src/app/components/backoffice/BOProfil.tsx:99	Modifier enrolement
frontend_src/src/app/components/backoffice/BOProfil.tsx:117	Creer utilisateurs BO
frontend_src/src/app/components/backoffice/BOProfil.tsx:245	Mot de passe modifie avec succes
frontend_src/src/app/components/backoffice/BOProfil.tsx:251	Deconnexion en cours
frontend_src/src/app/components/backoffice/BOProfil.tsx:256	Deconnexion reussie
frontend_src/src/app/components/backoffice/BOProfil.tsx:368	Derniere connexion
frontend_src/src/app/components/backoffice/BOProfil.tsx:523	Mon activite recente
frontend_src/src/app/components/backoffice/BOProfil.tsx:667	Mon activite recente
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:27	Gestion nationale — validation, enrolement, supervision
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:61	Audit, conformite, controles
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:75	Voir enrolement
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:76	Modifier enrolement
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:94	Creer utilisateurs BO
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:220	Erreur lors de la creation du compte
frontend_src/src/app/components/backoffice/BOUtilisateurs.tsx:681	Creer le compte
frontend_src/src/app/components/backoffice/EventMonitor.tsx:75	evenements rejoues
frontend_src/src/app/components/identificateur/FicheIdentificationDynamique.tsx:1519	Recepisse N
frontend_src/src/app/components/identificateur/FicheIdentificationDynamique.tsx:1527	Boite postale
frontend_src/src/app/components/producteur/CommandesProducteurPage.tsx:498	Statut mis a jour avec succes
frontend_src/src/app/contexts/ProducteurContext.tsx:207	Erreur creation cycle
frontend_src/src/app/hooks/useVoiceCore.ts:151	Ca marche !
frontend_src/src/app/hooks/useVoiceCore.ts:578	Ca marche, je note !
frontend_src/src/app/hooks/useVoiceCore.ts:594	ma chere
frontend_src/src/app/hooks/useVoiceCore.ts:660	Probleme de connexion, reessaie !
frontend_src/src/app/hooks/useVoiceCore.ts:728	Probleme de connexion, reessaie !
frontend_src/src/app/pages/AdminRecovery.tsx:677	Verifier l'etat du compte Super Admin dans la DB
```
