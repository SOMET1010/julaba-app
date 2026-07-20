// Catégories principales ANSUT
export const CATEGORIES_PRINCIPALES = [
  { value: 'Céréales', icon: 'ti-grain' },
  { value: 'Légumes', icon: 'ti-leaf' },
  { value: 'Tubercules', icon: 'ti-plant' },
  { value: 'Fruits', icon: 'ti-apple' },
];

// Sous-catégories secondaires (accessibles via "Autre")
export const SOUS_CATEGORIES = [
  { value: 'Productions végétales', icon: 'ti-seeding' },
  { value: 'Élevage et pêche', icon: 'ti-fish' },
  { value: 'Transformation et conservation', icon: 'ti-tools-kitchen-2' },
  { value: 'Commercialisation et logistique', icon: 'ti-truck' },
];

// Produits par catégorie principale
export const PRODUITS_PAR_CATEGORIE: Record<string, string[]> = {
  'Céréales': ['Riz local','Riz importé','Maïs','Sorgho','Mil','Fonio'],
  'Légumes': ['Tomate','Oignon','Aubergine','Gombo','Piment','Poivron','Carotte','Chou','Laitue','Concombre','Haricot vert','Feuilles de manioc','Épinard','Gingembre'],
  'Tubercules': ['Igname','Manioc','Patate douce','Taro','Banane plantain','Banane douce'],
  'Fruits': ['Orange','Mandarine','Citron','Papaye','Mangue','Ananas','Avocat','Noix de coco','Pastèque','Goyave'],
  'Productions végétales': ['Arachide','Niébé','Soja','Pois de terre','Noix de palme','Noix de karité','Coton'],
  'Élevage et pêche': ['Poulets de chair','Pondeuses','Lapins','Porcs','Moutons','Chèvres','Bœufs','Tilapia','Mâchoiron','Crevettes','Poisson fumé','Poisson frais'],
  'Transformation et conservation': ['Farine de manioc','Farine de maïs','Attiéké','Placali','Gari','Huile de palme','Pâte d\'arachide','Poisson séché','Piments séchés'],
  'Commercialisation et logistique': ['Vente en gros','Demi-gros','Vente au détail','Collecte et groupage','Transport vivriers','Commerce mixte'],
};

// Garde la liste plate pour rétro-compatibilité
export const ACTIVITES_LISTE: string[] = Object.values(PRODUITS_PAR_CATEGORIE).flat();

// Ancienne structure conservée pour rétro-compatibilité
export const ACTIVITES_VIVRIERS = CATEGORIES_PRINCIPALES.map(c => ({
  categorie: c.value,
  activites: PRODUITS_PAR_CATEGORIE[c.value] || [],
}));
