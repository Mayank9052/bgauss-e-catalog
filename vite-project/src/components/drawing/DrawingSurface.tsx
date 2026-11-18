// DrawingSurface.tsx — renders an assembly drawing (PDF page via PDF.js, or an image)
// at full container width and exposes an overlay layer whose box exactly matches
// the drawing, so hotspots can be positioned with normalised (0..1) coordinates.
//
// Rendering rules (keep these — they prevent the "Loading drawing…" hang):
//  • A page is rendered off-screen and copied to the visible canvas only when complete.
//  • A render is never restarted for small width changes (scrollbars appearing etc.).
//    It is only re-rendered when the box becomes noticeably wider (e.g. full screen);
//    when it gets narrower the existing canvas is simply scaled down by CSS.
//  • Every render that is no longer needed is cancelled in PDF.js, so renders never pile up.
//  • The loading state is cleared on success, failure and cancellation.
import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { isPdfPath } from "../../utils/media";
import { loadPdfDocument, startPageRender, isRenderCancelled } from "./pdf";
import type { RenderJob } from "./pdf";

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
  /** when set (full screen), the drawing is sized so its whole height fits in this many pixels */
  fitHeight?: number;
}

const MAX_CANVAS_PX = 2800;   // enough for 2–3× zoom without exhausting memory
const MIN_CANVAS_PX = 900;
const SLOW_AFTER_MS = 10000;

// Recently rendered pages, so leaving full screen or coming back to a page is instant.
// Kept small: each entry is one canvas of at most MAX_CANVAS_PX width.
const renderCache = new Map<string, { canvas: HTMLCanvasElement; aspect: number }>();
const RENDER_CACHE_SIZE = 3;
const remember = (key: string, canvas: HTMLCanvasElement, aspect: number) => {
  renderCache.delete(key);
  renderCache.set(key, { canvas, aspect });
  while (renderCache.size > RENDER_CACHE_SIZE) renderCache.delete(renderCache.keys().next().value as string);
};

interface ActiveRender { pageKey: string; wanted: number; job: RenderJob | null; dead: boolean }

const DrawingSurface = forwardRef<HTMLDivElement, Props>(function DrawingSurface(
  { src, page, alt, onInfo, onError, children, overlayProps, fitHeight },
  overlayRef,
) {
  const pdf = isPdfPath(src);
  const boxRef    = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [docState, setDocState] = useState<{ src: string; doc: PDFDocumentProxy } | null>(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow]       = useState(false);
  const [failed, setFailed]   = useState<string | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [aspect, setAspect]   = useState(0.7);
  const renderedRef = useRef<{ pageKey: string; width: number }>({ pageKey: "", width: 0 });
  const activeRef   = useRef<ActiveRender | null>(null);

  // stable callbacks
  const onInfoRef  = useRef(onInfo);
  const onErrorRef = useRef(onError);
  useEffect(() => { onInfoRef.current = onInfo; onErrorRef.current = onError; });

  // cancel any running render on unmount
  useEffect(() => () => {
    const a = activeRef.current;
    if (a) { a.dead = true; a.job?.cancel(); }
  }, []);

  // observe container width (debounced)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let t = 0;
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      window.clearTimeout(t);
      t = window.setTimeout(() => setBoxWidth(w), 200);
    });
    ro.observe(el);
    setBoxWidth(Math.round(el.getBoundingClientRect().width));
    return () => { ro.disconnect(); window.clearTimeout(t); };
  }, []);

  // load PDF document
  useEffect(() => {
    setFailed(null);
    setSlow(false);
    setLoading(true);
    setDocState(null);
    renderedRef.current = { pageKey: "", width: 0 };
    const a = activeRef.current;
    if (a) { a.dead = true; a.job?.cancel(); activeRef.current = null; }
    if (!pdf) return;
    let cancelled = false;
    loadPdfDocument(src)
      .then(d => { if (!cancelled) setDocState({ src, doc: d }); })
      .catch(() => {
        if (cancelled) return;
        const msg = "The PDF drawing could not be loaded.";
        setFailed(msg); setLoading(false); onErrorRef.current?.(msg);
      });
    return () => { cancelled = true; };
  }, [src, pdf]);

  const doc = docState && docState.src === src ? docState.doc : null;

  // render (or sharpen) the current PDF page
  useEffect(() => {
    if (!pdf || !doc || boxWidth <= 0) return;
    const pageNo  = Math.min(Math.max(1, page), doc.numPages);
    const pageKey = `${src}|${pageNo}`;
    const dpr     = window.devicePixelRatio || 1;
    const wanted  = Math.min(MAX_CANVAS_PX, Math.max(MIN_CANVAS_PX, Math.round(boxWidth * dpr * 1.5)));

    // reuse a recent render of this page (e.g. after leaving full screen)
    const cached = renderCache.get(pageKey);
    if (renderedRef.current.pageKey !== pageKey && cached && canvasRef.current) {
      const vis = canvasRef.current;
      vis.width = cached.canvas.width;
      vis.height = cached.canvas.height;
      vis.getContext("2d")?.drawImage(cached.canvas, 0, 0);
      renderedRef.current = { pageKey, width: cached.canvas.width };
      setAspect(cached.aspect);
      setLoading(false);
      setSlow(false);
      onInfoRef.current?.({ kind: "pdf", pageCount: doc.numPages, aspect: cached.aspect, doc });
    }

    // already rendered sharply enough for this width → nothing to do
    const done = renderedRef.current;
    if (done.pageKey === pageKey && done.width >= wanted * 0.85) return;
    // a suitable render is already running → let it finish
    const running = activeRef.current;
    if (running && !running.dead && running.pageKey === pageKey && running.wanted >= wanted * 0.85) return;
    if (running) { running.dead = true; running.job?.cancel(); }

    const first = done.pageKey !== pageKey;
    const me: ActiveRender = { pageKey, wanted, job: null, dead: false };
    activeRef.current = me;
    if (first) { setLoading(true); setSlow(false); setFailed(null); }
    const slowTimer = first ? window.setTimeout(() => { if (!me.dead) setSlow(true); }, SLOW_AFTER_MS) : 0;

    (async () => {
      try {
        const p = await doc.getPage(pageNo);
        if (me.dead) return;
        const off = document.createElement("canvas");
        me.job = startPageRender(p, off, wanted);
        const size = await me.job.promise;
        if (me.dead) return;
        const vis = canvasRef.current;
        if (!vis) return;
        vis.width = off.width;
        vis.height = off.height;
        vis.getContext("2d")?.drawImage(off, 0, 0);
        renderedRef.current = { pageKey, width: off.width };
        const a = size.height / size.width;
        remember(pageKey, off, a);
        setAspect(a);
        setLoading(false);
        setSlow(false);
        onInfoRef.current?.({ kind: "pdf", pageCount: doc.numPages, aspect: a, doc });
      } catch (e) {
        if (me.dead || isRenderCancelled(e)) return;
        if (first) {
          const msg = "This page of the drawing could not be rendered.";
          setFailed(msg); setLoading(false); onErrorRef.current?.(msg);
        }
        // a failed sharpening pass keeps the existing (lower resolution) drawing
      } finally {
        window.clearTimeout(slowTimer);
        if (activeRef.current === me) activeRef.current = null;
      }
    })();
  }, [pdf, doc, page, boxWidth, src]);

  return (
    <div
      ref={boxRef}
      className="ds-box"
      style={fitHeight ? { maxWidth: Math.max(320, Math.round(fitHeight / Math.max(aspect, 0.05))), margin: "0 auto" } : undefined}
    >
      {failed ? (
        <div className="ds-error">
          {failed} <a href={src} target="_blank" rel="noopener noreferrer">Open the file</a>
        </div>
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
          {loading && (
            <div className="ds-loading">
              <span className="ds-spinner" />
              {slow ? (
                <span>
                  Large drawing — still preparing…{" "}
                  <a href={src} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Open original</a>
                </span>
              ) : "Loading drawing…"}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DrawingSurface;
