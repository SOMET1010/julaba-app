/**
 * AKWABA PARLE, ET SON BOUTON ABOUTIT — AKW-01.
 *
 * Banc terrain, écran 1 : « MUET » et « 1 impasse /2 » — le bouton « Écouter
 * Tantie Nanti Lou » touché, rien ne bouge. C'est le tout premier écran du
 * téléphone, et il ne dit pas bonjour.
 *
 * Même cause qu'à l'accueil marchand : `direIntro` ne joue qu'un clip
 * enregistré, et rend `Promise<void>` quand il n'y en a pas. Dans tout build
 * livré (`VITE_JULABA_VOICE_PREVIEW` éteint), il n'y en a pas.
 *
 * Même remède, et la même exigence : UNE seule sortie. Jamais le clip ET le
 * texte.
 */
(import.meta as unknown as { env: Record<string, string> }).env ??= {};

const { direEntreeAvantConnexion, urlDuClip } = await import('./entreeVoixAvantConnexion.js');

const { readFileSync } = await import('node:fs');
const { dirname, resolve } = await import('node:path');
const { fileURLToPath } = await import('node:url');
const ici = dirname(fileURLToPath(import.meta.url));
// On LIT le fichier figé, on ne l'IMPORTE pas : il évalue
// `import.meta.env` à sa racine, donc l'importer hors Vite jetterait.
const fige = readFileSync(resolve(ici, 'onboardingVoix.ts'), 'utf-8');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nLe premier écran du téléphone dit bonjour — une fois\n');

console.log('[1] Une seule sortie, dans les quatre situations');
{
  let clips = 0;
  const r = await direEntreeAvantConnexion('accueil', {
    clipUrl: async () => '/voix/fr-CI/prototype/tata-accueil-preview.mp3',
    jouer: async () => { clips++; return 'ended'; },
  });
  ok(clips === 1 && r.lu === true, 'le clip joue, et le résultat le DIT');
  ok(r.doitDireLeTexte === false, 'rien ne repart par-dessus');
}
{
  let clips = 0;
  const r = await direEntreeAvantConnexion('accueil', { clipUrl: async () => null, jouer: async () => { clips++; return 'ended'; } });
  ok(clips === 0 && r.lu === false && r.raison === 'aucun-clip', 'aucun clip : la raison est nommée');
  ok(r.doitDireLeTexte === true, 'le texte prend le relais — le bouton cesse d\'être mort');
}
{
  const r = await direEntreeAvantConnexion('accueil', { clipUrl: async () => '/c.mp3', jouer: async () => 'failed' });
  ok(r.lu === false && r.raison === 'clip-echoue' && r.doitDireLeTexte, 'un clip qui échoue est rattrapé');
}
{
  const r = await direEntreeAvantConnexion('accueil', { clipUrl: async () => '/c.mp3', jouer: async () => 'cancelled' });
  ok(r.lu === false && r.raison === 'coupe' && !r.doitDireLeTexte,
     'une coupure ne se rattrape pas : ce silence est voulu (barge-in, changement d\'écran)');
}

console.log('\n[2] La disponibilité du clip suit la règle, elle ne la devine pas');
{
  // Les deux entrées TELLES QUE le registre figé les déclare, relues dans son
  // source. Les recopier de tête ferait mentir ce test le jour où elles bougent.
  const akwaba = { file: '/voix/fr-CI/prototype/tata-accueil-preview.mp3', atteste: false, prototype: true };
  const retour = { file: '/voix/fr-CI/intro-retour.mp3', atteste: false };
  ok(fige.includes(`file: '${akwaba.file}'`), 'le fichier figé déclare bien ce clip pour Akwaba');
  ok(urlDuClip(akwaba, false) === null,
     'build livré (prototypes éteints) : pas de clip — c\'est l\'état d\'aujourd\'hui');
  ok(urlDuClip(akwaba, true) === akwaba.file, 'prototypes allumés : le clip d\'Akwaba');
  ok(urlDuClip(retour, true) === null && urlDuClip(retour, false) === null,
     '« retour » n\'est ni attesté ni prototype : aucun clip, dans les deux mondes');
  ok(urlDuClip(undefined, true) === null, 'une clé inconnue ne fabrique pas d\'URL');
}

console.log('\n[3] LA RÈGLE FIGÉE N\'A PAS BOUGÉ SOUS NOS PIEDS');
{
  // `services/onboardingVoix.ts` est FIGÉ par VOICE-01 : on ne l'a pas touché,
  // et on ne le touchera pas. Mais ce module rejoue sa règle de disponibilité
  // — donc la règle existe à deux endroits, et deux copies divergent toujours.
  // Ce garde-fou refuse la divergence SANS desserrer quoi que ce soit : il
  // relit le fichier figé et vérifie que l'expression est mot pour mot celle
  // qu'on a reprise. Si elle change là-bas, ce test tombe ici.
  ok(fige.includes('clip.atteste || (clip.prototype && PROTOTYPES_VOIX_ACTIFS)'),
     'la règle de disponibilité du fichier figé est bien celle que ce module rejoue');
  ok(fige.includes('packClipUrl(`intro_${String(key)}`) ??'),
     'et elle laisse toujours la priorité à un clip publié par manifeste');
}

console.log('\n[4] Les textes ne sont pas inventés');
{
  ok(/texte: 'Akwaba\. Pour vendre, touche un produit, ou parle à Tata\. On est ensemble\.'/.test(fige),
     'le clip d\'accueil dit bien « Akwaba » — le texte parlé part de LÀ, pas d\'une invention');
  ok(fige.includes("texte: 'Re-bonjour ! On y va.'"),
     'et le retour a déjà sa phrase, écrite par un humain');
  ok(/le nom validé est « Tantie Nanti Lou »/.test(fige),
     'le registre dit lui-même que l\'audio enregistré est périmé : la forme PARLÉE dit le bon nom');
}

console.log('\n[5] L\'ÉCRAN 2 — Tantie se présente (TNT-01)');
{
  // Même module, mêmes règles : la présentation et le « bravo » de fin sont
  // deux clips du MÊME registre figé, et se comportent pareil.
  const presentation = { file: '/voix/fr-CI/prototype/tata-entree-presentation.mp3', atteste: false, prototype: true };
  const bravo = { file: '/voix/fr-CI/intro-bravo.mp3', atteste: false };
  ok(fige.includes(`file: '${presentation.file}'`), 'le registre figé déclare bien le clip de la présentation');
  ok(urlDuClip(presentation, false) === null, 'build livré : pas de clip de présentation — d\'où le « MUET » du banc');
  ok(urlDuClip(presentation, true) === presentation.file, 'prototypes allumés : le clip de la présentation');
  ok(urlDuClip(bravo, true) === null && urlDuClip(bravo, false) === null,
     '« bravo » n\'est ni attesté ni prototype : aucun clip, dans les deux mondes');

  const r = await direEntreeAvantConnexion('histoire1', { clipUrl: async () => null, jouer: async () => 'ended' });
  ok(r.doitDireLeTexte === true, 'sans clip, la présentation se dit — l\'écran 2 cesse d\'être muet');
  const c = await direEntreeAvantConnexion('histoire1', { clipUrl: async () => '/c.mp3', jouer: async () => 'cancelled' });
  ok(c.doitDireLeTexte === false,
     'et un tap qui coupe la présentation pour entrer ne la fait pas repartir en synthèse');

  ok(/texte: "Je serai avec toi chaque jour dans ton commerce\./.test(fige),
     'le texte de la présentation vient du registre, il n\'est pas inventé');
  ok(fige.includes("texte: 'Bravo ! Nous sommes prêtes. Ouvrons ta boutique.'"),
     'celui du « bravo » aussi');
}

console.log(echecs === 0
  ? '\n✅ Akwaba parle une fois, et son bouton aboutit.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
