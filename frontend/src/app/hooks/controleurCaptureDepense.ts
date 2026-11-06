import type { Dispatch, SetStateAction } from 'react';
import { CONTRAINTES_MICRO_DICTEE } from '../services/contraintesMicro';
import { stopAllVoice } from '../services/audioManager';
import { rendreMessage } from '../i18n/voice/contrat-audio';
import { resoudreMessage } from '../i18n/voice/runtime';
import { demarrerCaptureVocale } from '../voice-offline/captureVocale';

const DUREE_ECOUTE_MAX_MS = 15_000;
type CleMessage = Parameters<typeof resoudreMessage>[0];

export interface OptionsCaptureDepense {
  dire: (texte: string) => void | Promise<void>;
  question: string;
  onTranscription: (texte: string) => void;
  onErreur: (message: string) => void;
}

export class ControleurCaptureDepense {
  private options!: OptionsCaptureDepense;
  private arreter: (() => void | Promise<void>) | null = null;
  private conclure: (() => Promise<void>) | null = null;
  private flux: MediaStream | null = null;
  private minuteur: ReturnType<typeof setTimeout> | null = null;
  private silence: ReturnType<typeof setTimeout> | null = null;
  private actif = false;
  private demarrageEnCours = false;
  private monte = true;

  constructor(
    private readonly afficherEcoute: Dispatch<SetStateAction<boolean>>,
    private readonly afficherIndisponible: Dispatch<SetStateAction<string | null>>,
  ) {}

  configurer(options: OptionsCaptureDepense) { this.options = options; }

  private fermer(annuler = true, actualiser = true) {
    if (!this.actif) return;
    this.actif = false;
    if (this.minuteur) clearTimeout(this.minuteur);
    if (this.silence) clearTimeout(this.silence);
    this.minuteur = null;
    this.silence = null;
    if (annuler) void this.arreter?.();
    this.arreter = null;
    this.conclure = null;
    this.flux?.getTracks().forEach((piste) => piste.stop());
    this.flux = null;
    if (actualiser) this.afficherEcoute(false);
  }

  private signaler(id: CleMessage) {
    const message = resoudreMessage(id);
    this.options.onErreur(message.texte);
    void Promise.resolve(rendreMessage(message, this.options.dire)).catch((erreur: unknown) => {
      const detail = erreur instanceof Error ? erreur.message : 'Erreur inconnue';
      console.warn('[BoutonDireDepense] message vocal impossible:', detail);
    });
  }

  private signalerMicroIndisponible(id: CleMessage) {
    this.afficherIndisponible(resoudreMessage(id).texte);
    this.signaler(id);
  }

  private livrer = (texte: string) => {
    if (!this.actif) return;
    this.fermer();
    if (texte.trim()) this.options.onTranscription(texte.trim());
    else this.signaler('CORE_ERR_02');
  };

  private async demarrerMoteur(flux: MediaStream) {
    let dernierTexte = '';
    const capture = await demarrerCaptureVocale(flux, {
      interim: (texte) => {
        const courant = texte.trim();
        if (!courant || courant === dernierTexte) return;
        dernierTexte = courant;
        if (this.silence) clearTimeout(this.silence);
        this.silence = setTimeout(() => { void this.conclure?.(); }, 1_800);
      },
      conclure: this.livrer,
      erreurWeb: () => {
        this.fermer();
        this.signalerMicroIndisponible('DEPENSE_005');
      },
    });
    if (!this.actif) { await capture.annuler(); return; }
    this.arreter = capture.annuler;
    this.conclure = capture.conclure;
    this.minuteur = setTimeout(() => { void capture.conclure(); }, DUREE_ECOUTE_MAX_MS);
  }

  private async ouvrirMicro() {
    try {
      const flux = await navigator.mediaDevices.getUserMedia(CONTRAINTES_MICRO_DICTEE);
      if (!this.monte) {
        flux.getTracks().forEach((piste) => piste.stop());
        return;
      }
      this.flux = flux;
      this.actif = true;
      this.afficherEcoute(true);
      await this.demarrerMoteur(flux);
    } catch (erreur) {
      if (!this.monte) return;
      this.fermer();
      this.signalerMicroIndisponible(erreur instanceof DOMException && erreur.name === 'NotAllowedError'
        ? 'DEPENSE_006'
        : 'DEPENSE_005');
    }
  }

  async ecouter() {
    if (this.actif) {
      if (this.conclure) await this.conclure();
      else await this.arreter?.();
      return;
    }
    if (this.demarrageEnCours || !this.monte) return;
    this.demarrageEnCours = true;
    try {
      try { await this.options.dire(this.options.question); }
      catch (erreur) {
        if (!this.monte) return;
        const detail = erreur instanceof Error ? erreur.message : 'Erreur inconnue';
        console.warn('[BoutonDireDepense] question vocale impossible:', detail);
        this.signaler('DEPENSE_009');
        return;
      }
      if (!this.monte) return;
      stopAllVoice();
      await this.ouvrirMicro();
    } finally {
      this.demarrageEnCours = false;
    }
  }

  detruire() {
    this.monte = false;
    this.fermer(true, false);
  }
}
