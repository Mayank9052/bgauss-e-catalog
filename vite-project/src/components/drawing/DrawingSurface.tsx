// DrawingSurface.tsx — renders an assembly drawing (PDF page via PDF.js, or an image)
// at full container width and exposes an overlay layer whose box exactly matches
// the drawing, so hotspots can be positioned with normalised (0..1) coordinates.
import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { isPdfPath } from "../../utils/media";
import { loadPdfDocument, renderPageToCanvas } from "./pdf";

export interface SurfaceInfo {
  kind: "pdf" | "image";
  pageCount: number;
  /** natural aspect ratio (height / width) of the current page */
  aspect: number;
  doc?: PDFDocumentProxy;
}

interface Props {
  src: string;
  page: number;                         // 1-based
  alt: string;
  onInfo?: (info: SurfaceInfo) => void;
  onError?: (msg: string) => void;
  children?: ReactNode;                 // overlay content (absolute positioned)
  overlayProps?: React.HTMLAttributes<HTMLDivElement>;
}

const MAX_CANVAS_PX = 4096;

const DrawingSurface = forwardRef<HTMLDivElement, Props>(function DrawingSurface(
  { src, page, alt, onInfo, onError, children, overlayProps },
  overlayRef,
) {
  const pdf = isPdfPath(src);
  const boxRef    = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc]         = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState<string | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [aspect, setAspect]   = useState(0.7);
  const renderedFor = useRef<string>("");

  // stable callbacks
  const onInfoRef  = useRef(onInfo);
  const onErrorRef = useRef(onError);
  useEffect(() => { onInfoRef.current = onInfo; onErrorRef.current = onError; });

  // observe container width (debounced) so the PDF is re-rendered crisply
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let t = 0;
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      window.clearTimeout(t);
      t = window.setTimeout(() => setBoxWidth(w), 120);
    });
    ro.observe(el);
    setBoxWidth(Math.round(el.getBoundingClientRect().width));
    return () => { ro.disconnect(); window.clearTimeout(t); };
  }, []);

  // load PDF document
  useEffect(() => {
    setFailed(null);
    setLoading(true);
    renderedFor.current = "";
    if (!pdf) { setDoc(null); return; }
    let cancelled = false;
    setLoading(true);
    loadPdfDocument(src)
      .then(d => { if (!cancelled) setDoc(d); })
      .catch(() => {
        if (cancelled) return;
        const msg = "The PDF drawing could not be loaded.";
        setFailed(msg); setLoading(false); onErrorRef.current?.(msg);
      });
    return () => { cancelled = true; };
  }, [src, pdf]);

  // render current PDF page
  useEffect(() => {
    if (!pdf || !doc || !canvasRef.current || boxWidth <= 0) return;
    const pageNo = Math.min(Math.max(1, page), doc.numPages);
    const dpr = window.devicePixelRatio || 1;
    // render at 2× display size so zooming stays sharp, capped for memory
    const target = Math.min(MAX_CANVAS_PX, Math.round(boxWidth * dpr * 2));
    const key = `${src}|${pageNo}|${Math.round(target / 200)}`;
    if (renderedFor.current === key) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const p = await doc.getPage(pageNo);
        if (cancelled || !canvasRef.current) return;
        const size = await renderPageToCanvas(p, canvasRef.current, target);
        if (cancelled) return;
        renderedFor.current = key;
        const a = size.height / size.width;
        setAspect(a);
        onInfoRef.current?.({ kind: "pdf", pageCount: doc.numPages, aspect: a, doc });
      } catch {
        if (!cancelled) {
          const msg = "This page of the drawing could not be rendered.";
          setFailed(msg); onErrorRef.current?.(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdf, doc, page, boxWidth, src]);

  return (
    <div ref={boxRef} className="ds-box">
      {failed ? (
        <div className="ds-error">{failed}</div>
      ) : (
        <div className="ds-stage" style={pdf ? { aspectRatio: `1 / ${aspect}` } : undefined}>
          {pdf ? (
            <canvas ref={canvasRef} className="ds-canvas" aria-label={alt} role="img" />
          ) : (
            <img
              className="ds-img"
              src={src}
              alt={alt}
              draggable={false}
              onLoad={e => {
                const img = e.currentTarget;
                const a = img.naturalHeight / Math.max(1, img.naturalWidth);
                setAspect(a); setLoading(false);
                onInfoRef.current?.({ kind: "image", pageCount: 1, aspect: a });
              }}
              onError={() => {
                const msg = "The drawing image could not be loaded.";
                setFailed(msg); setLoading(false); onErrorRef.current?.(msg);
              }}
            />
          )}
          <div ref={overlayRef} className="ds-overlay" {...overlayProps}>
            {!loading && children}
          </div>
          {loading && <div className="ds-loading"><span className="ds-spinner" /> Loading drawing…</div>}
        </div>
      )}
    </div>
  );
});

export default DrawingSurface;
