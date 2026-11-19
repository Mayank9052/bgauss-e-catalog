// ColourMatrixViewer.tsx — full-screen viewer for an uploaded colour matrix.
//  • Excel (.xlsx): drawn as a table from the server preview (cell colours, merged cells,
//    pictures inside cells), with sheet tabs, find (highlights matching cells) and zoom.
//  • PDF: shown in the browser's own PDF viewer.
//  • Download keeps the original file and file name.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaDownload, FaTimes, FaSearch, FaSearchMinus, FaSearchPlus, FaExpand } from "react-icons/fa";
import type { ColourMatrixInfo, PreviewCell, WorkbookPreview } from "./colourMatrixApi";
import { downloadColourMatrix, fetchCellImage, fetchFileBlob, fetchPreview, formatFileSize, matrixScopeLabel } from "./colourMatrixApi";
import { errorMessage, formatDate } from "../../utils/media";
import "./colourMatrix.css";

interface Props {
  matrix: ColourMatrixInfo;
  onClose: () => void;
}

export default function ColourMatrixViewer({ matrix, onClose }: Props) {
  const isPdf = matrix.fileType === "pdf";
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [images, setImages] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [find, setFind] = useState("");
  const [zoom, setZoom] = useState<number | null>(null);   // null = fit to width
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(0);

  // close on Esc, lock page scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // load content
  useEffect(() => {
    const ctrl = new AbortController();
    const urls: string[] = [];
    setError(null);
    (async () => {
      try {
        if (isPdf) {
          const blob = await fetchFileBlob(matrix.id, ctrl.signal);
          const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
          urls.push(url);
          setPdfUrl(url);
        } else {
          const p = await fetchPreview(matrix.id, ctrl.signal);
          setPreview(p);
          // pictures inside cells
          const wanted = new Set<number>();
          p.sheets?.forEach(s => s.rows?.forEach(r => r.cells?.forEach(c => { if (c?.image != null) wanted.add(c.image); })));
          for (const i of wanted) {
            try {
              const blob = await fetchCellImage(matrix.id, i, ctrl.signal);
              const url = URL.createObjectURL(blob);
              urls.push(url);
              setImages(prev => ({ ...prev, [i]: url }));
            } catch { /* a missing picture just leaves its cell empty */ }
          }
        }
      } catch (e) {
        if (!ctrl.signal.aborted) setError(errorMessage(e));
      }
    })();
    return () => { ctrl.abort(); urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [matrix.id, isPdf]);

  // measure available width for "fit"
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(e => setBodyWidth(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [preview, pdfUrl]);

  const sheets = preview?.sheets ?? [];
  const sheet = sheets[Math.min(sheetIdx, Math.max(0, sheets.length - 1))];
  const widths = sheet?.columnWidths ?? [];
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const fit = totalWidth > 0 && bodyWidth > 0 ? Math.min(1.25, Math.max(0.35, (bodyWidth - 24) / totalWidth)) : 1;
  const z = zoom ?? fit;

  const q = find.trim().toLowerCase();
  const matchCount = useMemo(() => {
    if (!q || !sheet) return 0;
    let n = 0;
    sheet.rows?.forEach(r => r.cells?.forEach(c => { if (c && !c.covered && c.text?.toLowerCase().includes(q)) n++; }));
    return n;
  }, [q, sheet]);

  // scroll the first match into view
  useEffect(() => {
    if (!q) return;
    const t = window.setTimeout(() => {
      bodyRef.current?.querySelector(".cmv-cell--hit")?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [q, sheetIdx]);

  const download = useCallback(async () => {
    setDownloading(true);
    try { await downloadColourMatrix(matrix); }
    catch (e) { setError(errorMessage(e)); }
    finally { setDownloading(false); }
  }, [matrix]);

  const cellStyle = (c: PreviewCell, height?: number): React.CSSProperties => ({
    background: c.bg,
    color: c.color,
    fontWeight: c.bold ? 700 : undefined,
    fontStyle: c.italic ? "italic" : undefined,
    fontSize: `${Math.max(7, (c.size ?? 11) * 1.333 * z)}px`,
    textAlign: c.align ?? (c.text && /^[\d.,-]+$/.test(c.text) ? "right" : "left"),
    verticalAlign: c.vAlign ?? "bottom",
    whiteSpace: c.wrap ? "normal" : "nowrap",
    height: height ? height * z : undefined,
  });

  const view = (
    <div className="cmv-overlay" role="dialog" aria-label={`Colour matrix — ${matrix.title}`}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmv">
        <header className="cmv__head">
          <div className="cmv__title">
            <strong>{matrix.title}</strong>
            <span>{matrixScopeLabel(matrix)} · {matrix.originalFileName} · {formatFileSize(matrix.fileSize)} · {formatDate(new Date(matrix.uploadedAt))}</span>
          </div>
          <div className="cmv__tools">
            {!isPdf && (
              <>
                <label className="cmv__find">
                  <FaSearch />
                  <input value={find} onChange={e => setFind(e.target.value)} placeholder="Find part no. or name…" aria-label="Find in colour matrix" />
                  {q && <span className="cmv__find-count">{matchCount} found</span>}
                  {find && <button type="button" onClick={() => setFind("")} aria-label="Clear"><FaTimes /></button>}
                </label>
                <button type="button" className="cmv__btn" title="Zoom out" onClick={() => setZoom(Math.max(0.35, +(z - 0.1).toFixed(2)))}><FaSearchMinus /></button>
                <span className="cmv__zoom">{Math.round(z * 100)}%</span>
                <button type="button" className="cmv__btn" title="Zoom in" onClick={() => setZoom(Math.min(2, +(z + 0.1).toFixed(2)))}><FaSearchPlus /></button>
                <button type="button" className={`cmv__btn${zoom == null ? " cmv__btn--on" : ""}`} title="Fit to width" onClick={() => setZoom(null)}><FaExpand /></button>
              </>
            )}
            <button type="button" className="cmv__btn cmv__btn--primary" onClick={download} disabled={downloading}>
              <FaDownload /> {downloading ? "Downloading…" : "Download"}
            </button>
            <button type="button" className="cmv__btn" onClick={onClose} title="Close (Esc)" aria-label="Close"><FaTimes /></button>
          </div>
        </header>

        {!isPdf && sheets.length > 1 && (
          <nav className="cmv__sheets" role="tablist">
            {sheets.map((s, i) => (
              <button key={s.name + i} role="tab" aria-selected={i === sheetIdx}
                className={`cmv__sheet${i === sheetIdx ? " cmv__sheet--on" : ""}`} onClick={() => setSheetIdx(i)}>{s.name}</button>
            ))}
          </nav>
        )}

        <div className="cmv__body" ref={bodyRef}>
          {error ? (
            <div className="cmv__msg cmv__msg--error">
              {error}
              <button type="button" className="cmv__btn cmv__btn--primary" onClick={download}><FaDownload /> Download the file instead</button>
            </div>
          ) : isPdf ? (
            pdfUrl ? <iframe className="cmv__pdf" src={pdfUrl} title={matrix.title} /> : <div className="cmv__msg"><span className="cmv__spinner" /> Loading PDF…</div>
          ) : !preview ? (
            <div className="cmv__msg"><span className="cmv__spinner" /> Loading colour matrix…</div>
          ) : !sheet || !(sheet.rows?.length) ? (
            <div className="cmv__msg">This workbook has no visible data.</div>
          ) : (
            <>
              <table className="cmv__table" style={{ width: totalWidth * z }}>
                <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w * z }} />)}</colgroup>
                <tbody>
                  {sheet.rows!.map(r => (
                    <tr key={r.index}>
                      {(r.cells ?? []).map((c, ci) => {
                        if (c?.covered) return null;
                        if (!c) return <td key={ci} className="cmv-cell" style={{ height: (r.height ?? 20) * z }} />;
                        const hit = !!q && !!c.text && c.text.toLowerCase().includes(q);
                        return (
                          <td key={ci} colSpan={c.colSpan ?? 1} rowSpan={c.rowSpan ?? 1}
                            className={`cmv-cell${hit ? " cmv-cell--hit" : ""}${c.image != null ? " cmv-cell--img" : ""}`}
                            style={cellStyle(c, c.rowSpan && c.rowSpan > 1 ? undefined : r.height)}>
                            {c.image != null
                              ? (images[c.image]
                                  ? <img src={images[c.image]} alt="" style={{ maxHeight: Math.max(24, (r.height ?? 60) * z - 6) }} />
                                  : <span className="cmv__spinner cmv__spinner--sm" />)
                              : c.text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sheet.truncated && <p className="cmv__note">Only the first 1,000 rows are shown. Download the file to see everything.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(view, document.body);
}
