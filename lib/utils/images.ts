/**
 * Client-side image utilities.
 *
 * compressImage — resizes and compresses a File using the Canvas API before upload.
 * Keeps file sizes around 300–600 KB instead of the raw 3–8 MB phone photos,
 * which dramatically reduces Supabase Storage egress.
 *
 * supabaseImageUrl — converts a Supabase Storage public URL to a transformed
 * render URL so the browser receives a resized image rather than the full original.
 */

const MAX_DIMENSION = 1500; // px — enough for full-screen listing detail view
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  // Only compress image types; pass through anything else unchanged
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if either dimension exceeds the max
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Preserve original filename but force .jpg extension
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

/**
 * Returns a Supabase image transform URL that serves the image at the given width.
 * Falls back to the original URL if it doesn't look like a Supabase storage URL.
 *
 * Usage: supabaseImageUrl(displayUrl, 400) → serves a 400px-wide JPEG thumbnail
 */
export function supabaseImageUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  // Supabase storage object URL pattern: /storage/v1/object/public/
  if (!url.includes("/storage/v1/object/public/")) return url;
  return url
    .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
    + `?width=${width}&quality=80`;
}
