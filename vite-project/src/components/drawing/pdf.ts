// pdf.ts — lazy PDF.js loader + helpers shared by the drawing viewer,
// the admin hotspot editor and the PDF catalogue generator.
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type PdfJs = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJs> | null = null;

/** Loads PDF.js on first use only (keeps the main bundle small). */
export const loadPdfJs = (): Promise<PdfJs> => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then(mod => {
      mod.GlobalWorkerOptions.workerSrc = workerUrl;
      return mod;
    });
  }
  return pdfjsPromise;
};

const docCache = new Map<string, Promise<PDFDocumentProxy>>();

export const loadPdfDocument = async (url: string): Promise<PDFDocumentProxy> => {
  let p = docCache.get(url);
  if (!p) {
    p = loadPdfJs().then(pdfjs => pdfjs.getDocument({ url }).promise);
    docCache.set(url, p);
    p.catch(() => docCache.delete(url));
  }
  return p;
};

/** Renders a page into the canvas so that its pixel width ≈ targetWidthPx. */
export const renderPageToCanvas = async (
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  targetWidthPx: number,
): Promise<{ width: number; height: number }> => {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.max(0.1, targetWidthPx / base.width);
  const viewport = page.getViewport({ scale });
  canvas.width  = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { width: base.width, height: base.height };
};

export interface DetectedCallout {
  label: string;
  pageNumber: number;
  x: number; y: number;       // centre, normalised 0..1
  width: number; height: number;
}

/**
 * Finds part-number callouts in a vector PDF by reading its text layer and
 * matching the text against the known image numbers of the assembly.
 * This only works when the drawing contains real text (CAD exports usually do;
 * scanned drawings do not) — callers must treat the result as a suggestion.
 */
export const detectCalloutsOnPage = async (
  page: PDFPageProxy,
  pageNumber: number,
  labels: string[],
): Promise<DetectedCallout[]> => {
  if (labels.length === 0) return [];
  const pdfjs = await loadPdfJs();
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const wanted = new Map<string, string>();     // normalised → original label
  labels.forEach(l => { const k = normaliseLabel(l); if (k) wanted.set(k, l); });

  interface Box { str: string; x: number; y: number; w: number; h: number }
  const boxes: Box[] = [];
  for (const item of content.items) {
    if (!("str" in item)) continue;
    const str = item.str;
    if (!str || !str.trim()) continue;
    const tx = pdfjs.Util.transform(viewport.transform, item.transform);
    const h = Math.max(Math.hypot(tx[2], tx[3]), 1);
    const w = Math.max(item.width * viewport.scale, h * 0.5 * str.length);
    boxes.push({ str, x: tx[4], y: tx[5] - h, w, h });
  }

  const found: DetectedCallout[] = [];
  const push = (label: string, b: { x: number; y: number; w: number; h: number }) => {
    const size = Math.max(b.w, b.h) * 1.7;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    found.push({
      label, pageNumber,
      x: clamp01(cx / viewport.width),
      y: clamp01(cy / viewport.height),
      width:  clamp01(Math.max(size, 14) / viewport.width),
      height: clamp01(Math.max(b.h * 1.9, 14) / viewport.height),
    });
  };

  boxes.forEach((b, i) => {
    const key = normaliseLabel(b.str);
    if (wanted.has(key)) { push(wanted.get(key)!, b); return; }
    // callouts split into two text runs, e.g. "17." + "9"
    const next = boxes[i + 1];
    if (next && Math.abs(next.y - b.y) < b.h * 0.6 && next.x - (b.x + b.w) < b.h) {
      const joined = normaliseLabel(b.str + next.str);
      if (wanted.has(joined)) {
        const x2 = Math.max(b.x + b.w, next.x + next.w);
        push(wanted.get(joined)!, { x: b.x, y: Math.min(b.y, next.y), w: x2 - b.x, h: Math.max(b.h, next.h) });
      }
    }
  });

  return found;
};

export const normaliseLabel = (s: string): string =>
  s.replace(/\s+/g, "").replace(/^[([]+|[)\]]+$/g, "").toUpperCase();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
