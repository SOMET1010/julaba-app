// Base de données des marchés de Côte d'Ivoire

export interface Marche {
  nom: string;
  commune: string;
  ville: string;
  type: 'vivrier' | 'mixte' | 'bétail' | 'poisson' | 'textile';
}

export const MARCHES_CI: Marche[] = [
  // ── ABIDJAN ─────────────────────────────────────────────────────
  // Adjamé
  { nom: "Marché d'Adjamé", commune: "Abidjan - Adjamé", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Gouro", commune: "Abidjan - Adjamé", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Siaka Koné", commune: "Abidjan - Adjamé", ville: "Abidjan", type: "mixte" },
  { nom: "Grand Marché d'Adjamé", commune: "Abidjan - Adjamé", ville: "Abidjan", type: "mixte" },
  // Abobo
  { nom: "Marché d'Abobo", commune: "Abidjan - Abobo", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché PK18", commune: "Abidjan - Abobo", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Anador", commune: "Abidjan - Abobo", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Avocatier", commune: "Abidjan - Abobo", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Sagbé", commune: "Abidjan - Abobo", ville: "Abidjan", type: "vivrier" },
  // Attécoubé
  { nom: "Marché d'Attécoubé", commune: "Abidjan - Attécoubé", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Washington", commune: "Abidjan - Attécoubé", ville: "Abidjan", type: "vivrier" },
  // Cocody
  { nom: "Marché de Cocody", commune: "Abidjan - Cocody", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché d'Angré", commune: "Abidjan - Cocody", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché de Belvédère", commune: "Abidjan - Cocody", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché de Riviera", commune: "Abidjan - Cocody", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché d'Abatta", commune: "Abidjan - Cocody", ville: "Abidjan", type: "vivrier" },
  // Koumassi
  { nom: "Marché Siporex", commune: "Abidjan - Koumassi", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché de Koumassi", commune: "Abidjan - Koumassi", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Remblais", commune: "Abidjan - Koumassi", ville: "Abidjan", type: "vivrier" },
  // Marcory
  { nom: "Marché de Marcory", commune: "Abidjan - Marcory", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Zone 4", commune: "Abidjan - Marcory", ville: "Abidjan", type: "mixte" },
  // Plateau
  { nom: "Marché du Plateau", commune: "Abidjan - Plateau", ville: "Abidjan", type: "mixte" },
  { nom: "Grand Marché d'Abidjan", commune: "Abidjan - Plateau", ville: "Abidjan", type: "mixte" },
  // Port-Bouët
  { nom: "Marché de Port-Bouët", commune: "Abidjan - Port-Bouët", ville: "Abidjan", type: "poisson" },
  { nom: "Marché de Vridi", commune: "Abidjan - Port-Bouët", ville: "Abidjan", type: "poisson" },
  // Treichville
  { nom: "Marché de Treichville", commune: "Abidjan - Treichville", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché aux poissons de Treichville", commune: "Abidjan - Treichville", ville: "Abidjan", type: "poisson" },
  // Yopougon
  { nom: "Marché de Yopougon", commune: "Abidjan - Yopougon", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Selmer", commune: "Abidjan - Yopougon", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Niangon", commune: "Abidjan - Yopougon", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Wassakara", commune: "Abidjan - Yopougon", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Toits Rouges", commune: "Abidjan - Yopougon", ville: "Abidjan", type: "vivrier" },
  { nom: "Marché Lokoa", commune: "Abidjan - Yopougon", ville: "Abidjan", type: "vivrier" },
  // Bingerville
  { nom: "Marché de Bingerville", commune: "Abidjan - Bingerville", ville: "Abidjan", type: "vivrier" },
  // Grand-Bassam
  { nom: "Marché de Grand-Bassam", commune: "Grand-Bassam", ville: "Grand-Bassam", type: "vivrier" },
  { nom: "Marché de Moossou", commune: "Grand-Bassam", ville: "Grand-Bassam", type: "vivrier" },

  // ── BOUAKÉ ──────────────────────────────────────────────────────
  { nom: "Grand Marché de Bouaké", commune: "Bouaké", ville: "Bouaké", type: "vivrier" },
  { nom: "Marché de Koko", commune: "Bouaké", ville: "Bouaké", type: "vivrier" },
  { nom: "Marché de Kong", commune: "Bouaké", ville: "Bouaké", type: "vivrier" },
  { nom: "Marché Central de Bouaké", commune: "Bouaké", ville: "Bouaké", type: "mixte" },
  { nom: "Marché de Bromakoté", commune: "Bouaké", ville: "Bouaké", type: "vivrier" },

  // ── DALOA ───────────────────────────────────────────────────────
  { nom: "Grand Marché de Daloa", commune: "Daloa", ville: "Daloa", type: "vivrier" },
  { nom: "Marché de Lobia", commune: "Daloa", ville: "Daloa", type: "vivrier" },
  { nom: "Marché Gbeuliville", commune: "Daloa", ville: "Daloa", type: "vivrier" },

  // ── KORHOGO ─────────────────────────────────────────────────────
  { nom: "Grand Marché de Korhogo", commune: "Korhogo", ville: "Korhogo", type: "vivrier" },
  { nom: "Marché de bétail de Korhogo", commune: "Korhogo", ville: "Korhogo", type: "bétail" },
  { nom: "Marché de Soba", commune: "Korhogo", ville: "Korhogo", type: "vivrier" },

  // ── YAMOUSSOUKRO ────────────────────────────────────────────────
  { nom: "Marché Central de Yamoussoukro", commune: "Yamoussoukro", ville: "Yamoussoukro", type: "vivrier" },
  { nom: "Marché de Assabou", commune: "Yamoussoukro", ville: "Yamoussoukro", type: "vivrier" },
  { nom: "Marché de Morofé", commune: "Yamoussoukro", ville: "Yamoussoukro", type: "vivrier" },

  // ── SAN-PÉDRO ───────────────────────────────────────────────────
  { nom: "Grand Marché de San-Pédro", commune: "San-Pédro", ville: "San-Pédro", type: "vivrier" },
  { nom: "Marché de Bardot", commune: "San-Pédro", ville: "San-Pédro", type: "poisson" },

  // ── MAN ─────────────────────────────────────────────────────────
  { nom: "Grand Marché de Man", commune: "Man", ville: "Man", type: "vivrier" },
  { nom: "Marché de Dopleu", commune: "Man", ville: "Man", type: "vivrier" },

  // ── GAGNOA ──────────────────────────────────────────────────────
  { nom: "Grand Marché de Gagnoa", commune: "Gagnoa", ville: "Gagnoa", type: "vivrier" },
  { nom: "Marché de Dioulabougou", commune: "Gagnoa", ville: "Gagnoa", type: "vivrier" },

  // ── SOUBRÉ ──────────────────────────────────────────────────────
  { nom: "Marché de Soubré", commune: "Soubré", ville: "Soubré", type: "vivrier" },
  { nom: "Marché de Buyo", commune: "Soubré", ville: "Soubré", type: "vivrier" },

  // ── ABENGOUROU ──────────────────────────────────────────────────
  { nom: "Grand Marché d'Abengourou", commune: "Abengourou", ville: "Abengourou", type: "vivrier" },
  { nom: "Marché de Zaranou", commune: "Abengourou", ville: "Abengourou", type: "vivrier" },

  // ── DIVO ────────────────────────────────────────────────────────
  { nom: "Grand Marché de Divo", commune: "Divo", ville: "Divo", type: "vivrier" },

  // ── AGBOVILLE ───────────────────────────────────────────────────
  { nom: "Marché d'Agboville", commune: "Agboville", ville: "Agboville", type: "vivrier" },

  // ── SASSANDRA ───────────────────────────────────────────────────
  { nom: "Marché de Sassandra", commune: "Sassandra", ville: "Sassandra", type: "poisson" },

  // ── ODIENNÉ ─────────────────────────────────────────────────────
  { nom: "Marché d'Odienné", commune: "Odienné", ville: "Odienné", type: "vivrier" },

  // ── FERKESSÉDOUGOU ──────────────────────────────────────────────
  { nom: "Marché de Ferkessédougou", commune: "Ferkessédougou", ville: "Ferkessédougou", type: "vivrier" },
  { nom: "Marché de bétail de Ferké", commune: "Ferkessédougou", ville: "Ferkessédougou", type: "bétail" },

  // ── SÉGUÉLA ─────────────────────────────────────────────────────
  { nom: "Marché de Séguéla", commune: "Séguéla", ville: "Séguéla", type: "vivrier" },

  // ── BOUNDIALI ───────────────────────────────────────────────────
  { nom: "Marché de Boundiali", commune: "Boundiali", ville: "Boundiali", type: "vivrier" },

  // ── DIMBOKRO ────────────────────────────────────────────────────
  { nom: "Marché de Dimbokro", commune: "Dimbokro", ville: "Dimbokro", type: "vivrier" },

  // ── ADZOPÉ ──────────────────────────────────────────────────────
  { nom: "Marché d'Adzopé", commune: "Adzopé", ville: "Adzopé", type: "vivrier" },

  // ── ABOISSO ─────────────────────────────────────────────────────
  { nom: "Marché d'Aboisso", commune: "Aboisso", ville: "Aboisso", type: "vivrier" },
];

// Obtenir les marchés par commune
export function getMarchesByCommune(commune: string): string[] {
  return MARCHES_CI
    .filter(m => m.commune === commune)
    .map(m => m.nom);
}

// Liste de tous les noms de marchés
export const MARCHES_LISTE: string[] = MARCHES_CI.map(m => m.nom);
