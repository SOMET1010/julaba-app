/**
 * UNE SEULE SORTIE, JAMAIS DEUX — ACC-01b (correctif).
 *
 * Le lot précédent a réveillé les deux boutons « Écouter… » en appelant le clip
 * PUIS la clé de catalogue. Si le clip est réellement embarqué, la marchande
 * entend donc Tantie deux fois, en même temps. Patrick l'a vu avant la livraison.
 *
 * La décision ne se devine pas dans le composant : c'est `direAccueilMarchand`
 * qui RAPPORTE ce qu'il a fait, et qui dit s'il reste quelque chose à dire.
 *
 * QUATRE SITUATIONS, ET UN SILENCE VOULU PARMI ELLES.
 */
// LE MONDE DE BUILD QU'ON SIMULE, DIT À VOIX HAUTE. `import.meta.env` est une
// constante de Vite : sous `tsx`, elle n'existe pas, et le module échouerait à
// l'import. On la pose VIDE — c'est-à-dire exactement le build livré
// aujourd'hui, celui où `VITE_JULABA_VOICE_PREVIEW` est éteint. Les clips
// eux-mêmes sont injectés cas par cas : ce test juge la DÉCISION, pas
// l'inventaire des fichiers audio.
(import.meta as unknown as { env: Record<string, string> }).env ??= {};

const { direAccueilMarchand } = await import('./accueilMarchandVoix.js');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nLe bonjour de l\'accueil sort UNE fois\n');

// ── 1. LE CLIP EXISTE ET SE JOUE ───────────────────────────────────────────
{
  let clips = 0;
  const r = await direAccueilMarchand('comptoir', {
    clipUrl: () => '/voix/fr-CI/prototype/tata-accueil-comptoir.mp3',
    jouer: async () => { clips++; return 'ended'; },
  });
  ok(clips === 1, 'le clip est joué une fois');
  ok(r.lu === true, 'le résultat DIT que le clip a été lu — le composant ne devine pas');
  ok(r.doitDireLeTexte === false, 'donc il ne reste RIEN à dire : pas de seconde voix par-dessus');
}

// ── 2. AUCUN CLIP EMBARQUÉ (tout build livré aujourd'hui) ──────────────────
{
  let clips = 0;
  const r = await direAccueilMarchand('comptoir', {
    clipUrl: () => null,
    jouer: async () => { clips++; return 'ended'; },
  });
  ok(clips === 0, 'aucun clip n\'est tenté quand il n\'y en a pas');
  ok(r.lu === false && r.raison === 'aucun-clip', 'la raison est nommée, pas devinée');
  ok(r.doitDireLeTexte === true, 'le texte prend le relais : le bouton n\'est plus mort');
}

// ── 3. LE CLIP EXISTE MAIS NE SE JOUE PAS (fichier absent de l'APK) ────────
{
  const r = await direAccueilMarchand('comptoir', {
    clipUrl: () => '/voix/fr-CI/prototype/tata-accueil-comptoir.mp3',
    jouer: async () => 'failed',
  });
  ok(r.lu === false && r.raison === 'clip-echoue', 'un clip qui échoue est un clip non lu, pas un clip lu');
  ok(r.doitDireLeTexte === true, 'le texte rattrape : promettre un son et n\'en produire aucun est l\'impasse d\'avant');
}

// ── 4. LE CLIP A ÉTÉ COUPÉ — ET CE SILENCE-LÀ EST VOULU ────────────────────
{
  const r = await direAccueilMarchand('comptoir', {
    clipUrl: () => '/voix/fr-CI/prototype/tata-accueil-comptoir.mp3',
    jouer: async () => 'cancelled',
  });
  ok(r.lu === false && r.raison === 'coupe', 'une coupure est nommée à part : ce n\'est pas une panne');
  ok(r.doitDireLeTexte === false,
     'et SURTOUT rien ne repart : muet global ou navigation, le silence est une décision, pas un trou');
}

// ── 5. LA RÈGLE, ÉNONCÉE COMME TELLE ───────────────────────────────────────
{
  const cas = [
    { clipUrl: () => null as string | null, jouer: async () => 'ended' as const },
    { clipUrl: () => '/c.mp3' as string | null, jouer: async () => 'ended' as const },
    { clipUrl: () => '/c.mp3' as string | null, jouer: async () => 'failed' as const },
    { clipUrl: () => '/c.mp3' as string | null, jouer: async () => 'cancelled' as const },
  ];
  let jamaisDeux = true;
  for (const c of cas) {
    const r = await direAccueilMarchand('comptoir', c);
    // « lu » et « doitDireLeTexte » ne sont JAMAIS vrais ensemble : c'est
    // exactement la double lecture qu'on interdit.
    if (r.lu && r.doitDireLeTexte) jamaisDeux = false;
  }
  ok(jamaisDeux, 'dans les quatre situations, jamais deux voix pour un seul geste');
}

console.log(echecs === 0
  ? '\n✅ Un geste, une voix — ou un silence assumé.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
