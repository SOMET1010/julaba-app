import type { LettreMorte } from "./offlineCaisse";

export function resumeIncidentHorsLigne(incident: LettreMorte): string {
  const type = incident.endpoint.includes("depense") ? "dépense" : incident.endpoint.includes("vente") ? "vente" : "stock";
  const motif = incident.echec.message?.trim() || "L’opération a été refusée.";
  return `Cette ${type} n’a pas été enregistrée : ${motif}`;
}
