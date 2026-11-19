// media.ts — helpers for files served from the API's wwwroot
// (assembly drawings, colour swatches, individual part images)

/** Turns a stored relative path ("images/parts/x.jpg", "Sub Assly\\a.jpg") into a URL. */
export const resolveMediaUrl = (path?: string | null): string => {
  if (!path) return "";
  const clean = path.replace(/[\r\n]/g, "").trim();
  if (!clean) return "";
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  if (clean.startsWith("/api/")) return clean;
  const normalized = clean.replace(/\\/g, "/").replace(/^\/+/, "");
  // encode each segment so folders with spaces ("Sub Assly") work everywhere
  return "/" + normalized.split("/").map(s => encodeURIComponent(decodeURIComponentSafe(s))).join("/");
};

const decodeURIComponentSafe = (s: string): string => {
  try { return decodeURIComponent(s); } catch { return s; }
};

export const isPdfPath = (path?: string | null): boolean =>
  !!path && /\.pdf($|[?#])/i.test(path.trim());

/** Natural sort for image numbers: 1, 2, 8.1, 8.2, 10 */
export const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** DD.MM.YYYY (BGauss house format) */
export const formatDate = (d: Date = new Date()): string =>
  `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

/** Extracts a readable message from an axios / fetch error */
export const errorMessage = (e: unknown, fallback = "Something went wrong"): string => {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const anyE = e as { response?: { data?: unknown }; message?: string };
    const data = anyE.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const d = data as { message?: string; title?: string; errors?: Record<string, string[]> };
      if (d.message) return d.message;
      if (d.errors) return Object.values(d.errors).flat().join(" ");
      if (d.title) return d.title;
    }
    if (anyE.message) return anyE.message;
  }
  return fallback;
};

/**
 * The page-wide CSS zoom set in index.css (1, 0.9 or 0.8 depending on screen width).
 * Pixel values measured from the screen (getBoundingClientRect, innerWidth/innerHeight)
 * must be divided by this before they are used as CSS lengths inside the page.
 */
export const appZoom = (): number => {
  const z = parseFloat(getComputedStyle(document.documentElement).zoom || "1");
  return Number.isFinite(z) && z > 0 ? z : 1;
};
