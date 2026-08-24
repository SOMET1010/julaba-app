/**
 * Tests de la garde de route AppLayout — checkRouteAccess() (cumul de rôle
 * marchand + membre coopérative, cf. Stock commun /cooperative/stock).
 * Lancer : npm run test:route-access   (tsx, sans DOM ni navigateur)
 *
 * Régression : un marchand membre d'une coopérative (estMembreCooperative
 * = true) se faisait rediriger en silence hors de /cooperative/stock, car
 * la garde ne comparait que le préfixe du rôle primaire (ROLE_ROUTES),
 * sans jamais tenir compte du cumul de rôle.
 */
import { checkRouteAccess } from "./constants.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

function main() {
  console.log("\n[1] Rôle primaire — accès normal à son propre espace");
  {
    ok(checkRouteAccess('marchand', '/marchand/caisse').allowed, "marchand → /marchand/* autorisé");
    ok(checkRouteAccess('cooperateur', '/cooperative/stock').allowed, "responsable coop (DB=cooperateur) → /cooperative/* autorisé");
    ok(checkRouteAccess('producteur', '/producteur/stocks').allowed, "producteur → /producteur/* autorisé");
    ok(!checkRouteAccess('marchand', '/producteur/stocks').allowed, "marchand → /producteur/* refusé");
  }

  console.log("\n[2] Backoffice — rôles admin");
  {
    ok(checkRouteAccess('super_admin', '/backoffice/dashboard').allowed, "super_admin → /backoffice autorisé");
    ok(!checkRouteAccess('marchand', '/backoffice/dashboard').allowed, "marchand → /backoffice refusé");
  }

  console.log("\n[3] Régression — marchand membre d'une coopérative → Stock commun");
  {
    const membre = checkRouteAccess('marchand', '/cooperative/stock', true);
    ok(membre.allowed, "marchand + estMembreCooperative=true → /cooperative/stock AUTORISÉ (le défaut corrigé)");
    ok(!membre.deniedForMissingCooperative, "…et pas signalé comme refus pour absence de coopérative");

    const nonMembre = checkRouteAccess('marchand', '/cooperative/stock', false);
    ok(!nonMembre.allowed, "marchand SANS coopérative → /cooperative/stock toujours refusé");
    ok(nonMembre.deniedForMissingCooperative, "…refus signalé comme légitime (absence de coopérative), pas silencieux");
    ok(nonMembre.allowedPrefix === '/marchand', "…redirection vers son espace marchand");

    const sansFlag = checkRouteAccess('marchand', '/cooperative/stock');
    ok(!sansFlag.allowed, "marchand sans estMembreCooperative (undefined) → toujours refusé par défaut");
  }

  console.log("\n[4] Le cumul de rôle ne s'étend PAS au reste de /cooperative");
  {
    const membres = checkRouteAccess('marchand', '/cooperative/membres', true);
    ok(!membres.allowed, "marchand membre → /cooperative/membres reste refusé (pas de cumul générique)");
    ok(!membres.deniedForMissingCooperative, "…refus normal (hors périmètre du cumul), pas 'sans coopérative'");

    const finances = checkRouteAccess('marchand', '/cooperative/finances', true);
    ok(!finances.allowed, "marchand membre → /cooperative/finances reste refusé");
  }

  console.log("\n[5] Le cumul est spécifique au rôle marchand");
  {
    ok(!checkRouteAccess('producteur', '/cooperative/stock', true).allowed, "producteur (même avec le flag) → /cooperative/stock refusé : le cumul ne concerne que le marchand");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
