// AdminModules.tsx — Module Manager for Models, Variants, Colours, Assemblies and Parts
//
// Every tab has: live search (with clear), column sorting (asc → desc → off),
// Excel-style checkbox filters, Active/Inactive status with quick filter,
// pagination, friendly empty states. Parts have an Individual Part Image column,
// assemblies have a "Map part numbers" tool for clickable drawings.
// Inactive records are never deleted — they are only hidden from the customer catalogue.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.jpg";
import { getRoleFromToken } from "./auth";
import AccountMenu from "./components/AccountMenu";
import "./adminModules.css";

import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaPlus, FaEdit, FaTrash,
  FaDownload, FaUpload, FaTimes, FaCheck, FaExclamationTriangle,
  FaImage, FaMapMarkerAlt, FaChevronDown, FaInfoCircle,
} from "react-icons/fa";

import { useTableState } from "./components/table/useTableState";
import type { ColumnDef } from "./components/table/useTableState";
import { HeaderCell, TableToolbar, Pagination, EmptyRow, StatusToggle } from "./components/table/DataTable";
import { PartImageThumb } from "./components/PartImageThumb";
import HotspotEditor from "./components/drawing/HotspotEditor";
import { errorMessage, resolveMediaUrl } from "./utils/media";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
interface VehicleModel   { id?: number; modelName: string; isActive?: boolean; }
interface VehicleVariant { id?: number; variantName: string; modelId: number; isActive?: boolean; }
interface VehicleColour  { id?: number; colourName: string; modelId: number | null; variantId: number | null; imagePath: string; isActive?: boolean; }

interface Assembly {
  id?: number;
  assemblyName: string;
  imagePath: string;
  modelId: number;
  variantId?: number | null;
  isActive?: boolean;
  hotspotCount?: number;
}

interface Part {
  id?: number; partNumber: string; partName: string; description: string;
  remarks: string; price: number; bdp: number; mrp: number; taxPercent: number;
  stockQuantity: string; assemblyId: number | null; modelId: number | null;
  variantId: number | null; colourIds: string; torqueNm: number; imageNumber: string;
  isActive?: boolean;
  partImagePath?: string;
}

type ActiveTab = "models" | "variants" | "colours" | "assemblies" | "parts";
type StatusEntity = "VehicleModels" | "VehicleVariants" | "VehicleColours" | "Assemblies" | "Parts";

const statusText = (active?: boolean) => (active === false ? "Inactive" : "Active");
const ADMIN_PARAMS = { params: { includeInactive: true } };

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
interface ToastItem { id: number; msg: string; type: "success" | "error" | "info"; }

function ToastContainer({ toasts, remove }: { toasts: ToastItem[]; remove: (id: number) => void }) {
  return (
    <div className="am-toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`am-toast am-toast--${t.type}`}>
          <span className="am-toast__icon">
            {t.type === "success" ? <FaCheck /> : t.type === "info" ? <FaInfoCircle /> : <FaExclamationTriangle />}
          </span>
          <span className="am-toast__msg">{t.msg}</span>
          <button className="am-toast__close" onClick={() => remove(t.id)} aria-label="Dismiss"><FaTimes /></button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════ */
function ConfirmDialog({ msg, confirmLabel = "Yes, Delete", danger = true, onYes, onNo }: {
  msg: string; confirmLabel?: string; danger?: boolean; onYes: () => void; onNo: () => void;
}) {
  return (
    <div className="am-confirm-overlay">
      <div className="am-confirm-box" role="alertdialog" aria-label="Confirm">
        <div className="am-confirm-icon"><FaExclamationTriangle /></div>
        <p className="am-confirm-msg">{msg}</p>
        <div className="am-confirm-actions">
          <button className={`am-btn ${danger ? "am-btn--danger" : "am-btn--primary"}`} onClick={onYes}>{confirmLabel}</button>
          <button className="am-btn am-btn--ghost" onClick={onNo}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FIELD + SELECT helpers
═══════════════════════════════════════════════════ */
function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="am-field">
      <label className="am-field__label">{label}</label>
      <input className="am-field__input" type={type} value={value}
        placeholder={placeholder ?? label}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, disabled, hint }: {
  label: string; value: number | string; onChange: (v: string) => void;
  options: { id: number | string; label: string }[]; placeholder?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div className="am-field">
      <label className="am-field__label">{label}</label>
      <select className="am-field__select" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder ?? `-- ${label} --`}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {hint && <span className="am-field__hint">{hint}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COLOUR PICKER (multi-select, dependent on model/variant)
═══════════════════════════════════════════════════ */
function ColourPicker({ label, value, onChange, colours, disabled }: {
  label: string;
  value: string;                       // CSV of ids
  onChange: (csv: string) => void;
  colours: VehicleColour[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = new Set(value.split(",").map(s => s.trim()).filter(Boolean));

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(Array.from(next).join(","));
  };

  const names = colours.filter(c => selected.has(String(c.id))).map(c => c.colourName);
  const stale = Array.from(selected).filter(id => !colours.some(c => String(c.id) === id));

  return (
    <div className="am-field am-colour-field" ref={ref}>
      <label className="am-field__label">{label}</label>
      <button type="button" className="am-field__select am-colour-trigger" disabled={disabled} onClick={() => setOpen(o => !o)}>
        <span className="am-ellipsis">
          {names.length ? names.join(", ") : stale.length ? `${stale.length} colour(s) not valid here` : "All colours (common part)"}
        </span>
        <FaChevronDown />
      </button>
      {open && (
        <div className="am-colour-menu">
          {colours.length === 0 && <div className="am-colour-empty">No colours defined for this model / variant.</div>}
          {colours.map(c => (
            <label key={c.id} className="am-colour-item">
              <input type="checkbox" checked={selected.has(String(c.id))} onChange={() => toggle(String(c.id))} />
              <span>{c.colourName}</span>
              {c.isActive === false && <span className="am-tag am-tag--muted">inactive</span>}
            </label>
          ))}
          {selected.size > 0 && (
            <button type="button" className="am-colour-clear" onClick={() => onChange("")}>Clear (applies to all colours)</button>
          )}
        </div>
      )}
      {stale.length > 0 && <span className="am-field__hint am-field__hint--warn">Invalid colour selection — please re-select.</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   IMAGE UPLOAD FIELD
═══════════════════════════════════════════════════ */
async function uploadFile(file: File, uploadUrl: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await axios.post<{ path: string }>(uploadUrl, fd, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data.path;
}

function ImageUploadField({ label, value, onChange, accept = "image/*", uploadUrl = "/upload/image", onError }: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  accept?: string;
  uploadUrl?: string;
  onError?: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const resolvedPreview = resolveMediaUrl(value);
  const isPdf = value?.toLowerCase().endsWith(".pdf");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
    setUploading(true);
    try {
      onChange(await uploadFile(file, uploadUrl));
    } catch (err) {
      const msg = "Upload failed: " + errorMessage(err);
      if (onError) onError(msg); else alert(msg);
      setPreviewUrl("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const displayPreview = previewUrl || (!isPdf ? resolvedPreview : "");

  return (
    <div className="am-field">
      <label className="am-field__label">{label}</label>
      <div className="am-img-upload-box" onClick={() => !uploading && fileRef.current?.click()}>
        {isPdf && !uploading ? (
          <div className="am-img-upload-placeholder" style={{ gap: 6 }}>
            <span style={{ fontSize: 32 }}>📄</span>
            <span className="am-img-upload-text" style={{ color: "#dc2626", fontWeight: 700 }}>PDF uploaded</span>
            <span className="am-img-upload-hint" style={{ wordBreak: "break-all", textAlign: "center", padding: "0 8px" }}>
              {value.length > 50 ? "…" + value.slice(-47) : value}
            </span>
            <span className="am-img-upload-hint">Click to replace</span>
          </div>
        ) : displayPreview ? (
          <div className="am-img-upload-preview">
            <img src={displayPreview} alt="preview" className="am-img-thumb"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="am-img-upload-overlay">
              <FaImage />
              <span>{uploading ? "Uploading…" : "Change"}</span>
            </div>
          </div>
        ) : (
          <div className="am-img-upload-placeholder">
            <FaImage className="am-img-upload-icon" />
            <span className="am-img-upload-text">{uploading ? "Uploading…" : "Click to upload"}</span>
            <span className="am-img-upload-hint">{accept.includes(".pdf") ? "JPG, PNG, WebP, PDF" : "JPG, PNG, WebP"}</span>
          </div>
        )}
        {value && !uploading && (
          <div className="am-img-path-display" title={value}>
            {isPdf ? "📄" : "📁"} {value.length > 40 ? "…" + value.slice(-37) : value}
          </div>
        )}
      </div>
      {value && !uploading && (
        <button type="button" className="am-btn am-btn--ghost am-btn--xs"
          style={{ marginTop: 4, width: "100%" }}
          onClick={e => { e.stopPropagation(); onChange(""); setPreviewUrl(""); }}>
          <FaTimes /> Clear
        </button>
      )}
      <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INLINE IMAGE UPLOAD
═══════════════════════════════════════════════════ */
function InlineImageUpload({ value, onChange, accept = "image/*", uploadUrl = "/upload/image", onError }: {
  value: string;
  onChange: (path: string) => void;
  accept?: string;
  uploadUrl?: string;
  onError?: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const resolvedPreview = resolveMediaUrl(value);
  const isPdf = value?.toLowerCase().endsWith(".pdf");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadFile(file, uploadUrl));
    } catch (err) {
      const msg = "Upload failed: " + errorMessage(err);
      if (onError) onError(msg); else alert(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="am-inline-img-wrap">
      {isPdf ? (
        <span title={value} style={{ fontSize: 20, cursor: "default" }}>📄</span>
      ) : resolvedPreview ? (
        <img src={resolvedPreview} alt="img" className="am-inline-img-thumb"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : null}
      <button type="button" className="am-btn am-btn--outline am-btn--xs"
        disabled={uploading} onClick={() => fileRef.current?.click()} title="Upload file">
        <FaImage /> {uploading ? "…" : (value ? "Change" : "Upload")}
      </button>
      {value && (
        <button type="button" className="am-btn am-btn--ghost am-btn--xs" onClick={() => onChange("")} title="Clear">
          <FaTimes />
        </button>
      )}
      <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DOWNLOAD / IMPORT
═══════════════════════════════════════════════════ */
async function downloadTemplate(apiUrl: string, fileName: string): Promise<void> {
  const response = await axios.get(apiUrl, { responseType: "blob" });
  const contentType = response.headers["content-type"] ?? "";
  if (String(contentType).includes("text/html")) throw new Error("Server returned HTML. Check API routing.");
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ImportRow({ downloadUrl, importUrl, onDone, entity, fileName, ok, err }: {
  downloadUrl: string; importUrl: string; onDone: () => void; entity: string; fileName: string;
  ok: (m: string) => void; err: (m: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadTemplate(downloadUrl, fileName); }
    catch (e) { err("Download failed: " + errorMessage(e)); }
    finally { setDownloading(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(importUrl, fd, { headers: { "Content-Type": "multipart/form-data" } });
      ok(typeof res.data === "string" ? res.data : "Import successful.");
      onDone();
    } catch (error) {
      err("Import failed: " + errorMessage(error));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="am-import-row">
      <button className="am-btn am-btn--outline am-btn--sm" disabled={downloading} onClick={() => void handleDownload()}>
        <FaDownload /> {downloading ? "Downloading…" : `Download ${entity} Template`}
      </button>
      <button className="am-btn am-btn--primary am-btn--sm" disabled={busy} onClick={() => ref.current?.click()}>
        <FaUpload /> {busy ? "Importing…" : `Import ${entity} Excel`}
      </button>
      <input ref={ref} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleImport} />
    </div>
  );
}

function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "items", "value", "result", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

const LoadingRow = ({ colSpan }: { colSpan: number }) => (
  <tr><td colSpan={colSpan} className="am-loading-cell"><span className="am-spinner" /> Loading…</td></tr>
);

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const AdminModules = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("models");

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const addToast = useCallback((msg: string, type: ToastItem["type"]) => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), type === "error" ? 6000 : 3800);
  }, []);
  const ok   = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
  const err  = useCallback((msg: string) => addToast(msg, "error"),   [addToast]);
  const info = useCallback((msg: string) => addToast(msg, "info"),    [addToast]);

  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);
  const ask = (msg: string, fn: () => void) => setConfirm({ msg, fn });

  /* ═══════════ STATE ═══════════ */
  const [loading, setLoading] = useState<Record<ActiveTab, boolean>>({
    models: true, variants: true, colours: true, assemblies: true, parts: true,
  });
  const setLoaded = (k: ActiveTab) => setLoading(p => ({ ...p, [k]: false }));
  const [statusBusy, setStatusBusy] = useState<Record<string, boolean>>({});

  const [models,      setModels]      = useState<VehicleModel[]>([]);
  const [modelForm,   setModelForm]   = useState({ modelName: "" });
  const [editModel,   setEditModel]   = useState<VehicleModel | null>(null);

  const [variants,      setVariants]      = useState<VehicleVariant[]>([]);
  const [variantForm,   setVariantForm]   = useState({ variantName: "", modelId: 0 });
  const [editVariant,   setEditVariant]   = useState<VehicleVariant | null>(null);

  const [colours,      setColours]      = useState<VehicleColour[]>([]);
  const [colourForm,   setColourForm]   = useState({ colourName: "", modelId: 0, variantId: 0, imagePath: "" });
  const [editColour,   setEditColour]   = useState<VehicleColour | null>(null);

  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [asmForm,    setAsmForm]    = useState({ assemblyName: "", imagePath: "", modelId: 0, variantId: 0 });
  const [editAsm,    setEditAsm]    = useState<Assembly | null>(null);
  const [mapAsm,     setMapAsm]     = useState<Assembly | null>(null);

  const blankPart = (): Part => ({
    partNumber: "", partName: "", description: "", remarks: "",
    price: 0, bdp: 0, mrp: 0, taxPercent: 0, stockQuantity: "",
    assemblyId: null, modelId: null, variantId: null,
    colourIds: "", torqueNm: 0, imageNumber: "", partImagePath: "",
  });
  const [parts,        setParts]        = useState<Part[]>([]);
  const [partForm,     setPartForm]     = useState<Part>(blankPart());
  const [editPart,     setEditPart]     = useState<Part | null>(null);
  const [showPartForm, setShowPartForm] = useState(false);

  /* ═══════════ AUTH ═══════════ */
  useEffect(() => {
    const role = getRoleFromToken();
    if (!role) navigate("/", { replace: true });
    else if (role !== "Admin") navigate("/dashboard", { replace: true });
  }, [navigate]);

  /* ═══════════ FETCH (admin sees active + inactive) ═══════════ */
  const fetchModels = useCallback(async () => {
    try { const r = await axios.get("/VehicleModels", ADMIN_PARAMS); setModels(safeArray<VehicleModel>(r.data)); }
    catch { err("Failed to load models"); }
    finally { setLoaded("models"); }
  }, [err]);

  const fetchVariants = useCallback(async () => {
    try { const r = await axios.get("/VehicleVariants", ADMIN_PARAMS); setVariants(safeArray<VehicleVariant>(r.data)); }
    catch { err("Failed to load variants"); }
    finally { setLoaded("variants"); }
  }, [err]);

  const fetchColours = useCallback(async () => {
    try { const r = await axios.get("/VehicleColours", ADMIN_PARAMS); setColours(safeArray<VehicleColour>(r.data)); }
    catch { err("Failed to load colours"); }
    finally { setLoaded("colours"); }
  }, [err]);

  const fetchAssemblies = useCallback(async () => {
    try { const r = await axios.get("/Assemblies", ADMIN_PARAMS); setAssemblies(safeArray<Assembly>(r.data)); }
    catch { err("Failed to load assemblies"); }
    finally { setLoaded("assemblies"); }
  }, [err]);

  const fetchParts = useCallback(async () => {
    try { const r = await axios.get("/Parts", ADMIN_PARAMS); setParts(safeArray<Part>(r.data)); }
    catch { err("Failed to load parts"); }
    finally { setLoaded("parts"); }
  }, [err]);

  useEffect(() => {
    void fetchModels(); void fetchVariants(); void fetchColours(); void fetchAssemblies(); void fetchParts();
  }, [fetchModels, fetchVariants, fetchColours, fetchAssemblies, fetchParts]);

  /* ═══════════ LOOKUPS ═══════════ */
  const modelById   = useMemo(() => new Map(models.map(m => [m.id!, m])), [models]);
  const variantById = useMemo(() => new Map(variants.map(v => [v.id!, v])), [variants]);
  const asmById     = useMemo(() => new Map(assemblies.map(a => [a.id!, a])), [assemblies]);
  const colourById  = useMemo(() => new Map(colours.map(c => [c.id!, c])), [colours]);
  const variantCountByModel = useMemo(() => {
    const m = new Map<number, number>();
    variants.forEach(v => m.set(v.modelId, (m.get(v.modelId) ?? 0) + 1));
    return m;
  }, [variants]);

  const modelName   = useCallback((id: number | null | undefined) => (id != null && modelById.get(id)?.modelName) || "—", [modelById]);
  const variantName = useCallback((id: number | null | undefined) => (id != null && variantById.get(id)?.variantName) || "—", [variantById]);
  const asmName     = useCallback((id: number | null | undefined) => (id != null && asmById.get(id)?.assemblyName) || "—", [asmById]);
  const colourNames = useCallback((csv: string) => csv.split(",").map(s => +s).filter(Boolean)
    .map(id => colourById.get(id)?.colourName ?? `#${id}`).join(", "), [colourById]);

  const inactiveSuffix = (a?: boolean) => (a === false ? " (inactive)" : "");

  /* ═══════════ STATUS ═══════════ */
  const applyStatus = (entity: StatusEntity, id: number, v: boolean) => {
    const upd = <T extends { id?: number; isActive?: boolean }>(l: T[]) => l.map(x => x.id === id ? { ...x, isActive: v } : x);
    if (entity === "VehicleModels") setModels(upd);
    else if (entity === "VehicleVariants") setVariants(upd);
    else if (entity === "VehicleColours") setColours(upd);
    else if (entity === "Assemblies") setAssemblies(upd);
    else setParts(upd);
  };
  const ENTITY_LABEL: Record<StatusEntity, string> = {
    VehicleModels: "Model", VehicleVariants: "Variant", VehicleColours: "Colour", Assemblies: "Assembly", Parts: "Part",
  };
  const CASCADE_NOTE: Partial<Record<StatusEntity, string>> = {
    VehicleModels:   "Its variants, colours, assemblies and parts are hidden from the customer catalogue while it is inactive.",
    VehicleVariants: "Its colours and variant-specific assemblies are hidden from the customer catalogue while it is inactive.",
    Assemblies:      "Its parts are hidden from the customer catalogue while it is inactive.",
  };

  const setStatus = async (entity: StatusEntity, id: number, next: boolean) => {
    const key = `${entity}:${id}`;
    setStatusBusy(b => ({ ...b, [key]: true }));
    applyStatus(entity, id, next);                         // optimistic
    try {
      await axios.patch(`/${entity}/${id}/status`, { isActive: next });
      ok(`${ENTITY_LABEL[entity]} ${next ? "activated" : "deactivated"}`);
      const note = CASCADE_NOTE[entity];
      if (!next && note) info(note);
    } catch (e) {
      applyStatus(entity, id, !next);                      // rollback
      err(`Status not saved: ${errorMessage(e)}`);
    } finally {
      setStatusBusy(b => { const n = { ...b }; delete n[key]; return n; });
    }
  };

  const statusCell = (entity: StatusEntity, id: number | undefined, active?: boolean) => (
    <StatusToggle active={active !== false} busy={!!statusBusy[`${entity}:${id}`]}
      onChange={nv => { if (id != null) void setStatus(entity, id, nv); }} />
  );

  /* ═══════════ MODEL CRUD ═══════════ */
  const createModel = async () => {
    if (!modelForm.modelName.trim()) return err("Model name is required");
    try {
      await axios.post("/VehicleModels", { modelName: modelForm.modelName.trim() });
      setModelForm({ modelName: "" }); void fetchModels(); ok("Model created successfully");
    } catch (e) { err(errorMessage(e)); }
  };
  const saveModel = async () => {
    if (!editModel?.id) { err("No model selected for update"); return; }
    if (!editModel.modelName.trim()) return err("Model name is required");
    try {
      await axios.put(`/VehicleModels/${editModel.id}`, editModel);
      setEditModel(null); void fetchModels(); ok("Model updated successfully");
    } catch (e) { err(errorMessage(e)); }
  };
  const deleteModel = (id: number) => ask("Delete this model permanently? Tip: set it Inactive instead to hide it from the catalogue but keep its history.", async () => {
    try { await axios.delete(`/VehicleModels/${id}`); void fetchModels(); ok("Model deleted"); }
    catch (e) { err(errorMessage(e)); }
    finally { setConfirm(null); }
  });

  /* ═══════════ VARIANT CRUD ═══════════ */
  const createVariant = async () => {
    if (!variantForm.variantName.trim() || !variantForm.modelId) return err("Variant name and model are required");
    try {
      await axios.post("/VehicleVariants", { ...variantForm, variantName: variantForm.variantName.trim() });
      setVariantForm({ variantName: "", modelId: 0 }); void fetchVariants(); ok("Variant created successfully");
    } catch (e) { err(errorMessage(e)); }
  };
  const saveVariant = async () => {
    if (!editVariant) return;
    if (!editVariant.variantName?.trim() || !editVariant.modelId) return err("Variant name and model are required");
    try {
      await axios.put(`/VehicleVariants/${editVariant.id}`, editVariant);
      setEditVariant(null); void fetchVariants(); ok("Variant updated");
    } catch (e) { err(errorMessage(e)); }
  };
  const deleteVariant = (id: number) => ask("Delete this variant permanently? Tip: set it Inactive instead to keep its history.", async () => {
    try { await axios.delete(`/VehicleVariants/${id}`); void fetchVariants(); ok("Variant deleted"); }
    catch (e) { err(errorMessage(e)); }
    finally { setConfirm(null); }
  });

  /* ═══════════ COLOUR CRUD ═══════════ */
  const createColour = async () => {
    if (!colourForm.colourName.trim()) return err("Colour name is required");
    if (colourForm.variantId && !colourForm.modelId) return err("Select a model before selecting a variant");
    try {
      await axios.post("/VehicleColours", {
        ...colourForm,
        colourName: colourForm.colourName.trim(),
        modelId:   colourForm.modelId   || null,
        variantId: colourForm.variantId || null,
      });
      setColourForm({ colourName: "", modelId: 0, variantId: 0, imagePath: "" });
      void fetchColours(); ok("Colour created successfully");
    } catch (e) { err(errorMessage(e)); }
  };
  const saveColour = async () => {
    if (!editColour) return;
    if (!editColour.colourName?.trim()) return err("Colour name is required");
    if (editColour.variantId && !editColour.modelId) return err("Select a model before selecting a variant");
    try {
      await axios.put(`/VehicleColours/${editColour.id}`, editColour);
      setEditColour(null); void fetchColours(); ok("Colour updated");
    } catch (e) { err(errorMessage(e)); }
  };
  const deleteColour = (id: number) => ask("Delete this colour permanently? Tip: set it Inactive instead to keep its history.", async () => {
    try { await axios.delete(`/VehicleColours/${id}`); void fetchColours(); ok("Colour deleted"); }
    catch (e) { err(errorMessage(e)); }
    finally { setConfirm(null); }
  });

  /* ═══════════ ASSEMBLY CRUD ═══════════ */
  const createAssembly = async () => {
    if (!asmForm.assemblyName.trim() || !asmForm.modelId) return err("Assembly name and model are required");
    try {
      await axios.post("/Assemblies", { ...asmForm, assemblyName: asmForm.assemblyName.trim(), variantId: asmForm.variantId || null });
      setAsmForm({ assemblyName: "", imagePath: "", modelId: 0, variantId: 0 });
      void fetchAssemblies(); ok("Assembly created successfully");
    } catch (e) { err(errorMessage(e)); }
  };

  const saveAssembly = async () => {
    if (!editAsm) return;
    if (!editAsm.assemblyName?.trim() || !editAsm.modelId) return err("Assembly name and model are required");
    try {
      await axios.put(`/Assemblies/${editAsm.id}`, { ...editAsm, variantId: editAsm.variantId || null });
      setEditAsm(null); void fetchAssemblies(); ok("Assembly updated");
    } catch (e) { err(errorMessage(e)); }
  };

  const deleteAssembly = (id: number) => ask("Delete this assembly permanently (including its part-number map)? Tip: set it Inactive instead to keep its history.", async () => {
    try { await axios.delete(`/Assemblies/${id}`); void fetchAssemblies(); ok("Assembly deleted"); }
    catch (e) { err(errorMessage(e)); }
    finally { setConfirm(null); }
  });

  /* ═══════════ PART CRUD ═══════════ */
  const savePartImage = async (id: number, path: string) => {
    await axios.put(`/Parts/${id}/image`, { imagePath: path });
    setParts(l => l.map(p => p.id === id ? { ...p, partImagePath: path } : p));
  };

  const partBody = (p: Part) => {
    const body: Record<string, unknown> = { ...p, partNumber: p.partNumber.trim() };
    delete body.partImagePath;
    delete body.isActive;
    return body;
  };

  const createPart = async () => {
    if (!partForm.partNumber.trim()) return err("Part number is required");
    try {
      const res = await axios.post<{ id?: number }>("/Parts", partBody(partForm));
      const newId = res.data?.id;
      if (newId && partForm.partImagePath) {
        try { await savePartImage(newId, partForm.partImagePath); }
        catch (e) { err("Part saved, but the image could not be linked: " + errorMessage(e)); }
      }
      setPartForm(blankPart()); setShowPartForm(false); void fetchParts(); ok("Part created successfully");
    } catch (e) { err(errorMessage(e)); }
  };
  const savePart = async () => {
    if (!editPart) return;
    if (!editPart.partNumber?.trim()) return err("Part number is required");
    try {
      await axios.put(`/Parts/${editPart.id}`, partBody(editPart));
      setEditPart(null); void fetchParts(); ok("Part updated");
    } catch (e) { err(errorMessage(e)); }
  };
  const deletePart = (id: number) => ask("Delete this part permanently? Tip: set it Inactive instead to keep order history intact.", async () => {
    try { await axios.delete(`/Parts/${id}`); void fetchParts(); ok("Part deleted"); }
    catch (e) { err(errorMessage(e)); }
    finally { setConfirm(null); }
  });

  /* ═══════════ DEPENDENT OPTIONS (Model → Variant → Colour → Assembly) ═══════════ */
  const modelOpts = models.map(m => ({ id: m.id!, label: m.modelName + inactiveSuffix(m.isActive) }));
  const variantOptsFor = (modelId: number | null | undefined) =>
    variants.filter(v => v.modelId === (modelId ?? -1)).map(v => ({ id: v.id!, label: v.variantName + inactiveSuffix(v.isActive) }));
  const asmOptsFor = (modelId: number | null | undefined, variantId: number | null | undefined) =>
    assemblies
      .filter(a => a.modelId === (modelId ?? -1) && (!variantId || !a.variantId || a.variantId === variantId))
      .map(a => ({ id: a.id!, label: `${a.assemblyName}${a.variantId ? ` · ${variantName(a.variantId)}` : ""}${inactiveSuffix(a.isActive)}` }));
  const coloursFor = (modelId: number | null | undefined, variantId: number | null | undefined) =>
    colours.filter(c => (c.modelId == null || c.modelId === modelId) && (c.variantId == null || !variantId || c.variantId === variantId));

  /* ═══════════ TABLE COLUMNS + STATE ═══════════ */
  const modelCols = useMemo<ColumnDef<VehicleModel>[]>(() => [
    { key: "id", label: "ID", value: r => r.id, type: "number" },
    { key: "name", label: "Model Name", value: r => r.modelName, filterable: true },
    { key: "variants", label: "Variants", value: r => variantCountByModel.get(r.id ?? -1) ?? 0, type: "number", searchable: false },
    { key: "status", label: "Status", value: r => statusText(r.isActive), filterable: true },
  ], [variantCountByModel]);
  const modelTable = useTableState(models, modelCols, { initialSort: { key: "name", dir: "asc" } });

  const variantCols = useMemo<ColumnDef<VehicleVariant>[]>(() => [
    { key: "id", label: "ID", value: r => r.id, type: "number" },
    { key: "name", label: "Variant Name", value: r => r.variantName, filterable: true },
    { key: "model", label: "Model", value: r => modelName(r.modelId), filterable: true },
    { key: "status", label: "Status", value: r => statusText(r.isActive), filterable: true },
  ], [modelName]);
  const variantTable = useTableState(variants, variantCols, { initialSort: { key: "model", dir: "asc" } });

  const colourCols = useMemo<ColumnDef<VehicleColour>[]>(() => [
    { key: "id", label: "ID", value: r => r.id, type: "number" },
    { key: "name", label: "Colour Name", value: r => r.colourName, filterable: true },
    { key: "model", label: "Model", value: r => (r.modelId ? modelName(r.modelId) : "All Models"), filterable: true },
    { key: "variant", label: "Variant", value: r => (r.variantId ? variantName(r.variantId) : "All Variants"), filterable: true },
    { key: "image", label: "Image", value: r => (r.imagePath ? "Has image" : "No image"), filterable: true, sortable: false, searchable: false },
    { key: "status", label: "Status", value: r => statusText(r.isActive), filterable: true },
  ], [modelName, variantName]);
  const colourTable = useTableState(colours, colourCols, { initialSort: { key: "model", dir: "asc" } });

  const asmCols = useMemo<ColumnDef<Assembly>[]>(() => [
    { key: "id", label: "ID", value: r => r.id, type: "number" },
    { key: "name", label: "Assembly Name", value: r => r.assemblyName, filterable: true },
    { key: "model", label: "Model", value: r => modelName(r.modelId), filterable: true },
    { key: "variant", label: "Variant", value: r => (r.variantId ? variantName(r.variantId) : "All Variants"), filterable: true },
    { key: "file", label: "Image / PDF", value: r => (!r.imagePath ? "None" : r.imagePath.toLowerCase().endsWith(".pdf") ? "PDF" : "Image"), filterable: true, searchable: false },
    { key: "hotspots", label: "Part Map", value: r => r.hotspotCount ?? 0, filterText: r => ((r.hotspotCount ?? 0) > 0 ? "Mapped" : "Not mapped"), type: "number", filterable: true, searchable: false },
    { key: "status", label: "Status", value: r => statusText(r.isActive), filterable: true },
  ], [modelName, variantName]);
  const asmTable = useTableState(assemblies, asmCols, { initialSort: { key: "name", dir: "asc" } });

  const partCols = useMemo<ColumnDef<Part>[]>(() => [
    { key: "id", label: "ID", value: r => r.id, type: "number" },
    { key: "pic", label: "Image", value: r => (r.partImagePath ? 1 : 0), filterText: r => (r.partImagePath ? "Has image" : "No image"), type: "number", filterable: true, searchable: false },
    { key: "img", label: "Img#", value: r => r.imageNumber, filterable: true },
    { key: "pn", label: "Part #", value: r => r.partNumber, filterable: true },
    { key: "name", label: "Name", value: r => r.partName, filterable: true },
    { key: "desc", label: "Desc", value: r => r.description },
    { key: "bdp", label: "BDP", value: r => r.bdp, type: "number", filterable: true, searchable: false },
    { key: "mrp", label: "MRP", value: r => r.mrp, type: "number", filterable: true, searchable: false },
    { key: "tax", label: "Tax%", value: r => r.taxPercent, type: "number", filterable: true, searchable: false },
    { key: "stock", label: "Stock", value: r => (r.stockQuantity === "" || r.stockQuantity == null ? null : Number(r.stockQuantity)), type: "number", filterable: true, searchable: false },
    { key: "model", label: "Model", value: r => modelName(r.modelId), filterable: true },
    { key: "variant", label: "Variant", value: r => variantName(r.variantId), filterable: true },
    { key: "colour", label: "Colour", value: r => colourNames(r.colourIds || "") || "All", filterable: true },
    { key: "asm", label: "Assembly", value: r => asmName(r.assemblyId), filterable: true },
    { key: "torque", label: "Torque", value: r => r.torqueNm || null, type: "number", searchable: false },
    { key: "price", label: "Price", value: r => r.price || null, type: "number", searchable: false },
    { key: "status", label: "Status", value: r => statusText(r.isActive), filterable: true },
  ], [modelName, variantName, asmName, colourNames]);
  const partTable = useTableState(parts, partCols, { pageSize: 50 });

  const counts = {
    models:     { all: models.length,     active: models.filter(x => x.isActive !== false).length },
    variants:   { all: variants.length,   active: variants.filter(x => x.isActive !== false).length },
    colours:    { all: colours.length,    active: colours.filter(x => x.isActive !== false).length },
    assemblies: { all: assemblies.length, active: assemblies.filter(x => x.isActive !== false).length },
    parts:      { all: parts.length,      active: parts.filter(x => x.isActive !== false).length },
  };

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: "models",     label: "Models"     },
    { key: "variants",   label: "Variants"   },
    { key: "colours",    label: "Colours"    },
    { key: "assemblies", label: "Assemblies" },
    { key: "parts",      label: "Parts"      },
  ];

  const ASSEMBLY_ACCEPT = "image/*,.pdf";
  const PART_IMAGE_UPLOAD = "/upload/image?folder=parts";
  const rowClass = (active?: boolean, extra = "") => [active === false ? "dt-row--inactive" : "", extra].filter(Boolean).join(" ");

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="am-shell">
      <ToastContainer toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />
      {confirm && <ConfirmDialog msg={confirm.msg} onYes={confirm.fn} onNo={() => setConfirm(null)} />}
      {mapAsm && mapAsm.id != null && (
        <HotspotEditor
          assembly={{ id: mapAsm.id, assemblyName: mapAsm.assemblyName, imagePath: mapAsm.imagePath }}
          parts={parts.filter(p => p.assemblyId === mapAsm.id).map(p => ({ imageNumber: p.imageNumber, partNumber: p.partNumber, partName: p.partName }))}
          onClose={() => setMapAsm(null)}
          onSaved={n => {
            setAssemblies(l => l.map(a => a.id === mapAsm.id ? { ...a, hotspotCount: n } : a));
            ok(`Part-number map saved (${n} hotspot${n === 1 ? "" : "s"})`);
          }}
        />
      )}

      {/* ── NAVBAR ── */}
      <nav className="am-nav">
        <div className="am-nav__left">
          <img src={logo} className="am-nav__logo" alt="BGauss" />
          <div className="am-nav__brand">
            <span className="am-nav__name">BGAUSS</span>
            <span className="am-nav__sub">Electronic Parts Catalog</span>
          </div>
        </div>
        <div className="am-nav__right">
          <button className="am-nav__icon" onClick={() => navigate("/dashboard")} title="Home"><FaHome /></button>
          <button className="am-nav__icon" title="Contact"><FaPhoneAlt /></button>
          <button className="am-nav__icon" title="Cart" onClick={() => navigate("/checkout")}><FaShoppingCart /></button>
          <AccountMenu />
        </div>
      </nav>

      {/* ── PAGE ── */}
      <div className="am-page">
        <div className="am-page__header">
          <div>
            <h1 className="am-page__title">Module Management</h1>
            <p className="am-page__sub">Manage vehicle data, assemblies and parts catalogue</p>
          </div>
          <div className="am-page__actions">
            <button className="am-btn am-btn--primary" onClick={() => setShowModal(true)}><FaPlus /> Manage Module</button>
            <button className="am-btn am-btn--outline" onClick={() => navigate("/admin/users")}>← Back</button>
          </div>
        </div>

        <div className="am-cards">
          {([
            { key: "models",     label: "Models",     color: "#0e4f67" },
            { key: "variants",   label: "Variants",   color: "#1277a0" },
            { key: "colours",    label: "Colours",    color: "#0f766e" },
            { key: "assemblies", label: "Assemblies", color: "#b45309" },
            { key: "parts",      label: "Parts",      color: "#7c3aed" },
          ] as const).map(c => (
            <button key={c.label} type="button" className="am-card am-card--btn" style={{ borderTopColor: c.color }}
              onClick={() => { setActiveTab(c.key); setShowModal(true); }} title={`Manage ${c.label}`}>
              <div className="am-card__count" style={{ color: c.color }}>{counts[c.key].all}</div>
              <div className="am-card__label">{c.label}</div>
              <div className="am-card__meta">
                <span className="am-dot am-dot--on" /> {counts[c.key].active} active
                {counts[c.key].all - counts[c.key].active > 0 && (
                  <><span className="am-dot am-dot--off" /> {counts[c.key].all - counts[c.key].active} inactive</>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="am-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="am-modal" role="dialog" aria-label="Module Manager">

            <div className="am-modal__header">
              <div>
                <h2 className="am-modal__title">Module Manager</h2>
                <p className="am-modal__sub">Insert, update, activate / deactivate and import catalogue data</p>
              </div>
              <button className="am-modal__close" onClick={() => setShowModal(false)} aria-label="Close"><FaTimes /></button>
            </div>

            <div className="am-tabs" role="tablist">
              {TABS.map(t => (
                <button key={t.key} role="tab" aria-selected={activeTab === t.key}
                  className={`am-tab${activeTab === t.key ? " am-tab--active" : ""}`}
                  onClick={() => setActiveTab(t.key)}>
                  {t.label}
                  <span className="am-tab__badge">{counts[t.key].all}</span>
                </button>
              ))}
            </div>

            <div className="am-modal__body">

              {/* ════════════ MODELS TAB ════════════ */}
              {activeTab === "models" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/VehicleModels/download-template" importUrl="/VehicleModels/import"
                    fileName="VehicleModels_Import_Template.xlsx" onDone={fetchModels} entity="Models" ok={ok} err={err} />
                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Model</div>
                    <div className="am-form-row">
                      <Field label="Model Name" value={modelForm.modelName} onChange={v => setModelForm({ modelName: v })} />
                      <button className="am-btn am-btn--success am-btn--icon" onClick={createModel}><FaPlus /> Add Model</button>
                    </div>
                  </div>

                  <TableToolbar table={modelTable} placeholder="Search models…" statusKey="status" />
                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr>
                        <HeaderCell table={modelTable} colKey="id" width={80} />
                        <HeaderCell table={modelTable} colKey="name" />
                        <HeaderCell table={modelTable} colKey="variants" width={110} />
                        <HeaderCell table={modelTable} colKey="status" width={140} />
                        <th style={{ width: 170 }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {loading.models ? <LoadingRow colSpan={5} /> : <EmptyRow table={modelTable} colSpan={5} entity="models" />}
                        {!loading.models && modelTable.pageRows.map(m => (
                          editModel?.id === m.id ? (
                            <tr key={m.id} className="am-table__edit-row">
                              <td>{m.id}</td>
                              <td><input className="am-inline-input" value={editModel?.modelName} autoFocus
                                onChange={e => setEditModel({ ...editModel, modelName: e.target.value })}
                                onKeyDown={e => { if (e.key === "Enter") void saveModel(); if (e.key === "Escape") setEditModel(null); }} /></td>
                              <td>{variantCountByModel.get(m.id ?? -1) ?? 0}</td>
                              <td>{statusCell("VehicleModels", m.id, m.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveModel}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditModel(null)} title="Cancel"><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={m.id} className={rowClass(m.isActive)}>
                              <td><span className="am-id">#{m.id}</span></td>
                              <td><strong>{m.modelName}</strong></td>
                              <td>{variantCountByModel.get(m.id ?? -1) ?? 0}</td>
                              <td>{statusCell("VehicleModels", m.id, m.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditModel({ ...m })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteModel(m.id!)} title="Delete"><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination table={modelTable} />
                </div>
              )}

              {/* ════════════ VARIANTS TAB ════════════ */}
              {activeTab === "variants" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/VehicleVariants/download-template" importUrl="/VehicleVariants/import"
                    fileName="VehicleVariants_Import_Template.xlsx" onDone={fetchVariants} entity="Variants" ok={ok} err={err} />
                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Variant</div>
                    <div className="am-form-row">
                      <Field label="Variant Name" value={variantForm.variantName}
                        onChange={v => setVariantForm(p => ({ ...p, variantName: v }))} />
                      <SelectField label="Model" value={variantForm.modelId || ""}
                        onChange={v => setVariantForm(p => ({ ...p, modelId: +v }))} options={modelOpts} />
                      <button className="am-btn am-btn--success am-btn--icon" onClick={createVariant}><FaPlus /> Add Variant</button>
                    </div>
                  </div>

                  <TableToolbar table={variantTable} placeholder="Search variants or models…" statusKey="status" />
                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr>
                        <HeaderCell table={variantTable} colKey="id" width={80} />
                        <HeaderCell table={variantTable} colKey="name" />
                        <HeaderCell table={variantTable} colKey="model" />
                        <HeaderCell table={variantTable} colKey="status" width={140} />
                        <th style={{ width: 170 }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {loading.variants ? <LoadingRow colSpan={5} /> : <EmptyRow table={variantTable} colSpan={5} entity="variants" />}
                        {!loading.variants && variantTable.pageRows.map(v => (
                          editVariant?.id === v.id ? (
                            <tr key={v.id} className="am-table__edit-row">
                              <td>{v.id}</td>
                              <td><input className="am-inline-input" value={editVariant?.variantName} autoFocus
                                onChange={e => setEditVariant(p => p && ({ ...p, variantName: e.target.value }))} /></td>
                              <td>
                                <select className="am-inline-select" value={editVariant?.modelId}
                                  onChange={e => setEditVariant(p => p && ({ ...p, modelId: +e.target.value }))}>
                                  {models.map(m => <option key={m.id} value={m.id}>{m.modelName}{inactiveSuffix(m.isActive)}</option>)}
                                </select>
                              </td>
                              <td>{statusCell("VehicleVariants", v.id, v.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveVariant}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditVariant(null)} title="Cancel"><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={v.id} className={rowClass(v.isActive)}>
                              <td><span className="am-id">#{v.id}</span></td>
                              <td><strong>{v.variantName}</strong></td>
                              <td><span className={`am-badge${modelById.get(v.modelId)?.isActive === false ? " am-badge--muted" : ""}`}>{modelName(v.modelId)}</span></td>
                              <td>{statusCell("VehicleVariants", v.id, v.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditVariant({ ...v })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteVariant(v.id!)} title="Delete"><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination table={variantTable} />
                </div>
              )}

              {/* ════════════ COLOURS TAB ════════════ */}
              {activeTab === "colours" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/VehicleColours/download-template" importUrl="/VehicleColours/import"
                    fileName="VehicleColours_Import_Template.xlsx" onDone={fetchColours} entity="Colours" ok={ok} err={err} />
                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Colour</div>
                    <p className="am-form-card__help">
                      <FaInfoCircle /> Dependency: Model → Variant → Colour. Leave Variant empty if the colour is offered on every variant of the model.
                    </p>
                    <div className="am-form-grid">
                      <Field label="Colour Name" value={colourForm.colourName}
                        onChange={v => setColourForm(p => ({ ...p, colourName: v }))} />
                      <SelectField label="Model" value={colourForm.modelId || ""}
                        onChange={v => setColourForm(p => ({ ...p, modelId: +v, variantId: 0 }))} options={modelOpts} />
                      <SelectField label="Variant" value={colourForm.variantId || ""} disabled={!colourForm.modelId}
                        placeholder={colourForm.modelId ? "— All variants of this model —" : "Select a model first"}
                        onChange={v => setColourForm(p => ({ ...p, variantId: +v }))} options={variantOptsFor(colourForm.modelId)} />
                      <ImageUploadField label="Colour Image" value={colourForm.imagePath} onError={err}
                        onChange={v => setColourForm(p => ({ ...p, imagePath: v }))} />
                    </div>
                    <button className="am-btn am-btn--success am-btn--icon" style={{ marginTop: 10 }}
                      onClick={createColour}><FaPlus /> Add Colour</button>
                  </div>

                  <TableToolbar table={colourTable} placeholder="Search colours, models or variants…" statusKey="status" />
                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr>
                        <HeaderCell table={colourTable} colKey="id" width={80} />
                        <HeaderCell table={colourTable} colKey="name" />
                        <HeaderCell table={colourTable} colKey="model" />
                        <HeaderCell table={colourTable} colKey="variant" />
                        <HeaderCell table={colourTable} colKey="image" />
                        <HeaderCell table={colourTable} colKey="status" width={140} />
                        <th style={{ width: 170 }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {loading.colours ? <LoadingRow colSpan={7} /> : <EmptyRow table={colourTable} colSpan={7} entity="colours" />}
                        {!loading.colours && colourTable.pageRows.map(c => (
                          editColour?.id === c.id ? (
                            <tr key={c.id} className="am-table__edit-row">
                              <td>{c.id}</td>
                              <td><input className="am-inline-input" value={editColour?.colourName} autoFocus
                                onChange={e => setEditColour(p => p && ({ ...p, colourName: e.target.value }))} /></td>
                              <td>
                                <select className="am-inline-select" value={editColour?.modelId ?? ""}
                                  onChange={e => setEditColour(p => p && ({ ...p, modelId: +e.target.value || null, variantId: null }))}>
                                  <option value="">All Models</option>
                                  {models.map(m => <option key={m.id} value={m.id}>{m.modelName}{inactiveSuffix(m.isActive)}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className="am-inline-select" value={editColour?.variantId ?? ""} disabled={!editColour?.modelId}
                                  onChange={e => setEditColour(p => p && ({ ...p, variantId: +e.target.value || null }))}>
                                  <option value="">All Variants</option>
                                  {variantOptsFor(editColour?.modelId).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                </select>
                              </td>
                              <td>
                                <InlineImageUpload value={editColour?.imagePath ?? ""} onError={err}
                                  onChange={v => setEditColour(prev => prev ? { ...prev, imagePath: v } : null)} />
                              </td>
                              <td>{statusCell("VehicleColours", c.id, c.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveColour}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditColour(null)} title="Cancel"><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={c.id} className={rowClass(c.isActive)}>
                              <td><span className="am-id">#{c.id}</span></td>
                              <td><strong>{c.colourName}</strong></td>
                              <td><span className="am-badge">{c.modelId ? modelName(c.modelId) : "All Models"}</span></td>
                              <td><span className="am-badge am-badge--teal">{c.variantId ? variantName(c.variantId) : "All Variants"}</span></td>
                              <td>
                                {c.imagePath ? (
                                  <img src={resolveMediaUrl(c.imagePath)} alt={c.colourName} className="am-table-img-thumb"
                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                ) : <span className="am-path">—</span>}
                              </td>
                              <td>{statusCell("VehicleColours", c.id, c.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditColour({ ...c })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteColour(c.id!)} title="Delete"><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination table={colourTable} />
                </div>
              )}

              {/* ════════════ ASSEMBLIES TAB ════════════ */}
              {activeTab === "assemblies" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/Assemblies/download-template" importUrl="/Assemblies/import"
                    fileName="Assemblies_Import_Template.xlsx" onDone={fetchAssemblies} entity="Assemblies" ok={ok} err={err} />

                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Assembly</div>
                    <div className="am-form-grid">
                      <Field label="Assembly Name" value={asmForm.assemblyName}
                        onChange={v => setAsmForm(p => ({ ...p, assemblyName: v }))} />
                      <SelectField label="Model" value={asmForm.modelId || ""}
                        onChange={v => setAsmForm(p => ({ ...p, modelId: +v, variantId: 0 }))}
                        options={modelOpts} />
                      <SelectField label="Variant (optional)" value={asmForm.variantId || ""} disabled={!asmForm.modelId}
                        onChange={v => setAsmForm(p => ({ ...p, variantId: +v }))}
                        options={variantOptsFor(asmForm.modelId)}
                        placeholder={asmForm.modelId ? "— All Variants —" : "Select a model first"} />
                      <ImageUploadField label="Assembly Image / PDF" value={asmForm.imagePath} onError={err}
                        onChange={v => setAsmForm(p => ({ ...p, imagePath: v }))} accept={ASSEMBLY_ACCEPT} />
                    </div>
                    <button className="am-btn am-btn--success am-btn--icon" style={{ marginTop: 10 }}
                      onClick={createAssembly}><FaPlus /> Add Assembly</button>
                  </div>

                  <TableToolbar table={asmTable} placeholder="Search assemblies, models or variants…" statusKey="status" />
                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr>
                        <HeaderCell table={asmTable} colKey="id" width={80} />
                        <HeaderCell table={asmTable} colKey="name" />
                        <HeaderCell table={asmTable} colKey="model" />
                        <HeaderCell table={asmTable} colKey="variant" />
                        <HeaderCell table={asmTable} colKey="file" />
                        <HeaderCell table={asmTable} colKey="hotspots" />
                        <HeaderCell table={asmTable} colKey="status" width={140} />
                        <th style={{ width: 170 }}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {loading.assemblies ? <LoadingRow colSpan={8} /> : <EmptyRow table={asmTable} colSpan={8} entity="assemblies" />}
                        {!loading.assemblies && asmTable.pageRows.map(a => (
                          editAsm?.id === a.id ? (
                            <tr key={a.id} className="am-table__edit-row">
                              <td>{a.id}</td>
                              <td><input className="am-inline-input" value={editAsm?.assemblyName} autoFocus
                                onChange={e => setEditAsm(p => p && ({ ...p, assemblyName: e.target.value }))} /></td>
                              <td>
                                <select className="am-inline-select" value={editAsm?.modelId}
                                  onChange={e => setEditAsm(p => p && ({ ...p, modelId: +e.target.value, variantId: null }))}>
                                  {models.map(m => <option key={m.id} value={m.id}>{m.modelName}{inactiveSuffix(m.isActive)}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className="am-inline-select" value={editAsm?.variantId ?? ""}
                                  onChange={e => setEditAsm(p => p && ({ ...p, variantId: +e.target.value || null }))}>
                                  <option value="">— All —</option>
                                  {variantOptsFor(editAsm?.modelId).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                </select>
                              </td>
                              <td>
                                <InlineImageUpload value={editAsm?.imagePath ?? ""} accept={ASSEMBLY_ACCEPT} onError={err}
                                  onChange={v => setEditAsm(prev => prev ? { ...prev, imagePath: v } : null)} />
                              </td>
                              <td>{a.hotspotCount ?? 0}</td>
                              <td>{statusCell("Assemblies", a.id, a.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveAssembly}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditAsm(null)} title="Cancel"><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={a.id} className={rowClass(a.isActive)}>
                              <td><span className="am-id">#{a.id}</span></td>
                              <td><strong>{a.assemblyName}</strong></td>
                              <td><span className="am-badge">{modelName(a.modelId)}</span></td>
                              <td><span className="am-badge am-badge--teal">{a.variantId ? variantName(a.variantId) : "All Variants"}</span></td>
                              <td>
                                {a.imagePath ? (
                                  a.imagePath.toLowerCase().endsWith(".pdf") ? (
                                    <a className="am-file-link" href={resolveMediaUrl(a.imagePath)} target="_blank" rel="noreferrer" title={a.imagePath}>
                                      <span style={{ fontSize: 18 }}>📄</span>
                                      <span className="am-ellipsis" style={{ maxWidth: 120 }}>{a.imagePath.split("/").pop()}</span>
                                    </a>
                                  ) : (
                                    <img src={resolveMediaUrl(a.imagePath)} alt={a.assemblyName} className="am-table-img-thumb"
                                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                  )
                                ) : <span className="am-path">—</span>}
                              </td>
                              <td>
                                <button type="button" className={`am-map-btn${(a.hotspotCount ?? 0) > 0 ? " am-map-btn--done" : ""}`}
                                  disabled={!a.imagePath} onClick={() => setMapAsm(a)}
                                  title={a.imagePath ? "Map clickable part numbers on the drawing" : "Upload a drawing first"}>
                                  <FaMapMarkerAlt /> {(a.hotspotCount ?? 0) > 0 ? `${a.hotspotCount} mapped` : "Map parts"}
                                </button>
                              </td>
                              <td>{statusCell("Assemblies", a.id, a.isActive)}</td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditAsm({ ...a })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteAssembly(a.id!)} title="Delete"><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination table={asmTable} />
                </div>
              )}

              {/* ════════════ PARTS TAB ════════════ */}
              {activeTab === "parts" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/Parts/download-template" importUrl="/Parts/import"
                    fileName="Parts_Import_Template.xlsx" onDone={fetchParts} entity="Parts" ok={ok} err={err} />

                  <button className="am-btn am-btn--success am-btn--icon" style={{ marginBottom: 12 }}
                    onClick={() => { setShowPartForm(p => !p); setEditPart(null); }}>
                    <FaPlus /> {showPartForm ? "Hide Form" : "Add New Part"}
                  </button>

                  {showPartForm && (
                    <div className="am-form-card">
                      <div className="am-form-card__title">Add New Part</div>
                      <div className="am-form-grid am-form-grid--5">
                        <Field label="Part Number *" value={partForm.partNumber} onChange={v => setPartForm(p => ({ ...p, partNumber: v }))} />
                        <Field label="Part Name" value={partForm.partName} onChange={v => setPartForm(p => ({ ...p, partName: v }))} />
                        <Field label="Description" value={partForm.description} onChange={v => setPartForm(p => ({ ...p, description: v }))} />
                        <Field label="Remarks" value={partForm.remarks} onChange={v => setPartForm(p => ({ ...p, remarks: v }))} />
                        <Field label="Image Number" value={partForm.imageNumber} onChange={v => setPartForm(p => ({ ...p, imageNumber: v }))} />
                        <Field label="BDP" value={partForm.bdp} onChange={v => setPartForm(p => ({ ...p, bdp: +v }))} type="number" />
                        <Field label="MRP" value={partForm.mrp} onChange={v => setPartForm(p => ({ ...p, mrp: +v }))} type="number" />
                        <Field label="Price" value={partForm.price} onChange={v => setPartForm(p => ({ ...p, price: +v }))} type="number" />
                        <Field label="Tax %" value={partForm.taxPercent} onChange={v => setPartForm(p => ({ ...p, taxPercent: +v }))} type="number" />
                        <Field label="Stock Qty" value={partForm.stockQuantity} onChange={v => setPartForm(p => ({ ...p, stockQuantity: v }))} />
                        <Field label="Torque Nm" value={partForm.torqueNm} onChange={v => setPartForm(p => ({ ...p, torqueNm: +v }))} type="number" />
                        <SelectField label="Model" value={partForm.modelId ?? ""}
                          onChange={v => setPartForm(p => ({ ...p, modelId: +v || null, variantId: null, assemblyId: null, colourIds: "" }))}
                          options={modelOpts} />
                        <SelectField label="Variant" value={partForm.variantId ?? ""} disabled={!partForm.modelId}
                          placeholder={partForm.modelId ? "— All variants —" : "Select a model first"}
                          onChange={v => setPartForm(p => ({ ...p, variantId: +v || null, assemblyId: null, colourIds: "" }))}
                          options={variantOptsFor(partForm.modelId)} />
                        <ColourPicker label="Colour(s)" value={partForm.colourIds} disabled={!partForm.modelId}
                          colours={coloursFor(partForm.modelId, partForm.variantId)}
                          onChange={v => setPartForm(p => ({ ...p, colourIds: v }))} />
                        <SelectField label="Assembly" value={partForm.assemblyId ?? ""} disabled={!partForm.modelId}
                          placeholder={partForm.modelId ? "-- Assembly --" : "Select a model first"}
                          onChange={v => setPartForm(p => ({ ...p, assemblyId: +v || null }))}
                          options={asmOptsFor(partForm.modelId, partForm.variantId)} />
                        <ImageUploadField label="Individual Part Image" value={partForm.partImagePath ?? ""}
                          uploadUrl={PART_IMAGE_UPLOAD} onError={err}
                          onChange={v => setPartForm(p => ({ ...p, partImagePath: v }))} />
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button className="am-btn am-btn--success" onClick={createPart}><FaCheck /> Save Part</button>
                        <button className="am-btn am-btn--ghost" onClick={() => { setPartForm(blankPart()); setShowPartForm(false); }}>
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {editPart && (
                    <div className="am-form-card am-form-card--edit">
                      <div className="am-form-card__title">✏️ Editing Part #{editPart.id} — {editPart.partNumber}</div>
                      <div className="am-form-grid am-form-grid--5">
                        <Field label="Part Number" value={editPart.partNumber} onChange={v => setEditPart(p => p && ({ ...p, partNumber: v }))} />
                        <Field label="Part Name" value={editPart.partName} onChange={v => setEditPart(p => p && ({ ...p, partName: v }))} />
                        <Field label="Description" value={editPart.description} onChange={v => setEditPart(p => p && ({ ...p, description: v }))} />
                        <Field label="Remarks" value={editPart.remarks} onChange={v => setEditPart(p => p && ({ ...p, remarks: v }))} />
                        <Field label="Image Number" value={editPart.imageNumber} onChange={v => setEditPart(p => p && ({ ...p, imageNumber: v }))} />
                        <Field label="BDP" value={editPart.bdp} onChange={v => setEditPart(p => p && ({ ...p, bdp: +v }))} type="number" />
                        <Field label="MRP" value={editPart.mrp} onChange={v => setEditPart(p => p && ({ ...p, mrp: +v }))} type="number" />
                        <Field label="Price" value={editPart.price} onChange={v => setEditPart(p => p && ({ ...p, price: +v }))} type="number" />
                        <Field label="Tax %" value={editPart.taxPercent} onChange={v => setEditPart(p => p && ({ ...p, taxPercent: +v }))} type="number" />
                        <Field label="Stock Qty" value={editPart.stockQuantity} onChange={v => setEditPart(p => p && ({ ...p, stockQuantity: v }))} />
                        <Field label="Torque Nm" value={editPart.torqueNm} onChange={v => setEditPart(p => p && ({ ...p, torqueNm: +v }))} type="number" />
                        <SelectField label="Model" value={editPart.modelId ?? ""}
                          onChange={v => setEditPart(p => p && ({ ...p, modelId: +v || null, variantId: null, assemblyId: null, colourIds: "" }))}
                          options={modelOpts} />
                        <SelectField label="Variant" value={editPart.variantId ?? ""} disabled={!editPart.modelId}
                          placeholder={editPart.modelId ? "— All variants —" : "Select a model first"}
                          onChange={v => setEditPart(p => p && ({ ...p, variantId: +v || null, assemblyId: null }))}
                          options={variantOptsFor(editPart.modelId)} />
                        <ColourPicker label="Colour(s)" value={editPart.colourIds ?? ""} disabled={!editPart.modelId}
                          colours={coloursFor(editPart.modelId, editPart.variantId)}
                          onChange={v => setEditPart(p => p && ({ ...p, colourIds: v }))} />
                        <SelectField label="Assembly" value={editPart.assemblyId ?? ""} disabled={!editPart.modelId}
                          onChange={v => setEditPart(p => p && ({ ...p, assemblyId: +v || null }))}
                          options={asmOptsFor(editPart.modelId, editPart.variantId)} />
                        <ImageUploadField label="Individual Part Image (saved immediately)" value={editPart.partImagePath ?? ""}
                          uploadUrl={PART_IMAGE_UPLOAD} onError={err}
                          onChange={v => {
                            const id = editPart.id!;
                            setEditPart(p => p && ({ ...p, partImagePath: v }));
                            savePartImage(id, v)
                              .then(() => ok(v ? "Part image saved" : "Part image removed"))
                              .catch(e => err("Image not saved: " + errorMessage(e)));
                          }} />
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button className="am-btn am-btn--success" onClick={savePart}><FaCheck /> Update Part</button>
                        <button className="am-btn am-btn--ghost" onClick={() => setEditPart(null)}><FaTimes /> Cancel</button>
                      </div>
                    </div>
                  )}

                  <TableToolbar table={partTable} placeholder="Search by part number, name, description, model, assembly…" statusKey="status" />

                  <div className="am-table-wrap">
                    <table className="am-table am-table--sm">
                      <thead>
                        <tr>
                          <HeaderCell table={partTable} colKey="id" />
                          <HeaderCell table={partTable} colKey="pic" />
                          <HeaderCell table={partTable} colKey="img" />
                          <HeaderCell table={partTable} colKey="pn" />
                          <HeaderCell table={partTable} colKey="name" />
                          <HeaderCell table={partTable} colKey="desc" />
                          <HeaderCell table={partTable} colKey="bdp" />
                          <HeaderCell table={partTable} colKey="mrp" />
                          <HeaderCell table={partTable} colKey="tax" />
                          <HeaderCell table={partTable} colKey="stock" />
                          <HeaderCell table={partTable} colKey="model" />
                          <HeaderCell table={partTable} colKey="variant" />
                          <HeaderCell table={partTable} colKey="colour" />
                          <HeaderCell table={partTable} colKey="asm" />
                          <HeaderCell table={partTable} colKey="torque" />
                          <HeaderCell table={partTable} colKey="price" />
                          <HeaderCell table={partTable} colKey="status" />
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading.parts ? <LoadingRow colSpan={18} /> : <EmptyRow table={partTable} colSpan={18} entity="parts" />}
                        {!loading.parts && partTable.pageRows.map(p => (
                          <tr key={p.id} className={rowClass(p.isActive, editPart?.id === p.id ? "am-table__active-row" : "")}>
                            <td><span className="am-id">#{p.id}</span></td>
                            <td><PartImageThumb path={p.partImagePath} alt={`${p.partNumber} ${p.partName}`} size={38}
                              caption={`${p.partNumber} — ${p.partName}`} /></td>
                            <td>{p.imageNumber || "—"}</td>
                            <td><strong>{p.partNumber}</strong></td>
                            <td className="am-td--name">{p.partName}</td>
                            <td><span className="am-ellipsis" title={p.description}>{p.description}</span></td>
                            <td>{p.bdp}</td>
                            <td>{p.mrp}</td>
                            <td>{p.taxPercent}%</td>
                            <td><span className={`am-stock ${!p.stockQuantity || p.stockQuantity === "0" ? "am-stock--low" : ""}`}>{p.stockQuantity}</span></td>
                            <td><span className="am-badge">{modelName(p.modelId)}</span></td>
                            <td><span className="am-badge am-badge--teal">{variantName(p.variantId)}</span></td>
                            <td><span className="am-ellipsis" style={{ maxWidth: 110 }} title={colourNames(p.colourIds || "")}>{colourNames(p.colourIds || "") || "All"}</span></td>
                            <td><span className="am-badge am-badge--amber">{asmName(p.assemblyId)}</span></td>
                            <td>{p.torqueNm || "—"}</td>
                            <td>{p.price || "—"}</td>
                            <td>{statusCell("Parts", p.id, p.isActive)}</td>
                            <td className="am-table__actions">
                              <button className="am-btn am-btn--edit am-btn--xs" title="Edit"
                                onClick={() => { setEditPart({ ...p, colourIds: p.colourIds ?? "" }); setShowPartForm(false); }}><FaEdit /></button>
                              <button className="am-btn am-btn--danger am-btn--xs" title="Delete"
                                onClick={() => deletePart(p.id!)}><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination table={partTable} sizes={[25, 50, 100, 250, 500]} />
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModules;
