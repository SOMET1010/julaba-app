// ──────────────────────────────────────────────────────────────────────────
// Garde-fou du ROUTAGE AUDIO — la SESSION : ce qui applique la décision et
// réagit aux ruptures, avec un faux pont natif et une horloge fausse.
//
// CE QUE CE FICHIER PROUVE. Que la session ouvre le canal quand il faut,
// attend la confirmation sans jamais dépasser son délai, et REPLIE sur le
// téléphone dans les trois cas qui comptent : pas d'oreillette, oreillette qui
// ne répond pas, oreillette PERDUE EN PLEINE VENTE. Et que l'enveloppe de
// `getUserMedia` ne peut ni retarder, ni empêcher, ni masquer l'ouverture du
// micro.
//
// CE QU'IL NE PROUVE PAS. Rien de ce qu'Android fait réellement : le pont est
// un faux, aucune oreillette n'a été branchée, aucun test ici n'a produit un
// son. Le comportement réel reste à observer sur un téléphone.
// ──────────────────────────────────────────────────────────────────────────

import { DELAI_CONFIRMATION_MS, GRACE_APRES_ECOUTE_MS, PLAFOND_ECHECS } from './decisionRoutage.js';
import { SessionRoutage, type EtatPeripheriques, type PontRoutage } from './sessionRoutage.js';
import { CLE_MODE, choisirMode, enrouler, type CibleMedia } from './index.js';

let echecs = 0;
function ok(condition: boolean, libelle: string): void {
  if (condition) console.log(`  ✓ ${libelle}`);
  else { echecs++; console.error(`  ✗ ${libelle}`); }
}

// ── Un faux Android ────────────────────────────────────────────────────────

class PontFactice implements PontRoutage {
  peripheriques: EtatPeripheriques = {
    oreilletteConnectee: false,
    oreilletteSortieMedia: false,
    canalMicroActif: false,
  };
  ouvertures = 0;
  fermetures = 0;
  /** Le canal se confirme-t-il sur-le-champ (Android 12+) ? */
  confirmeToutDeSuite = true;
  /** Le pont casse-t-il ? (plugin absent, appareil capricieux) */
  casse = false;
  private ecouteurs: Array<(e: EtatPeripheriques) => void> = [];

  disponible(): boolean { return true; }
  async lireEtat(): Promise<EtatPeripheriques> { return { ...this.peripheriques }; }
  async ouvrirCanalMicro(): Promise<boolean> {
    this.ouvertures += 1;
    if (this.casse) throw new Error('pont natif en vrac');
    if (!this.peripheriques.oreilletteConnectee) return false;
    if (!this.confirmeToutDeSuite) return false;
    this.peripheriques.canalMicroActif = true;
    return true;
  }
  async fermerCanalMicro(): Promise<void> {
    this.fermetures += 1;
    this.peripheriques.canalMicroActif = false;
  }
  surChangement(e: (etat: EtatPeripheriques) => void): () => void {
    this.ecouteurs.push(e);
    return () => { this.ecouteurs = this.ecouteurs.filter((x) => x !== e); };
  }
  /** Android annonce un changement (branchement, débranchement, canal ouvert). */
  emettre(): void { for (const e of [...this.ecouteurs]) e({ ...this.peripheriques }); }
  brancherOreillette(media = true): void {
    this.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: media, canalMicroActif: false, nom: 'Oreillette de test' };
    this.emettre();
  }
  debrancherOreillette(): void {
    this.peripheriques = { oreilletteConnectee: false, oreilletteSortieMedia: false, canalMicroActif: false };
    this.emettre();
  }
}

/** Horloge fausse : `patienter` fait avancer le temps, il ne s'écoule pas tout seul. */
function horloge() {
  let t = 1_000_000;
  return {
    maintenant: () => t,
    avancer: (ms: number) => { t += ms; },
  };
}

async function laisserTournerLesPromesses(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

console.log('\n── Oreillette branchée, canal confirmé tout de suite (Android 12+) ──');
{
  const pont = new PontFactice();
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false, nom: 'Oreillette de test' };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();

  const t0 = h.maintenant();
  const route = await s.ouvrirCapture();
  ok(pont.ouvertures === 1, 'le canal micro est ouvert une fois, à la demande de capture');
  ok(route.entree === 'oreillette', 'c’est le micro de l’oreillette qui écoute');
  ok(route.sortie === 'oreillette', 'et la voix de Tantie sort dans l’oreillette');
  ok(h.maintenant() === t0, 'confirmation immédiate : la marchande n’attend pas une milliseconde');
  ok(s.appareil() === 'Oreillette de test', 'le nom de l’appareil remonte, pour le rapport de terrain');

  s.fermerCapture();
  await laisserTournerLesPromesses();
  ok(pont.fermetures === 0, 'écoute finie : le canal TIENT, le temps que Tantie réponde dans l’oreille');

  h.avancer(GRACE_APRES_ECOUTE_MS);
  await s.appliquer('minuteur');
  ok(pont.fermetures === 1, 'grâce écoulée : le canal est rendu, la sortie repasse en pleine qualité');
}

console.log('\n── Confirmation différée (Android < 12, canal asynchrone) ──');
{
  const pont = new PontFactice();
  pont.confirmeToutDeSuite = false;
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  let confirmeA = 0;
  const s = new SessionRoutage({
    pont,
    mode: 'tout-oreillette',
    maintenant: h.maintenant,
    patienter: async (ms) => {
      h.avancer(ms);
      // Android confirme au bout de 300 ms, comme un vrai téléphone.
      if (h.maintenant() >= confirmeA && !pont.peripheriques.canalMicroActif) {
        pont.peripheriques.canalMicroActif = true;
        pont.emettre();
      }
    },
  });
  await s.demarrer();
  const t0 = h.maintenant();
  confirmeA = t0 + 300;
  const route = await s.ouvrirCapture();
  ok(route.entree === 'oreillette', 'la capture attend la confirmation : le début de phrase est préservé');
  ok(h.maintenant() - t0 <= 350, `l’attente s’arrête dès qu’Android répond (${h.maintenant() - t0} ms)`);
  ok(h.maintenant() - t0 < DELAI_CONFIRMATION_MS, 'et pas au bout du délai complet');
}

console.log('\n── Repli : l’oreillette ne confirme jamais ──');
{
  const pont = new PontFactice();
  pont.confirmeToutDeSuite = false;
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();
  const t0 = h.maintenant();
  const route = await s.ouvrirCapture();
  ok(route.entree === 'telephone', 'canal muet : on écoute par le micro du téléphone');
  // Les deux voies sont indépendantes, et c'est ici que ça se voit : rater le
  // canal micro ne coûte PAS la voix de Tantie. L'oreillette est toujours là,
  // l'A2DP la sert, et la marchande continue d'entendre dans son oreille.
  ok(route.sortie === 'oreillette', 'mais Tantie reste dans l’oreillette par l’A2DP — l’échec du micro ne coûte pas la sortie');
  ok(
    h.maintenant() - t0 <= DELAI_CONFIRMATION_MS + 50,
    `l’attente est BORNÉE (${h.maintenant() - t0} ms) : aucune marchande ne reste bloquée devant son client`,
  );
  ok(pont.fermetures >= 1, 'le canal est rendu proprement, rien n’est laissé engagé');
}

console.log('\n── Repli : on cesse d’insister après deux échecs de suite ──');
{
  const pont = new PontFactice();
  pont.confirmeToutDeSuite = false;
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();
  for (let i = 0; i < PLAFOND_ECHECS; i++) {
    await s.ouvrirCapture();
    s.fermerCapture();
    await laisserTournerLesPromesses();
    h.avancer(GRACE_APRES_ECOUTE_MS);
  }
  const ouverturesAvant = pont.ouvertures;
  const t0 = h.maintenant();
  const route = await s.ouvrirCapture();
  ok(pont.ouvertures === ouverturesAvant, 'plus aucune tentative d’ouverture : le son ne clignote plus à chaque phrase');
  ok(route.entree === 'telephone', 'on écoute par le téléphone, sans plus jamais faire attendre');
  ok(h.maintenant() === t0, 'et sans la moindre attente');
}

console.log('\n── LE CAS QUI COMPTE : l’oreillette tombe EN PLEINE VENTE ──');
{
  const pont = new PontFactice();
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false, nom: 'Oreillette de test' };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();

  const avant = await s.ouvrirCapture();
  ok(avant.entree === 'oreillette', 'la vente commence : micro de l’oreillette');

  // Le micro est OUVERT, la marchande est en train de dicter : l’oreillette tombe.
  const fermeturesAvant = pont.fermetures;
  pont.debrancherOreillette();
  await laisserTournerLesPromesses();

  ok(pont.fermetures > fermeturesAvant, 'le canal est rendu IMMÉDIATEMENT, sans attendre le prochain appui sur le micro');
  ok(s.routage().entree === 'telephone', 'le micro du téléphone prend le relais');
  ok(s.routage().sortie === 'telephone', 'et la voix de Tantie repasse par le téléphone');
  ok(s.appareil() === null, 'plus aucun appareil annoncé : le journal ne ment pas');

  // La capture n’a PAS été refermée par le routage : la vente continue.
  s.fermerCapture();
  await laisserTournerLesPromesses();
  ok(s.routage().entree === 'telephone', 'la vente s’est terminée au téléphone — aucune vente perdue');

  // Et elle revient : on doit pouvoir la reprendre.
  pont.brancherOreillette();
  await laisserTournerLesPromesses();
  h.avancer(GRACE_APRES_ECOUTE_MS);
  const reprise = await s.ouvrirCapture();
  ok(reprise.entree === 'oreillette', 'oreillette rebranchée : la vente suivante repart dans l’oreillette');
}

console.log('\n── Pont natif cassé : on dégrade, on ne casse pas ──');
{
  const pont = new PontFactice();
  pont.casse = true;
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();
  const route = await s.ouvrirCapture();
  ok(route.entree === 'telephone', 'plugin en erreur : on écoute par le téléphone, et la vente continue');
  ok(pont.fermetures >= 1, 'et rien n’est laissé engagé derrière l’erreur');
}

console.log('\n── Mode « sortie oreillette » : on n’ouvre JAMAIS le canal micro ──');
{
  const pont = new PontFactice();
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'sortie-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();
  const t0 = h.maintenant();
  const route = await s.ouvrirCapture();
  ok(pont.ouvertures === 0, 'aucun canal SCO ouvert : le signal donné à sherpa-onnx reste intact');
  ok(route.sortie === 'oreillette', 'Tantie parle quand même dans l’oreillette, par l’A2DP');
  ok(route.entree === 'telephone', 'et c’est le micro du téléphone qui écoute');
  ok(h.maintenant() === t0, 'aucune latence d’activation : rien ne peut manger le début de phrase');

  await s.changerMode('tout-oreillette');
  const route2 = await s.ouvrirCapture();
  ok(route2.entree === 'oreillette', 'le mode se change à chaud, sans rebuild');
}

console.log('\n── Le choix du mode est rangé sur l’appareil, pas figé dans le code ──');
{
  ok(choisirMode(() => null) === 'tout-oreillette', 'sans préférence : le défaut demandé par Patrick');
  ok(choisirMode(() => 'sortie-oreillette') === 'sortie-oreillette', 'préférence lue sur l’appareil : arbitrage applicable sans livraison');
  ok(choisirMode(() => 'n’importe quoi') === 'tout-oreillette', 'valeur aberrante : on retombe sur le défaut');
  ok(choisirMode(() => { throw new Error('stockage bloqué'); }) === 'tout-oreillette', 'stockage inaccessible : on retombe sur le défaut');
  ok(CLE_MODE.startsWith('julaba_'), 'la clé de préférence est nommée comme les autres du produit');
}

// ── L'enveloppe de getUserMedia ────────────────────────────────────────────

interface PisteFactice { addEventListener(n: string, cb: () => void, o?: unknown): void; stop(): void }
function fluxFactice(): { flux: MediaStream; piste: PisteFactice } {
  let arretee = false;
  const piste: PisteFactice = {
    addEventListener() { /* la vraie fin passera par stop() */ },
    stop() { arretee = true; },
  };
  const flux = { getAudioTracks: () => [piste], estArretee: () => arretee } as unknown as MediaStream;
  return { flux, piste };
}

console.log('\n── L’enveloppe de getUserMedia ne peut rien casser ──');
{
  const pont = new PontFactice();
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();

  let demandes: MediaStreamConstraints[] = [];
  const { flux, piste } = fluxFactice();
  const cible: CibleMedia = {
    async getUserMedia(c) { demandes.push(c); return flux; },
  };
  const defaire = enrouler(cible, s);

  const rendu = await cible.getUserMedia({ audio: true });
  ok(rendu === flux, 'le flux rendu est EXACTEMENT celui du navigateur, intact');
  ok(demandes.length === 1 && demandes[0].audio === true, 'les contraintes passent telles quelles');
  ok(s.routage().entree === 'oreillette', 'le canal est ouvert avant que le micro ne s’ouvre');

  piste.stop();
  await laisserTournerLesPromesses();
  ok(pont.fermetures === 0, 'la piste arrêtée referme la capture (le canal, lui, tient sa grâce)');
  h.avancer(GRACE_APRES_ECOUTE_MS);
  await s.appliquer('minuteur');
  ok(pont.fermetures === 1, 'et le canal finit bien par être rendu : rien ne reste engagé');

  // Une demande vidéo ne doit rien déclencher.
  demandes = [];
  const ouverturesAvant = pont.ouvertures;
  await cible.getUserMedia({ video: true });
  ok(pont.ouvertures === ouverturesAvant, 'une demande vidéo ne touche pas au routage audio');

  defaire();
  await cible.getUserMedia({ audio: true });
  ok(demandes.length === 2, 'l’enveloppe se retire proprement et rend la main au navigateur');
}

console.log('\n── Un micro refusé reste un micro refusé : l’erreur passe intacte ──');
{
  const pont = new PontFactice();
  pont.peripheriques = { oreilletteConnectee: true, oreilletteSortieMedia: true, canalMicroActif: false };
  const h = horloge();
  const s = new SessionRoutage({ pont, mode: 'tout-oreillette', maintenant: h.maintenant, patienter: async (ms) => h.avancer(ms) });
  await s.demarrer();

  const refus = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
  const cible: CibleMedia = { async getUserMedia() { throw refus; } };
  enrouler(cible, s);

  let attrapee: unknown = null;
  try { await cible.getUserMedia({ audio: true }); } catch (e) { attrapee = e; }
  ok(attrapee === refus, 'l’erreur du navigateur remonte À L’IDENTIQUE — les messages d’aide de la caisse restent justes');

  h.avancer(GRACE_APRES_ECOUTE_MS);
  await s.appliquer('minuteur');
  ok(pont.fermetures >= 1, 'et la capture ratée ne laisse pas le canal Bluetooth ouvert derrière elle');
}

console.log(
  echecs === 0
    ? '\nRoutage audio — session et repli validés sur un FAUX pont. Aucune oreillette n’a été branchée : le comportement réel reste à observer sur un téléphone.'
    : `\n${echecs} échec(s).`,
);
if (echecs > 0) process.exit(1);
