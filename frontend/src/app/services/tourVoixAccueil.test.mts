/**
 * LE TOUR DE PAROLE DE L'ACCUEIL + LA LECTURE VOIX-05 — 26/10.
 *
 * Patrick (recette vrai téléphone) : « la question ne joue pas, on doit
 * cliquer d'abord sur le HP ». Deux filets portent la correction, et les deux
 * sont des décisions PURES, donc prouvables ici, sans navigateur ni audio :
 *
 * 1. LE CRÉNEAU (`reserverVoixAccueil` / `tourVoixAccueilLibre`) — la question
 *    de la reconnaissance partait PILE sur la phrase de caisse ; l'accueil
 *    réserve maintenant une fenêtre généreuse à chaque prise de parole, la
 *    question attend derrière. La réservation la plus récente NE RACCOURCIT
 *    jamais la fenêtre en cours.
 *
 * 2. LE LECTEUR (`derniereIssuePlayClip`) — un `play()` refusé (autoplay hors
 *    geste, vrai téléphone) mourait dans l'audioManager qui rapportait
 *    « joué » (dette ACC-05, figée par VOICE-01). La preuve existe pourtant,
 *    écrite par le lecteur de clips lui-même (VOIX-05) : ce lecteur la relit,
 *    et l'écran peut NOMMER le geste au lieu de mentir.
 */
(import.meta as unknown as { env: Record<string, string> }).env ??= {};

const { reserverVoixAccueil, tourVoixAccueilLibre } = await import('./accueilMarchandVoix.js');
const { ttsMoteur, derniereIssuePlayClip } = await import('../utils/voiceTrace.js');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

const dormir = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

console.log('\nLe créneau de l\'accueil — la question attend, la caisse parle\n');

// ── 1. LIBRE PAR DÉFAUT ────────────────────────────────────────────────────
{
  ok(tourVoixAccueilLibre() === true, 'sans réservation, le créneau est libre');
  ok(tourVoixAccueilLibre(0) === true, 'pur : l\u2019instant 0 est libre');
}

// ── 2. LA RÉSERVATION FERME, PUIS SE REND ──────────────────────────────────
{
  reserverVoixAccueil(200);
  ok(tourVoixAccueilLibre() === false, 'réservé : la question n\u2019y touche pas encore');
  await dormir(260);
  ok(tourVoixAccueilLibre() === true, 'la fenêtre passée, le créneau est rendu');
}

// ── 3. LA PLUS LONGUE FENÊTRE GAGNE (jamais de raccourcissement) ──────────
{
  reserverVoixAccueil(1000);
  reserverVoixAccueil(30); // une seconde réservation ne doit pas couper la première
  ok(tourVoixAccueilLibre() === false, 'une réservation courte ne raccourcit pas la longue');
  await dormir(1100);
  ok(tourVoixAccueilLibre() === true, 'tout est rendu après la plus longue');
}

console.log('\nLa lecture VOIX-05 — le refus de play() ne meurt plus dans le silence\n');

// ── 4. URL JAMAIS JOUÉE ────────────────────────────────────────────────────
{
  ok(derniereIssuePlayClip('/voix/nulle-part.mp3') === null, 'aucune tentative tracée → null (pas un refus inventé)');
}

// ── 5. LA DERNIÈRE TENTATIVE GAGNE, LES AUTRES ISSUES NE MASQUENT RIEN ────
{
  const url = '/voix/fr-CI/prototype/tata-reconnaissance-proposition.mp3';
  ok(derniereIssuePlayClip(url) === null, 'avant toute lecture : null');
  ttsMoteur('clip', { url, issue: 'play-refuse', erreur: 'NotAllowedError' });
  ok(derniereIssuePlayClip(url) === 'play-refuse', 'le refus de play() est RELU — l\u2019écran peut nommer le geste');
  ttsMoteur('clip', { url, issue: 'ended', volume: 1, lu: 4 });
  ok(derniereIssuePlayClip(url) === 'play-refuse', 'une entrée « ended » ne masque pas le refus qu\u2019elle suivait');
  ttsMoteur('clip', { url, issue: 'play-accepte', volume: 1 });
  ok(derniereIssuePlayClip(url) === 'play-accepte', 'une relecture acceptée devient la dernière vérité');
  const autre = '/voix/tata/login-85.mp3';
  ttsMoteur('clip', { url: autre, issue: 'play-refuse', erreur: 'NotAllowedError' });
  ok(derniereIssuePlayClip(url) === 'play-accepte', 'le refus d\u2019une AUTRE URL ne contamine pas celle-ci');
  ok(derniereIssuePlayClip(autre) === 'play-refuse', '…et l\u2019autre URL porte bien son propre refus');
}

if (echecs) {
  console.log(`\n${echecs} échec(s) ✗`);
  process.exit(1);
}
console.log('\nTous les tests sont verts ✅');
