/**
 * ARG-12 — LE VRAI CLIENT ENVOIE UNE CLÉ, ET C'EST ÇA QU'IL FALLAIT PROUVER.
 *
 * LE PIÈGE, relevé au contre-audit de Patrick. L'invariant backend
 * `blockers.spec.ts` I5 rejouait :
 *
 *     { montant: 1000, idempotency_key: 'I5-K' }
 *
 * …et passait au vert. Mais `caisse-api.ts` postait réellement `{ montant }`
 * tout court. Le test prouvait donc « SI l'appelant fournit une clé stable, le
 * serveur sait la rejouer » — pas le parcours JULABA. Le serveur compensait
 * en fabriquant `credit-acompte-<id>-<montant>-<Date.now()>` : deux envois de
 * la même tentative recevaient deux clés et encaissaient DEUX FOIS.
 *
 * Un test qui fournit ce que le vrai client ne fournit pas ne teste pas le
 * vrai client. C'est ce maillon-ci qui manquait.
 *
 * Lancer : npm run test:credits-cle
 */
let echecs = 0;
function ok(c: boolean, label: string) {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label); echecs++; }
}
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); echecs++; }
}

const magasin = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (magasin.has(k) ? magasin.get(k)! : null),
  setItem: (k: string, v: string) => { magasin.set(k, String(v)); },
  removeItem: () => {},
};
(globalThis as any).window = { dispatchEvent: () => true, location: { pathname: '/' } };
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };

let corps: any[] = [];
(globalThis as any).fetch = async (_url: string, init: RequestInit = {}) => {
  corps.push(init.body ? JSON.parse(String(init.body)) : null);
  return { ok: true, status: 200, json: async () => ({ success: true, solde: false }) } as unknown as Response;
};

const api = await import('./caisse-api.js');

console.log('\nUn acompte part TOUJOURS avec une clé');
{
  corps = [];
  await api.ajouterAcompte('credit-1', 1000);
  ok(typeof corps[0]?.idempotency_key === 'string' && corps[0].idempotency_key.length > 0,
     'le corps porte une `idempotency_key`');
  eq(corps[0]?.montant, 1000, 'le montant est bien là, lui aussi');
}

console.log('\nDeux tentatives DISTINCTES ont des clés distinctes');
{
  // Deux appuis séparés sur « encaisser » sont deux encaissements voulus :
  // ils DOIVENT aboutir tous les deux.
  corps = [];
  await api.ajouterAcompte('credit-1', 1000);
  await api.ajouterAcompte('credit-1', 1000);
  ok(corps[0].idempotency_key !== corps[1].idempotency_key,
     'deux tentatives voulues ne s’annulent pas l’une l’autre');
}

console.log('\nUne MÊME tentative réessayée garde SA clé');
{
  // C'est le cas qui encaissait deux fois : un rejeu de la même tentative.
  // L'écran fournit sa clé, elle traverse inchangée.
  corps = [];
  const cle = 'tentative-marche-du-mardi';
  await api.ajouterAcompte('credit-1', 1000, cle);
  await api.ajouterAcompte('credit-1', 1000, cle);
  eq(corps[0].idempotency_key, cle, 'la clé fournie est envoyée telle quelle');
  eq(corps[1].idempotency_key, cle, '…et le réessai présente la MÊME');
}

console.log('\nLe règlement final et la création portent aussi leur clé');
{
  corps = [];
  await api.marquerCreditPaye('credit-2');
  ok(typeof corps[0]?.idempotency_key === 'string', 'marquerCreditPaye envoie une clé');
  eq(corps[0].idempotency_key, 'reglement-credit-2',
     '…stable, dérivée du crédit : le même règlement rejoué reste le même');

  corps = [];
  await api.creerCredit({ client_nom: 'Awa', montant_total: 5000, echeance: '2026-12-31' });
  ok(typeof corps[0]?.idempotency_key === 'string',
     'creerCredit envoie une clé — pour l’ACOMPTE initial seulement (ARG-04 reste ouverte)');
}

console.log('\nUn montant invalide ne part pas du tout');
{
  corps = [];
  let leve = false;
  try { await api.ajouterAcompte('credit-1', 0); } catch { leve = true; }
  ok(leve, 'montant nul refusé avant tout appel réseau');
  eq(corps.length, 0, '…et rien n’est parti');
}

console.log(echecs === 0
  ? '\n✓ ARG-12 — le vrai client n’encaisse plus deux fois la même tentative\n'
  : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
