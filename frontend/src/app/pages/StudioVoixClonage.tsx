/**
 * Studio Voix — onglet Clonage.
 *
 * Deuxième étape du pipeline voix, à côté de l'enregistrement (StudioVoix.tsx,
 * régie locale au navigateur) : configure le fournisseur TTS cloud qui
 * entraîne/sert la voix clonée à partir des enregistrements — ElevenLabs
 * (historique) ou Azure AI Speech (Speech Studio, nouvelle clé du porteur
 * produit). Écran ADMIN-ONLY : le contrôle d'accès se fait ICI (dans la page,
 * pas via une route back-office séparée) car /studio-voix reste une route
 * d'équipe accessible sans layout back-office — le backend est la garde
 * réelle (JwtAuthGuard + RolesGuard('ADMIN')), cet écran affiche juste un
 * message clair si l'appelant n'a pas les droits.
 *
 * La clé API n'est JAMAIS pré-remplie en clair : le statut ne renvoie que
 * "configuré : oui/non" + les 4 derniers caractères (voir voice-config-api.ts).
 */
import { useEffect, useRef, useState } from 'react';
import {
  fetchVoiceConfigStatus,
  updateVoiceConfig,
  testVoiceConfig,
  HttpError,
  type VoiceConfigStatus,
  type VoiceProvider,
} from '../services/api/voice-config-api';
import { base64ToBlob } from '../services/elevenlabs';
import { NOT_AUTHENTICATED } from '../services/api/api-client';

const PROVIDER_LABEL: Record<VoiceProvider, string> = {
  elevenlabs: 'ElevenLabs',
  azure_speech: 'Azure AI Speech',
};

type Acces = 'chargement' | 'refuse' | 'non_connecte' | 'ok' | 'erreur';

interface FormState {
  apiKey: string;
  voiceName: string;
  azureRegion: string;
}

function formVideDe(s?: VoiceConfigStatus): FormState {
  return { apiKey: '', voiceName: s?.voiceName || '', azureRegion: s?.azureRegion || '' };
}

export default function StudioVoixClonage() {
  const [acces, setAcces] = useState<Acces>('chargement');
  const [erreurAcces, setErreurAcces] = useState('');
  const [statuts, setStatuts] = useState<Record<VoiceProvider, VoiceConfigStatus | undefined>>({
    elevenlabs: undefined,
    azure_speech: undefined,
  });
  const [providerActif, setProviderActif] = useState<VoiceProvider>('azure_speech');
  const [formulaires, setFormulaires] = useState<Record<VoiceProvider, FormState>>({
    elevenlabs: formVideDe(),
    azure_speech: formVideDe(),
  });
  const [enregistrement, setEnregistrement] = useState<VoiceProvider | null>(null);
  const [testEnCours, setTestEnCours] = useState<VoiceProvider | null>(null);
  const [messages, setMessages] = useState<Record<VoiceProvider, string>>({ elevenlabs: '', azure_speech: '' });
  const audioTestUrlRef = useRef<string | null>(null);

  const charger = async () => {
    try {
      const liste = await fetchVoiceConfigStatus();
      const parProvider: Record<VoiceProvider, VoiceConfigStatus | undefined> = { elevenlabs: undefined, azure_speech: undefined };
      for (const s of liste) parProvider[s.provider] = s;
      setStatuts(parProvider);
      setFormulaires({ elevenlabs: formVideDe(parProvider.elevenlabs), azure_speech: formVideDe(parProvider.azure_speech) });
      setAcces('ok');
    } catch (e) {
      if (e instanceof Error && e.message === NOT_AUTHENTICATED) {
        setAcces('non_connecte');
        return;
      }
      if (e instanceof HttpError && e.status === 403) {
        setAcces('refuse');
        return;
      }
      setAcces('erreur');
      setErreurAcces(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  };

  useEffect(() => { void charger(); }, []);
  useEffect(() => () => { if (audioTestUrlRef.current) URL.revokeObjectURL(audioTestUrlRef.current); }, []);

  const majFormulaire = (provider: VoiceProvider, patch: Partial<FormState>) => {
    setFormulaires((f) => ({ ...f, [provider]: { ...f[provider], ...patch } }));
  };

  // `setActiveValue` : undefined = ne touche pas à l'état actif (bouton
  // "Enregistrer" seul) ; true/false = changement explicite (boutons
  // "Activer en prod" / "Désactiver"). Sans cette distinction, cliquer sur
  // "Enregistrer" pour juste corriger un voice_id aurait désactivé un
  // fournisseur déjà actif en prod par effet de bord.
  const enregistrer = async (provider: VoiceProvider, setActiveValue?: boolean) => {
    setEnregistrement(provider);
    setMessages((m) => ({ ...m, [provider]: '' }));
    try {
      const f = formulaires[provider];
      const payload: Parameters<typeof updateVoiceConfig>[1] = {
        voiceName: f.voiceName.trim() || undefined,
        azureRegion: provider === 'azure_speech' ? (f.azureRegion.trim() || undefined) : undefined,
        setActive: setActiveValue,
      };
      if (f.apiKey.trim()) payload.apiKey = f.apiKey.trim();
      const updated = await updateVoiceConfig(provider, payload);
      setStatuts((s) => ({ ...s, [provider]: updated }));
      // Si l'autre fournisseur a été désactivé en cascade côté serveur, on
      // recharge tout pour rester synchro à l'affichage.
      await charger();
      majFormulaire(provider, { apiKey: '' }); // la clé n'est jamais réaffichée après envoi
      setMessages((m) => ({
        ...m,
        [provider]: setActiveValue === true ? 'Enregistré et activé.' : setActiveValue === false ? 'Désactivé.' : 'Enregistré.',
      }));
    } catch (e) {
      setMessages((m) => ({ ...m, [provider]: e instanceof Error ? `Échec : ${e.message}` : 'Échec de l\'enregistrement.' }));
    } finally {
      setEnregistrement(null);
    }
  };

  const tester = async (provider: VoiceProvider) => {
    setTestEnCours(provider);
    setMessages((m) => ({ ...m, [provider]: '' }));
    try {
      const res = await testVoiceConfig(provider);
      if (audioTestUrlRef.current) URL.revokeObjectURL(audioTestUrlRef.current);
      const blob = base64ToBlob(res.audio);
      const url = URL.createObjectURL(blob);
      audioTestUrlRef.current = url;
      const audio = new Audio(url);
      await audio.play().catch(() => { /* lecture auto refusée par le navigateur : le lien reste cliquable */ });
      setMessages((m) => ({ ...m, [provider]: `Test synthétisé : "${res.phrase}"` }));
    } catch (e) {
      setMessages((m) => ({ ...m, [provider]: e instanceof Error ? `Échec du test : ${e.message}` : 'Échec du test.' }));
    } finally {
      setTestEnCours(null);
    }
  };

  if (acces === 'chargement') {
    return <p style={{ padding: 16, color: '#555' }}>Vérification des droits…</p>;
  }
  if (acces === 'non_connecte') {
    return (
      <div style={{ padding: 16 }}>
        <p role="alert" style={{ background: '#fdecea', color: '#a52f22', padding: '10px 14px', borderRadius: 8 }}>
          Connecte-toi au back-office pour configurer les fournisseurs voix.
        </p>
        <a href="/login" style={{ color: '#1e6b40', fontWeight: 700 }}>Aller à la connexion</a>
      </div>
    );
  }
  if (acces === 'refuse') {
    return (
      <p role="alert" style={{ margin: 16, background: '#fdecea', color: '#a52f22', padding: '10px 14px', borderRadius: 8 }}>
        Accès réservé aux administrateurs. Cette section configure une clé API cloud payante (ElevenLabs / Azure AI Speech) —
        connecte-toi avec un compte admin pour la modifier.
      </p>
    );
  }
  if (acces === 'erreur') {
    return (
      <div style={{ padding: 16 }}>
        <p role="alert" style={{ background: '#fdecea', color: '#a52f22', padding: '10px 14px', borderRadius: 8 }}>
          Impossible de charger la configuration voix : {erreurAcces}
        </p>
        <button onClick={() => { setAcces('chargement'); void charger(); }}
          style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#c65a11', color: '#fff', fontWeight: 700 }}>
          Réessayer
        </button>
      </div>
    );
  }

  const providers: VoiceProvider[] = ['azure_speech', 'elevenlabs'];

  return (
    <div style={{ padding: '8px 0 32px' }}>
      <p style={{ color: '#555', fontSize: 14 }}>
        Configure la clé du fournisseur qui synthétise la voix clonée (rapport hebdo vocal, raccourcis vocaux).
        La clé n'est jamais réaffichée en clair une fois enregistrée. Utilise « Tester » avant d'activer en prod.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {providers.map((p) => (
          <button key={p} onClick={() => setProviderActif(p)}
            style={{
              padding: '8px 14px', borderRadius: 8, fontWeight: 700, minHeight: 40,
              border: providerActif === p ? '2px solid #1e6b40' : '1px solid #ddd',
              background: statuts[p]?.active ? '#eaf6ee' : '#fff',
              color: providerActif === p ? '#1e6b40' : '#333',
            }}>
            {PROVIDER_LABEL[p]} {statuts[p]?.active ? '● actif' : ''}
          </button>
        ))}
      </div>

      {providers.map((provider) => {
        if (provider !== providerActif) return null;
        const statut = statuts[provider];
        const f = formulaires[provider];
        const busy = enregistrement === provider;
        const busyTest = testEnCours === provider;
        return (
          <section key={provider} style={{ border: '1px solid #ddd', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{PROVIDER_LABEL[provider]}</h3>
              <span style={{ fontSize: 12, fontWeight: 600, color: statut?.configured ? '#1e6b40' : '#8a6d1f' }}>
                {statut?.configured ? `● configuré (…${statut.keyLast4 ?? '????'})` : '○ non configuré'}
                {statut?.active ? ' — actif en prod' : ''}
              </span>
            </div>

            <label style={{ display: 'block', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
              Clé API {statut?.configured ? '(laisser vide pour conserver la clé actuelle)' : ''}
              <input type="password" autoComplete="off" value={f.apiKey}
                onChange={(e) => majFormulaire(provider, { apiKey: e.target.value })}
                placeholder={statut?.configured ? '•••• (inchangée si vide)' : 'Clé API'}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', minHeight: 44 }} />
            </label>

            <label style={{ display: 'block', marginTop: 10, fontSize: 13, fontWeight: 600 }}>
              {provider === 'azure_speech' ? 'Nom de la voix (ex. fr-FR-DeniseNeural, ou nom de la voix clonée déployée dans Speech Studio)' : 'Voice ID ElevenLabs'}
              <input type="text" value={f.voiceName}
                onChange={(e) => majFormulaire(provider, { voiceName: e.target.value })}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', minHeight: 44 }} />
            </label>

            {provider === 'azure_speech' && (
              <label style={{ display: 'block', marginTop: 10, fontSize: 13, fontWeight: 600 }}>
                Région Azure (ex. francecentral, westeurope)
                <input type="text" value={f.azureRegion}
                  onChange={(e) => majFormulaire(provider, { azureRegion: e.target.value })}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', minHeight: 44 }} />
              </label>
            )}

            {messages[provider] && (
              <p style={{ marginTop: 10, fontSize: 13, color: messages[provider].startsWith('Échec') ? '#a52f22' : '#1e6b40' }}>
                {messages[provider]}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <button disabled={busy} onClick={() => void enregistrer(provider)}
                style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: '1px solid #1e6b40', background: '#fff', color: '#1e6b40', fontWeight: 700 }}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button disabled={busyTest || !statut?.configured} onClick={() => void tester(provider)}
                style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none',
                  background: !statut?.configured ? '#ccc' : '#c65a11', color: '#fff', fontWeight: 700 }}>
                {busyTest ? 'Test en cours…' : '▶ Tester'}
              </button>
              <button disabled={busy || !statut?.configured || statut?.active} onClick={() => void enregistrer(provider, true)}
                style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none',
                  background: (!statut?.configured || statut?.active) ? '#ccc' : '#1e6b40', color: '#fff', fontWeight: 700 }}>
                Activer en prod
              </button>
              {statut?.active && (
                <button disabled={busy} onClick={() => void enregistrer(provider, false)}
                  style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: '1px solid #a52f22', background: '#fff', color: '#a52f22', fontWeight: 700 }}>
                  Désactiver
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
