// generateCataloguePdf.ts — builds a professional, multi-page PDF parts catalogue
// in the browser with jsPDF. Assembly drawings that are PDFs are rasterised with
// PDF.js; images are down-scaled on a canvas so the file stays a sensible size.
import type { jsPDF as JsPDF } from "jspdf";
import logoUrl from "../../assets/logo.jpg";
import { formatDate, isPdfPath, resolveMediaUrl } from "../../utils/media";
import { loadPdfDocument, renderPageToCanvas } from "../drawing/pdf";

/* ── data shape returned by GET /api/catalogue/data ── */
export interface CataloguePart {
  id: number;
  imageNumber: string;
  partNumber: string;
  partName: string;
  description: string;
  torqueNm?: number | null;
  partImagePath: string;
  colourNames: string;
}
export interface CatalogueAssembly {
  id: number;
  assemblyName: string;
  imagePath: string;
  parts: CataloguePart[];
}
export interface CatalogueGroup {
  modelId: number;
  modelName: string;
  variantId: number | null;
  variantName: string;
  colourName: string;
  colours: string[];
  assemblies: CatalogueAssembly[];
}
export interface CatalogueData { generatedAt: string; groups: CatalogueGroup[] }

export interface PdfOptions {
  title: string;              // e.g. "BG C12 · MAX R"
  scopeLabel: string;         // e.g. "Selected configuration"
  includeDrawings: boolean;
  includePartImages: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
  signal?: AbortSignal;
}

/* ── layout constants (mm, A4 portrait) ── */
const PAGE_W = 210, PAGE_H = 297, M = 14;
const CONTENT_W = PAGE_W - M * 2;
const HEADER_H = 16, FOOTER_H = 12;
const BRAND: [number, number, number] = [11, 60, 77];      // #0b3c4d
const BRAND_LIGHT: [number, number, number] = [220, 232, 239];
const TEXT: [number, number, number] = [25, 54, 79];
const MUTED: [number, number, number] = [88, 112, 130];

interface LoadedImage { data: string; w: number; h: number }

class AbortError extends Error { constructor() { super("Cancelled"); this.name = "AbortError"; } }

export async function generateCataloguePdf(data: CatalogueData, opts: PdfOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const today = formatDate(new Date());
  const groups = data.groups.filter(g => g.assemblies.length > 0);

  const totalAssemblies = groups.reduce((n, g) => n + g.assemblies.length, 0);
  const totalParts = groups.reduce((n, g) => n + g.assemblies.reduce((m, a) => m + a.parts.length, 0), 0);
  let progressDone = 0;
  const step = (label: string) => {
    if (opts.signal?.aborted) throw new AbortError();
    opts.onProgress?.(++progressDone, totalAssemblies + 2, label);
  };

  const imageCache = new Map<string, Promise<LoadedImage | null>>();
  const getImage = (path: string, maxPx: number, quality: number) => {
    const key = `${path}|${maxPx}`;
    if (!imageCache.has(key)) imageCache.set(key, loadRaster(resolveMediaUrl(path), maxPx, quality));
    return imageCache.get(key)!;
  };

  const logo = await loadRaster(logoUrl, 300, 0.9).catch(() => null);

  /* ───── cover ───── */
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PAGE_W, 110, "F");
  if (logo) doc.addImage(logo.data, "JPEG", M, 22, 22, 22 * (logo.h / logo.w));
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(30);
  doc.text("BGAUSS", M + 28, 36);
  doc.setFont("helvetica", "normal"); doc.setFontSize(13);
  doc.text("Electronic Parts Catalogue", M + 28, 44);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(doc.splitTextToSize(opts.title, CONTENT_W) as string[], M, 76);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(opts.scopeLabel, M, 98);

  doc.setTextColor(...TEXT);
  let cy = 130;
  const stat = (label: string, value: string) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M, cy);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...TEXT);
    doc.text(value, M, cy + 7);
    cy += 20;
  };
  const modelsList = Array.from(new Set(groups.map(g => g.modelName))).join(", ");
  stat("Models", modelsList || "—");
  if (groups.length === 1 && groups[0].variantName) stat("Variant", groups[0].variantName);
  if (groups.length === 1 && groups[0].colourName) stat("Colour", groups[0].colourName);
  stat("Assemblies", String(totalAssemblies));
  stat("Part entries", String(totalParts));
  stat("Generated", today);

  doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.setFont("helvetica", "normal");
  doc.text(
    doc.splitTextToSize("Only active catalogue items are included. Part availability, prices and supersessions are subject to change — always confirm with BGauss before ordering.", CONTENT_W) as string[],
    M, PAGE_H - 24,
  );
  step("Cover page");

  /* ───── table of contents (reserved now, filled at the end) ───── */
  const tocEntries: { text: string; level: 0 | 1; page: number }[] = [];
  groups.forEach(g => {
    tocEntries.push({ text: groupTitle(g), level: 0, page: 0 });
    g.assemblies.forEach(a => tocEntries.push({ text: a.assemblyName, level: 1, page: 0 }));
  });
  const TOC_LINE = 6.2;
  const tocLinesFirst = Math.floor((PAGE_H - M - FOOTER_H - (M + 26)) / TOC_LINE);
  const tocLinesNext  = Math.floor((PAGE_H - M - FOOTER_H - (M + 12)) / TOC_LINE);
  const tocPages = tocEntries.length <= tocLinesFirst ? 1 : 1 + Math.ceil((tocEntries.length - tocLinesFirst) / tocLinesNext);
  const tocStartPage = 2;
  for (let i = 0; i < tocPages; i++) doc.addPage();

  /* ───── content ───── */
  let y = 0;
  let header = { group: "", assembly: "" };

  const newPage = () => {
    doc.addPage();
    drawRunningHeader(doc, header.group, header.assembly);
    y = M + HEADER_H + 4;
  };
  const ensure = (h: number) => { if (y + h > PAGE_H - M - FOOTER_H) newPage(); };

  let tocIndex = 0;
  for (const g of groups) {
    header = { group: groupTitle(g), assembly: "" };
    tocEntries[tocIndex++].page = doc.getNumberOfPages() + 1;

    // group divider page
    doc.addPage();
    doc.setFillColor(...BRAND_LIGHT);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    doc.setFillColor(...BRAND);
    doc.rect(0, 100, PAGE_W, 44, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(24);
    doc.text(g.modelName, M, 120);
    doc.setFont("helvetica", "normal"); doc.setFontSize(14);
    doc.text([g.variantName ? `Variant: ${g.variantName}` : "All variants", g.colourName ? `Colour: ${g.colourName}` : ""].filter(Boolean).join("   ·   "), M, 132);
    doc.setTextColor(...TEXT); doc.setFontSize(10);
    if (g.colours.length && !g.colourName) {
      doc.text(doc.splitTextToSize(`Available colours: ${g.colours.join(", ")}`, CONTENT_W) as string[], M, 160);
    }
    doc.text(`${g.assemblies.length} assemblies`, M, 174);

    for (const a of g.assemblies) {
      step(`${g.modelName} · ${a.assemblyName}`);
      header = { group: groupTitle(g), assembly: a.assemblyName };
      tocEntries[tocIndex++].page = doc.getNumberOfPages() + 1;
      newPage();

      // assembly title band
      doc.setFillColor(...BRAND);
      doc.roundedRect(M, y, CONTENT_W, 11, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text(truncate(doc, a.assemblyName, CONTENT_W - 40), M + 4, y + 7.4);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`${a.parts.length} part${a.parts.length === 1 ? "" : "s"}`, M + CONTENT_W - 4, y + 7.4, { align: "right" });
      y += 15;

      // drawing(s)
      if (opts.includeDrawings && a.imagePath) {
        const drawings = await loadDrawing(a.imagePath, getImage);
        if (drawings.length === 0) {
          doc.setTextColor(...MUTED); doc.setFontSize(9);
          doc.text("Drawing could not be loaded.", M, y + 4); y += 10;
        }
        for (let di = 0; di < drawings.length; di++) {
          const img = drawings[di];
          const maxH = di === 0 ? 150 : PAGE_H - M - FOOTER_H - (M + HEADER_H + 4);
          const fit = fitBox(img.w, img.h, CONTENT_W, maxH);
          ensure(fit.h + 4);
          doc.setDrawColor(208, 216, 224);
          doc.rect(M + (CONTENT_W - fit.w) / 2 - 0.5, y - 0.5, fit.w + 1, fit.h + 1);
          doc.addImage(img.data, "JPEG", M + (CONTENT_W - fit.w) / 2, y, fit.w, fit.h, undefined, "FAST");
          y += fit.h + 6;
        }
      }

      // parts table
      if (a.parts.length === 0) {
        ensure(10);
        doc.setTextColor(...MUTED); doc.setFontSize(9.5);
        doc.text("No active parts are listed for this assembly.", M, y + 4);
        y += 10;
        continue;
      }

      const cols = opts.includePartImages
        ? [{ k: "img", t: "Img No.", w: 16 }, { k: "pic", t: "Image", w: 18 }, { k: "pn", t: "Part Number", w: 36 }, { k: "name", t: "Part Name / Description", w: 74 }, { k: "col", t: "Colour", w: CONTENT_W - 144 }]
        : [{ k: "img", t: "Img No.", w: 16 }, { k: "pn", t: "Part Number", w: 38 }, { k: "name", t: "Part Name / Description", w: 92 }, { k: "col", t: "Colour", w: CONTENT_W - 146 }];

      const drawTableHeader = () => {
        doc.setFillColor(...BRAND);
        doc.rect(M, y, CONTENT_W, 8, "F");
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
        let x = M;
        cols.forEach(c => { doc.text(c.t, x + 2, y + 5.4); x += c.w; });
        y += 8;
      };

      ensure(20);
      drawTableHeader();

      for (let pi = 0; pi < a.parts.length; pi++) {
        const p = a.parts[pi];
        const nameCol = cols.find(c => c.k === "name")!;
        const colCol  = cols.find(c => c.k === "col")!;
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
        const nameLines = doc.splitTextToSize(p.partName || "—", nameCol.w - 4) as string[];
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        const descText = [p.description, p.torqueNm ? `Torque: ${p.torqueNm} Nm` : ""].filter(Boolean).join(" · ");
        const descLines = descText ? (doc.splitTextToSize(descText, nameCol.w - 4) as string[]).slice(0, 4) : [];
        const colourLines = (doc.splitTextToSize(p.colourNames || "—", colCol.w - 4) as string[]).slice(0, 4);
        const textH = nameLines.length * 3.8 + descLines.length * 3.3 + 3;
        const rowH = Math.max(opts.includePartImages ? 17 : 8, textH, colourLines.length * 3.3 + 3);

        if (y + rowH > PAGE_H - M - FOOTER_H) { newPage(); drawTableHeader(); }

        if (pi % 2 === 1) { doc.setFillColor(244, 247, 249); doc.rect(M, y, CONTENT_W, rowH, "F"); }
        doc.setDrawColor(230, 237, 242); doc.line(M, y + rowH, M + CONTENT_W, y + rowH);

        let x = M;
        for (const c of cols) {
          doc.setTextColor(...TEXT);
          if (c.k === "img") {
            doc.setFont("helvetica", "bold"); doc.setFontSize(9);
            doc.text(p.imageNumber || "—", x + 2, y + 5);
          } else if (c.k === "pic") {
            if (p.partImagePath) {
              const img = await getImage(p.partImagePath, 220, 0.8);
              if (img) {
                const fit = fitBox(img.w, img.h, c.w - 3, rowH - 3);
                doc.addImage(img.data, "JPEG", x + (c.w - fit.w) / 2, y + (rowH - fit.h) / 2, fit.w, fit.h, undefined, "FAST");
              } else placeholder(doc, x + 2, y + 2, c.w - 4, rowH - 4);
            } else placeholder(doc, x + 2, y + 2, c.w - 4, rowH - 4);
          } else if (c.k === "pn") {
            doc.setFont("courier", "bold"); doc.setFontSize(8.5);
            doc.text(doc.splitTextToSize(p.partNumber || "—", c.w - 3) as string[], x + 2, y + 5);
          } else if (c.k === "name") {
            doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
            doc.text(nameLines, x + 2, y + 5);
            if (descLines.length) {
              doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
              doc.text(descLines, x + 2, y + 5 + nameLines.length * 3.8);
            }
          } else if (c.k === "col") {
            doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
            doc.text(colourLines, x + 2, y + 5);
          }
          x += c.w;
        }
        y += rowH;
      }
    }
  }

  /* ───── fill the table of contents ───── */
  step("Table of contents");
  let tocPage = tocStartPage;
  doc.setPage(tocPage);
  let ty = M + 8;
  doc.setTextColor(...BRAND); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Contents", M, ty + 6);
  ty += 18;
  for (const e of tocEntries) {
    if (ty > PAGE_H - M - FOOTER_H) {
      tocPage++; doc.setPage(tocPage); ty = M + 12;
    }
    const indent = e.level === 0 ? 0 : 6;
    doc.setFont("helvetica", e.level === 0 ? "bold" : "normal");
    doc.setFontSize(e.level === 0 ? 10.5 : 9.5);
    doc.setTextColor(...(e.level === 0 ? BRAND : TEXT));
    const label = truncate(doc, e.text, CONTENT_W - indent - 20);
    doc.text(label, M + indent, ty);
    const labelW = doc.getTextWidth(label);
    doc.setDrawColor(203, 213, 225);
    (doc as unknown as { setLineDashPattern: (a: number[], p: number) => void }).setLineDashPattern([0.4, 1], 0);
    doc.line(M + indent + labelW + 2, ty - 0.8, M + CONTENT_W - 12, ty - 0.8);
    (doc as unknown as { setLineDashPattern: (a: number[], p: number) => void }).setLineDashPattern([], 0);
    doc.text(String(e.page), M + CONTENT_W, ty, { align: "right" });
    doc.link(M, ty - 4, CONTENT_W, 5.5, { pageNumber: e.page });
    ty += TOC_LINE;
  }

  /* ───── footers with page numbers ───── */
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(208, 216, 224);
    doc.line(M, PAGE_H - M - 4, PAGE_W - M, PAGE_H - M - 4);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(`BGAUSS Electronic Parts Catalogue  ·  ${opts.title}  ·  ${today}`, M, PAGE_H - M + 1);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - M + 1, { align: "right" });
  }

  step("Finishing");
  return doc.output("blob");
}

/* ───────────────────────── helpers ───────────────────────── */
const groupTitle = (g: CatalogueGroup) =>
  [g.modelName, g.variantName, g.colourName].filter(Boolean).join(" · ");

function drawRunningHeader(doc: JsPDF, group: string, assembly: string) {
  doc.setFillColor(...BRAND_LIGHT);
  doc.rect(0, 0, PAGE_W, M + HEADER_H - 6, "F");
  doc.setTextColor(...BRAND); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("BGAUSS", M, M + 2);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
  doc.text(truncate(doc, group, 80), M + 18, M + 2);
  if (assembly) doc.text(truncate(doc, assembly, 80), PAGE_W - M, M + 2, { align: "right" });
}

function placeholder(doc: JsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(203, 213, 225);
  (doc as unknown as { setLineDashPattern: (a: number[], p: number) => void }).setLineDashPattern([0.8, 0.8], 0);
  doc.rect(x, y, w, h);
  (doc as unknown as { setLineDashPattern: (a: number[], p: number) => void }).setLineDashPattern([], 0);
  doc.setFontSize(6); doc.setTextColor(148, 163, 184);
  doc.text("No image", x + w / 2, y + h / 2 + 1, { align: "center" });
}

function truncate(doc: JsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

function fitBox(w: number, h: number, maxW: number, maxH: number) {
  const r = Math.min(maxW / w, maxH / h);
  return { w: w * r, h: h * r };
}

/** Loads an image URL, down-scales it to maxPx on the longest side and returns a JPEG data URL. */
function loadRaster(url: string, maxPx: number, quality: number): Promise<LoadedImage | null> {
  return new Promise(resolve => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * s));
        const h = Math.max(1, Math.round(img.naturalHeight * s));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: c.toDataURL("image/jpeg", quality), w, h });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Returns one raster per drawing page (PDF: up to 4 pages; image: 1). */
async function loadDrawing(
  path: string,
  getImage: (p: string, maxPx: number, q: number) => Promise<LoadedImage | null>,
): Promise<LoadedImage[]> {
  if (!isPdfPath(path)) {
    const img = await getImage(path, 1800, 0.82);
    return img ? [img] : [];
  }
  try {
    const pdf = await loadPdfDocument(resolveMediaUrl(path));
    const out: LoadedImage[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 4); i++) {
      const page = await pdf.getPage(i);
      const canvas = document.createElement("canvas");
      await renderPageToCanvas(page, canvas, 1800);
      out.push({ data: canvas.toDataURL("image/jpeg", 0.85), w: canvas.width, h: canvas.height });
    }
    return out;
  } catch {
    return [];
  }
}
