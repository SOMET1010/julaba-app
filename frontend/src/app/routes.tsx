import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { RootLayout } from './components/layout/RootLayout';
import { AppLayout } from './components/layout/AppLayout';
import { EntryGate } from './components/auth/EntryGate';
import { ChangePasswordScreen } from './components/auth/ChangePasswordScreen';
import { ActivationScreen } from './components/auth/ActivationScreen';
import { UnregisteredPhone } from './components/auth/UnregisteredPhone';
import { BORoot } from './components/backoffice/BORoot';
import { BOLogin } from './components/backoffice/BOLogin';
import { useBackOfficeOptional } from './contexts/BackOfficeContext';
import { IdentificateurLayout } from './components/identificateur/IdentificateurLayout';
import { InstitutionLayout } from './components/institution/InstitutionLayout';
import { ErrorFallback } from './components/layout/ErrorFallback';

const PageLoader = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
    <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid #C46210", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
    <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
  </div>
);

function L(fn: () => Promise<{ default: React.ComponentType<unknown> }>) {
  const C = lazy(fn);
  return <Suspense fallback={<PageLoader />}><C /></Suspense>;
}

// ── Garde de rôle BO (pattern recopié de BORoot.tsx) ─────────────────────────
// ADMINGEN-01 (audit admin général 19/10/2026) : les routes /backoffice/* ne
// portaient qu'une garde de LAYOUT (BORoot) — aucune vérification au niveau de
// la route elle-même. On recopie ici le pattern de garde du fichier (liste
// blanche de rôles BO + redirection vers /backoffice/login + attente du
// chargement d'auth) et on l'applique à chaque page BO : tout utilisateur non
// BO est renvoyé au login BO, même si le layout venait à changer. Les pages
// à usage superOnly restent fermées côté menu ET côté serveur — cette garde
// exige le RÔLE (liste blanche), pas une permission fine.
const ROLES_BO: readonly string[] = [
  'admin_general',
  'admin_national',
  'gestionnaire_zone',
  'operateur_terrain',
  'super_admin',
];

function ExigerRoleBO({ children }: { children: React.ReactNode }) {
  const boCtx = useBackOfficeOptional();
  // Attendre que loadUser soit terminé avant de statuer (évite un renvoi au
  // login pendant le chargement de session).
  if (boCtx?.isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }
  if (!boCtx?.boUser || !ROLES_BO.includes(boCtx.boUser.role)) {
    return <Navigate to="/backoffice/login" replace />;
  }
  return <>{children}</>;
}

const isDev = import.meta.env.DEV;
const diagnosticRoutes = isDev ? [
  { path: "/database", element: L(() => import("./pages/DatabaseViewer")), errorElement: <ErrorFallback /> },
  { path: "/create-super-admin", element: L(() => import("./pages/CreateSuperAdmin")), errorElement: <ErrorFallback /> },
  { path: "/setup-marchand", element: L(() => import("./pages/SetupMarchand")), errorElement: <ErrorFallback /> },
] : [];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <EntryGate /> },
      { path: "/non-enregistre", element: <UnregisteredPhone /> },
      // AUTH-01 (audit UI auth 05/10/2026) — UNE SEULE PORTE D'ENTRÉE, et la
      // garde `test:entree-unique` remise à VIVANTE (elle est repassée dans la
      // chaîne `verify`). /welcome et /login montaient Welcome et
      // LoginPassword EN DIRECT — un état hérité du snapshot d'origine,
      // jamais arbitré : deux chemins d'entrée parallèles à EntryGate, qui
      // contournaient ses drapeaux (splash, onboarding) et sa redirection par
      // rôle. Un lien profond vers /login faisait voir l'écran de connexion à
      // une personne DÉJÀ connectée ; EntryGate, lui, l'aurait renvoyée vers
      // son interface. Toute entrée passe donc par `/` : EntryGate reste le
      // SEUL juge du splash, de l'onboarding et du rôle (« logique centralisée
      // unique », en-tête d'EntryGate.tsx) — et la garde vérifie de nouveau
      // qu'aucun écran d'entrée ne peut être monté hors d'elle.
      { path: "/welcome", element: <Navigate to="/" replace /> },
      { path: "/login", element: <Navigate to="/" replace /> },
      { path: '/change-password', element: <ChangePasswordScreen /> },
      { path: '/activation', element: <ActivationScreen /> },
      // Console interne du Studio Voice (enregistrement des clips de Tata) —
      // outil d'équipe local au navigateur, aucune donnée ni écriture serveur.
      { path: "/studio-voix", element: L(() => import("./pages/StudioVoix")), errorElement: <ErrorFallback /> },
      // Studio v1 : collecte terrain par élicitation + validation par paires.
      // Squelette (backlog V5) — file locale, pas de synchro serveur.
      { path: "/collecte-voix", element: L(() => import("./pages/CollecteVoix")), errorElement: <ErrorFallback /> },
      { path: "/collecte-voix/validation", element: L(() => import("./pages/ValidationCollecte")), errorElement: <ErrorFallback /> },
      ...(isDev ? [{ path: "/dev-mode", element: L(() => import("./pages/DevModeHome").then(m => ({ default: m.DevModeHome }))), errorElement: <ErrorFallback /> }] : []),
      ...diagnosticRoutes,

      { path: "/marchand", element: <AppLayout />, children: [
        { index: true, element: L(() => import("./components/marchand/MarchandHome").then(m => ({ default: m.MarchandHome }))), errorElement: <ErrorFallback /> },
        { path: "caisse", element: L(() => import("./components/marchand/POSCaisse").then(m => ({ default: m.POSCaisse }))), errorElement: <ErrorFallback /> },
        { path: "cahier", element: L(() => import("./components/marchand/MarchandDepenses").then(m => ({ default: m.MarchandDepenses }))), errorElement: <ErrorFallback /> },
        { path: "depense", element: L(() => import("./components/marchand/DepenseForm").then(m => ({ default: m.DepenseForm }))), errorElement: <ErrorFallback /> },
        { path: "stock", element: L(() => import("./components/marchand/GestionStock").then(m => ({ default: m.GestionStock }))), errorElement: <ErrorFallback /> },
        { path: "marche", element: L(() => import("./components/marchand/MarcheVirtuel").then(m => ({ default: m.MarcheVirtuel }))), errorElement: <ErrorFallback /> },
        { path: "recoltes-prevues", element: L(() => import("./components/marchand/RecoltesPrevues").then(m => ({ default: m.RecoltesPrevues }))), errorElement: <ErrorFallback /> },
        { path: "profil", element: L(() => import("./components/marchand/MarchandProfil").then(m => ({ default: m.MarchandProfil }))), errorElement: <ErrorFallback /> },
        { path: "ventes-passees", element: L(() => import("./components/marchand/VentesPassees").then(m => ({ default: m.VentesPassees }))), errorElement: <ErrorFallback /> },
        { path: "resume-caisse", element: L(() => import("./components/marchand/ResumeCaisse").then(m => ({ default: m.ResumeCaisse }))), errorElement: <ErrorFallback /> },
        { path: "commandes", element: L(() => import("./components/marchand/MesCommandes").then(m => ({ default: m.MesCommandes }))), errorElement: <ErrorFallback /> },
        { path: "alertes", element: L(() => import("./components/marchand/MarchandAlertes").then(m => ({ default: m.MarchandAlertes }))), errorElement: <ErrorFallback /> },
        { path: "parametres", element: L(() => import("./components/marchand/Parametres").then(m => ({ default: m.Parametres }))), errorElement: <ErrorFallback /> },
        { path: "mes-donnees", element: L(() => import("./pages/marchand/MesDonnees").then(m => ({ default: m.MesDonnees }))), errorElement: <ErrorFallback /> },
        { path: "cooperative", element: L(() => import("./components/marchand/MaCooperative").then(m => ({ default: m.MaCooperative }))), errorElement: <ErrorFallback /> },
        { path: "cooperative/besoin", element: L(() => import("./components/marchand/BesoinMarchand").then(m => ({ default: m.BesoinMarchand }))), errorElement: <ErrorFallback /> },
        { path: "tontines", element: L(() => import("./components/marchand/Tontines").then(m => ({ default: m.Tontines }))), errorElement: <ErrorFallback /> },
        { path: "tontines/:id", element: L(() => import("./components/marchand/TontineDetail").then(m => ({ default: m.TontineDetail }))), errorElement: <ErrorFallback /> },
        { path: "protection-sociale", element: L(() => import("./components/marchand/ProtectionSociale").then(m => ({ default: m.ProtectionSociale }))), errorElement: <ErrorFallback /> },
        { path: "fidelite", element: L(() => import("./components/marchand/Fidelite").then(m => ({ default: m.Fidelite }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/academy/UniversalAcademy").then(m => ({ default: m.UniversalAcademy }))), errorElement: <ErrorFallback /> },
        { path: "keiwa", element: L(() => import("./components/wallet/WalletPage").then(m => ({ default: m.WalletPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/transfert", element: L(() => import("./components/wallet/TransfertPage").then(m => ({ default: m.TransfertPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/paiements", element: L(() => import("./components/wallet/PaiementsPage").then(m => ({ default: m.PaiementsPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/banque", element: L(() => import("./components/wallet/BanquePage").then(m => ({ default: m.BanquePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/carte", element: L(() => import("./components/wallet/CartePage").then(m => ({ default: m.CartePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/historique", element: L(() => import("./components/wallet/HistoriquePage").then(m => ({ default: m.HistoriquePage }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/shared/SupportPage").then(m => ({ default: m.SupportPage }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/producteur", element: <AppLayout />, children: [
        { index: true, element: L(() => import("./components/producteur/ProducteurHome").then(m => ({ default: m.ProducteurHome }))), errorElement: <ErrorFallback /> },
        { path: "production", element: L(() => import("./components/producteur/ProducteurProduction").then(m => ({ default: m.ProducteurProduction }))), errorElement: <ErrorFallback /> },
        { path: "commandes", element: L(() => import("./components/producteur/CommandesProducteurPage").then(m => ({ default: m.ProducteurCommandes }))), errorElement: <ErrorFallback /> },
        { path: "profil", element: L(() => import("./components/producteur/ProducteurMoi").then(m => ({ default: m.ProducteurMoi }))), errorElement: <ErrorFallback /> },
        { path: "declarer-recolte", element: L(() => import("./components/producteur/RecolteForm").then(m => ({ default: m.RecolteForm }))), errorElement: <ErrorFallback /> },
        { path: "recoltes", element: L(() => import("./components/producteur/MesRecoltesPage").then(m => ({ default: m.MesRecoltesPage }))), errorElement: <ErrorFallback /> },
        { path: "stocks", element: L(() => import("./components/producteur/StocksWrapper").then(m => ({ default: m.StocksWrapper }))), errorElement: <ErrorFallback /> },
        { path: "publier-recolte", element: L(() => import("./components/producteur/PublierRecolte").then(m => ({ default: m.PublierRecolte }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/academy/UniversalAcademy").then(m => ({ default: m.UniversalAcademy }))), errorElement: <ErrorFallback /> },
        { path: "keiwa", element: L(() => import("./components/wallet/WalletPage").then(m => ({ default: m.WalletPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/transfert", element: L(() => import("./components/wallet/TransfertPage").then(m => ({ default: m.TransfertPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/paiements", element: L(() => import("./components/wallet/PaiementsPage").then(m => ({ default: m.PaiementsPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/banque", element: L(() => import("./components/wallet/BanquePage").then(m => ({ default: m.BanquePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/carte", element: L(() => import("./components/wallet/CartePage").then(m => ({ default: m.CartePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/historique", element: L(() => import("./components/wallet/HistoriquePage").then(m => ({ default: m.HistoriquePage }))), errorElement: <ErrorFallback /> },
        { path: "parametres", element: L(() => import("./components/producteur/ProducteurParametres").then(m => ({ default: m.ProducteurParametres }))), errorElement: <ErrorFallback /> },
        { path: "alertes", element: L(() => import("./components/producteur/ProducteurAlertes").then(m => ({ default: m.ProducteurAlertes }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/shared/SupportPage").then(m => ({ default: m.SupportPage }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/cooperative", element: <AppLayout />, children: [
        { index: true, element: L(() => import("./components/cooperative/CooperativeHome").then(m => ({ default: m.CooperativeHome }))), errorElement: <ErrorFallback /> },
        { path: "membres", element: L(() => import("./components/cooperative/Membres").then(m => ({ default: m.Membres }))), errorElement: <ErrorFallback /> },
        { path: "finances", element: L(() => import("./components/cooperative/FinancesCooperative").then(m => ({ default: m.FinancesCooperative }))), errorElement: <ErrorFallback /> },
        { path: "profil", element: L(() => import("./components/cooperative/CooperativeProfil").then(m => ({ default: m.CooperativeProfil }))), errorElement: <ErrorFallback /> },
        { path: "stock", element: L(() => import("./components/cooperative/Stock").then(m => ({ default: m.Stock }))), errorElement: <ErrorFallback /> },
        { path: "tresorerie", element: L(() => import("./components/cooperative/TresorerieCooperative").then(m => ({ default: m.TresorerieCooperative }))), errorElement: <ErrorFallback /> },
        { path: "marche", element: L(() => import("./components/cooperative/MarcheHub").then(m => ({ default: m.MarcheHub }))), errorElement: <ErrorFallback /> },
        { path: "commandes", element: L(() => import("./components/cooperative/Commandes").then(m => ({ default: m.Commandes }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/academy/UniversalAcademy").then(m => ({ default: m.UniversalAcademy }))), errorElement: <ErrorFallback /> },
        { path: "keiwa", element: L(() => import("./components/wallet/WalletPage").then(m => ({ default: m.WalletPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/transfert", element: L(() => import("./components/wallet/TransfertPage").then(m => ({ default: m.TransfertPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/paiements", element: L(() => import("./components/wallet/PaiementsPage").then(m => ({ default: m.PaiementsPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/banque", element: L(() => import("./components/wallet/BanquePage").then(m => ({ default: m.BanquePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/carte", element: L(() => import("./components/wallet/CartePage").then(m => ({ default: m.CartePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/historique", element: L(() => import("./components/wallet/HistoriquePage").then(m => ({ default: m.HistoriquePage }))), errorElement: <ErrorFallback /> },
        { path: "parametres", element: L(() => import("./components/cooperative/CooperativeParametres").then(m => ({ default: m.CooperativeParametres }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/shared/SupportPage").then(m => ({ default: m.SupportPage }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/institution", element: <InstitutionLayout />, children: [
        { index: true, element: L(() => import("./components/institution/InstitutionHome").then(m => ({ default: m.InstitutionHome }))), errorElement: <ErrorFallback /> },
        { path: "analytics", element: L(() => import("./components/institution/Analytics").then(m => ({ default: m.Analytics }))), errorElement: <ErrorFallback /> },
        { path: "acteurs", element: L(() => import("./components/institution/InstitutionActeurs").then(m => ({ default: m.InstitutionActeurs }))), errorElement: <ErrorFallback /> },
        { path: "supervision", element: L(() => import("./components/institution/InstitutionSupervision").then(m => ({ default: m.InstitutionSupervision }))), errorElement: <ErrorFallback /> },
        { path: "parametres", element: L(() => import("./components/institution/InstitutionParametres").then(m => ({ default: m.InstitutionParametres }))), errorElement: <ErrorFallback /> },
        { path: "profil", element: L(() => import("./components/institution/InstitutionProfil").then(m => ({ default: m.InstitutionProfil }))), errorElement: <ErrorFallback /> },
        { path: "dashboard", element: L(() => import("./components/institution/Dashboard").then(m => ({ default: m.Dashboard }))), errorElement: <ErrorFallback /> },
        { path: "dashboard-analytics", element: L(() => import("./components/institution/DashboardAnalytics").then(m => ({ default: m.DashboardAnalytics }))), errorElement: <ErrorFallback /> },
        { path: "audit-trail", element: L(() => import("./components/institution/AuditTrail").then(m => ({ default: m.AuditTrail }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/academy/UniversalAcademy").then(m => ({ default: m.UniversalAcademy }))), errorElement: <ErrorFallback /> },
        { path: "keiwa", element: L(() => import("./components/wallet/WalletPage").then(m => ({ default: m.WalletPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/transfert", element: L(() => import("./components/wallet/TransfertPage").then(m => ({ default: m.TransfertPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/paiements", element: L(() => import("./components/wallet/PaiementsPage").then(m => ({ default: m.PaiementsPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/banque", element: L(() => import("./components/wallet/BanquePage").then(m => ({ default: m.BanquePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/carte", element: L(() => import("./components/wallet/CartePage").then(m => ({ default: m.CartePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/historique", element: L(() => import("./components/wallet/HistoriquePage").then(m => ({ default: m.HistoriquePage }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/shared/SupportPage").then(m => ({ default: m.SupportPage }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/marketplace", element: <AppLayout />, children: [
        { index: true, element: L(() => import("./components/marketplace/Marketplace").then(m => ({ default: m.Marketplace }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/identificateur", element: <IdentificateurLayout />, children: [
        { index: true, element: L(() => import("./components/identificateur/IdentificateurHome").then(m => ({ default: m.IdentificateurHome }))), errorElement: <ErrorFallback /> },
        // Route canonique du formulaire : /identificateur/fiche-identification
        // (celle où la BottomBar est masquée, T5/I-P1-5). La route historique
        // /identification redirige — un composant, une destination.
        { path: "identification", element: <Navigate to="/identificateur/fiche-identification" replace /> },
        { path: "suivi", element: L(() => import("./components/identificateur/SuiviIdentifications").then(m => ({ default: m.SuiviIdentifications }))), errorElement: <ErrorFallback /> },
        { path: "brouillons", element: L(() => import("./components/identificateur/MesBrouillons").then(m => ({ default: m.MesBrouillons }))), errorElement: <ErrorFallback /> },
        // Canonique : /identifications (nommée comme l'écran, pointée par les
        // notifications dossier_*, T5). /acteurs est la route historique.
        { path: "acteurs", element: <Navigate to="/identificateur/identifications" replace /> },
        { path: "profil", element: L(() => import("./components/identificateur/IdentificateurProfil").then(m => ({ default: m.IdentificateurProfil }))), errorElement: <ErrorFallback /> },
        { path: "acteur/:numero", element: L(() => import("./components/identificateur/ActeurDetails").then(m => ({ default: m.ActeurDetails }))), errorElement: <ErrorFallback /> },
        { path: "demande-mutation", element: L(() => import("./components/identificateur/DemandeMutation").then(m => ({ default: m.DemandeMutation }))), errorElement: <ErrorFallback /> },
        { path: "identifications", element: L(() => import("./components/identificateur/Identifications").then(m => ({ default: m.Identifications }))), errorElement: <ErrorFallback /> },
        // Écrans analytiques orphelins (0 lien entrant, T5) : la fusion
        // Dashboard + Statistiques dans Rapports/Suivi est décidée (§8.5,
        // terme) — en attendant, les deux routes historiques rejoignent
        // Rapports au lieu de monter 4 écrans concurrents.
        { path: "statistiques", element: <Navigate to="/identificateur/rapports" replace /> },
        { path: "rapports", element: L(() => import("./components/identificateur/RapportsIdentificateur").then(m => ({ default: m.RapportsIdentificateur }))), errorElement: <ErrorFallback /> },
        { path: "dashboard", element: <Navigate to="/identificateur/rapports" replace /> },
        { path: "fiche-identification", element: L(() => import("./components/identificateur/FicheIdentificationDynamique").then(m => ({ default: m.FicheIdentificationDynamique }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/academy/UniversalAcademy").then(m => ({ default: m.UniversalAcademy }))), errorElement: <ErrorFallback /> },
        // IDENTIFICATEUR-16 (audit 19/10/2026) : les 6 routes Keiwa (wallets)
        // montées sous /identificateur sont RETIRÉES — l'identificateur est un
        // acteur MONÉTIQUEMENT NEUTRE (aucun wallet métier) et le serveur ne
        // garantit pas encore la neutralité (wallets.controller sans garde de
        // rôle). Même par URL directe, ce sous-espace ne monte plus de page
        // d'argent. Le masquage nav (modulesPilote) et les liens résiduels
        // (UniversalProfil/UniversalParametres — fichiers hors périmètre 46-h)
        // atterriront sur NotFound au lieu d'un wallet.
        { path: "parametres", element: L(() => import("./components/identificateur/IdentificateurParametres").then(m => ({ default: m.IdentificateurParametres }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/shared/SupportPage").then(m => ({ default: m.SupportPage }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/backoffice/login", element: <BOLogin /> },
      // ADMINGEN-01 : chaque page BO est enveloppée par <ExigerRoleBO> (pattern
      // BORoot recopié en tête de fichier) — la garde de rôle ne dépend plus du
      // seul layout. L'index reste une redirection pure vers la page (déjà
      // gardée) /backoffice/dashboard.
      { path: "/backoffice", element: <BORoot />, children: [
        { index: true, element: <Navigate to="/backoffice/dashboard" replace /> },
        { path: "dashboard", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BODashboard").then(m => ({ default: m.BODashboard })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "acteurs", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOActeurs").then(m => ({ default: m.BOActeurs })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "acteurs/nouveau", element: <ExigerRoleBO>{L(() => import("./components/backoffice/NouvelActeurPage").then(m => ({ default: m.NouvelActeurPage })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "acteurs/:id", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOActeurDetail").then(m => ({ default: m.BOActeurDetail })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "enrolement", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOEnrolement").then(m => ({ default: m.BOEnrolement })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "supervision", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOSupervision").then(m => ({ default: m.BOSupervision })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "zones", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOZones").then(m => ({ default: m.BOZones })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "carte", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOCarteActeurs").then(m => ({ default: m.BOCarteActeurs })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "academy", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOAcademy").then(m => ({ default: m.BOAcademy })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "missions", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOMissions").then(m => ({ default: m.BOMissions })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "parametres", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOParametres").then(m => ({ default: m.BOParametres })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "audit", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOAudit").then(m => ({ default: m.BOAudit })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "utilisateurs", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOUtilisateurs").then(m => ({ default: m.BOUtilisateurs })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "institutions", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOInstitutions").then(m => ({ default: m.BOInstitutions })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "profil", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOProfil").then(m => ({ default: m.BOProfil })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "rapports", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BORapports").then(m => ({ default: m.BORapports })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "notifications", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BONotifications").then(m => ({ default: m.BONotifications })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "support", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOSupport").then(m => ({ default: m.BOSupport })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "moderation", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOModeration").then(m => ({ default: m.BOModeration })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "mutations", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOMutations").then(m => ({ default: m.BOMutations })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "contenus", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOContenus").then(m => ({ default: m.BOContenus })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "monitoring-ia", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOMonitoringIA").then(m => ({ default: m.BOMonitoringIA })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "event-monitor", element: <ExigerRoleBO>{L(() => import("./components/backoffice/EventMonitor").then(m => ({ default: m.EventMonitor })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "analytics", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOAnalyticsProduit").then(m => ({ default: m.BOAnalyticsProduit })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "score-financier", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOScoreFinancier").then(m => ({ default: m.BOScoreFinancier })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "api-keys", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOApiKeys").then(m => ({ default: m.BOApiKeys })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "marketplace", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOMarketplace").then(m => ({ default: m.BOMarketplace })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "livraison", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOLivraison").then(m => ({ default: m.BOLivraison })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "communication", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOCommunication").then(m => ({ default: m.BOCommunication })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "cron", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOCronDashboard").then(m => ({ default: m.BOCronDashboard })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "config-institution", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOConfigInstitution").then(m => ({ default: m.BOConfigInstitution })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
        { path: "keiwa", element: <ExigerRoleBO>{L(() => import("./components/backoffice/BOKeiwa").then(m => ({ default: m.BOKeiwa })))}</ExigerRoleBO>, errorElement: <ErrorFallback /> },
      ]},

      { path: "/pay/success", element: L(() => import("./components/wallet/PaySuccessPage").then(m => ({ default: m.default }))), errorElement: <ErrorFallback /> },
      { path: "/pay/error", element: L(() => import("./components/wallet/PaySuccessPage").then(m => ({ default: m.default }))), errorElement: <ErrorFallback /> },
      { path: "/paiement/success", element: L(() => import("./components/wallet/PaySuccessPage").then(m => ({ default: m.default }))), errorElement: <ErrorFallback /> },
      { path: "/paiement/failed", element: L(() => import("./components/wallet/PaySuccessPage").then(m => ({ default: m.default }))), errorElement: <ErrorFallback /> },
      { path: "/pay/:marchandId", element: L(() => import("./components/wallet/PayPage").then(m => ({ default: m.default }))), errorElement: <ErrorFallback /> },
      { path: "*", element: L(() => import("./pages/NotFound")), errorElement: <ErrorFallback /> },
    ],
  },
]);
