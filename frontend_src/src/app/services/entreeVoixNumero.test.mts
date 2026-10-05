/**
 * « TON NUMÉRO » PARLE, ET SON BOUTON ABOUTIT — NUM-01.
 *
 * Banc terrain, écran 3 : « MUET » et « 1 impasse /14 » — le bouton « Écouter
 * Tantie Nanti Lou » touché, rien ne bouge. Les quatorze autres éléments (le
 * pavé) mènent bien quelque part, mais aucun ne parle.
 *
 * Troisième fois la même cause : `direEntree` ne joue qu'un clip enregistré et
 * rend `Promise<void>` quand il n'y en a pas. Dans tout build livré, le
 * drapeau des prototypes est éteint, donc il n'y en a pas.
 *
 * ICI LE FICHIER N'EST PAS FIGÉ (il n'est pas dans l'empreinte VOICE-01) : on
 * corrige donc SUR PLACE, sans module parallèle et sans règle en double.
 */
(import.meta as unknown as { env: Record<string, string> }).env ??= {};

const { direEntree, urlClipEntree, ENTREE_VOICE_CLIPS } = await import('./entreeVoix.js');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nL\'écran du numéro dit sa consigne — une fois\n');

console.log('[1] Une seule sortie, dans les quatre situations');
{
  let clips = 0;
  const r = await direEntree('numero', {
    clipUrl: async () => '/voix/fr-CI/prototype/tata-entree-numero.mp3',
    jouer: async () => { clips++; return 'ended'; },
  });
  ok(clips === 1 && r.lu === true, 'le clip joue, et le résultat le DIT');
  ok(r.doitDireLeTexte === false, 'rien ne repart par-dessus');
}
{
  const r = await direEntree('numero', { clipUrl: async () => null, jouer: async () => 'ended' });
  ok(r.lu === false && r.raison === 'aucun-clip' && r.doitDireLeTexte,
     'aucun clip : le texte prend le relais — l\'écran cesse d\'être muet');
}
{
  const r = await direEntree('numero', { clipUrl: async () => '/c.mp3', jouer: async () => 'failed' });
  ok(r.lu === false && r.raison === 'clip-echoue' && r.doitDireLeTexte, 'un clip qui échoue est rattrapé');
}
{
  const r = await direEntree('numero', { clipUrl: async () => '/c.mp3', jouer: async () => 'cancelled' });
  ok(r.lu === false && r.raison === 'coupe' && !r.doitDireLeTexte,
     'une coupure ne se rattrape pas : la marchande a tapé un chiffre, Tantie se tait');
}

console.log('\n[2] La règle de disponibilité, pure et dans les deux mondes');
ok(urlClipEntree('numero', false) === null,
   'build livré (prototypes éteints) : pas de clip — d\'où le « MUET » du banc');
ok(urlClipEntree('numero', true) === ENTREE_VOICE_CLIPS.numero.file,
   'prototypes allumés : le clip de la consigne');
{
  // Un clip ATTESTÉ (validé par un humain) se joue dans les deux mondes —
  // c'est la moitié de la règle que le drapeau ne commande pas.
  // MIS À JOUR LE 26/09/2026. Cette ligne affirmait « aucun clip d'entrée
  // n'est encore attesté : c'est l'état d'aujourd'hui, et il est mesuré ».
  // C'était vrai, et ce ne l'est plus : `ui-058` et `ui-100` — deux clips de
  // la VOIX HUMAINE, déjà validés — ont reçu leur clé (CLIP-03).
  //
  // Un constat daté se périme ; la RÈGLE qu'il servait à illustrer, non. On
  // vérifie donc celle-ci, écrite juste au-dessus : un clip attesté se joue
  // dans les deux mondes, drapeau des prototypes allumé OU éteint.
  const attestes = (Object.keys(ENTREE_VOICE_CLIPS) as (keyof typeof ENTREE_VOICE_CLIPS)[])
    .filter((k) => ENTREE_VOICE_CLIPS[k].atteste);
  ok(attestes.length > 0, `${attestes.length} clip(s) d'entrée attesté(s) — la voix humaine`);
  for (const k of attestes) {
    ok(urlClipEntree(k, false) === ENTREE_VOICE_CLIPS[k].file,
       `${k} : joué même prototypes ÉTEINTS — c'est ce que « attesté » veut dire`);
    ok(!ENTREE_VOICE_CLIPS[k].lotA,
       `${k} : attesté ET lot A à la fois n'aurait aucun sens`);
  }
}

console.log('\n[3] Les six consignes ont chacune leur clé, et aucune ne ment');
{
  const { MESSAGES_TTS } = await import('../i18n/voice/catalog.js');
  const parId = new Map(MESSAGES_TTS.map((m: { id: string }) => [m.id, m]));
  const attendu: Record<string, string> = {
    numero: 'ENTREE_NUMERO', numeroVoix: 'ENTREE_NUMERO_VOIX', code: 'ENTREE_CODE',
    codeErreur: 'ENTREE_CODE_ERREUR', connexionIndisponible: 'ENTREE_CONNEXION', reconnaissance: 'ENTREE_RECONNAISSANCE',
  };
  for (const [cle, id] of Object.entries(attendu)) {
    const m = parId.get(id) as { frActuel?: string; critiqueArgent?: boolean } | undefined;
    ok(!!m, `${id} existe au catalogue`);
    ok(m?.frActuel === ENTREE_VOICE_CLIPS[cle as keyof typeof ENTREE_VOICE_CLIPS].texte,
       `${id} dit MOT POUR MOT ce que le clip dit — le texte n'est pas inventé`);
  }
}

console.log('\n[4] Aucune donnée personnelle ne part en synthèse');
{
  // `direEntreeTexte` résout une phrase FIXE vers son clip. Il ne doit jamais
  // gagner de repli parlé : l'écran s'en sert aussi pour relire le numéro
  // composé (`parle(chiffresEpeles(phone))`). Lui donner une voix de secours
  // ferait prononcer le numéro de la marchande à voix haute au marché.
  const { direEntreeTexte } = await import('./entreeVoix.js');
  let dit = 0;
  await direEntreeTexte('07 09 88 77 66', { clipUrl: async () => null, jouer: async () => { dit++; return 'ended'; } });
  ok(dit === 0, 'une phrase inconnue (donc un numéro) ne produit AUCUN son');
  const r = await direEntreeTexte('07 09 88 77 66', { clipUrl: async () => null, jouer: async () => 'ended' });
  ok(r.doitDireLeTexte === false,
     'et surtout elle ne demande pas non plus de la dire : NUM-02 reste fermée par construction');
}

console.log(echecs === 0
  ? '\n✅ La consigne se dit, le bouton aboutit, et le numéro reste muet.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
