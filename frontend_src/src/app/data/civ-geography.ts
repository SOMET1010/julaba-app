// ─── Hierarchie administrative de la Cote d'Ivoire ───────────────────────────
// Donnees hardcodees pour les formulaires Back-Office.
// Structure : District > Region > Departement > Sous-prefecture > Commune
// Source : Decoupage administratif officiel de la RCI
// ─────────────────────────────────────────────────────────────────────────────

// ── Types TypeScript ────────────────────────────────────────────────────────

export type Commune = string;

export type SousPrefecture = {
  nom: string;
  communes: Commune[];
};

export type Departement = {
  nom: string;
  sousPrefectures: SousPrefecture[];
};

export type Region = {
  nom: string;
  chefLieu: string;
  departements: Departement[];
};

export type District = {
  nom: string;
  type: 'autonome' | 'standard';
  regions: Region[];
};

// ── Districts et regions completes ──────────────────────────────────────────

export const CIV_DISTRICTS: District[] = [
  // ── District Autonome d'Abidjan ──
  {
    nom: 'Abidjan',
    type: 'autonome',
    regions: [
      {
        nom: 'Abidjan',
        chefLieu: 'Abidjan',
        departements: [
          {
            nom: 'Abidjan',
            sousPrefectures: [
              { nom: 'Abobo', communes: ['Abobo'] },
              { nom: 'Adjame', communes: ['Adjame'] },
              { nom: 'Attiecoube', communes: ['Attiecoube'] },
              { nom: 'Cocody', communes: ['Cocody'] },
              { nom: 'Koumassi', communes: ['Koumassi'] },
              { nom: 'Marcory', communes: ['Marcory'] },
              { nom: 'Plateau', communes: ['Plateau'] },
              { nom: 'Port-Bouet', communes: ['Port-Bouet'] },
              { nom: 'Treichville', communes: ['Treichville'] },
              { nom: 'Yopougon', communes: ['Yopougon'] },
              { nom: 'Bingerville', communes: ['Bingerville'] },
              { nom: 'Songon', communes: ['Songon'] },
              { nom: 'Anyama', communes: ['Anyama'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District Autonome de Yamoussoukro ──
  {
    nom: 'Yamoussoukro',
    type: 'autonome',
    regions: [
      {
        nom: 'Yamoussoukro',
        chefLieu: 'Yamoussoukro',
        departements: [
          {
            nom: 'Yamoussoukro',
            sousPrefectures: [
              { nom: 'Yamoussoukro', communes: ['Yamoussoukro'] },
              { nom: 'Attieguakro', communes: ['Attieguakro'] },
              { nom: 'Kossou', communes: ['Kossou'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District des Lagunes ──
  {
    nom: 'Lagunes',
    type: 'standard',
    regions: [
      {
        nom: 'Agneby-Tiassa',
        chefLieu: 'Agboville',
        departements: [
          {
            nom: 'Agboville',
            sousPrefectures: [
              { nom: 'Agboville', communes: ['Agboville'] },
              { nom: 'Azaguie', communes: ['Azaguie'] },
              { nom: 'Rubino', communes: ['Rubino'] },
            ],
          },
          {
            nom: 'Tiassale',
            sousPrefectures: [
              { nom: 'Tiassale', communes: ['Tiassale'] },
              { nom: "N'Douci", communes: ["N'Douci"] },
              { nom: 'Sikensi', communes: ['Sikensi'] },
            ],
          },
        ],
      },
      {
        nom: 'Grands-Ponts',
        chefLieu: 'Dabou',
        departements: [
          {
            nom: 'Dabou',
            sousPrefectures: [
              { nom: 'Dabou', communes: ['Dabou'] },
              { nom: 'Lopou', communes: ['Lopou'] },
            ],
          },
          {
            nom: 'Jacqueville',
            sousPrefectures: [
              { nom: 'Jacqueville', communes: ['Jacqueville'] },
            ],
          },
        ],
      },
      {
        nom: 'La Me',
        chefLieu: 'Adzope',
        departements: [
          {
            nom: 'Adzope',
            sousPrefectures: [
              { nom: 'Adzope', communes: ['Adzope'] },
              { nom: 'Becedi-Brignan', communes: ['Becedi-Brignan'] },
              { nom: 'Yakasse-Attobrou', communes: ['Yakasse-Attobrou'] },
            ],
          },
          {
            nom: 'Alepe',
            sousPrefectures: [
              { nom: 'Alepe', communes: ['Alepe'] },
              { nom: 'Oghlwapo', communes: ['Oghlwapo'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District de la Comoe ──
  {
    nom: 'Comoe',
    type: 'standard',
    regions: [
      {
        nom: 'Indenie-Djuablin',
        chefLieu: 'Abengourou',
        departements: [
          {
            nom: 'Abengourou',
            sousPrefectures: [
              { nom: 'Abengourou', communes: ['Abengourou'] },
              { nom: 'Aniassue', communes: ['Aniassue'] },
              { nom: 'Niable', communes: ['Niable'] },
            ],
          },
          {
            nom: 'Agnibilekrou',
            sousPrefectures: [
              { nom: 'Agnibilekrou', communes: ['Agnibilekrou'] },
            ],
          },
          {
            nom: 'Bettie',
            sousPrefectures: [
              { nom: 'Bettie', communes: ['Bettie'] },
            ],
          },
        ],
      },
      {
        nom: 'Sud-Comoe',
        chefLieu: 'Aboisso',
        departements: [
          {
            nom: 'Aboisso',
            sousPrefectures: [
              { nom: 'Aboisso', communes: ['Aboisso'] },
              { nom: 'Adiake', communes: ['Adiake'] },
              { nom: 'Ayame', communes: ['Ayame'] },
            ],
          },
          {
            nom: 'Grand-Bassam',
            sousPrefectures: [
              { nom: 'Grand-Bassam', communes: ['Grand-Bassam'] },
              { nom: 'Bonoua', communes: ['Bonoua'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Haut-Sassandra ──
  {
    nom: 'Haut-Sassandra',
    type: 'standard',
    regions: [
      {
        nom: 'Haut-Sassandra',
        chefLieu: 'Daloa',
        departements: [
          {
            nom: 'Daloa',
            sousPrefectures: [
              { nom: 'Daloa', communes: ['Daloa'] },
              { nom: 'Vavoua', communes: ['Vavoua'] },
            ],
          },
          {
            nom: 'Issia',
            sousPrefectures: [
              { nom: 'Issia', communes: ['Issia'] },
              { nom: 'Saioua', communes: ['Saioua'] },
            ],
          },
        ],
      },
      {
        nom: 'Marahoue',
        chefLieu: 'Bouafle',
        departements: [
          {
            nom: 'Bouafle',
            sousPrefectures: [
              { nom: 'Bouafle', communes: ['Bouafle'] },
              { nom: 'Bonon', communes: ['Bonon'] },
            ],
          },
          {
            nom: 'Sinfra',
            sousPrefectures: [
              { nom: 'Sinfra', communes: ['Sinfra'] },
            ],
          },
          {
            nom: 'Zuenoula',
            sousPrefectures: [
              { nom: 'Zuenoula', communes: ['Zuenoula'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District des Savanes ──
  {
    nom: 'Savanes',
    type: 'standard',
    regions: [
      {
        nom: 'Poro',
        chefLieu: 'Korhogo',
        departements: [
          {
            nom: 'Korhogo',
            sousPrefectures: [
              { nom: 'Korhogo', communes: ['Korhogo'] },
              { nom: 'Karakoro', communes: ['Karakoro'] },
              { nom: 'Lataha', communes: ['Lataha'] },
              { nom: 'Dassoungboho', communes: ['Dassoungboho'] },
            ],
          },
          {
            nom: 'Sinematiali',
            sousPrefectures: [
              { nom: 'Sinematiali', communes: ['Sinematiali'] },
            ],
          },
          {
            nom: 'Dikodougou',
            sousPrefectures: [
              { nom: 'Dikodougou', communes: ['Dikodougou'] },
            ],
          },
          {
            nom: "M'Bengue",
            sousPrefectures: [
              { nom: "M'Bengue", communes: ["M'Bengue"] },
            ],
          },
        ],
      },
      {
        nom: 'Tchologo',
        chefLieu: 'Ferkessedougou',
        departements: [
          {
            nom: 'Ferkessedougou',
            sousPrefectures: [
              { nom: 'Ferkessedougou', communes: ['Ferkessedougou'] },
            ],
          },
          {
            nom: 'Kong',
            sousPrefectures: [
              { nom: 'Kong', communes: ['Kong'] },
            ],
          },
          {
            nom: 'Ouangolodougou',
            sousPrefectures: [
              { nom: 'Ouangolodougou', communes: ['Ouangolodougou'] },
            ],
          },
        ],
      },
      {
        nom: 'Bagoue',
        chefLieu: 'Boundiali',
        departements: [
          {
            nom: 'Boundiali',
            sousPrefectures: [
              { nom: 'Boundiali', communes: ['Boundiali'] },
            ],
          },
          {
            nom: 'Tengrela',
            sousPrefectures: [
              { nom: 'Tengrela', communes: ['Tengrela'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Vallee du Bandama ──
  {
    nom: 'Vallee du Bandama',
    type: 'standard',
    regions: [
      {
        nom: 'Gbeke',
        chefLieu: 'Bouake',
        departements: [
          {
            nom: 'Bouake',
            sousPrefectures: [
              { nom: 'Bouake', communes: ['Bouake'] },
              { nom: 'Djebonoua', communes: ['Djebonoua'] },
              { nom: 'Brobo', communes: ['Brobo'] },
            ],
          },
          {
            nom: 'Sakassou',
            sousPrefectures: [
              { nom: 'Sakassou', communes: ['Sakassou'] },
            ],
          },
          {
            nom: 'Beoumi',
            sousPrefectures: [
              { nom: 'Beoumi', communes: ['Beoumi'] },
            ],
          },
        ],
      },
      {
        nom: 'Hambol',
        chefLieu: 'Katiola',
        departements: [
          {
            nom: 'Katiola',
            sousPrefectures: [
              { nom: 'Katiola', communes: ['Katiola'] },
              { nom: 'Fronan', communes: ['Fronan'] },
            ],
          },
          {
            nom: 'Dabakala',
            sousPrefectures: [
              { nom: 'Dabakala', communes: ['Dabakala'] },
            ],
          },
          {
            nom: 'Niakaramandougou',
            sousPrefectures: [
              { nom: 'Niakaramandougou', communes: ['Niakaramandougou'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District des Montagnes ──
  {
    nom: 'Montagnes',
    type: 'standard',
    regions: [
      {
        nom: 'Tonkpi',
        chefLieu: 'Man',
        departements: [
          {
            nom: 'Man',
            sousPrefectures: [
              { nom: 'Man', communes: ['Man'] },
              { nom: 'Sangouine', communes: ['Sangouine'] },
            ],
          },
          {
            nom: 'Danane',
            sousPrefectures: [
              { nom: 'Danane', communes: ['Danane'] },
            ],
          },
          {
            nom: 'Biankouma',
            sousPrefectures: [
              { nom: 'Biankouma', communes: ['Biankouma'] },
            ],
          },
          {
            nom: 'Sipilou',
            sousPrefectures: [
              { nom: 'Sipilou', communes: ['Sipilou'] },
            ],
          },
        ],
      },
      {
        nom: 'Guemon',
        chefLieu: 'Duekoue',
        departements: [
          {
            nom: 'Duekoue',
            sousPrefectures: [
              { nom: 'Duekoue', communes: ['Duekoue'] },
            ],
          },
          {
            nom: 'Guiglo',
            sousPrefectures: [
              { nom: 'Guiglo', communes: ['Guiglo'] },
            ],
          },
          {
            nom: 'Bangolo',
            sousPrefectures: [
              { nom: 'Bangolo', communes: ['Bangolo'] },
            ],
          },
        ],
      },
      {
        nom: 'Cavally',
        chefLieu: 'Guiglo',
        departements: [
          {
            nom: 'Toulepleu',
            sousPrefectures: [
              { nom: 'Toulepleu', communes: ['Toulepleu'] },
            ],
          },
          {
            nom: 'Blolekin',
            sousPrefectures: [
              { nom: 'Blolekin', communes: ['Blolekin'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Bas-Sassandra ──
  {
    nom: 'Bas-Sassandra',
    type: 'standard',
    regions: [
      {
        nom: 'San-Pedro',
        chefLieu: 'San-Pedro',
        departements: [
          {
            nom: 'San-Pedro',
            sousPrefectures: [
              { nom: 'San-Pedro', communes: ['San-Pedro'] },
              { nom: 'Grand-Bereby', communes: ['Grand-Bereby'] },
            ],
          },
          {
            nom: 'Tabou',
            sousPrefectures: [
              { nom: 'Tabou', communes: ['Tabou'] },
            ],
          },
        ],
      },
      {
        nom: 'Nawa',
        chefLieu: 'Soubre',
        departements: [
          {
            nom: 'Soubre',
            sousPrefectures: [
              { nom: 'Soubre', communes: ['Soubre'] },
              { nom: 'Grand-Zattry', communes: ['Grand-Zattry'] },
            ],
          },
          {
            nom: 'Buyo',
            sousPrefectures: [
              { nom: 'Buyo', communes: ['Buyo'] },
            ],
          },
          {
            nom: 'Gueyo',
            sousPrefectures: [
              { nom: 'Gueyo', communes: ['Gueyo'] },
            ],
          },
        ],
      },
      {
        nom: 'Gbokle',
        chefLieu: 'Sassandra',
        departements: [
          {
            nom: 'Sassandra',
            sousPrefectures: [
              { nom: 'Sassandra', communes: ['Sassandra'] },
            ],
          },
          {
            nom: 'Fresco',
            sousPrefectures: [
              { nom: 'Fresco', communes: ['Fresco'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Goh-Djiboua ──
  {
    nom: 'Goh-Djiboua',
    type: 'standard',
    regions: [
      {
        nom: 'Goh',
        chefLieu: 'Gagnoa',
        departements: [
          {
            nom: 'Gagnoa',
            sousPrefectures: [
              { nom: 'Gagnoa', communes: ['Gagnoa'] },
              { nom: 'Oume', communes: ['Oume'] },
            ],
          },
        ],
      },
      {
        nom: 'Loh-Djiboua',
        chefLieu: 'Divo',
        departements: [
          {
            nom: 'Divo',
            sousPrefectures: [
              { nom: 'Divo', communes: ['Divo'] },
              { nom: 'Guitry', communes: ['Guitry'] },
              { nom: 'Lakota', communes: ['Lakota'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Woroba ──
  {
    nom: 'Woroba',
    type: 'standard',
    regions: [
      {
        nom: 'Bere',
        chefLieu: 'Mankono',
        departements: [
          {
            nom: 'Mankono',
            sousPrefectures: [
              { nom: 'Mankono', communes: ['Mankono'] },
            ],
          },
        ],
      },
      {
        nom: 'Worodougou',
        chefLieu: 'Seguela',
        departements: [
          {
            nom: 'Seguela',
            sousPrefectures: [
              { nom: 'Seguela', communes: ['Seguela'] },
            ],
          },
        ],
      },
      {
        nom: 'Bafing',
        chefLieu: 'Touba',
        departements: [
          {
            nom: 'Touba',
            sousPrefectures: [
              { nom: 'Touba', communes: ['Touba'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Denguele ──
  {
    nom: 'Denguele',
    type: 'standard',
    regions: [
      {
        nom: 'Folon',
        chefLieu: 'Minignan',
        departements: [
          {
            nom: 'Minignan',
            sousPrefectures: [
              { nom: 'Minignan', communes: ['Minignan'] },
            ],
          },
        ],
      },
      {
        nom: 'Kabadougou',
        chefLieu: 'Odienne',
        departements: [
          {
            nom: 'Odienne',
            sousPrefectures: [
              { nom: 'Odienne', communes: ['Odienne'] },
              { nom: 'Samatiguila', communes: ['Samatiguila'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Zanzan ──
  {
    nom: 'Zanzan',
    type: 'standard',
    regions: [
      {
        nom: 'Gontougo',
        chefLieu: 'Bondoukou',
        departements: [
          {
            nom: 'Bondoukou',
            sousPrefectures: [
              { nom: 'Bondoukou', communes: ['Bondoukou'] },
              { nom: 'Tanda', communes: ['Tanda'] },
            ],
          },
          {
            nom: 'Transua',
            sousPrefectures: [
              { nom: 'Transua', communes: ['Transua'] },
            ],
          },
        ],
      },
      {
        nom: 'Bounkani',
        chefLieu: 'Bouna',
        departements: [
          {
            nom: 'Bouna',
            sousPrefectures: [
              { nom: 'Bouna', communes: ['Bouna'] },
              { nom: 'Doropo', communes: ['Doropo'] },
            ],
          },
        ],
      },
    ],
  },

  // ── District du Sassandra-Marahoue ──
  {
    nom: 'Sassandra-Marahoue',
    type: 'standard',
    regions: [
      {
        nom: 'Haut-Sassandra',
        chefLieu: 'Daloa',
        departements: [
          {
            nom: 'Daloa',
            sousPrefectures: [
              { nom: 'Daloa', communes: ['Daloa'] },
            ],
          },
        ],
      },
    ],
  },
];

// ── Helpers d'extraction ────────────────────────────────────────────────────

/** Toutes les regions (noms uniques, tries) */
export function getAllRegions(): string[] {
  const set = new Set<string>();
  CIV_DISTRICTS.forEach(d => d.regions.forEach(r => set.add(r.nom)));
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Tous les districts (noms tries) */
export function getAllDistricts(): string[] {
  return CIV_DISTRICTS.map(d => d.nom).sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Regions d'un district */
export function getRegionsByDistrict(districtNom: string): string[] {
  const d = CIV_DISTRICTS.find(d => d.nom === districtNom);
  return d ? d.regions.map(r => r.nom).sort((a, b) => a.localeCompare(b, 'fr')) : [];
}

/** Departements d'une region */
export function getDepartementsByRegion(regionNom: string): string[] {
  const deps: string[] = [];
  CIV_DISTRICTS.forEach(d =>
    d.regions.forEach(r => {
      if (r.nom === regionNom) r.departements.forEach(dep => deps.push(dep.nom));
    })
  );
  return [...new Set(deps)].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Sous-prefectures d'un departement */
export function getSousPrefecturesByDepartement(regionNom: string, depNom: string): string[] {
  const sps: string[] = [];
  CIV_DISTRICTS.forEach(d =>
    d.regions.forEach(r => {
      if (r.nom === regionNom) {
        r.departements.forEach(dep => {
          if (dep.nom === depNom) dep.sousPrefectures.forEach(sp => sps.push(sp.nom));
        });
      }
    })
  );
  return [...new Set(sps)].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Communes d'une sous-prefecture */
export function getCommunesBySousPrefecture(regionNom: string, depNom: string, spNom: string): string[] {
  const communes: string[] = [];
  CIV_DISTRICTS.forEach(d =>
    d.regions.forEach(r => {
      if (r.nom === regionNom) {
        r.departements.forEach(dep => {
          if (dep.nom === depNom) {
            dep.sousPrefectures.forEach(sp => {
              if (sp.nom === spNom) communes.push(...sp.communes);
            });
          }
        });
      }
    })
  );
  return [...new Set(communes)].sort((a, b) => a.localeCompare(b, 'fr'));
}

// ── Liste plate des regions avec "National" en premier ──────────────────────
export const CIV_REGIONS_LIST: string[] = ['National', ...getAllRegions()];

// ── Liste plate pour les filtres (sans "National") ──────────────────────────
export const CIV_REGIONS_FILTER: string[] = getAllRegions();

// ── Valeurs par defaut CIV ──────────────────────────────────────────────────
export const CIV_DEFAULTS = {
  pays: 'Cote d\'Ivoire',
  indicatifTel: '+225',
  devise: 'XOF',
  deviseLabel: 'Franc CFA (XOF)',
  formatDate: 'JJ/MM/AAAA',
  formatMonetaire: 'XOF',
  statuts: ['Actif', 'Suspendu', 'En attente'] as const,
  statutDefaut: 'Actif' as const,
  typesActeurs: ['Producteur', 'Marchand', 'Cooperative', 'Institution', 'Identificateur'] as const,
};

// ── Recherche intelligente (auto-completion) ────────────────────────────────
export function searchLocations(query: string): Array<{ type: string; nom: string; parent: string }> {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const results: Array<{ type: string; nom: string; parent: string }> = [];
  const match = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);

  CIV_DISTRICTS.forEach(d => {
    if (match(d.nom)) results.push({ type: 'District', nom: d.nom, parent: '' });
    d.regions.forEach(r => {
      if (match(r.nom)) results.push({ type: 'Region', nom: r.nom, parent: d.nom });
      r.departements.forEach(dep => {
        if (match(dep.nom)) results.push({ type: 'Departement', nom: dep.nom, parent: r.nom });
        dep.sousPrefectures.forEach(sp => {
          if (match(sp.nom)) results.push({ type: 'Sous-prefecture', nom: sp.nom, parent: dep.nom });
          sp.communes.forEach(c => {
            if (match(c)) results.push({ type: 'Commune', nom: c, parent: sp.nom });
          });
        });
      });
    });
  });

  // Dedup et max 15
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.type}-${r.nom}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}