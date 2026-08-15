col:academy_modules.created_at:timestamp without time zone:NO
col:academy_modules.description:character varying:YES
col:academy_modules.duree:integer:NO
col:academy_modules.id:uuid:NO
col:academy_modules.image:character varying:YES
col:academy_modules.nb_inscrits:integer:NO
col:academy_modules.niveau:character varying:NO
col:academy_modules.points:integer:NO
col:academy_modules.profil:character varying:NO
col:academy_modules.statut:character varying:NO
col:academy_modules.taux_completion:integer:NO
col:academy_modules.titre:character varying:NO
col:academy_modules.type:character varying:NO
col:academy_modules.updated_at:timestamp without time zone:NO
col:academy_progress.completed:boolean:NO
col:academy_progress.enrolled_at:timestamp without time zone:NO
col:academy_progress.id:uuid:NO
col:academy_progress.last_question_index:integer:NO
col:academy_progress.module_id:character varying:NO
col:academy_progress.score:integer:NO
col:academy_progress.taux_completion:integer:NO
col:academy_progress.updated_at:timestamp without time zone:NO
col:academy_progress.user_id:character varying:NO
col:academy_questions.actif:boolean:NO
col:academy_questions.chapter:integer:NO
col:academy_questions.correct_index:integer:NO
col:academy_questions.created_at:timestamp without time zone:NO
col:academy_questions.explication:character varying:YES
col:academy_questions.id:uuid:NO
col:academy_questions.lesson:integer:NO
col:academy_questions.module_id:uuid:YES
col:academy_questions.options:jsonb:NO
col:academy_questions.question:character varying:NO
col:academy_questions.role:character varying:NO
col:audit_logs.action:character varying:YES
col:audit_logs.created_at:timestamp without time zone:NO
col:audit_logs.details:jsonb:YES
col:audit_logs.entite:character varying:YES
col:audit_logs.entite_id:character varying:YES
col:audit_logs.id:uuid:NO
col:audit_logs.ip:character varying:YES
col:audit_logs.user_id:character varying:YES
col:boutique_mouvements.created_at:timestamp without time zone:NO
col:boutique_mouvements.device:character varying:NO
col:boutique_mouvements.id:uuid:NO
col:boutique_mouvements.marchand_id:uuid:NO
col:boutique_mouvements.montant:numeric:YES
col:boutique_mouvements.produit:character varying:YES
col:boutique_mouvements.quantite:numeric:YES
col:boutique_mouvements.transcription:text:YES
col:boutique_mouvements.ts:bigint:NO
col:boutique_mouvements.type:character varying:NO
col:bpay_transactions.bpay_status:text:YES
col:bpay_transactions.created_at:timestamp with time zone:YES
col:bpay_transactions.id:uuid:NO
col:bpay_transactions.montant:numeric:YES
col:bpay_transactions.pay_token:text:YES
col:bpay_transactions.source:text:YES
col:bpay_transactions.status:text:YES
col:bpay_transactions.updated_at:timestamp with time zone:YES
col:bpay_transactions.user_id:text:YES
col:caisse_sessions.created_at:timestamp with time zone:YES
col:caisse_sessions.date:date:NO
col:caisse_sessions.fond_final:numeric:YES
col:caisse_sessions.fond_initial:numeric:YES
col:caisse_sessions.heure_fermeture:timestamp with time zone:YES
col:caisse_sessions.heure_ouverture:timestamp with time zone:YES
col:caisse_sessions.id:uuid:NO
col:caisse_sessions.marchand_id:text:NO
col:caisse_sessions.notes:text:YES
col:caisse_sessions.ouvert:boolean:YES
col:caisse_sessions.updated_at:timestamp with time zone:YES
col:caisse_transactions.benefice:numeric:YES
col:caisse_transactions.category:character varying:YES
col:caisse_transactions.created_at:timestamp without time zone:NO
col:caisse_transactions.description:character varying:YES
col:caisse_transactions.details:jsonb:YES
col:caisse_transactions.id:uuid:NO
col:caisse_transactions.idempotency_key:text:YES
col:caisse_transactions.marchand_id:character varying:YES
col:caisse_transactions.marge:numeric:YES
col:caisse_transactions.mode_paiement:character varying:YES
col:caisse_transactions.montant:numeric:YES
col:caisse_transactions.motif:text:YES
col:caisse_transactions.prix_achat:numeric:YES
col:caisse_transactions.prix_vente:numeric:YES
col:caisse_transactions.produit:character varying:YES
col:caisse_transactions.quantite:numeric:YES
col:caisse_transactions.session_id:character varying:YES
col:caisse_transactions.source:character varying:YES
col:caisse_transactions.statut:USER-DEFINED:NO
col:caisse_transactions.type:character varying:YES
col:caisse_transactions.user_id:character varying:YES
col:caisse_transactions.zone_id:character varying:YES
col:clients.created_at:timestamp with time zone:YES
col:clients.derniere_visite:timestamp with time zone:YES
col:clients.id:uuid:NO
col:clients.marchand_id:uuid:NO
col:clients.montant_du:numeric:YES
col:clients.nb_credits:integer:YES
col:clients.nom:character varying:NO
col:clients.phone:character varying:YES
col:clients.updated_at:timestamp with time zone:YES
col:commandes.acheteur_id:uuid:YES
col:commandes.acheteur_nom:character varying:YES
col:commandes.acheteur_telephone:character varying:YES
col:commandes.created_at:timestamp without time zone:NO
col:commandes.date_commande:timestamp with time zone:NO
col:commandes.date_livraison:date:YES
col:commandes.id:uuid:NO
col:commandes.image_url:character varying:YES
col:commandes.livreur:character varying:YES
col:commandes.localite:character varying:YES
col:commandes.mode_paiement:character varying:YES
col:commandes.notes:text:YES
col:commandes.paye_at:timestamp with time zone:YES
col:commandes.prix_unitaire:numeric:NO
col:commandes.produit:character varying:NO
col:commandes.publication_id:uuid:YES
col:commandes.quantite:numeric:NO
col:commandes.recolte_id:uuid:YES
col:commandes.statut:USER-DEFINED:NO
col:commandes.statut_paiement:character varying:NO
col:commandes.total:numeric:NO
col:commandes.type:character varying:NO
col:commandes.updated_at:timestamp without time zone:NO
col:commandes.vendeur_id:uuid:NO
col:communes.code:character varying:NO
col:communes.departement_id:uuid:NO
col:communes.id:uuid:NO
col:communes.nom:character varying:NO
col:cooperative_membres.actif:boolean:YES
col:cooperative_membres.cooperative_id:character varying:NO
col:cooperative_membres.cotisation_payee:boolean:YES
col:cooperative_membres.date_adhesion:character varying:YES
col:cooperative_membres.id:uuid:NO
col:cooperative_membres.membre_id:character varying:NO
col:cooperative_membres.role:character varying:YES
col:cooperative_membres.statut:character varying:YES
col:cooperatives.actif:boolean:NO
col:cooperatives.created_at:timestamp without time zone:NO
col:cooperatives.id:uuid:NO
col:cooperatives.nom:character varying:NO
col:cooperatives.responsable_id:character varying:YES
col:cooperatives.updated_at:timestamp without time zone:NO
col:cooperatives.zone_id:character varying:YES
col:credits.acompte:numeric:YES
col:credits.articles:jsonb:YES
col:credits.client_nom:character varying:NO
col:credits.client_phone:character varying:YES
col:credits.created_at:timestamp with time zone:YES
col:credits.echeance:date:NO
col:credits.id:uuid:NO
col:credits.marchand_id:uuid:NO
col:credits.montant_total:numeric:NO
col:credits.notes:text:YES
col:credits.paye_le:timestamp with time zone:YES
col:credits.statut:character varying:YES
col:credits.transaction_id:uuid:YES
col:credits.updated_at:timestamp with time zone:YES
col:credits_avec_statut.acompte:numeric:YES
col:credits_avec_statut.articles:jsonb:YES
col:credits_avec_statut.client_nom:character varying:YES
col:credits_avec_statut.client_phone:character varying:YES
col:credits_avec_statut.created_at:timestamp with time zone:YES
col:credits_avec_statut.echeance:date:YES
col:credits_avec_statut.id:uuid:YES
col:credits_avec_statut.marchand_id:uuid:YES
col:credits_avec_statut.montant_restant:numeric:YES
col:credits_avec_statut.montant_total:numeric:YES
col:credits_avec_statut.notes:text:YES
col:credits_avec_statut.paye_le:timestamp with time zone:YES
col:credits_avec_statut.statut:text:YES
col:credits_avec_statut.transaction_id:uuid:YES
col:credits_avec_statut.updated_at:timestamp with time zone:YES
col:cycles.created_at:timestamp without time zone:NO
col:cycles.culture:character varying:NO
col:cycles.date_plantation:date:NO
col:cycles.date_recolte_estimee:date:NO
col:cycles.date_recolte_reelle:date:YES
col:cycles.id:uuid:NO
col:cycles.notes:text:YES
col:cycles.parcelle:character varying:YES
col:cycles.photo_url:text:YES
col:cycles.quantite_estimee:numeric:NO
col:cycles.quantite_reelle:numeric:YES
col:cycles.status:USER-DEFINED:NO
col:cycles.statut:character varying:YES
col:cycles.surface:numeric:NO
col:cycles.updated_at:timestamp without time zone:NO
col:cycles.user_id:uuid:NO
col:departements.code:character varying:NO
col:departements.id:uuid:NO
col:departements.nom:character varying:NO
col:departements.region_id:uuid:NO
col:districts.code:character varying:NO
col:districts.id:uuid:NO
col:districts.nom:character varying:NO
col:evaluations.auteur_id:uuid:NO
col:evaluations.cible_id:uuid:NO
col:evaluations.commande_id:uuid:NO
col:evaluations.commentaire:text:YES
col:evaluations.created_at:timestamp with time zone:YES
col:evaluations.id:uuid:NO
col:evaluations.note:smallint:NO
col:fidelite_clients.id:uuid:NO
col:fidelite_clients.marchand_id:uuid:NO
col:fidelite_clients.nom:character varying:YES
col:fidelite_clients.points:numeric:YES
col:fidelite_clients.telephone:character varying:NO
col:fidelite_clients.total_achats:numeric:YES
col:fidelite_clients.updated_at:timestamp with time zone:YES
col:fidelite_config.actif:boolean:YES
col:fidelite_config.marchand_id:uuid:NO
col:fidelite_config.points_par_cent:numeric:YES
col:fidelite_config.recompense_fcfa:numeric:YES
col:fidelite_config.seuil_points:numeric:YES
col:fidelite_config.updated_at:timestamp with time zone:YES
col:identifications.acteur_id:character varying:YES
col:identifications.acteur_nom:character varying:YES
col:identifications.commission:numeric:YES
col:identifications.commission_payee:boolean:NO
col:identifications.commune:character varying:YES
col:identifications.created_at:timestamp without time zone:NO
col:identifications.current_step:integer:YES
col:identifications.date_identification:timestamp without time zone:YES
col:identifications.documents:jsonb:YES
col:identifications.form_data:jsonb:YES
col:identifications.id:uuid:NO
col:identifications.identificateur_id:character varying:YES
col:identifications.latitude:double precision:YES
col:identifications.longitude:double precision:YES
col:identifications.motif_rejet:character varying:YES
col:identifications.region:character varying:YES
col:identifications.source:USER-DEFINED:NO
col:identifications.statut:character varying:NO
col:identifications.type_acteur:character varying:YES
col:identifications.updated_at:timestamp without time zone:NO
col:identifications.zone_id:character varying:YES
col:institutions.actif:boolean:NO
col:institutions.created_at:timestamp without time zone:NO
col:institutions.id:uuid:NO
col:institutions.modules:jsonb:NO
col:institutions.nom:character varying:NO
col:institutions.responsable_id:character varying:YES
col:institutions.type:character varying:YES
col:institutions.updated_at:timestamp without time zone:NO
col:institutions.zone_id:character varying:YES
col:marchand_sous_profil_historique.ancien_sous_profil:USER-DEFINED:YES
col:marchand_sous_profil_historique.created_at:timestamp with time zone:NO
col:marchand_sous_profil_historique.id:uuid:NO
col:marchand_sous_profil_historique.marchand_id:uuid:NO
col:marchand_sous_profil_historique.modifie_par:uuid:YES
col:marchand_sous_profil_historique.motif:text:YES
col:marchand_sous_profil_historique.nouveau_sous_profil:USER-DEFINED:YES
col:marches.actif:boolean:NO
col:marches.adresse:text:YES
col:marches.created_at:timestamp without time zone:NO
col:marches.description:text:YES
col:marches.id:uuid:NO
col:marches.latitude:numeric:YES
col:marches.longitude:numeric:YES
col:marches.nom:character varying:NO
col:marches.type:USER-DEFINED:NO
col:marches.updated_at:timestamp without time zone:NO
col:marches.zone_id:uuid:YES
col:missions.assignee_id:character varying:YES
col:missions.created_at:timestamp without time zone:NO
col:missions.date_echeance:timestamp without time zone:YES
col:missions.description:character varying:YES
col:missions.id:uuid:NO
col:missions.priorite:character varying:NO
col:missions.statut:character varying:NO
col:missions.titre:character varying:NO
col:missions.updated_at:timestamp without time zone:NO
col:missions.zone_id:character varying:YES
col:mutations.created_at:timestamp without time zone:NO
col:mutations.date_decision:timestamp with time zone:YES
col:mutations.decideur_id:uuid:YES
col:mutations.id:uuid:NO
col:mutations.identificateur_id:uuid:NO
col:mutations.identificateur_nom:character varying:YES
col:mutations.motif_decision:text:YES
col:mutations.raison:text:NO
col:mutations.statut:USER-DEFINED:NO
col:mutations.updated_at:timestamp without time zone:NO
col:mutations.zone_actuelle_id:character varying:YES
col:mutations.zone_actuelle_nom:character varying:YES
col:mutations.zone_demandee_id:character varying:NO
col:mutations.zone_demandee_nom:character varying:NO
col:negociations.created_at:timestamp without time zone:NO
col:negociations.id:uuid:NO
col:negociations.marchand_id:character varying:NO
col:negociations.message:text:YES
col:negociations.message_reponse:text:YES
col:negociations.nb_contre_offres:integer:NO
col:negociations.prix_contre_offre:numeric:YES
col:negociations.prix_original:numeric:NO
col:negociations.prix_propose:numeric:NO
col:negociations.produit:character varying:NO
col:negociations.quantite:numeric:NO
col:negociations.statut:USER-DEFINED:NO
col:negociations.unite:character varying:NO
col:negociations.updated_at:timestamp without time zone:NO
col:negociations.vendeur_id:character varying:NO
col:notifications.category:character varying:YES
col:notifications.created_at:timestamp without time zone:NO
col:notifications.deleted_at:timestamp without time zone:YES
col:notifications.icon:character varying:YES
col:notifications.id:uuid:NO
col:notifications.is_read:boolean:NO
col:notifications.message:character varying:NO
col:notifications.metadata:jsonb:YES
col:notifications.priority:character varying:NO
col:notifications.role:character varying:YES
col:notifications.titre:character varying:NO
col:notifications.type:character varying:NO
col:notifications.user_id:character varying:NO
col:objectifs_journaliers.alerte50:boolean:NO
col:objectifs_journaliers.alerte80:boolean:NO
col:objectifs_journaliers.createdAt:timestamp without time zone:NO
col:objectifs_journaliers.date:date:NO
col:objectifs_journaliers.id:uuid:NO
col:objectifs_journaliers.objectif:numeric:NO
col:objectifs_journaliers.userId:character varying:NO
col:produits.actif:boolean:YES
col:produits.categorie:text:YES
col:produits.created_at:timestamp with time zone:YES
col:produits.date_peremption:date:YES
col:produits.id:uuid:NO
col:produits.image:text:YES
col:produits.marchand_id:text:NO
col:produits.nom:text:NO
col:produits.prix:numeric:YES
col:produits.prix_achat:numeric:YES
col:produits.prix_promo:numeric:YES
col:produits.promo_fin:date:YES
col:produits.seuil_alerte:numeric:YES
col:produits.stock:numeric:YES
col:produits.unite:text:YES
col:produits.updated_at:timestamp with time zone:YES
col:publications.active:boolean:NO
col:publications.conditions_vente:text:YES
col:publications.cooperative_id:uuid:YES
col:publications.created_at:timestamp without time zone:NO
col:publications.culture:character varying:NO
col:publications.cycle_id:uuid:YES
col:publications.date_expiration:date:YES
col:publications.date_publication:timestamp with time zone:NO
col:publications.date_recolte:date:YES
col:publications.description:text:YES
col:publications.id:uuid:NO
col:publications.localisation:character varying:YES
col:publications.photo_url:text:YES
col:publications.prix_unitaire:numeric:NO
col:publications.produit:character varying:NO
col:publications.qualite:character varying:NO
col:publications.quantite_disponible:numeric:NO
col:publications.quantite_initiale:numeric:NO
col:publications.recolte_id:uuid:YES
col:publications.statut:USER-DEFINED:NO
col:publications.type_marche:USER-DEFINED:NO
col:publications.unite:character varying:NO
col:publications.updated_at:timestamp without time zone:NO
col:publications.user_id:uuid:NO
col:push_tokens.created_at:timestamp without time zone:NO
col:push_tokens.id:uuid:NO
col:push_tokens.token:text:NO
col:push_tokens.updated_at:timestamp without time zone:NO
col:push_tokens.user_id:character varying:NO
col:raccourcis.actif:boolean:NO
col:raccourcis.action:jsonb:NO
col:raccourcis.created_at:timestamp without time zone:NO
col:raccourcis.declencheur:character varying:NO
col:raccourcis.id:uuid:NO
col:raccourcis.nom:character varying:NO
col:raccourcis.type:character varying:NO
col:raccourcis.user_id:character varying:NO
col:raccourcis_vocaux.actif:boolean:NO
col:raccourcis_vocaux.action:jsonb:YES
col:raccourcis_vocaux.createdAt:timestamp without time zone:NO
col:raccourcis_vocaux.declencheur:character varying:NO
col:raccourcis_vocaux.id:uuid:NO
col:raccourcis_vocaux.nom:character varying:NO
col:raccourcis_vocaux.type:character varying:NO
col:raccourcis_vocaux.updatedAt:timestamp without time zone:NO
col:raccourcis_vocaux.userId:character varying:NO
col:recoltes.created_at:timestamp without time zone:NO
col:recoltes.cycle_id:uuid:YES
col:recoltes.date_recolte:date:NO
col:recoltes.id:uuid:NO
col:recoltes.notes:text:YES
col:recoltes.parcelle:character varying:YES
col:recoltes.photo_url:text:YES
col:recoltes.prix_unitaire:numeric:NO
col:recoltes.producteur_id:character varying:YES
col:recoltes.produit:character varying:NO
col:recoltes.qualite:USER-DEFINED:NO
col:recoltes.quantite:numeric:NO
col:recoltes.statut:USER-DEFINED:NO
col:recoltes.stock_disponible:numeric:NO
col:recoltes.stock_vendu:numeric:NO
col:recoltes.unite:character varying:NO
col:recoltes.updated_at:timestamp without time zone:NO
col:recoltes.user_id:uuid:NO
col:recoltes.zone_id:character varying:YES
col:refresh_tokens.created_at:timestamp without time zone:NO
col:refresh_tokens.device_info:character varying:YES
col:refresh_tokens.expires_at:timestamp without time zone:NO
col:refresh_tokens.id:uuid:NO
col:refresh_tokens.ip_address:character varying:YES
col:refresh_tokens.revoked:boolean:NO
col:refresh_tokens.token_hash:character varying:NO
col:refresh_tokens.used:boolean:NO
col:refresh_tokens.user_id:character varying:NO
col:regions.code:character varying:NO
col:regions.district_id:uuid:NO
col:regions.id:uuid:NO
col:regions.nom:character varying:NO
col:stock_mouvements.created_at:timestamp with time zone:YES
col:stock_mouvements.id:uuid:NO
col:stock_mouvements.manquant:numeric:NO
col:stock_mouvements.marchand_id:text:NO
col:stock_mouvements.produit_id:uuid:YES
col:stock_mouvements.produit_nom:text:YES
col:stock_mouvements.quantite_demandee:numeric:NO
col:stock_mouvements.quantite_retranchee:numeric:NO
col:stock_mouvements.stock_avant:numeric:NO
col:stock_mouvements.transaction_id:uuid:YES
col:stock_reservations.commande_id:uuid:NO
col:stock_reservations.created_at:timestamp without time zone:NO
col:stock_reservations.id:uuid:NO
col:stock_reservations.publication_id:uuid:YES
col:stock_reservations.quantite:numeric:NO
col:stock_reservations.recolte_id:uuid:YES
col:stock_reservations.statut:character varying:NO
col:stock_reservations.updated_at:timestamp without time zone:NO
col:stocks.categorie:text:YES
col:stocks.created_at:timestamp without time zone:NO
col:stocks.date_peremption:date:YES
col:stocks.id:uuid:NO
col:stocks.image:text:YES
col:stocks.prix_achat:numeric:YES
col:stocks.prix_promo:numeric:YES
col:stocks.prix_vente:numeric:YES
col:stocks.produit:character varying:NO
col:stocks.promo_fin:date:YES
col:stocks.proprietaire_id:character varying:YES
col:stocks.quantite:numeric:YES
col:stocks.seuil_alerte:numeric:YES
col:stocks.unite:character varying:YES
col:stocks.updated_at:timestamp without time zone:NO
col:stocks.zone_id:character varying:YES
col:tickets.categorie:character varying:YES
col:tickets.created_at:timestamp without time zone:NO
col:tickets.description:character varying:YES
col:tickets.id:uuid:NO
col:tickets.lu_par_bo:boolean:NO
col:tickets.numero:character varying:YES
col:tickets.priorite:character varying:NO
col:tickets.reponses:jsonb:NO
col:tickets.statut:character varying:NO
col:tickets.titre:character varying:YES
col:tickets.updated_at:timestamp without time zone:NO
col:tickets.user_id:character varying:YES
col:user_flags.commentaire:text:YES
col:user_flags.created_at:timestamp with time zone:NO
col:user_flags.created_by:character varying:NO
col:user_flags.flag_type:USER-DEFINED:NO
col:user_flags.id:uuid:NO
col:user_flags.raison:text:NO
col:user_flags.resolution_note:text:YES
col:user_flags.resolved_at:timestamp with time zone:YES
col:user_flags.resolved_by:character varying:YES
col:user_flags.user_id:character varying:NO
col:users.activity:character varying:YES
col:users.bo_permissions:jsonb:YES
col:users.boite_postale:character varying:YES
col:users.categorie:character varying:YES
col:users.commune:character varying:YES
col:users.commune_autre:text:YES
col:users.commune_id:character varying:YES
col:users.cooperative_name:character varying:YES
col:users.created_at:timestamp without time zone:NO
col:users.date_naissance:date:YES
col:users.deleted_at:timestamp without time zone:YES
col:users.departement_autre:text:YES
col:users.departement_id:character varying:YES
col:users.district_autre:text:YES
col:users.district_id:character varying:YES
col:users.email:character varying:YES
col:users.entite_metadata:jsonb:YES
col:users.est_membre_cooperative:boolean:YES
col:users.failed_pin_attempts:integer:NO
col:users.first_name:character varying:NO
col:users.genre:character varying:YES
col:users.id:uuid:NO
col:users.institution_name:character varying:YES
col:users.last_login_at:timestamp with time zone:YES
col:users.last_login_user_agent:character varying:YES
col:users.last_name:character varying:NO
col:users.lieu_naissance:character varying:YES
col:users.locked_until:timestamp without time zone:YES
col:users.market:character varying:YES
col:users.must_change_password:boolean:NO
col:users.nationalite:character varying:YES
col:users.nin:character varying:YES
col:users.num_cmu:character varying:YES
col:users.num_cnps:character varying:YES
col:users.objectif_mensuel:integer:YES
col:users.password_hash:character varying:YES
col:users.pending_validation_data:jsonb:YES
col:users.phone:character varying:NO
col:users.photo_url:text:YES
col:users.pin_code_encrypted_identificateur:character varying:YES
col:users.pin_code_hash:character varying:YES
col:users.pin_security_enabled:boolean:NO
col:users.preferences:jsonb:NO
col:users.prime_objectif:integer:YES
col:users.quartier_village:text:YES
col:users.recepisse:character varying:YES
col:users.region:character varying:YES
col:users.region_autre:text:YES
col:users.region_id:character varying:YES
col:users.role:USER-DEFINED:NO
col:users.situation_matrimoniale:character varying:YES
col:users.sous_profil_marchand:USER-DEFINED:YES
col:users.status:USER-DEFINED:NO
col:users.statut_entrepreneur:character varying:YES
col:users.type_point_vente:character varying:YES
col:users.type_point_vente_autre:text:YES
col:users.validated:boolean:NO
col:users.webauthn_challenge:character varying:YES
col:users.webauthn_credentials:jsonb:YES
col:users.zone_id:character varying:YES
col:wallet_transactions.created_at:timestamp without time zone:NO
col:wallet_transactions.description:text:YES
col:wallet_transactions.id:uuid:NO
col:wallet_transactions.metadata:jsonb:YES
col:wallet_transactions.montant:numeric:NO
col:wallet_transactions.related_entity_id:uuid:YES
col:wallet_transactions.related_entity_type:character varying:YES
col:wallet_transactions.statut:character varying:NO
col:wallet_transactions.type:USER-DEFINED:NO
col:wallet_transactions.user_id:uuid:NO
col:wallets.created_at:timestamp without time zone:NO
col:wallets.currency:character varying:NO
col:wallets.id:uuid:NO
col:wallets.solde:numeric:NO
col:wallets.solde_bloque:numeric:NO
col:wallets.updated_at:timestamp without time zone:NO
col:wallets.user_id:uuid:NO
col:zones.actif:boolean:NO
col:zones.created_at:timestamp without time zone:NO
col:zones.description:character varying:YES
col:zones.gestionnaire_id:character varying:YES
col:zones.id:uuid:NO
col:zones.nom:character varying:NO
col:zones.region:character varying:YES
col:zones.updated_at:timestamp without time zone:NO
col:zones.ville:character varying:YES
con:FK_05500efd05f72c9141ec296304e:f:marches
con:FK_215c6b9274f41665a154db4dfc4:f:cycles
con:FK_4796762c619893704abbc3dce65:f:wallet_transactions
con:FK_79d45115b7e411b4eba9179f493:f:commandes
con:FK_89b340df4ab6331d651865df3a4:f:commandes
con:FK_92558c08091598f7a4439586cda:f:wallets
con:FK_9ee3bc3631b2e8919c05d9a1a81:f:publications
con:FK_a11a5f46c36bc38067965c877bf:f:departements
con:FK_c921bd98c371f2053c1991f5f25:f:recoltes
con:FK_cafe31c486af3e5eec0a273ebee:f:commandes
con:FK_d0c72ad2c80cc78a99ddfe1f1e8:f:regions
con:FK_dc2adca1292f393cb5f35dd87d9:f:communes
con:FK_e3681a80d74f8e3fbd3f4c94ba8:f:publications
con:FK_ec50069e0910bfc638ac8fc49ef:f:publications
con:FK_f901ffbf66a4d0537ea235c0a97:f:recoltes
con:UQ_0d2cc92e9eea45587a60b18c3ff:u:cooperatives
con:UQ_8e9d73424149b43b38244f75528:u:districts
con:UQ_92558c08091598f7a4439586cda:u:wallets
con:UQ_97672ac88f789774dd47f7c8be3:u:users
con:UQ_a000cca60bcf04454e727699490:u:users
con:UQ_c177b96380c25d2a0364124c7a9:u:districts
con:UQ_e55a5ee0373d2132b9315184d96:u:academy_progress
con:bpay_transactions_pkey:p:bpay_transactions
con:caisse_sessions_pkey:p:caisse_sessions
con:clients_pkey:p:clients
con:credits_pkey:p:credits
con:evaluations_note_check:c:evaluations
con:evaluations_pkey:p:evaluations
con:fidelite_clients_pkey:p:fidelite_clients
con:fidelite_config_pkey:p:fidelite_config
con:produits_pkey:p:produits
con:stock_mouvements_pkey:p:stock_mouvements
idx:IDX_3ddc983c5f7bcf132fd8732c3f:refresh_tokens
idx:IDX_760ed385479f5bd683018f1379:boutique_mouvements
idx:IDX_ad3e46cb78aedbf7882e547a53:cooperative_membres
idx:PK_048c7aef9a99d4aed24c9054893:commandes
idx:PK_0be7539dcdba335470dc05e9690:institutions
idx:PK_0d27db950c50899676bce8e69dd:cooperative_membres
idx:PK_1bb179d048bbc581caa3b013439:audit_logs
idx:PK_2c4850823d8f6ec267b042368da:departements
idx:PK_2c4e732b044e09139d2f1065fae:publications
idx:PK_32734e87f299c29ca3878861f4f:push_tokens
idx:PK_343bc942ae261cf7a1377f48fd0:tickets
idx:PK_3a74f2e283338659fef10802360:raccourcis
idx:PK_432acea399a929f312e6613d973:academy_questions
idx:PK_46ec0f5605d70f64654ad4e7bd9:stock_reservations
idx:PK_4c4f716e96651b63e7369a42aeb:identifications
idx:PK_4fcd12ed6a046276e2deb08801c:regions
idx:PK_5120f131bde2cda940ec1a621db:wallet_transactions
idx:PK_529c862266138c6e9cf315b53c0:mutations
idx:PK_52e5eeb9c7c6e4ad1aed657967a:cycles
idx:PK_52fc93ab8869e3f71c46601fe9b:cooperatives
idx:PK_53a9285bb669dd2298c4de525bb:communes
idx:PK_6343e1b79d617a65d8496492743:recoltes
idx:PK_6a72c3c0f683f6462415e653c3a:notifications
idx:PK_6de618449277fb758cd2f13c1e3:user_flags
idx:PK_71d69ef1c2c7f6eceea500700f9:marchand_sous_profil_historique
idx:PK_787aebb1ac5923c9904043c6309:missions
idx:PK_7d8bee0204106019488c4c50ffa:refresh_tokens
idx:PK_8402e5df5a30a229380e83e4f7e:wallets
idx:PK_880484a43ca311707b05895bd4a:zones
idx:PK_8ec08f442448e2c7a1ea56bac73:academy_modules
idx:PK_972a72ff4e3bea5c7f43a2b98af:districts
idx:PK_9f7c5c349b66557717dd96b1d71:caisse_transactions
idx:PK_a3ffb1c0c8416b9fc6f907b7433:users
idx:PK_a7a4ca36a3fea7db0066f750162:boutique_mouvements
idx:PK_b5b1ee4ac914767229337974575:stocks
idx:PK_c82f0002854f4702a34d1feae08:objectifs_journaliers
idx:PK_d1ffb1f02f29e4f405d1d728243:marches
idx:PK_dd51990e9d8e65699a336104c6b:negociations
idx:PK_f8e7aa8dddec42142557cd01aa1:raccourcis_vocaux
idx:PK_fa54eb53cdaa4a07c2efac20d4e:academy_progress
idx:UQ_0d2cc92e9eea45587a60b18c3ff:cooperatives
idx:UQ_8e9d73424149b43b38244f75528:districts
idx:UQ_92558c08091598f7a4439586cda:wallets
idx:UQ_97672ac88f789774dd47f7c8be3:users
idx:UQ_a000cca60bcf04454e727699490:users
idx:UQ_c177b96380c25d2a0364124c7a9:districts
idx:UQ_e55a5ee0373d2132b9315184d96:academy_progress
idx:bpay_transactions_pkey:bpay_transactions
idx:caisse_sessions_pkey:caisse_sessions
idx:clients_pkey:clients
idx:credits_pkey:credits
idx:evaluations_pkey:evaluations
idx:fidelite_clients_pkey:fidelite_clients
idx:fidelite_config_pkey:fidelite_config
idx:idx_credits_marchand:credits
idx:idx_evaluations_cible:evaluations
idx:idx_produits_marchand:produits
idx:idx_stock_mouvements_marchand:stock_mouvements
idx:idx_stock_mouvements_tx:stock_mouvements
idx:idx_stock_reservations_publication:stock_reservations
idx:idx_stock_reservations_recolte:stock_reservations
idx:idx_users_email_lower:users
idx:idx_users_email_unique:users
idx:produits_pkey:produits
idx:stock_mouvements_pkey:stock_mouvements
idx:ux_caisse_sessions_marchand_date:caisse_sessions
idx:ux_caisse_tx_idempotency_key:caisse_transactions
idx:ux_clients_marchand_nom:clients
idx:ux_evaluations_cmd_auteur:evaluations
idx:ux_fidelite_client:fidelite_clients
idx:ux_publications_user_produit:publications
idx:ux_stock_reservations_commande:stock_reservations
view:credits_avec_statut
