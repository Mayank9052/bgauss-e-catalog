import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.jpg";
import { getRoleFromToken } from "./auth";
import AccountMenu from "./components/AccountMenu";
import "./AdminModules.css";

import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaPlus, FaEdit, FaTrash,
  FaDownload, FaUpload, FaSearch, FaTimes, FaCheck, FaExclamationTriangle,
} from "react-icons/fa";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
interface VehicleModel   { id?: number; modelName: string; }
interface VehicleVariant { id?: number; variantName: string; modelId: number; }
interface VehicleColour  { id?: number; colourName: string; modelId: number | null; variantId: number | null; imagePath: string; }
interface Assembly       { id?: number; assemblyName: string; imagePath: string; modelId: number; }
interface Part {
  id?: number; partNumber: string; partName: string; description: string;
  remarks: string; price: number; bdp: number; mrp: number; taxPercent: number;
  stockQuantity: number; assemblyId: number | null; modelId: number | null;
  variantId: number | null; colourIds: string; torqueNm: number; imageNumber: string;
}

type ActiveTab = "models" | "variants" | "colours" | "assemblies" | "parts";

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
interface ToastItem { id: number; msg: string; type: "success" | "error"; }

function ToastContainer({ toasts, remove }: { toasts: ToastItem[]; remove: (id: number) => void }) {
  return (
    <div className="am-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`am-toast am-toast--${t.type}`}>
          <span className="am-toast__icon">{t.type === "success" ? <FaCheck /> : <FaExclamationTriangle />}</span>
          <span className="am-toast__msg">{t.msg}</span>
          <button className="am-toast__close" onClick={() => remove(t.id)}><FaTimes /></button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════ */
function ConfirmDialog({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="am-confirm-overlay">
      <div className="am-confirm-box">
        <div className="am-confirm-icon"><FaExclamationTriangle /></div>
        <p className="am-confirm-msg">{msg}</p>
        <div className="am-confirm-actions">
          <button className="am-btn am-btn--danger" onClick={onYes}>Yes, Delete</button>
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

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: number | string; onChange: (v: string) => void;
  options: { id: number | string; label: string }[]; placeholder?: string;
}) {
  return (
    <div className="am-field">
      <label className="am-field__label">{label}</label>
      <select className="am-field__select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder ?? `-- ${label} --`}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   IMPORT ROW
═══════════════════════════════════════════════════ */
function ImportRow({ downloadUrl, importUrl, onDone, entity }: {
  downloadUrl: string; importUrl: string; onDone: () => void; entity: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // FIX 1: replaced `err: any` with `unknown` and narrowed the type
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(importUrl, fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert(typeof res.data === "string" ? res.data : "Import successful.");
      onDone();
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? (error.response?.data as string | undefined) ?? error.message
        : String(error);
      alert("Import failed: " + msg);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="am-import-row">
      <a href={downloadUrl} download className="am-btn am-btn--outline am-btn--sm">
        <FaDownload /> Download {entity} Template
      </a>
      <button className="am-btn am-btn--primary am-btn--sm" disabled={busy}
        onClick={() => ref.current?.click()}>
        <FaUpload /> {busy ? "Importing…" : `Import ${entity} Excel`}
      </button>
      <input ref={ref} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handle} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
const AdminModules = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("models");

  /* ── toasts ── */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const addToast = useCallback((msg: string, type: "success" | "error") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  // FIX 2: ok/err defined with useCallback so they're stable references
  // and can safely be included in useCallback dependency arrays below
  const ok  = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
  const err = useCallback((msg: string) => addToast(msg, "error"),   [addToast]);

  /* ── confirm ── */
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);
  const ask = (msg: string, fn: () => void) => setConfirm({ msg, fn });

  /* ═══════════ STATE ═══════════ */

  /* models */
  const [models, setModels]           = useState<VehicleModel[]>([]);
  const [modelForm, setModelForm]     = useState({ modelName: "" });
  const [editModel, setEditModel]     = useState<VehicleModel | null>(null);
  const [modelSearch, setModelSearch] = useState("");

  /* variants */
  const [variants, setVariants]           = useState<VehicleVariant[]>([]);
  const [variantForm, setVariantForm]     = useState({ variantName: "", modelId: 0 });
  const [editVariant, setEditVariant]     = useState<VehicleVariant | null>(null);
  const [variantSearch, setVariantSearch] = useState("");

  /* colours */
  const [colours, setColours]             = useState<VehicleColour[]>([]);
  const [colourForm, setColourForm]       = useState({ colourName: "", modelId: 0, variantId: 0, imagePath: "" });
  const [editColour, setEditColour]       = useState<VehicleColour | null>(null);
  const [colourSearch, setColourSearch]   = useState("");

  /* assemblies */
  const [assemblies, setAssemblies]       = useState<Assembly[]>([]);
  const [asmForm, setAsmForm]             = useState({ assemblyName: "", imagePath: "", modelId: 0 });
  const [editAsm, setEditAsm]             = useState<Assembly | null>(null);
  const [asmSearch, setAsmSearch]         = useState("");

  /* parts */
  const blankPart = (): Part => ({
    partNumber: "", partName: "", description: "", remarks: "",
    price: 0, bdp: 0, mrp: 0, taxPercent: 0, stockQuantity: 0,
    assemblyId: null, modelId: null, variantId: null,
    colourIds: "", torqueNm: 0, imageNumber: "",
  });
  const [parts, setParts]               = useState<Part[]>([]);
  const [partForm, setPartForm]         = useState<Part>(blankPart());
  const [editPart, setEditPart]         = useState<Part | null>(null);
  const [partSearch, setPartSearch]     = useState("");
  const [showPartForm, setShowPartForm] = useState(false);

  /* ═══════════ AUTH ═══════════ */
  // FIX 3: navigate is stable, added to dep array to satisfy exhaustive-deps
  useEffect(() => {
    const role = getRoleFromToken();
    if (!role) navigate("/", { replace: true });
    else if (role !== "Admin") navigate("/dashboard", { replace: true });
  }, [navigate]);

  /* ═══════════ FETCH ═══════════ */
  // FIX 4: ok/err are now stable (useCallback) so safe in dep arrays
  const fetchModels     = useCallback(async () => { try { const r = await axios.get("/VehicleModels");   setModels(r.data);     } catch { err("Failed to load models");     } }, [err]);
  const fetchVariants   = useCallback(async () => { try { const r = await axios.get("/VehicleVariants"); setVariants(r.data);   } catch { err("Failed to load variants");   } }, [err]);
  const fetchColours    = useCallback(async () => { try { const r = await axios.get("/VehicleColours");  setColours(r.data);    } catch { err("Failed to load colours");    } }, [err]);
  const fetchAssemblies = useCallback(async () => { try { const r = await axios.get("/Assemblies");      setAssemblies(r.data); } catch { err("Failed to load assemblies"); } }, [err]);
  const fetchParts      = useCallback(async () => { try { const r = await axios.get("/Parts");           setParts(r.data);      } catch { err("Failed to load parts");      } }, [err]);

  // FIX 5: all fetch functions included in dep array
  useEffect(() => {
    fetchModels();
    fetchVariants();
    fetchColours();
    fetchAssemblies();
    fetchParts();
  }, [fetchModels, fetchVariants, fetchColours, fetchAssemblies, fetchParts]);

  /* ═══════════ MODEL CRUD ═══════════ */
  const createModel = async () => {
    if (!modelForm.modelName.trim()) return err("Model name is required");
    try {
      await axios.post("/VehicleModels", modelForm);
      setModelForm({ modelName: "" });
      fetchModels();
      ok("Model created successfully");
    } catch { err("Failed to create model"); }
  };

  const saveModel = async () => {
    // FIX 6: guard with early return — editModel is VehicleModel (not null) below this point
    if (!editModel) return;
    try {
      await axios.put(`/VehicleModels/${editModel.id}`, editModel);
      setEditModel(null);
      fetchModels();
      ok("Model updated");
    } catch { err("Failed to update model"); }
  };

  const deleteModel = (id: number) => ask("Delete this model? This may affect related variants and colours.", async () => {
    try { await axios.delete(`/VehicleModels/${id}`); fetchModels(); ok("Model deleted"); }
    catch { err("Failed to delete model"); }
    finally { setConfirm(null); }
  });

  /* ═══════════ VARIANT CRUD ═══════════ */
  const createVariant = async () => {
    if (!variantForm.variantName.trim() || !variantForm.modelId) return err("Variant name and model are required");
    try {
      await axios.post("/VehicleVariants", variantForm);
      setVariantForm({ variantName: "", modelId: 0 });
      fetchVariants();
      ok("Variant created successfully");
    } catch { err("Failed to create variant"); }
  };

  const saveVariant = async () => {
    if (!editVariant) return;
    try {
      await axios.put(`/VehicleVariants/${editVariant.id}`, editVariant);
      setEditVariant(null);
      fetchVariants();
      ok("Variant updated");
    } catch { err("Failed to update variant"); }
  };

  const deleteVariant = (id: number) => ask("Delete this variant?", async () => {
    try { await axios.delete(`/VehicleVariants/${id}`); fetchVariants(); ok("Variant deleted"); }
    catch { err("Failed to delete variant"); }
    finally { setConfirm(null); }
  });

  /* ═══════════ COLOUR CRUD ═══════════ */
  const createColour = async () => {
    if (!colourForm.colourName.trim()) return err("Colour name is required");
    try {
      await axios.post("/VehicleColours", {
        ...colourForm,
        modelId:   colourForm.modelId   || null,
        variantId: colourForm.variantId || null,
      });
      setColourForm({ colourName: "", modelId: 0, variantId: 0, imagePath: "" });
      fetchColours();
      ok("Colour created successfully");
    } catch { err("Failed to create colour"); }
  };

  const saveColour = async () => {
    if (!editColour) return;
    try {
      await axios.put(`/VehicleColours/${editColour.id}`, editColour);
      setEditColour(null);
      fetchColours();
      ok("Colour updated");
    } catch { err("Failed to update colour"); }
  };

  const deleteColour = (id: number) => ask("Delete this colour?", async () => {
    try { await axios.delete(`/VehicleColours/${id}`); fetchColours(); ok("Colour deleted"); }
    catch { err("Failed to delete colour"); }
    finally { setConfirm(null); }
  });

  /* ═══════════ ASSEMBLY CRUD ═══════════ */
  const createAssembly = async () => {
    if (!asmForm.assemblyName.trim() || !asmForm.modelId) return err("Assembly name and model are required");
    try {
      await axios.post("/Assemblies", asmForm);
      setAsmForm({ assemblyName: "", imagePath: "", modelId: 0 });
      fetchAssemblies();
      ok("Assembly created successfully");
    } catch { err("Failed to create assembly"); }
  };

  const saveAssembly = async () => {
    if (!editAsm) return;
    try {
      await axios.put(`/Assemblies/${editAsm.id}`, editAsm);
      setEditAsm(null);
      fetchAssemblies();
      ok("Assembly updated");
    } catch { err("Failed to update assembly"); }
  };

  const deleteAssembly = (id: number) => ask("Delete this assembly?", async () => {
    try { await axios.delete(`/Assemblies/${id}`); fetchAssemblies(); ok("Assembly deleted"); }
    catch { err("Failed to delete assembly"); }
    finally { setConfirm(null); }
  });

  /* ═══════════ PART CRUD ═══════════ */
  const createPart = async () => {
    if (!partForm.partNumber.trim()) return err("Part number is required");
    try {
      await axios.post("/Parts", {
        ...partForm,
        colourId: partForm.colourIds ? parseInt(partForm.colourIds) : null,
      });
      setPartForm(blankPart());
      setShowPartForm(false);
      fetchParts();
      ok("Part created successfully");
    } catch { err("Failed to create part"); }
  };

  const savePart = async () => {
    if (!editPart) return;
    try {
      await axios.put(`/Parts/${editPart.id}`, editPart);
      setEditPart(null);
      fetchParts();
      ok("Part updated");
    } catch { err("Failed to update part"); }
  };

  const deletePart = (id: number) => ask("Delete this part?", async () => {
    try { await axios.delete(`/Parts/${id}`); fetchParts(); ok("Part deleted"); }
    catch { err("Failed to delete part"); }
    finally { setConfirm(null); }
  });

  // variant inline
  const onEditVariantName = (v: string) => {
    if (!editVariant) return;
    setEditVariant({ ...editVariant, variantName: v });
  };
  const onEditVariantModel = (v: string) => {
    if (!editVariant) return;
    setEditVariant({ ...editVariant, modelId: +v });
  };

  // colour inline
  const onEditColourName    = (v: string) => { if (!editColour) return; setEditColour({ ...editColour, colourName: v }); };
  const onEditColourModel   = (v: string) => { if (!editColour) return; setEditColour({ ...editColour, modelId: +v || null }); };
  const onEditColourVariant = (v: string) => { if (!editColour) return; setEditColour({ ...editColour, variantId: +v || null }); };
  const onEditColourImage   = (v: string) => { if (!editColour) return; setEditColour({ ...editColour, imagePath: v }); };

  // assembly inline
  const onEditAsmName  = (v: string) => { if (!editAsm) return; setEditAsm({ ...editAsm, assemblyName: v }); };
  const onEditAsmModel = (v: string) => { if (!editAsm) return; setEditAsm({ ...editAsm, modelId: +v }); };
  const onEditAsmImage = (v: string) => { if (!editAsm) return; setEditAsm({ ...editAsm, imagePath: v }); };

  /* ═══════════ FILTER ═══════════ */
  const fModels     = models.filter(m => m.modelName?.toLowerCase().includes(modelSearch.toLowerCase()));
  const fVariants   = variants.filter(v => v.variantName?.toLowerCase().includes(variantSearch.toLowerCase()));
  const fColours    = colours.filter(c => c.colourName?.toLowerCase().includes(colourSearch.toLowerCase()));
  const fAssemblies = assemblies.filter(a => a.assemblyName?.toLowerCase().includes(asmSearch.toLowerCase()));
  const fParts      = parts.filter(p =>
    p.partName?.toLowerCase().includes(partSearch.toLowerCase()) ||
    p.partNumber?.toLowerCase().includes(partSearch.toLowerCase())
  );

  const modelOpts   = models.map(m => ({ id: m.id!, label: m.modelName }));
  const filteredAssemblies = assemblies.filter(a => a.modelId === colourForm.modelId);
  const filteredAsmOpts = filteredAssemblies.map(a => ({id: a.id!,label: a.assemblyName}));

  const modelName   = (id: number | null | undefined) => models.find(m => m.id === id)?.modelName     ?? String(id ?? "—");
  const variantName = (id: number | null | undefined) => variants.find(v => v.id === id)?.variantName ?? String(id ?? "—");
  const asmName     = (id: number | null | undefined) => assemblies.find(a => a.id === id)?.assemblyName ?? String(id ?? "—");

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: "models",     label: "Models" },
    { key: "variants",   label: "Variants" },
    { key: "colours",    label: "Colours" },
    { key: "assemblies", label: "Assemblies" },
    { key: "parts",      label: "Parts" },
  ];

  const filteredVariants = variants.filter(
  v => v.modelId === colourForm.modelId
);

  const filteredVariantOpts = filteredVariants.map(v => ({
  id: v.id!,
  label: v.variantName
}));
  /* ═══════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════ */
  return (
    <div className="am-shell">
      <ToastContainer toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />
      {confirm && <ConfirmDialog msg={confirm.msg} onYes={confirm.fn} onNo={() => setConfirm(null)} />}

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
          <button className="am-nav__icon" title="Cart"><FaShoppingCart /></button>
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
            <button className="am-btn am-btn--primary" onClick={() => setShowModal(true)}>
              <FaPlus /> Manage Module
            </button>
            <button className="am-btn am-btn--outline" onClick={() => navigate("/admin/users")}>
              ← Back
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="am-cards">
          {([
            { label: "Models",     count: models.length,     color: "#0e4f67" },
            { label: "Variants",   count: variants.length,   color: "#1277a0" },
            { label: "Colours",    count: colours.length,    color: "#0f766e" },
            { label: "Assemblies", count: assemblies.length, color: "#b45309" },
            { label: "Parts",      count: parts.length,      color: "#7c3aed" },
          ] as const).map(c => (
            <div key={c.label} className="am-card" style={{ borderTopColor: c.color }}>
              <div className="am-card__count" style={{ color: c.color }}>{c.count}</div>
              <div className="am-card__label">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="am-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="am-modal">

            {/* Modal Header */}
            <div className="am-modal__header">
              <div>
                <h2 className="am-modal__title">Module Manager</h2>
                <p className="am-modal__sub">Insert, update, delete and import data</p>
              </div>
              <button className="am-modal__close" onClick={() => setShowModal(false)}><FaTimes /></button>
            </div>

            {/* Tabs */}
            <div className="am-tabs">
              {TABS.map(t => (
                <button key={t.key}
                  className={`am-tab${activeTab === t.key ? " am-tab--active" : ""}`}
                  onClick={() => setActiveTab(t.key)}>
                  {t.label}
                  <span className="am-tab__badge">
                    {t.key === "models"     ? models.length     :
                     t.key === "variants"   ? variants.length   :
                     t.key === "colours"    ? colours.length    :
                     t.key === "assemblies" ? assemblies.length :
                     parts.length}
                  </span>
                </button>
              ))}
            </div>

            <div className="am-modal__body">

              {/* ════════════ MODELS TAB ════════════ */}
              {activeTab === "models" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/VehicleModels/download-template" importUrl="/VehicleModels/import" onDone={fetchModels} entity="Models" />

                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Model</div>
                    <div className="am-form-row">
                      <Field label="Model Name" value={modelForm.modelName} onChange={v => setModelForm({ modelName: v })} />
                      <button className="am-btn am-btn--success am-btn--icon" onClick={createModel}><FaPlus /> Add Model</button>
                    </div>
                  </div>

                  <div className="am-search-row">
                    <FaSearch className="am-search-icon" />
                    <input className="am-search" placeholder="Search models…" value={modelSearch} onChange={e => setModelSearch(e.target.value)} />
                    <span className="am-count">{fModels.length} record{fModels.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr><th>ID</th><th>Model Name</th><th>Actions</th></tr></thead>
                      <tbody>
                        {fModels.length === 0 && <tr><td colSpan={3} className="am-empty">No models found</td></tr>}
                        {fModels.map(m => (
                          editModel?.id === m.id ? (
                            <tr key={m.id} className="am-table__edit-row">
                              <td>{m.id}</td>
                              <td>
                                {/* FIX 8: editModel is guaranteed non-null here (same id match above) */}
                                <input className="am-inline-input" value={editModel?.modelName}
                                  onChange={e => setEditModel({ ...editModel, modelName: e.target.value })} />
                              </td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveModel}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditModel(null)}><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={m.id}>
                              <td><span className="am-id">#{m.id}</span></td>
                              <td><strong>{m.modelName}</strong></td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditModel({ ...m })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteModel(m.id!)}><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ════════════ VARIANTS TAB ════════════ */}
              {activeTab === "variants" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/VehicleVariants/download-template" importUrl="/VehicleVariants/import" onDone={fetchVariants} entity="Variants" />

                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Variant</div>
                    <div className="am-form-row">
                      <Field label="Variant Name" value={variantForm.variantName} onChange={v => setVariantForm(p => ({ ...p, variantName: v }))} />
                      <SelectField label="Model" value={variantForm.modelId} onChange={v => setVariantForm(p => ({ ...p, modelId: +v }))} options={modelOpts} />
                      <button className="am-btn am-btn--success am-btn--icon" onClick={createVariant}><FaPlus /> Add Variant</button>
                    </div>
                  </div>

                  <div className="am-search-row">
                    <FaSearch className="am-search-icon" />
                    <input className="am-search" placeholder="Search variants…" value={variantSearch} onChange={e => setVariantSearch(e.target.value)} />
                    <span className="am-count">{fVariants.length} record{fVariants.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr><th>ID</th><th>Variant Name</th><th>Model</th><th>Actions</th></tr></thead>
                      <tbody>
                        {fVariants.length === 0 && <tr><td colSpan={4} className="am-empty">No variants found</td></tr>}
                        {fVariants.map(v => (
                          editVariant?.id === v.id ? (
                            <tr key={v.id} className="am-table__edit-row">
                              <td>{v.id}</td>
                              {/* FIX 9: use handler functions — null check done inside them */}
                              <td><input className="am-inline-input" value={editVariant?.variantName} onChange={e => onEditVariantName(e.target.value)} /></td>
                              <td>
                                <select className="am-inline-select" value={editVariant?.modelId} onChange={e => onEditVariantModel(e.target.value)}>
                                  {models.map(m => <option key={m.id} value={m.id}>{m.modelName}</option>)}
                                </select>
                              </td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveVariant}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditVariant(null)}><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={v.id}>
                              <td><span className="am-id">#{v.id}</span></td>
                              <td><strong>{v.variantName}</strong></td>
                              <td><span className="am-badge">{modelName(v.modelId)}</span></td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditVariant({ ...v })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteVariant(v.id!)}><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ════════════ COLOURS TAB ════════════ */}
              {activeTab === "colours" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/VehicleColours/download-template" importUrl="/VehicleColours/import" onDone={fetchColours} entity="Colours" />

                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Colour</div>
                    <div className="am-form-grid">
                      <Field label="Colour Name" value={colourForm.colourName} onChange={v => setColourForm(p => ({ ...p, colourName: v }))} />
                      <SelectField 
                        label="Model"   
                        value={colourForm.modelId}   
                        onChange={v => setColourForm(p => 
                          ({ 
                            ...p, 
                              modelId: +v,
                              variantId: 0 

                          }))}   
                        options={modelOpts}
                         />

                      <SelectField label="Variant" value={colourForm.variantId} onChange={v => setColourForm(p => ({ ...p, variantId: +v }))} options={filteredVariantOpts} />
                      <Field label="Image Path" value={colourForm.imagePath} onChange={v => setColourForm(p => ({ ...p, imagePath: v }))} />
                    </div>
                    <button className="am-btn am-btn--success am-btn--icon" style={{ marginTop: 10 }} onClick={createColour}><FaPlus /> Add Colour</button>
                  </div>

                  <div className="am-search-row">
                    <FaSearch className="am-search-icon" />
                    <input className="am-search" placeholder="Search colours…" value={colourSearch} onChange={e => setColourSearch(e.target.value)} />
                    <span className="am-count">{fColours.length} record{fColours.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr><th>ID</th><th>Colour Name</th><th>Model</th><th>Variant</th><th>Image Path</th><th>Actions</th></tr></thead>
                      <tbody>
                        {fColours.length === 0 && <tr><td colSpan={6} className="am-empty">No colours found</td></tr>}
                        {fColours.map(c => (
                          editColour?.id === c.id ? (
                            <tr key={c.id} className="am-table__edit-row">
                              <td>{c.id}</td>
                              <td><input className="am-inline-input" value={editColour?.colourName}    onChange={e => onEditColourName(e.target.value)} /></td>
                              <td>
                                <select className="am-inline-select" value={editColour?.modelId ?? ""}   onChange={e => onEditColourModel(e.target.value)}>
                                  <option value="">—</option>
                                  {models.map(m => <option key={m.id} value={m.id}>{m.modelName}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className="am-inline-select" value={editColour?.variantId ?? ""} onChange={e => onEditColourVariant(e.target.value)}>
                                  <option value="">—</option>
                                  {variants
                                      .filter(v => v.modelId === editColour?.modelId)
                                      .map(v => (
                                        <option key={v.id} value={v.id}>
                                          {v.variantName}
                                        </option>
                                    ))}
                                </select>
                              </td>
                              <td><input className="am-inline-input" value={editColour?.imagePath}    onChange={e => onEditColourImage(e.target.value)} /></td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveColour}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditColour(null)}><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={c.id}>
                              <td><span className="am-id">#{c.id}</span></td>
                              <td><strong>{c.colourName}</strong></td>
                              <td><span className="am-badge">{modelName(c.modelId)}</span></td>
                              <td><span className="am-badge am-badge--teal">{variantName(c.variantId)}</span></td>
                              <td><span className="am-path">{c.imagePath || "—"}</span></td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditColour({ ...c })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteColour(c.id!)}><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ════════════ ASSEMBLIES TAB ════════════ */}
              {activeTab === "assemblies" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/Assemblies/download-template" importUrl="/Assemblies/import" onDone={fetchAssemblies} entity="Assemblies" />

                  <div className="am-form-card">
                    <div className="am-form-card__title">Add New Assembly</div>
                    <div className="am-form-grid">
                      <Field label="Assembly Name" value={asmForm.assemblyName} onChange={v => setAsmForm(p => ({ ...p, assemblyName: v }))} />
                      <SelectField label="Model"   value={asmForm.modelId}      onChange={v => setAsmForm(p => ({ ...p, modelId: +v }))}   options={modelOpts} />
                      <Field label="Image Path"    value={asmForm.imagePath}    onChange={v => setAsmForm(p => ({ ...p, imagePath: v }))} />
                    </div>
                    <button className="am-btn am-btn--success am-btn--icon" style={{ marginTop: 10 }} onClick={createAssembly}><FaPlus /> Add Assembly</button>
                  </div>

                  <div className="am-search-row">
                    <FaSearch className="am-search-icon" />
                    <input className="am-search" placeholder="Search assemblies…" value={asmSearch} onChange={e => setAsmSearch(e.target.value)} />
                    <span className="am-count">{fAssemblies.length} record{fAssemblies.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="am-table-wrap">
                    <table className="am-table">
                      <thead><tr><th>ID</th><th>Assembly Name</th><th>Model</th><th>Image Path</th><th>Actions</th></tr></thead>
                      <tbody>
                        {fAssemblies.length === 0 && <tr><td colSpan={5} className="am-empty">No assemblies found</td></tr>}
                        {fAssemblies.map(a => (
                          editAsm?.id === a.id ? (
                            <tr key={a.id} className="am-table__edit-row">
                              <td>{a.id}</td>
                              <td><input className="am-inline-input" value={editAsm?.assemblyName} onChange={e => onEditAsmName(e.target.value)} /></td>
                              <td>
                                <select className="am-inline-select" value={editAsm?.modelId} onChange={e => onEditAsmModel(e.target.value)}>
                                  {models.map(m => <option key={m.id} value={m.id}>{m.modelName}</option>)}
                                </select>
                              </td>
                              <td><input className="am-inline-input" value={editAsm?.imagePath} onChange={e => onEditAsmImage(e.target.value)} /></td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--success am-btn--xs" onClick={saveAssembly}><FaCheck /> Save</button>
                                <button className="am-btn am-btn--ghost am-btn--xs" onClick={() => setEditAsm(null)}><FaTimes /></button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={a.id}>
                              <td><span className="am-id">#{a.id}</span></td>
                              <td><strong>{a.assemblyName}</strong></td>
                              <td><span className="am-badge">{modelName(a.modelId)}</span></td>
                              <td><span className="am-path">{a.imagePath || "—"}</span></td>
                              <td className="am-table__actions">
                                <button className="am-btn am-btn--edit am-btn--xs" onClick={() => setEditAsm({ ...a })}><FaEdit /> Edit</button>
                                <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deleteAssembly(a.id!)}><FaTrash /></button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ════════════ PARTS TAB ════════════ */}
              {activeTab === "parts" && (
                <div className="am-section">
                  <ImportRow downloadUrl="/Parts/download-template" importUrl="/Parts/import" onDone={fetchParts} entity="Parts" />

                  <button className="am-btn am-btn--success am-btn--icon" style={{ marginBottom: 12 }}
                    onClick={() => setShowPartForm(p => !p)}>
                    <FaPlus /> {showPartForm ? "Hide Form" : "Add New Part"}
                  </button>

                  {showPartForm && (
                    <div className="am-form-card">
                      <div className="am-form-card__title">Add New Part</div>
                      <div className="am-form-grid am-form-grid--5">
                        <Field label="Part Number *" value={partForm.partNumber}    onChange={v => setPartForm(p => ({ ...p, partNumber: v }))} />
                        <Field label="Part Name"     value={partForm.partName}      onChange={v => setPartForm(p => ({ ...p, partName: v }))} />
                        <Field label="Description"   value={partForm.description}  onChange={v => setPartForm(p => ({ ...p, description: v }))} />
                        <Field label="Remarks"       value={partForm.remarks}       onChange={v => setPartForm(p => ({ ...p, remarks: v }))} />
                        <Field label="Image Number"  value={partForm.imageNumber}   onChange={v => setPartForm(p => ({ ...p, imageNumber: v }))} />
                        <Field label="BDP"           value={partForm.bdp}           onChange={v => setPartForm(p => ({ ...p, bdp: +v }))}           type="number" />
                        <Field label="MRP"           value={partForm.mrp}           onChange={v => setPartForm(p => ({ ...p, mrp: +v }))}           type="number" />
                        <Field label="Price"         value={partForm.price}         onChange={v => setPartForm(p => ({ ...p, price: +v }))}         type="number" />
                        <Field label="Tax %"         value={partForm.taxPercent}    onChange={v => setPartForm(p => ({ ...p, taxPercent: +v }))}    type="number" />
                        <Field label="Stock Qty"     value={partForm.stockQuantity} onChange={v => setPartForm(p => ({ ...p, stockQuantity: +v }))} type="number" />
                        <Field label="Torque Nm"     value={partForm.torqueNm}      onChange={v => setPartForm(p => ({ ...p, torqueNm: +v }))}      type="number" />
                        <Field label="Colour IDs (CSV)" value={partForm.colourIds} onChange={v => setPartForm(p => ({ ...p, colourIds: v }))} />
                        <SelectField 
                          label="Model"    
                          value={partForm.modelId ?? ""}    
                          onChange={v => setPartForm(p => ({  
                                  ...p, modelId: +v || null, 
                                  variantId: null, 
                                  assemblyId: null 
                            }))} 
                                options={modelOpts} 
                          />
                        <SelectField label="Variant"  value={partForm.variantId ?? ""}  onChange={v => setPartForm(p => ({ ...p, variantId:  +v || null }))} options={filteredVariantOpts} />
                        <SelectField label="Assembly" value={partForm.assemblyId ?? ""} onChange={v => setPartForm(p => ({ ...p, assemblyId: +v || null }))} options={filteredAsmOpts} />
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button className="am-btn am-btn--success" onClick={createPart}><FaCheck /> Save Part</button>
                        <button className="am-btn am-btn--ghost" onClick={() => { setPartForm(blankPart()); setShowPartForm(false); }}><FaTimes /> Cancel</button>
                      </div>
                    </div>
                  )}

                  {editPart && (
                    <div className="am-form-card am-form-card--edit">
                      <div className="am-form-card__title">✏️ Editing Part #{editPart.id} — {editPart.partNumber}</div>
                      <div className="am-form-grid am-form-grid--5">
                        <Field label="Part Number"   value={editPart.partNumber}    onChange={v => setEditPart(p => p && ({ ...p, partNumber: v }))} />
                        <Field label="Part Name"     value={editPart.partName}      onChange={v => setEditPart(p => p && ({ ...p, partName: v }))} />
                        <Field label="Description"   value={editPart.description}  onChange={v => setEditPart(p => p && ({ ...p, description: v }))} />
                        <Field label="Remarks"       value={editPart.remarks}       onChange={v => setEditPart(p => p && ({ ...p, remarks: v }))} />
                        <Field label="Image Number"  value={editPart.imageNumber}   onChange={v => setEditPart(p => p && ({ ...p, imageNumber: v }))} />
                        <Field label="BDP"           value={editPart.bdp}           onChange={v => setEditPart(p => p && ({ ...p, bdp: +v }))}           type="number" />
                        <Field label="MRP"           value={editPart.mrp}           onChange={v => setEditPart(p => p && ({ ...p, mrp: +v }))}           type="number" />
                        <Field label="Price"         value={editPart.price}         onChange={v => setEditPart(p => p && ({ ...p, price: +v }))}         type="number" />
                        <Field label="Tax %"         value={editPart.taxPercent}    onChange={v => setEditPart(p => p && ({ ...p, taxPercent: +v }))}    type="number" />
                        <Field label="Stock Qty"     value={editPart.stockQuantity} onChange={v => setEditPart(p => p && ({ ...p, stockQuantity: +v }))} type="number" />
                        <Field label="Torque Nm"     value={editPart.torqueNm}      onChange={v => setEditPart(p => p && ({ ...p, torqueNm: +v }))}      type="number" />
                        <Field label="Colour IDs"    value={editPart.colourIds}     onChange={v => setEditPart(p => p && ({ ...p, colourIds: v }))} />
                        <SelectField label="Model"    value={editPart.modelId ?? ""}    onChange={v => setEditPart(p => p && ({ ...p, modelId:    +v || null }))} options={modelOpts} />
                        <SelectField label="Variant"  value={editPart.variantId ?? ""}  onChange={v => setEditPart(p => p && ({ ...p, variantId:  +v || null }))} options={filteredVariantOpts} />
                        <SelectField label="Assembly" value={editPart.assemblyId ?? ""} onChange={v => setEditPart(p => p && ({ ...p, assemblyId: +v || null }))} options={filteredAsmOpts} />
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button className="am-btn am-btn--success" onClick={savePart}><FaCheck /> Update Part</button>
                        <button className="am-btn am-btn--ghost" onClick={() => setEditPart(null)}><FaTimes /> Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="am-search-row">
                    <FaSearch className="am-search-icon" />
                    <input className="am-search" placeholder="Search by part name or number…" value={partSearch} onChange={e => setPartSearch(e.target.value)} />
                    <span className="am-count">{fParts.length} record{fParts.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="am-table-wrap">
                    <table className="am-table am-table--sm">
                      <thead>
                        <tr>
                          <th>ID</th><th>Part #</th><th>Name</th><th>Desc</th>
                          <th>BDP</th><th>MRP</th><th>Tax%</th><th>Stock</th>
                          <th>Model</th><th>Variant</th><th>Assembly</th>
                          <th>Torque</th><th>Img#</th><th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fParts.length === 0 && <tr><td colSpan={14} className="am-empty">No parts found</td></tr>}
                        {fParts.map(p => (
                          <tr key={p.id} className={editPart?.id === p.id ? "am-table__active-row" : ""}>
                            <td><span className="am-id">#{p.id}</span></td>
                            <td><strong>{p.partNumber}</strong></td>
                            <td>{p.partName}</td>
                            <td><span className="am-ellipsis" title={p.description}>{p.description}</span></td>
                            <td>{p.bdp}</td>
                            <td>{p.mrp}</td>
                            <td>{p.taxPercent}%</td>
                            <td><span className={`am-stock ${(p.stockQuantity ?? 0) <= 0 ? "am-stock--low" : ""}`}>{p.stockQuantity}</span></td>
                            <td><span className="am-badge">{modelName(p.modelId)}</span></td>
                            <td><span className="am-badge am-badge--teal">{variantName(p.variantId)}</span></td>
                            <td><span className="am-badge am-badge--amber">{asmName(p.assemblyId)}</span></td>
                            <td>{p.torqueNm || "—"}</td>
                            <td>{p.imageNumber || "—"}</td>
                            <td className="am-table__actions">
                              <button className="am-btn am-btn--edit am-btn--xs" onClick={() => { setEditPart({ ...p }); setShowPartForm(false); }}><FaEdit /></button>
                              <button className="am-btn am-btn--danger am-btn--xs" onClick={() => deletePart(p.id!)}><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>{/* end modal body */}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModules;