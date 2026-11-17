// CatalogueDownload.tsx — "Download PDF" button with scope choice + progress dialog.
// Scopes are supplied by the page (e.g. this assembly / this vehicle / complete catalogue).
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FaFilePdf, FaTimes, FaCheck } from "react-icons/fa";
import type { CatalogueData } from "./generateCataloguePdf";
import { errorMessage, formatDate } from "../../utils/media";
import "./catalogue.css";

export interface CatalogueScope {
  key: string;
  label: string;
  description: string;
  title: string;                                   // printed on the cover
  params: Record<string, number | undefined>;      // modelId / variantId / colourId / assemblyId
  heavy?: boolean;                                 // complete catalogue — images off by default
}

type Phase = "idle" | "fetching" | "building" | "done" | "error";

export default function CatalogueDownload({
  scopes, className = "", compact = false,
}: {
  scopes: CatalogueScope[];
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [scopeKey, setScopeKey] = useState(scopes[0]?.key ?? "");
  const scope = scopes.find(s => s.key === scopeKey) ?? scopes[0];
  const [drawings, setDrawings] = useState(!scope?.heavy);
  const [images, setImages]     = useState(!scope?.heavy);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 1, label: "" });
  const [error, setError]       = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // default image options per scope (re-applied only when the scope changes)
  const heavy = !!scope?.heavy;
  useEffect(() => {
    setDrawings(!heavy);
    setImages(!heavy);
  }, [scopeKey, heavy]);

  if (!scope) return null;

  const busy = phase === "fetching" || phase === "building";

  const start = async () => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(""); setPhase("fetching");
    setProgress({ done: 0, total: 1, label: "Collecting catalogue data…" });
    try {
      const params: Record<string, number> = {};
      Object.entries(scope.params).forEach(([k, v]) => { if (v != null && Number.isFinite(v)) params[k] = v; });
      const res = await axios.get<CatalogueData>("/catalogue/data", { params, signal: ctrl.signal });
      const data = res.data;
      if (!data?.groups?.length || data.groups.every(g => g.assemblies.length === 0)) {
        throw new Error("No active catalogue items were found for this selection.");
      }
      setPhase("building");
      const { generateCataloguePdf } = await import("./generateCataloguePdf");
      const blob = await generateCataloguePdf(data, {
        title: scope.title,
        scopeLabel: scope.label,
        includeDrawings: drawings,
        includePartImages: images,
        signal: ctrl.signal,
        onProgress: (done, total, label) => setProgress({ done, total, label }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BGAUSS_Catalogue_${scope.title.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${formatDate().replace(/\./g, "")}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setPhase("done");
    } catch (e) {
      if (ctrl.signal.aborted || (e as Error)?.name === "AbortError" || (e as Error)?.name === "CanceledError") {
        setPhase("idle");
        return;
      }
      setError(errorMessage(e, "The PDF could not be generated."));
      setPhase("error");
    }
  };

  const cancel = () => { abortRef.current?.abort(); setPhase("idle"); };
  const close  = () => { if (busy) cancel(); setOpen(false); setPhase("idle"); };

  const pct = Math.round((progress.done / Math.max(1, progress.total)) * 100);

  return (
    <>
      <button type="button" className={`cd-btn${compact ? " cd-btn--compact" : ""} ${className}`} onClick={() => setOpen(true)}
        title="Download the catalogue as a PDF">
        <FaFilePdf /> {compact ? "PDF" : "Download PDF"}
      </button>

      {open && createPortal(
        <div className="cd-overlay" onClick={e => { if (e.target === e.currentTarget && !busy) close(); }}>
          <div className="cd-modal" role="dialog" aria-label="Download catalogue PDF">
            <div className="cd-head">
              <h3><FaFilePdf /> Download catalogue PDF</h3>
              <button type="button" className="cd-x" onClick={close} aria-label="Close"><FaTimes /></button>
            </div>

            {phase === "idle" || phase === "error" ? (
              <>
                <div className="cd-scopes">
                  {scopes.map(s => (
                    <label key={s.key} className={`cd-scope${s.key === scopeKey ? " cd-scope--on" : ""}`}>
                      <input type="radio" name="cd-scope" checked={s.key === scopeKey} onChange={() => setScopeKey(s.key)} />
                      <span>
                        <strong>{s.label}</strong>
                        <small>{s.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="cd-opts">
                  <label><input type="checkbox" checked={drawings} onChange={e => setDrawings(e.target.checked)} /> Include assembly drawings</label>
                  <label><input type="checkbox" checked={images} onChange={e => setImages(e.target.checked)} /> Include individual part images</label>
                  {scope.heavy && (drawings || images) && (
                    <p className="cd-warn">The complete catalogue with images can take several minutes and produce a large file.</p>
                  )}
                </div>
                {phase === "error" && <div className="cd-error">{error}</div>}
                <div className="cd-foot">
                  <button type="button" className="cd-ghost" onClick={close}>Cancel</button>
                  <button type="button" className="cd-primary" onClick={() => void start()}><FaFilePdf /> Generate PDF</button>
                </div>
              </>
            ) : phase === "done" ? (
              <div className="cd-done">
                <div className="cd-done__icon"><FaCheck /></div>
                <p>Your catalogue PDF has been downloaded.</p>
                <div className="cd-foot">
                  <button type="button" className="cd-ghost" onClick={() => setPhase("idle")}>Download another</button>
                  <button type="button" className="cd-primary" onClick={close}>Close</button>
                </div>
              </div>
            ) : (
              <div className="cd-progress">
                <p className="cd-progress__label">{phase === "fetching" ? "Collecting catalogue data…" : progress.label}</p>
                <div className="cd-bar"><div className="cd-bar__fill" style={{ width: `${phase === "fetching" ? 4 : pct}%` }} /></div>
                <p className="cd-progress__pct">{phase === "fetching" ? "" : `${pct}%`}</p>
                <div className="cd-foot">
                  <button type="button" className="cd-ghost" onClick={cancel}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
