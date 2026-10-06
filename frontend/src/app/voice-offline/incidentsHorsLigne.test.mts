import { resumeIncidentHorsLigne } from "./incidentsHorsLigne.js";

const resume = resumeIncidentHorsLigne({
  id: "op-1",
  endpoint: "/caisse/vente",
  method: "POST",
  payload: {},
  ts: 1,
  echec: { status: 422, message: "La journée est fermée.", failedAt: 2 },
});

if (resume !== "Cette vente n’a pas été enregistrée : La journée est fermée.") {
  throw new Error(`Résumé d’incident inattendu : ${resume}`);
}

console.log("Résumé des incidents hors ligne validé ✅");
