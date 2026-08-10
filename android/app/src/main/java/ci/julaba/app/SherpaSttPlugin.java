package ci.julaba.app;

import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.k2fsa.sherpa.onnx.OnlineModelConfig;
import com.k2fsa.sherpa.onnx.OnlineRecognizer;
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig;
import com.k2fsa.sherpa.onnx.OnlineStream;
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Pont Capacitor → moteur sherpa-onnx NATIF (STT streaming hors-ligne) pour
 * l'APK Julaba. Contrat JS : voir frontend/src/app/voice-offline/nativeStt.ts.
 *
 *   isAvailable()                    → { available: boolean }
 *   prepare({ dir, files })          → télécharge (si absent) les fichiers du
 *                                      modèle FR puis construit l'OnlineRecognizer
 *                                      (progression via l'event « modelProgress »).
 *   transcribe({ pcm, sampleRate })  → { text: string }  (pcm = base64 Float32 LE)
 *   release()                        → libère le recognizer
 *
 * Modèle : streaming zipformer FR (transducer), même modèle int8 que le moteur
 * WASM (scripts/install-sherpa-stt.sh). Noms de fichiers dans filesDir/<dir> :
 * encoder.onnx, decoder.onnx, joiner.onnx, tokens.txt.
 *
 * L'AAR est déclaré dans android/app/build.gradle (libs/sherpa-onnx-1.13.4.aar,
 * récupéré par scripts/fetch-sherpa-aar.sh).
 */
@CapacitorPlugin(name = "SherpaStt")
public class SherpaSttPlugin extends Plugin {

    private static final String TAG = "SherpaSttPlugin";
    private static final int TARGET_SAMPLE_RATE = 16000;

    /** Un seul thread de fond : téléchargements + transcriptions sérialisés. */
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    /** Volatile : lu depuis le thread principal (isAvailable), écrit du worker. */
    private volatile OnlineRecognizer recognizer;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", recognizer != null);
        call.resolve(ret);
    }

    /**
     * Garantit les fichiers du modèle dans filesDir puis initialise le recognizer.
     * `files` : [{ name, url, size }] — les 4 fichiers attendus sont encoder.onnx,
     * decoder.onnx, joiner.onnx et tokens.txt. Progression émise par fichier via
     * l'event « modelProgress » ({ name, doneBytes, totalBytes }).
     */
    @PluginMethod
    public void prepare(PluginCall call) {
        final String dirName = call.getString("dir", "sherpa-stt");
        final JSArray files = call.getArray("files");
        if (files == null) {
            call.reject("prepare: paramètre « files » manquant");
            return;
        }
        call.setKeepAlive(true);
        executor.execute(() -> {
            try {
                File dir = new File(getContext().getFilesDir(), dirName);
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new IOException("impossible de créer le dossier modèle : " + dir);
                }
                for (int i = 0; i < files.length(); i++) {
                    JSObject f;
                    try {
                        f = files.getJSObject(i);
                    } catch (Exception e) {
                        continue; // entrée malformée → on passe
                    }
                    String name = f.getString("name");
                    String url = f.getString("url");
                    long size = f.optLong("size", -1L);
                    if (name == null || name.isEmpty() || url == null || url.isEmpty()) continue;
                    File target = new File(dir, name);
                    if (!isValid(target, size)) {
                        download(url, target, size);
                    } else {
                        Log.i(TAG, "modèle déjà présent : " + target.getName());
                    }
                }
                buildRecognizer(dir);
                JSObject ret = new JSObject();
                ret.put("available", true);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "prepare échoué", e);
                call.reject("prepare échoué : " + e.getMessage(), e);
            }
        });
    }

    /**
     * Transcrit un paquet d'échantillons Float32 (base64 LE) et renvoie le texte.
     * Le natif rééchantillonne vers 16 kHz (exigence du modèle zipformer FR).
     */
    @PluginMethod
    public void transcribe(PluginCall call) {
        OnlineRecognizer rec = recognizer;
        if (rec == null) {
            call.resolve(new JSObject().put("text", ""));
            return;
        }
        String pcmB64 = call.getString("pcm", "");
        int sampleRate = call.getInt("sampleRate", TARGET_SAMPLE_RATE);
        if (pcmB64.isEmpty()) {
            call.resolve(new JSObject().put("text", ""));
            return;
        }
        call.setKeepAlive(true);
        executor.execute(() -> {
            String text = "";
            try {
                byte[] bytes = Base64.decode(pcmB64, Base64.DEFAULT);
                int n = bytes.length / 4;
                float[] samples = new float[n];
                for (int i = 0; i < n; i++) {
                    int off = i * 4;
                    int bits = (bytes[off] & 0xFF)
                            | ((bytes[off + 1] & 0xFF) << 8)
                            | ((bytes[off + 2] & 0xFF) << 16)
                            | ((bytes[off + 3] & 0xFF) << 24);
                    samples[i] = Float.intBitsToFloat(bits);
                }
                float[] pcm16 = resample(samples, sampleRate, TARGET_SAMPLE_RATE);
                OnlineStream stream = rec.createStream("");
                try {
                    stream.acceptWaveform(pcm16, TARGET_SAMPLE_RATE);
                    stream.inputFinished();
                    while (rec.isReady(stream)) rec.decode(stream);
                    text = rec.getResult(stream).getText();
                } finally {
                    stream.release();
                }
            } catch (Exception e) {
                Log.e(TAG, "transcribe échoué", e);
            }
            call.resolve(new JSObject().put("text", text));
        });
    }

    /** Libère le recognizer (mémoire) — appelé quand la couche vocale est fermée. */
    @PluginMethod
    public void release(PluginCall call) {
        executor.execute(() -> {
            synchronized (this) {
                if (recognizer != null) {
                    try {
                        recognizer.release();
                    } catch (Exception e) {
                        Log.w(TAG, "release échec (déjà libéré ?)", e);
                    }
                    recognizer = null;
                }
            }
            call.resolve();
        });
    }

    // ── Construction du recognizer ──────────────────────────────────────────

    private void buildRecognizer(File dir) throws IOException {
        String base = dir.getAbsolutePath() + "/";
        String encoder = base + "encoder.onnx";
        String decoder = base + "decoder.onnx";
        String joiner = base + "joiner.onnx";
        String tokens = base + "tokens.txt";
        String[] paths = {encoder, decoder, joiner, tokens};
        for (String p : paths) {
            if (!new File(p).isFile()) {
                throw new IOException("fichier modèle manquant : " + p);
            }
        }
        // Même configuration que le moteur WASM / config officielle type 7
        // (sherpa-onnx-streaming-zipformer-fr-2023-04-14, transducer zipformer).
        OnlineTransducerModelConfig transducer = new OnlineTransducerModelConfig();
        transducer.setEncoder(encoder);
        transducer.setDecoder(decoder);
        transducer.setJoiner(joiner);
        OnlineModelConfig model = new OnlineModelConfig();
        model.setTransducer(transducer);
        model.setTokens(tokens);
        model.setModelType("zipformer");
        model.setNumThreads(2);
        OnlineRecognizerConfig config = new OnlineRecognizerConfig();
        config.setModelConfig(model);
        config.setEnableEndpoint(true);
        OnlineRecognizer rec = new OnlineRecognizer(null, config);
        synchronized (this) {
            if (recognizer != null) {
                try { recognizer.release(); } catch (Exception e) { Log.w(TAG, "release ancien recognizer", e); }
            }
            recognizer = rec;
        }
        Log.i(TAG, "OnlineRecognizer prêt (modèle FR natif)");
    }

    // ── Téléchargement avec progression ─────────────────────────────────────

    /** Vrai si le fichier existe, n'est pas vide et a la taille attendue. */
    private boolean isValid(File f, long expectedSize) {
        return f.isFile() && f.length() > 0 && (expectedSize <= 0 || f.length() == expectedSize);
    }

    /** Télécharge url vers target (écriture atomique via .tmp), en émettant la progression. */
    private void download(String urlStr, File target, long expectedSize) throws IOException {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setInstanceFollowRedirects(true); // HuggingFace → CDN
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(120000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) JulabaApp");
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                throw new IOException("HTTP " + code + " pour " + urlStr);
            }
            long total = expectedSize > 0 ? expectedSize : conn.getContentLengthLong();
            File tmp = new File(target.getAbsolutePath() + ".tmp");
            try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
                byte[] buf = new byte[8192];
                long done = 0;
                int lastPct = -1;
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                    done += n;
                    if (total > 0) {
                        int pct = (int) (done * 100 / total);
                        if (pct != lastPct) {
                            lastPct = pct;
                            notifyProgress(target.getName(), done, total);
                        }
                    }
                }
            }
            if (!tmp.renameTo(target)) {
                // rename échoué (cible existante sur certains FS) → on remplace.
                //noinspection ResultOfMethodCallIgnored
                target.delete();
                if (!tmp.renameTo(target)) {
                    throw new IOException("rename échoué pour " + target);
                }
            }
            Log.i(TAG, "modèle téléchargé : " + target.getName() + " (" + target.length() + " octets)");
        } finally {
            conn.disconnect();
        }
    }

    private void notifyProgress(String name, long done, long total) {
        try {
            JSObject data = new JSObject();
            data.put("name", name);
            data.put("doneBytes", done);
            data.put("totalBytes", total);
            notifyListeners("modelProgress", data);
        } catch (Exception e) {
            Log.w(TAG, "notification de progression ignorée", e);
        }
    }

    // ── Cycle de vie ─────────────────────────────────────────────────────────

    /** Libère le recognizer quand l'activity est détruite (mémoire modèle, ~128 Mo). */
    @Override
    protected void handleOnDestroy() {
        executor.execute(() -> {
            synchronized (this) {
                if (recognizer != null) {
                    try {
                        recognizer.release();
                    } catch (Exception e) {
                        Log.w(TAG, "release à la destruction échoué", e);
                    }
                    recognizer = null;
                }
            }
        });
        super.handleOnDestroy();
    }

    // ── Audio ───────────────────────────────────────────────────────────────

    /** Rééchantillonnage linéaire mono vers la fréquence cible (16 kHz pour sherpa). */
    private float[] resample(float[] src, int srcRate, int dstRate) {
        if (src.length == 0 || srcRate == dstRate) return src;
        double ratio = (double) srcRate / dstRate;
        int outLen = (int) Math.max(1, Math.round(src.length / ratio));
        float[] out = new float[outLen];
        for (int i = 0; i < outLen; i++) {
            double pos = i * ratio;
            int i0 = (int) Math.floor(pos);
            int i1 = Math.min(i0 + 1, src.length - 1);
            double frac = pos - i0;
            out[i] = (float) (src[i0] * (1 - frac) + src[i1] * frac);
        }
        return out;
    }
}
