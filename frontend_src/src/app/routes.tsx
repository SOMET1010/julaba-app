import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { RootLayout } from './components/layout/RootLayout';
import { AppLayout } from './components/layout/AppLayout';
import { EntryGate } from './components/auth/EntryGate';
import { LoginPassword } from './components/auth/LoginPassword';
import { ChangePasswordScreen } from './components/auth/ChangePasswordScreen';
import { UnregisteredPhone } from './components/auth/UnregisteredPhone';
import { Welcome } from './components/auth/Welcome';
import { BORoot } from './components/backoffice/BORoot';
import { BOLogin } from './components/backoffice/BOLogin';
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

const isDev = import.meta.env.DEV;
const diagnosticRoutes = isDev ? [
  { path: "/database", element: L(() => import("./pages/DatabaseViewer")), errorElement: <ErrorFallback /> },
  { path: "/create-super-admin", element: L(() => import("./pages/CreateSuperAdmin")), errorElement: <ErrorFallback /> },
  { path: "/admin-recovery", element: L(() => import("./pages/AdminRecovery")), errorElement: <ErrorFallback /> },
  { path: "/setup-marchand", element: L(() => import("./pages/SetupMarchand")), errorElement: <ErrorFallback /> },
] : [];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <EntryGate /> },
      { path: "/non-enregistre", element: <UnregisteredPhone /> },
      { path: "/welcome", element: <Welcome /> },
      { path: "/login", element: <LoginPassword /> },
      { path: '/change-password', element: <ChangePasswordScreen /> },
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
        { path: "cooperative", element: L(() => import("./components/marchand/MaCooperative").then(m => ({ default: m.MaCooperative }))), errorElement: <ErrorFallback /> },
        { path: "cooperative/besoin", element: L(() => import("./components/marchand/BesoinMarchand").then(m => ({ default: m.BesoinMarchand }))), errorElement: <ErrorFallback /> },
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
        { path: "identification", element: L(() => import("./components/identificateur/FicheIdentificationDynamique").then(m => ({ default: m.FicheIdentificationDynamique }))), errorElement: <ErrorFallback /> },
        { path: "suivi", element: L(() => import("./components/identificateur/SuiviIdentifications").then(m => ({ default: m.SuiviIdentifications }))), errorElement: <ErrorFallback /> },
        { path: "brouillons", element: L(() => import("./components/identificateur/MesBrouillons").then(m => ({ default: m.MesBrouillons }))), errorElement: <ErrorFallback /> },
        { path: "acteurs", element: L(() => import("./components/identificateur/Identifications").then(m => ({ default: m.Identifications }))), errorElement: <ErrorFallback /> },
        { path: "profil", element: L(() => import("./components/identificateur/IdentificateurProfil").then(m => ({ default: m.IdentificateurProfil }))), errorElement: <ErrorFallback /> },
        { path: "acteur/:numero", element: L(() => import("./components/identificateur/ActeurDetails").then(m => ({ default: m.ActeurDetails }))), errorElement: <ErrorFallback /> },
        { path: "demande-mutation", element: L(() => import("./components/identificateur/DemandeMutation").then(m => ({ default: m.DemandeMutation }))), errorElement: <ErrorFallback /> },
        { path: "identifications", element: L(() => import("./components/identificateur/Identifications").then(m => ({ default: m.Identifications }))), errorElement: <ErrorFallback /> },
        { path: "statistiques", element: L(() => import("./components/identificateur/IdentificateurStats").then(m => ({ default: m.IdentificateurStats }))), errorElement: <ErrorFallback /> },
        { path: "rapports", element: L(() => import("./components/identificateur/RapportsIdentificateur").then(m => ({ default: m.RapportsIdentificateur }))), errorElement: <ErrorFallback /> },
        { path: "dashboard", element: L(() => import("./components/identificateur/IdentificateurDashboard").then(m => ({ default: m.IdentificateurDashboard }))), errorElement: <ErrorFallback /> },
        { path: "fiche-identification", element: L(() => import("./components/identificateur/FicheIdentificationDynamique").then(m => ({ default: m.FicheIdentificationDynamique }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/academy/UniversalAcademy").then(m => ({ default: m.UniversalAcademy }))), errorElement: <ErrorFallback /> },
        { path: "keiwa", element: L(() => import("./components/wallet/WalletPage").then(m => ({ default: m.WalletPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/transfert", element: L(() => import("./components/wallet/TransfertPage").then(m => ({ default: m.TransfertPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/paiements", element: L(() => import("./components/wallet/PaiementsPage").then(m => ({ default: m.PaiementsPage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/banque", element: L(() => import("./components/wallet/BanquePage").then(m => ({ default: m.BanquePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/carte", element: L(() => import("./components/wallet/CartePage").then(m => ({ default: m.CartePage }))), errorElement: <ErrorFallback /> },
        { path: "keiwa/historique", element: L(() => import("./components/wallet/HistoriquePage").then(m => ({ default: m.HistoriquePage }))), errorElement: <ErrorFallback /> },
        { path: "parametres", element: L(() => import("./components/identificateur/IdentificateurParametres").then(m => ({ default: m.IdentificateurParametres }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/shared/SupportPage").then(m => ({ default: m.SupportPage }))), errorElement: <ErrorFallback /> },
      ]},

      { path: "/backoffice/login", element: <BOLogin /> },
      { path: "/backoffice", element: <BORoot />, children: [
        { index: true, element: <Navigate to="/backoffice/dashboard" replace /> },
        { path: "dashboard", element: L(() => import("./components/backoffice/BODashboard").then(m => ({ default: m.BODashboard }))), errorElement: <ErrorFallback /> },
        { path: "acteurs", element: L(() => import("./components/backoffice/BOActeurs").then(m => ({ default: m.BOActeurs }))), errorElement: <ErrorFallback /> },
        { path: "acteurs/nouveau", element: L(() => import("./components/backoffice/NouvelActeurPage").then(m => ({ default: m.NouvelActeurPage }))), errorElement: <ErrorFallback /> },
        { path: "acteurs/:id", element: L(() => import("./components/backoffice/BOActeurDetail").then(m => ({ default: m.BOActeurDetail }))), errorElement: <ErrorFallback /> },
        { path: "enrolement", element: L(() => import("./components/backoffice/BOEnrolement").then(m => ({ default: m.BOEnrolement }))), errorElement: <ErrorFallback /> },
        { path: "supervision", element: L(() => import("./components/backoffice/BOSupervision").then(m => ({ default: m.BOSupervision }))), errorElement: <ErrorFallback /> },
        { path: "zones", element: L(() => import("./components/backoffice/BOZones").then(m => ({ default: m.BOZones }))), errorElement: <ErrorFallback /> },
        { path: "carte", element: L(() => import("./components/backoffice/BOCarteActeurs").then(m => ({ default: m.BOCarteActeurs }))), errorElement: <ErrorFallback /> },
        { path: "academy", element: L(() => import("./components/backoffice/BOAcademy").then(m => ({ default: m.BOAcademy }))), errorElement: <ErrorFallback /> },
        { path: "missions", element: L(() => import("./components/backoffice/BOMissions").then(m => ({ default: m.BOMissions }))), errorElement: <ErrorFallback /> },
        { path: "parametres", element: L(() => import("./components/backoffice/BOParametres").then(m => ({ default: m.BOParametres }))), errorElement: <ErrorFallback /> },
        { path: "audit", element: L(() => import("./components/backoffice/BOAudit").then(m => ({ default: m.BOAudit }))), errorElement: <ErrorFallback /> },
        { path: "utilisateurs", element: L(() => import("./components/backoffice/BOUtilisateurs").then(m => ({ default: m.BOUtilisateurs }))), errorElement: <ErrorFallback /> },
        { path: "institutions", element: L(() => import("./components/backoffice/BOInstitutions").then(m => ({ default: m.BOInstitutions }))), errorElement: <ErrorFallback /> },
        { path: "profil", element: L(() => import("./components/backoffice/BOProfil").then(m => ({ default: m.BOProfil }))), errorElement: <ErrorFallback /> },
        { path: "rapports", element: L(() => import("./components/backoffice/BORapports").then(m => ({ default: m.BORapports }))), errorElement: <ErrorFallback /> },
        { path: "notifications", element: L(() => import("./components/backoffice/BONotifications").then(m => ({ default: m.BONotifications }))), errorElement: <ErrorFallback /> },
        { path: "support", element: L(() => import("./components/backoffice/BOSupport").then(m => ({ default: m.BOSupport }))), errorElement: <ErrorFallback /> },
        { path: "moderation", element: L(() => import("./components/backoffice/BOModeration").then(m => ({ default: m.BOModeration }))), errorElement: <ErrorFallback /> },
        { path: "mutations", element: L(() => import("./components/backoffice/BOMutations").then(m => ({ default: m.BOMutations }))), errorElement: <ErrorFallback /> },
        { path: "contenus", element: L(() => import("./components/backoffice/BOContenus").then(m => ({ default: m.BOContenus }))), errorElement: <ErrorFallback /> },
        { path: "monitoring-ia", element: L(() => import("./components/backoffice/BOMonitoringIA").then(m => ({ default: m.BOMonitoringIA }))), errorElement: <ErrorFallback /> },
        { path: "event-monitor", element: L(() => import("./components/backoffice/EventMonitor").then(m => ({ default: m.EventMonitor }))), errorElement: <ErrorFallback /> },
        { path: "analytics", element: L(() => import("./components/backoffice/BOAnalyticsProduit").then(m => ({ default: m.BOAnalyticsProduit }))), errorElement: <ErrorFallback /> },
        { path: "score-financier", element: L(() => import("./components/backoffice/BOScoreFinancier").then(m => ({ default: m.BOScoreFinancier }))), errorElement: <ErrorFallback /> },
        { path: "api-keys", element: L(() => import("./components/backoffice/BOApiKeys").then(m => ({ default: m.BOApiKeys }))), errorElement: <ErrorFallback /> },
        { path: "marketplace", element: L(() => import("./components/backoffice/BOMarketplace").then(m => ({ default: m.BOMarketplace }))), errorElement: <ErrorFallback /> },
        { path: "livraison", element: L(() => import("./components/backoffice/BOLivraison").then(m => ({ default: m.BOLivraison }))), errorElement: <ErrorFallback /> },
        { path: "communication", element: L(() => import("./components/backoffice/BOCommunication").then(m => ({ default: m.BOCommunication }))), errorElement: <ErrorFallback /> },
        { path: "cron", element: L(() => import("./components/backoffice/BOCronDashboard").then(m => ({ default: m.BOCronDashboard }))), errorElement: <ErrorFallback /> },
        { path: "config-institution", element: L(() => import("./components/backoffice/BOConfigInstitution").then(m => ({ default: m.BOConfigInstitution }))), errorElement: <ErrorFallback /> },
        { path: "keiwa", element: L(() => import("./components/backoffice/BOKeiwa").then(m => ({ default: m.BOKeiwa }))), errorElement: <ErrorFallback /> },
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
