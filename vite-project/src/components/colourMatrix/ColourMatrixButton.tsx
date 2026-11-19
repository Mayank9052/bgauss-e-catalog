// ColourMatrixButton.tsx — "Colour Matrix" button for the catalogue pages.
// Lists the active colour matrices for the current model / variant / colour
// (whole-model matrices are included). One matrix → View + Download buttons;
// several → a menu. Nothing is shown when no matrix has been uploaded.
import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaDownload, FaFileExcel, FaFilePdf, FaTable } from "react-icons/fa";
import type { ColourMatrixInfo } from "./colourMatrixApi";
import { downloadColourMatrix, listColourMatrices, matrixScopeLabel } from "./colourMatrixApi";
import ColourMatrixViewer from "./ColourMatrixViewer";
import "./colourMatrix.css";

interface Props {
  modelId: number;
  variantId?: number;
  colourId?: number;
}

const FileIcon = ({ type }: { type: string }) => (type === "pdf" ? <FaFilePdf className="cmb__ico cmb__ico--pdf" /> : <FaFileExcel className="cmb__ico cmb__ico--xls" />);

export default function ColourMatrixButton({ modelId, variantId, colourId }: Props) {
  const [items, setItems] = useState<ColourMatrixInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<ColourMatrixInfo | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modelId) return;
    const ctrl = new AbortController();
    listColourMatrices({ modelId, variantId, colourId }, ctrl.signal)
      .then(setItems)
      .catch(() => { if (!ctrl.signal.aborted) setItems([]); });
    return () => ctrl.abort();
  }, [modelId, variantId, colourId]);

  // close the menu on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const download = async (m: ColourMatrixInfo) => {
    setBusyId(m.id); setError(null);
    try { await downloadColourMatrix(m); }
    catch { setError("Download failed. Please try again."); }
    finally { setBusyId(null); }
  };

  if (!items.length) return null;
  const single = items.length === 1 ? items[0] : null;

  return (
    <div className="cmb" ref={wrapRef}>
      {single ? (
        <div className="cmb__split">
          <button type="button" className="cmb__btn" onClick={() => setViewing(single)} title={`View ${single.title}`}>
            <FaTable /> Colour Matrix
          </button>
          <button type="button" className="cmb__btn cmb__btn--icon" onClick={() => void download(single)}
            disabled={busyId === single.id} title="Download colour matrix" aria-label="Download colour matrix">
            <FaDownload />
          </button>
        </div>
      ) : (
        <button type="button" className="cmb__btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu">
          <FaTable /> Colour Matrix <span className="cmb__count">{items.length}</span> <FaChevronDown className="cmb__chev" />
        </button>
      )}

      {open && !single && (
        <div className="cmb__menu" role="menu">
          {items.map(m => (
            <div key={m.id} className="cmb__item" role="menuitem">
              <FileIcon type={m.fileType} />
              <div className="cmb__item-text">
                <strong>{m.title}</strong>
                <span>{matrixScopeLabel(m)}</span>
              </div>
              <button type="button" className="cmb__mini" onClick={() => { setViewing(m); setOpen(false); }}>View</button>
              <button type="button" className="cmb__mini" onClick={() => void download(m)} disabled={busyId === m.id} aria-label={`Download ${m.title}`}><FaDownload /></button>
            </div>
          ))}
        </div>
      )}
      {error && <div className="cmb__error" role="alert">{error}</div>}
      {viewing && <ColourMatrixViewer matrix={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
