/**
 * JULABA - Auto-compression images
 * Compression Canvas natif, 0 dependance
 * Cible: < 200KB, max 1024px, qualite adaptative
 */

export interface CompressOptions {
  maxWidthPx?: number;
  maxSizeKb?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg";
}

export async function compressImage(
  file: File | Blob,
  opts: CompressOptions = {},
): Promise<string> {
  const maxWidthPx = opts.maxWidthPx ?? 1024;
  const maxSizeKb  = opts.maxSizeKb  ?? 200;
  const quality    = opts.quality    ?? 0.82;
  const format     = opts.format     ?? "image/webp";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > maxWidthPx) { h = Math.round(h * maxWidthPx / w); w = maxWidthPx; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas non supporte")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let q = quality;
      let dataUrl = canvas.toDataURL(format, q);
      while (dataUrl.length / 1024 > maxSizeKb * 1.37 && q > 0.3) {
        q -= 0.08;
        dataUrl = canvas.toDataURL(format, q);
      }
      if (dataUrl.startsWith("data:image/png") && format === "image/webp") {
        dataUrl = canvas.toDataURL("image/jpeg", q);
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Chargement image echoue")); };
    img.src = url;
  });
}

export async function compressDataUrl(dataUrl: string, opts: CompressOptions = {}): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return compressImage(blob, opts);
}

export function estimateSizeKb(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round(base64.length * 0.75 / 1024);
}
