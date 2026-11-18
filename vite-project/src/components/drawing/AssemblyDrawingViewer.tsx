// AssemblyDrawingViewer.tsx — customer-facing assembly drawing with clickable part numbers.
//
// Hotspot source, in priority order:
//   1. Mapping saved by an administrator (Admin Modules → Assemblies → "Map part numbers")
//   2. For vector PDFs only: callouts auto-detected from the PDF text layer that
//      exactly match an image number of this assembly's parts
// If neither is available the drawing is still shown with zoom/pan and the
// "Image No." chips remain the way to pick parts.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  FaSearchPlus, FaSearchMinus, FaExpand, FaCompress, FaUndo, FaChevronLeft,
  FaChevronRight, FaExternalLinkAlt, FaMapMarkerAlt, FaEye, FaEyeSlash,
} from "react-icons/fa";
import DrawingSurface from "./DrawingSurface";
import type { SurfaceInfo } from "./DrawingSurface";
import { detectCalloutsOnPage, normaliseLabel } from "./pdf";
import { isPdfPath } from "../../utils/media";
import "./drawing.css";

export interface Hotspot {
  id?: number;
  label: string;
  pageNumber: number;
  x: number; y: number; width: number; height: number;
}

type Source = "saved" | "auto" | "none";

interface Props {
  src: string;
  title: string;
  assemblyId?: number;
  /** image numbers of the parts in this assembly */
  labels: string[];
  activeLabels: Set<string>;
  focusLabel?: string | null;
  hoveredLabel?: string | null;
  onHotspotClick: (label: string) => void;
  onHotspotHover?: (label: string | null) => void;
}

export default function AssemblyDrawingViewer({
  src, title, assemblyId, labels, activeLabels, focusLabel, hoveredLabel,
  onHotspotClick, onHotspotHover,
}: Props) {
  const pdf = isPdfPath(src);
  const [page, setPage]           = useState(1);
  const [info, setInfo]           = useState<SurfaceInfo | null>(null);
  const [saved, setSaved]         = useState<Hotspot[] | null>(null);
  const [auto, setAuto]           = useState<Hotspot[]>([]);
  const [expanded, setExpanded]   = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const detectedPages = useRef<Set<number>>(new Set());
  const [viewH, setViewH] = useState(() => window.innerHeight);

  // ── saved mapping
  useEffect(() => {
    setSaved(null); setAuto([]); setPage(1); setError(null);
    detectedPages.current = new Set();
    if (!assemblyId) { setSaved([]); return; }
    let cancelled = false;
    axios.get<Hotspot[]>(`/assemblies/${assemblyId}/hotspots`)
      .then(r => { if (!cancelled) setSaved(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!cancelled) setSaved([]); });   // viewer still works without hotspots
    return () => { cancelled = true; };
  }, [assemblyId, src]);

  const labelsKey = labels.join("|");

  // ── PDF text-layer auto-detection (only when nothing is saved)
  useEffect(() => {
    if (!pdf || !info?.doc || saved === null || saved.length > 0 || labels.length === 0) return;
    if (detectedPages.current.has(page)) return;
    detectedPages.current.add(page);
    let cancelled = false;
    (async () => {
      try {
        const p = await info.doc!.getPage(page);
        const found = await detectCalloutsOnPage(p, page, labels);
        if (!cancelled && found.length) setAuto(prev => [...prev.filter(h => h.pageNumber !== page), ...found]);
      } catch { /* text layer not available — silently fall back to chips */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, info?.doc, saved, page, labelsKey]);

  const source: Source = saved && saved.length > 0 ? "saved" : auto.length > 0 ? "auto" : "none";
  const all = source === "saved" ? saved! : auto;
  const pageHotspots = useMemo(() => all.filter(h => (h.pageNumber || 1) === page), [all, page]);

  const knownLabels = useMemo(() => new Set(labels.map(normaliseLabel)), [labels]);
  const mappedCount = useMemo(
    () => new Set(all.filter(h => knownLabels.has(normaliseLabel(h.label))).map(h => normaliseLabel(h.label))).size,
    [all, knownLabels],
  );

  const pageCount = info?.pageCount ?? 1;

  // Esc closes the expanded view
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    const onResize = () => setViewH(window.innerHeight);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  // jump to the page that holds the focused label
  useEffect(() => {
    if (!focusLabel) return;
    const h = all.find(x => normaliseLabel(x.label) === normaliseLabel(focusLabel));
    if (h && h.pageNumber && h.pageNumber !== page) setPage(h.pageNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLabel]);

  const isActive = useCallback((label: string) => {
    const n = normaliseLabel(label);
    if (focusLabel && normaliseLabel(focusLabel) === n) return true;
    for (const a of activeLabels) if (normaliseLabel(a) === n) return true;
    return false;
  }, [activeLabels, focusLabel]);

  const resolveLabel = (label: string): string => {
    const n = normaliseLabel(label);
    return labels.find(l => normaliseLabel(l) === n) ?? label;
  };

  const view = (
    <div className={`dv${expanded ? " dv--expanded" : ""}`}>
      {expanded && <div className="dv__backdrop" onClick={() => setExpanded(false)} />}
      <div className="dv__frame">
        <TransformWrapper
          minScale={1}
          maxScale={8}
          wheel={{ step: 0.15 }}
          doubleClick={{ mode: "zoomIn", step: 0.7, excluded: ["dv-hs"] }}
          panning={{ excluded: ["dv-hs"], velocityDisabled: true }}
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="dv__toolbar">
                <div className="dv__tools">
                  <button type="button" onClick={() => zoomOut()} title="Zoom out"><FaSearchMinus /></button>
                  <button type="button" onClick={() => zoomIn()} title="Zoom in"><FaSearchPlus /></button>
                  <button type="button" onClick={() => resetTransform()} title="Reset view"><FaUndo /></button>
                  {pageCount > 1 && (
                    <span className="dv__pages">
                      <button type="button" disabled={page <= 1} onClick={() => { setPage(p => p - 1); resetTransform(0); }} title="Previous page"><FaChevronLeft /></button>
                      <span>{page}/{pageCount}</span>
                      <button type="button" disabled={page >= pageCount} onClick={() => { setPage(p => p + 1); resetTransform(0); }} title="Next page"><FaChevronRight /></button>
                    </span>
                  )}
                </div>
                <div className="dv__tools">
                  {source !== "none" && (
                    <button type="button" onClick={() => setShowMarkers(s => !s)}
                      title={showMarkers ? "Hide clickable markers" : "Show clickable markers"}>
                      {showMarkers ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  )}
                  <a href={src} target="_blank" rel="noopener noreferrer" title={pdf ? "Open original PDF" : "Open original image"}>
                    <FaExternalLinkAlt />
                  </a>
                  <button type="button" onClick={() => { setViewH(window.innerHeight); setExpanded(e => !e); resetTransform(0); }}
                    title={expanded ? "Exit full screen (Esc)" : "Full screen"}>
                    {expanded ? <FaCompress /> : <FaExpand />}
                  </button>
                </div>
              </div>

              <TransformComponent wrapperClass="dv__viewport" contentClass="dv__content">
                <DrawingSurface
                  src={src}
                  page={page}
                  alt={title}
                  onInfo={setInfo}
                  onError={setError}
                  fitHeight={expanded ? viewH - 140 : undefined}
                >
                  {pageHotspots.map((h, i) => {
                    const label = resolveLabel(h.label);
                    const active = isActive(label);
                    const hovered = hoveredLabel != null && normaliseLabel(hoveredLabel) === normaliseLabel(label);
                    return (
                      <button
                        key={`${h.label}-${i}`}
                        type="button"
                        className={[
                          "dv-hs",
                          showMarkers ? "dv-hs--marked" : "",
                          active ? "dv-hs--active" : "",
                          hovered ? "dv-hs--hover" : "",
                        ].filter(Boolean).join(" ")}
                        style={{
                          left: `${h.x * 100}%`, top: `${h.y * 100}%`,
                          width: `${h.width * 100}%`, height: `${h.height * 100}%`,
                        }}
                        title={`Image no. ${label} — click to view part details`}
                        aria-label={`Image number ${label}`}
                        onClick={e => { e.stopPropagation(); onHotspotClick(label); }}
                        onMouseEnter={() => onHotspotHover?.(label)}
                        onMouseLeave={() => onHotspotHover?.(null)}
                      >
                        <span className="dv-hs__tip">{label}</span>
                      </button>
                    );
                  })}
                </DrawingSurface>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {!error && (
        <div className={`dv__status dv__status--${source}`}>
          <FaMapMarkerAlt />
          {source === "saved" && <span>Click a part number on the drawing to view its details ({mappedCount} mapped)</span>}
          {source === "auto" && <span>Part numbers detected in the PDF ({mappedCount}) — click one to view its details</span>}
          {source === "none" && saved !== null && (
            <span>Clickable part numbers are not mapped for this drawing yet — use the Image No. list below.</span>
          )}
          {saved === null && <span>Loading part-number map…</span>}
        </div>
      )}
      {error && <div className="dv__status dv__status--error">{error} <a href={src} target="_blank" rel="noopener noreferrer">Open file</a></div>}
    </div>
  );

  // Full screen is rendered at the top of the page so no sticky panel or table can cover it.
  return expanded ? createPortal(view, document.body) : view;
}
