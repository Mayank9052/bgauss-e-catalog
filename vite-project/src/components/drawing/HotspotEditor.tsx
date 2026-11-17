// HotspotEditor.tsx — admin tool to map clickable part numbers onto an assembly drawing.
//
// How it works
//   • Pick an image number on the right (taken from the parts of this assembly)
//   • Click on the drawing where that number appears → a hotspot is placed
//   • Drag a hotspot to move it, use the size slider to resize, Delete to remove
//   • For vector PDFs, "Auto-detect" reads the PDF text layer and proposes hotspots
//   • Save stores the mapping in dbo.AssemblyHotspots (normalised 0..1 coordinates)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  FaTimes, FaSave, FaMagic, FaTrash, FaSearchPlus, FaSearchMinus, FaUndo,
  FaChevronLeft, FaChevronRight, FaPlus, FaCheckCircle,
} from "react-icons/fa";
import DrawingSurface from "./DrawingSurface";
import type { SurfaceInfo } from "./DrawingSurface";
import { detectCalloutsOnPage, normaliseLabel } from "./pdf";
import type { Hotspot } from "./AssemblyDrawingViewer";
import { errorMessage, isPdfPath, naturalCompare, resolveMediaUrl } from "../../utils/media";
import "./drawing.css";

interface PartLite { imageNumber: string; partNumber: string; partName: string }

interface Props {
  assembly: { id: number; assemblyName: string; imagePath: string };
  parts: PartLite[];
  onClose: () => void;
  onSaved: (count: number) => void;
}

const DEFAULT_SIZE = 0.035;

export default function HotspotEditor({ assembly, parts, onClose, onSaved }: Props) {
  const src = resolveMediaUrl(assembly.imagePath);
  const pdf = isPdfPath(src);

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [message, setMessage]   = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [page, setPage]         = useState(1);
  const [info, setInfo]         = useState<SurfaceInfo | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>("");
  const [selected, setSelected] = useState<number | null>(null);   // index in hotspots
  const [customLabel, setCustomLabel] = useState("");
  const [labelFilter, setLabelFilter] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const downPos    = useRef<{ x: number; y: number } | null>(null);
  const dragging   = useRef<{ index: number; moved: boolean } | null>(null);

  // labels = distinct image numbers from parts (+ any already saved)
  const partLabels = useMemo(() => {
    const m = new Map<string, PartLite[]>();
    parts.forEach(p => {
      const l = (p.imageNumber ?? "").trim();
      if (!l) return;
      if (!m.has(l)) m.set(l, []);
      m.get(l)!.push(p);
    });
    return m;
  }, [parts]);

  const labels = useMemo(() => {
    const set = new Set<string>(partLabels.keys());
    hotspots.forEach(h => set.add(h.label));
    return Array.from(set).sort(naturalCompare);
  }, [partLabels, hotspots]);

  const countFor = useCallback(
    (label: string) => hotspots.filter(h => normaliseLabel(h.label) === normaliseLabel(label)).length,
    [hotspots],
  );

  // ── load saved mapping
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get<Hotspot[]>(`/assemblies/${assembly.id}/hotspots`)
      .then(r => { if (!cancelled) setHotspots(Array.isArray(r.data) ? r.data : []); })
      .catch(e => { if (!cancelled) setMessage({ type: "err", text: "Could not load saved hotspots: " + errorMessage(e) }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assembly.id]);

  // default active label = first unmapped one
  useEffect(() => {
    if (activeLabel || labels.length === 0) return;
    setActiveLabel(labels.find(l => countFor(l) === 0) ?? labels[0]);
  }, [labels, activeLabel, countFor]);

  const aspect = info?.aspect ?? 0.7;

  const toNorm = (clientX: number, clientY: number) => {
    const r = overlayRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    };
  };

  const nextUnmapped = (after: string, list: Hotspot[]) => {
    const idx = labels.indexOf(after);
    const ordered = [...labels.slice(idx + 1), ...labels.slice(0, idx)];
    return ordered.find(l => !list.some(h => normaliseLabel(h.label) === normaliseLabel(l))) ?? after;
  };

  // ── place a hotspot by clicking (ignored if the user was panning)
  const onOverlayMouseDown = (e: React.MouseEvent) => { downPos.current = { x: e.clientX, y: e.clientY }; };
  const onOverlayClick = (e: React.MouseEvent) => {
    const d = downPos.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;  // was a pan
    if ((e.target as HTMLElement).closest(".he-hs")) return;
    if (!activeLabel) { setMessage({ type: "info", text: "Select an image number on the right first." }); return; }
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    const h: Hotspot = {
      label: activeLabel, pageNumber: page, x: p.x, y: p.y,
      width: DEFAULT_SIZE, height: Math.min(1, DEFAULT_SIZE / Math.max(aspect, 0.1)),
    };
    const list = [...hotspots, h];
    setHotspots(list);
    setSelected(list.length - 1);
    setDirty(true);
    setActiveLabel(nextUnmapped(activeLabel, list));
  };

  // ── drag to move
  const startDrag = (index: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelected(index);
    dragging.current = { index, moved: false };
    const move = (ev: PointerEvent) => {
      const p = toNorm(ev.clientX, ev.clientY);
      if (!p || !dragging.current) return;
      dragging.current.moved = true;
      setHotspots(list => list.map((h, i) => i === index ? { ...h, x: p.x, y: p.y } : h));
      setDirty(true);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      dragging.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const removeSelected = useCallback(() => {
    if (selected == null) return;
    setHotspots(list => list.filter((_, i) => i !== selected));
    setSelected(null);
    setDirty(true);
  }, [selected]);

  const resizeSelected = (size: number) => {
    if (selected == null) return;
    setHotspots(list => list.map((h, i) => i === selected
      ? { ...h, width: size, height: Math.min(1, size / Math.max(aspect, 0.1)) } : h));
    setDirty(true);
  };

  // Delete / Esc keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected != null) { e.preventDefault(); removeSelected(); }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, removeSelected]);

  // ── auto-detect from PDF text
  const autoDetect = async () => {
    if (!info?.doc) return;
    setMessage({ type: "info", text: "Reading PDF text…" });
    try {
      const wanted = Array.from(partLabels.keys());
      const results: Hotspot[] = [];
      for (let p = 1; p <= info.doc.numPages; p++) {
        const pg = await info.doc.getPage(p);
        results.push(...await detectCalloutsOnPage(pg, p, wanted));
      }
      if (results.length === 0) {
        setMessage({ type: "info", text: "No matching part numbers were found in the PDF text (the drawing may be a scan). Place hotspots manually." });
        return;
      }
      // keep manual hotspots, add detected ones for labels that have none yet
      const already = new Set(hotspots.map(h => normaliseLabel(h.label)));
      const added = results.filter(r => !already.has(normaliseLabel(r.label)));
      setHotspots(list => [...list, ...added]);
      setDirty(added.length > 0);
      const distinct = new Set(results.map(r => normaliseLabel(r.label))).size;
      setMessage({
        type: "ok",
        text: `Found ${distinct} of ${wanted.length} image numbers in the PDF; added ${added.length} new hotspot(s). Review them, then Save.`,
      });
    } catch (e) {
      setMessage({ type: "err", text: "Auto-detect failed: " + errorMessage(e) });
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`/assemblies/${assembly.id}/hotspots`, hotspots.map(h => ({
        label: h.label, pageNumber: h.pageNumber || 1,
        x: round(h.x), y: round(h.y), width: round(h.width), height: round(h.height),
      })));
      setDirty(false);
      setMessage({ type: "ok", text: `${hotspots.length} hotspot(s) saved.` });
      onSaved(hotspots.length);
    } catch (e) {
      setMessage({ type: "err", text: "Save failed: " + errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("You have unsaved hotspot changes. Close without saving?")) return;
    onClose();
  };

  const addCustomLabel = () => {
    const l = customLabel.trim();
    if (!l) return;
    setActiveLabel(l);
    setCustomLabel("");
    setMessage({ type: "info", text: `Click on the drawing to place "${l}".` });
  };

  const sel = selected != null ? hotspots[selected] : null;
  const unmapped = Array.from(partLabels.keys()).filter(l => countFor(l) === 0).length;
  const visibleLabels = labels.filter(l => !labelFilter.trim() || l.toLowerCase().includes(labelFilter.trim().toLowerCase()));

  return createPortal(
    <div className="he-overlay" role="dialog" aria-label="Map part numbers">
      <div className="he-modal">
        <div className="he-head">
          <div>
            <h3 className="he-title">Map part numbers — {assembly.assemblyName}</h3>
            <p className="he-sub">
              Select an image number, then click its position on the drawing. Drag to move, Delete to remove.
            </p>
          </div>
          <div className="he-head__actions">
            {pdf && (
              <button type="button" className="am-btn am-btn--outline am-btn--sm" onClick={() => void autoDetect()} disabled={!info?.doc}>
                <FaMagic /> Auto-detect from PDF
              </button>
            )}
            <button type="button" className="am-btn am-btn--success am-btn--sm" onClick={() => void save()} disabled={saving || loading}>
              <FaSave /> {saving ? "Saving…" : dirty ? "Save*" : "Save"}
            </button>
            <button type="button" className="am-modal__close" onClick={close} aria-label="Close"><FaTimes /></button>
          </div>
        </div>

        {message && <div className={`he-msg he-msg--${message.type}`}>{message.text}</div>}

        <div className="he-body">
          {/* ── drawing ── */}
          <div className="he-stage">
            {!src ? (
              <div className="he-empty">This assembly has no drawing. Upload an image or PDF first.</div>
            ) : (
              <TransformWrapper minScale={1} maxScale={10} wheel={{ step: 0.15 }}
                doubleClick={{ disabled: true }} panning={{ excluded: ["he-hs"], velocityDisabled: true }}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="dv__toolbar">
                      <div className="dv__tools">
                        <button type="button" onClick={() => zoomOut()} title="Zoom out"><FaSearchMinus /></button>
                        <button type="button" onClick={() => zoomIn()} title="Zoom in"><FaSearchPlus /></button>
                        <button type="button" onClick={() => resetTransform()} title="Reset view"><FaUndo /></button>
                        {(info?.pageCount ?? 1) > 1 && (
                          <span className="dv__pages">
                            <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><FaChevronLeft /></button>
                            <span>Page {page}/{info?.pageCount}</span>
                            <button type="button" disabled={page >= (info?.pageCount ?? 1)} onClick={() => setPage(p => p + 1)}><FaChevronRight /></button>
                          </span>
                        )}
                      </div>
                      <div className="he-placing">
                        Placing: <strong>{activeLabel || "—"}</strong>
                      </div>
                    </div>
                    <TransformComponent wrapperClass="dv__viewport he-viewport" contentClass="dv__content">
                      <DrawingSurface
                        ref={overlayRef}
                        src={src}
                        page={page}
                        alt={assembly.assemblyName}
                        onInfo={setInfo}
                        onError={t => setMessage({ type: "err", text: t })}
                        overlayProps={{ onMouseDown: onOverlayMouseDown, onClick: onOverlayClick, className: "ds-overlay he-place" }}
                      >
                        {hotspots.map((h, i) => (h.pageNumber || 1) === page && (
                          <div
                            key={i}
                            className={`he-hs${i === selected ? " he-hs--sel" : ""}${normaliseLabel(h.label) === normaliseLabel(activeLabel) ? " he-hs--active" : ""}`}
                            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.width * 100}%`, height: `${h.height * 100}%` }}
                            onPointerDown={startDrag(i)}
                            title={`${h.label} — drag to move`}
                          >
                            <span className="he-hs__label">{h.label}</span>
                          </div>
                        ))}
                      </DrawingSurface>
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            )}
          </div>

          {/* ── side panel ── */}
          <aside className="he-side">
            {sel && (
              <div className="he-card he-card--sel">
                <div className="he-card__title">Selected hotspot: {sel.label}</div>
                <label className="he-range">
                  Size
                  <input type="range" min={0.01} max={0.15} step={0.0025} value={sel.width}
                    onChange={e => resizeSelected(+e.target.value)} />
                </label>
                <label className="he-field">
                  Image no.
                  <select value={sel.label} onChange={e => {
                    const v = e.target.value;
                    setHotspots(list => list.map((h, i) => i === selected ? { ...h, label: v } : h));
                    setDirty(true);
                  }}>
                    {labels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <button type="button" className="am-btn am-btn--danger am-btn--xs" onClick={removeSelected}>
                  <FaTrash /> Remove hotspot
                </button>
              </div>
            )}

            <div className="he-card">
              <div className="he-card__title">
                Image numbers
                <span className="he-progress">{partLabels.size - unmapped}/{partLabels.size} mapped</span>
              </div>
              <input className="he-filter" placeholder="Find image no.…" value={labelFilter}
                onChange={e => setLabelFilter(e.target.value)} />
              <div className="he-labels">
                {loading && <div className="he-muted">Loading…</div>}
                {!loading && labels.length === 0 && (
                  <div className="he-muted">No parts with an image number are linked to this assembly yet.</div>
                )}
                {visibleLabels.map(l => {
                  const n = countFor(l);
                  const ps = partLabels.get(l) ?? [];
                  return (
                    <button key={l} type="button"
                      className={`he-label${l === activeLabel ? " he-label--on" : ""}${n > 0 ? " he-label--done" : ""}`}
                      onClick={() => setActiveLabel(l)}
                      title={ps.map(p => `${p.partNumber} — ${p.partName}`).join("\n") || "Custom label"}>
                      <span className="he-label__no">{l}</span>
                      <span className="he-label__name">{ps[0]?.partName ?? "(custom)"}{ps.length > 1 ? ` +${ps.length - 1}` : ""}</span>
                      {n > 0 ? <FaCheckCircle className="he-label__ok" /> : <span className="he-label__todo">—</span>}
                    </button>
                  );
                })}
              </div>
              <div className="he-custom">
                <input placeholder="Other label (e.g. 17.9)" value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCustomLabel(); }} />
                <button type="button" className="am-btn am-btn--outline am-btn--xs" onClick={addCustomLabel}><FaPlus /></button>
              </div>
            </div>

            <div className="he-card he-help">
              <strong>Tip:</strong> the label must match the part's <em>Image Number</em> so customers
              see the right part when they click it. {hotspots.length} hotspot(s) on this drawing.
              {hotspots.length > 0 && (
                <button type="button" className="he-clear" onClick={() => {
                  if (window.confirm("Remove all hotspots from this drawing?")) { setHotspots([]); setSelected(null); setDirty(true); }
                }}>Remove all</button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const round = (v: number) => Math.round(v * 100000) / 100000;
