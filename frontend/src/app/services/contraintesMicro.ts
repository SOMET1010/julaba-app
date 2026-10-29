/**
 * LE MICRO N'ÉCOUTE PAS TANTIE — MIC-01.
 *
 * LE DÉFAUT QU'ON FERME. Trois chemins ouvraient le micro NU —
 * `getUserMedia({ audio: true })` — alors que ce sont précisément les trois
 * chemins où l'oreille s'ouvre JUSTE APRÈS une phrase dite par l'application :
 *
 *   - `BoutonDirePrix`    : Tantie demande « Quel est ton prix ? », puis écoute
 *                           (250 ms après la fin réelle de la parole, VOX-05a) ;
 *   - `BoutonDireProduit` : même enchaînement sur le nom du produit ;
 *   - `LoginPassword`     : la dictée du numéro et du code, juste après la
 *                           consigne dite à l'entrée.
 *
 * Sans `echoCancellation`, le micro d'un téléphone entend son PROPRE
 * haut-parleur. La queue de la voix de Tantie (Piper / Sherpa), la réverbération
 * de la pièce, le clip qui finit de rendre après `TTS_FIN` : tout cela entre
 * dans le tampon de `startLiveDictation` et part au moteur comme si la
 * marchande avait parlé. Le résultat n'est pas un silence — c'est une
 * TRANSCRIPTION DE L'APPLICATION PAR ELLE-MÊME, qui remplit un champ de prix
 * ou un numéro de téléphone avec les mots de la question posée.
 *
 * Le verrou `stopAllVoice()` que ces trois chemins appellent déjà ne suffit pas :
 * il coupe la SOURCE, il n'efface pas ce qui est encore en vol dans le
 * haut-parleur ni ce qui revient par la pièce. L'anti-écho est la seule
 * barrière qui agisse sur le trajet haut-parleur → micro.
 *
 * UNE SEULE SOURCE POUR CES CONTRAINTES, et c'est le fond du sujet. Recopiée
 * dans chaque écran, la liste dérive : un chemin reçoit `noiseSuppression`, le
 * voisin non, et le même geste de la marchande est entendu de deux façons
 * selon l'écran — « ne jamais donner deux sens à la même donnée » vaut aussi
 * pour le son qu'on capte. `services/microContraint.test.mts` interdit la
 * recopie et interdit qu'un nouveau micro reparte nu.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POURQUOI `sampleRate` N'EST PAS ICI — ARBITRAGE TRANCHÉ, PAS UN OUBLI.
 *
 * `useVoiceCore.ts:1027` force `sampleRate: 16000`. Ce chemin-là est un
 * MediaRecorder (webm/opus encodé puis envoyé) : le taux du flux y est le taux
 * réellement encodé, la contrainte a donc un sens.
 *
 * Les trois chemins ci-dessus, eux, passent tous par
 * `voice-offline/offlineStt.ts::startLiveDictation`, et ce pipeline NE LIT
 * JAMAIS le taux du flux :
 *
 *     const ctx = new AC();                        // aucun sampleRate demandé
 *     const source = ctx.createMediaStreamSource(stream);
 *     ... nativeStt.transcribe(concat(), ctx.sampleRate)
 *
 * Le `MediaStreamAudioSourceNode` rééchantillonne le flux vers le taux de
 * l'AudioContext, qui est celui du matériel — journal terrain : `LIVE_CTX
 * { sampleRate: 48000 }`, et la dictée fonctionne. Le taux transmis au moteur
 * est `ctx.sampleRate`, jamais celui de la piste ; `MAX_SAMPLES` se calcule sur
 * `ctx.sampleRate` lui aussi. Et c'est le natif qui rééchantillonne à 16 kHz
 * (contrat de `voice-offline/nativeStt.ts`).
 *
 * Donc : forcer 16000 ici ne changerait RIEN en aval (gain nul, prouvé par la
 * lecture du pipeline), et ferait courir un risque réel — `OverconstrainedError`
 * sur un matériel qui ne sert pas ce taux, ou un rééchantillonnage
 * supplémentaire 48 k → 16 k → 48 k dans la pile audio du téléphone, qui
 * dégrade le signal que le moteur doit lire. On ne prend pas un risque pour un
 * gain prouvé nul. Ce qu'on cherche ici est l'ANTI-ÉCHO, pas le taux.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Le réglage du micro pour TOUTE écoute de dictée (`startLiveDictation`).
 *
 * - `echoCancellation` : la raison d'être du module — le micro ne reprend pas
 *   la voix de Tantie qui sort du haut-parleur.
 * - `noiseSuppression` : un marché ivoirien à midi, c'est le bruit de fond
 *   permanent dans lequel elle parle ; le moteur n'a pas à le transcrire.
 * - `autoGainControl`  : elle ne sait pas à quelle distance tenir le téléphone,
 *   et personne ne le lui dira jamais par écrit.
 * - `channelCount: 1`  : `startLiveDictation` ne lit que `getChannelData(0)` —
 *   demander deux voies serait capter un canal que rien ne lit.
 *
 * Valeurs nues (pas `{ exact: ... }`) : ce sont des souhaits. Un appareil qui
 * ne sait pas annuler l'écho rend quand même un flux, et la dictée marche comme
 * avant — jamais de micro mort pour un réglage de confort.
 */
export const CONTRAINTES_MICRO_DICTEE: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
