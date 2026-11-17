// assembly_catalogue.tsx — fetches assemblies filtered by modelId + variantId
// PDF support added: assemblies with .pdf imagePath show iframe preview + Open PDF button
import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./assembly_catalogue.css";
import AppNavbar from "./components/AppNavbar";
import BreadcrumbPath from "./components/BreadcrumbPath";
import axios from "axios";
import type { Assembly } from "./services/api";
import { FaSearchPlus, FaTimes, FaRedo, FaMapMarkerAlt } from "react-icons/fa";
import CatalogueDownload from "./components/catalogue/CatalogueDownload";
import type { CatalogueScope } from "./components/catalogue/CatalogueDownload";
import { resolveMediaUrl } from "./utils/media";

interface VehicleSearchState {
  searchType?: "vin" | "model";
  vin?: string;
  modelId?:   number | string;
  variantId?: number | string;   // ← used for variant-scoped assembly filtering
  colourId?:  number | string;
}
interface CartCountResponse { items: { id: number }[] }

const SESSION_KEY = "assemblyCatalogueState";

// ── Resolve the best available state:
//    1. location.state (fresh navigation)
//    2. sessionStorage fallback (back button / stale state)
//    Both are checked so we never fetch with a missing variantId.
const resolveSearchState = (locationState: unknown): VehicleSearchState => {
  const ls = locationState as VehicleSearchState | null | undefined;

  // Consider location.state valid only when it has a modelId
  if (ls && (ls.modelId !== undefined && ls.modelId !== null && ls.modelId !== "")) {
    return ls;
  }

  // Fallback to sessionStorage
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as VehicleSearchState;
      if (parsed.modelId !== undefined && parsed.modelId !== null && parsed.modelId !== "") {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }

  return ls ?? {};
};

const resolveAssemblyImage = (imagePath?: string | null): string => resolveMediaUrl(imagePath);

// ── NEW: detect PDF path ──────────────────────────────────────────────────────
const isPdfPath = (path: string): boolean => path.toLowerCase().endsWith(".pdf");

const AssemblyCatalogue = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  // ── Derive searchState ONCE per render from both sources ──────────────
  // Using a ref so the derived value is stable even if location.state
  // temporarily becomes null during back-navigation rehydration.
  const searchState = resolveSearchState(location.state);

  const modelId   = Number(searchState?.modelId);
  const variantId = searchState?.variantId ? Number(searchState.variantId) : undefined;

  // ── Keep sessionStorage in sync with the latest valid state ──────────
  // Only write when modelId is present so we never overwrite a good value
  // with an empty/stale one.
  const persistedRef = useRef(false);
  useEffect(() => {
    if (searchState.modelId !== undefined && searchState.modelId !== null && searchState.modelId !== "") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(searchState));
      persistedRef.current = true;
    }
  }, [searchState]);

  const [assemblies,        setAssemblies]        = useState<Assembly[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [loadError,         setLoadError]         = useState("");
  const [reloadKey,         setReloadKey]         = useState(0);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [cartCount,         setCartCount]         = useState(0);

  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [scale,     setScale]     = useState(1);
  const [origin,    setOrigin]    = useState("center center");

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await axios.get<CartCountResponse>("/cart/my-cart");
      setCartCount(res.data?.items?.length ?? 0);
    } catch { setCartCount(0); }
  }, []);

  useEffect(() => {
    // ── Guard: don't fetch at all if modelId is invalid ──────────────
    // This is the key protection — if location.state hasn't fully
    // rehydrated yet (modelId is NaN), we skip the fetch entirely
    // instead of sending an unfiltered request to the backend.
    if (!Number.isFinite(modelId) || modelId === 0) {
      setAssemblies([]);
      setLoadError("No vehicle selected. Please start from the Dashboard.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAssemblies = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const variantParam = variantId != null ? `&variantId=${variantId}` : "";
        const res = await fetch(`/api/assemblies?modelId=${modelId}${variantParam}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data: Assembly[] = await res.json();
        if (cancelled) return;
        setAssemblies(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setAssemblies([]);
          setLoadError("Assemblies could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAssemblies();
    void fetchCartCount();

    return () => { cancelled = true; };
  }, [modelId, variantId, fetchCartCount, reloadKey]);

  // Instant search within the assemblies of the selected (active) model / variant
  const visibleAssemblies = (() => {
    const words = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return assemblies;
    return assemblies.filter(a => words.every(w => (a.assemblyName ?? "").toLowerCase().includes(w)));
  })();

  useEffect(() => {
    document.body.style.overflow = zoomImage ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [zoomImage]);

  const openZoom = (image: string, e: React.MouseEvent) => {
    e.stopPropagation(); setZoomImage(image); setScale(1); setOrigin("center center");
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    setScale(prev => Math.max(1, Math.min(4, prev + (e.deltaY < 0 ? 0.2 : -0.2))));
  };

  const goToAssembly = (assembly: Assembly) => {
    const partsState = {
      modelId:       searchState?.modelId,
      variantId:     searchState?.variantId,
      colourId:      searchState?.colourId,
      assemblyId:    assembly.id,
      assemblyName:  assembly.assemblyName,
      assemblyImage: resolveAssemblyImage(assembly.imagePath),
    };
    sessionStorage.setItem("partsPageState", JSON.stringify(partsState));
    navigate("/parts", { state: partsState });
  };

  // ── Restore vehicle_preview state for breadcrumb ──
  const vehiclePreviewState = (() => {
    try { return JSON.parse(sessionStorage.getItem("partsSearchState") ?? "null"); }
    catch { return null; }
  })();

  const colourId = searchState?.colourId ? Number(searchState.colourId) : undefined;
  const vehicleTitle = [vehiclePreviewState?.modelName, vehiclePreviewState?.variantName, vehiclePreviewState?.colourName]
    .filter(Boolean).join(" · ") || "Selected vehicle";
  const pdfScopes: CatalogueScope[] = [
    {
      key: "vehicle", label: "This vehicle configuration",
      description: `All active assemblies and parts for ${vehicleTitle}`,
      title: vehicleTitle,
      params: { modelId: Number.isFinite(modelId) ? modelId : undefined, variantId, colourId },
    },
    {
      key: "all", label: "Complete catalogue",
      description: "Every active model, variant and assembly",
      title: "Complete Parts Catalogue",
      params: {}, heavy: true,
    },
  ];

  return (
    <div className="assembly-page">

      <AppNavbar cartCount={cartCount} />

      <BreadcrumbPath
        current="assembly_catalogue"
        stateMap={{
          dashboard:       null,
          vehicle_preview: vehiclePreviewState ?? (searchState as object) ?? null,
        }}
      />

      <main className="assembly-content">
        <div className="ac-head">
          <h2>Assembly Catalogue</h2>
          {Number.isFinite(modelId) && modelId > 0 && <CatalogueDownload scopes={pdfScopes} />}
        </div>

        <div className="content-search-bar ac-search">
          <input
            type="text"
            placeholder="Search assembly..."
            className="nav-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Search assembly"
          />
          {searchTerm && (
            <button type="button" className="ac-search__clear" onClick={() => setSearchTerm("")} aria-label="Clear search"><FaTimes /></button>
          )}
        </div>

        <p className="assembly-status">
          {loading ? "Loading assemblies…"
            : loadError ? ""
            : `${visibleAssemblies.length} assemblies found`}
        </p>

        {loading ? (
          <div className="assembly-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="assembly-card ac-skeleton" />)}
          </div>
        ) : loadError ? (
          <div className="ac-state">
            <p>{loadError}</p>
            {Number.isFinite(modelId) && modelId > 0
              ? <button type="button" onClick={() => setReloadKey(k => k + 1)}><FaRedo /> Try again</button>
              : <button type="button" onClick={() => navigate("/dashboard")}>Go to Dashboard</button>}
          </div>
        ) : (
          <div className="assembly-grid">
            {visibleAssemblies.length === 0 ? (
              <div className="ac-state">
                <p>{searchTerm ? `No assemblies match "${searchTerm}"` : "No active assemblies are available for this vehicle."}</p>
                {searchTerm && <button type="button" onClick={() => setSearchTerm("")}>Clear search</button>}
              </div>
            ) : visibleAssemblies.map(assembly => {
              const imgSrc = resolveAssemblyImage(assembly.imagePath);
              return (
                <div
                  key={assembly.id}
                  className="assembly-card"
                  onClick={() => goToAssembly(assembly)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") goToAssembly(assembly); }}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  <div className="assembly-image-wrap" style={{ position: "relative" }}>
                    {imgSrc ? (
                      // ── UPDATED: branch on PDF vs image ──────────────────
                      isPdfPath(imgSrc) ? (
                        // ── PDF preview ──────────────────────────────────────
                        <div
                          style={{ position: "relative", width: "100%", height: 140 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <iframe
                            src={`${imgSrc}#toolbar=0&navpanes=0&scrollbar=0`}
                            title={assembly.assemblyName}
                            style={{
                              width: "100%",
                              height: "100%",
                              border: "none",
                              borderRadius: 8,
                              pointerEvents: "none",
                            }}
                          />
                          {/* Open PDF button — stops card navigation, opens in new tab */}
                          <a
                            href={imgSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open PDF"
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: "absolute", top: 6, right: 6,
                              background: "rgba(220,38,38,0.85)", color: "#fff",
                              border: "none", borderRadius: 6, padding: "4px 8px",
                              cursor: "pointer", fontSize: 12, display: "flex",
                              alignItems: "center", gap: 4, zIndex: 2,
                              textDecoration: "none",
                            }}
                          >
                            📄 Open PDF
                          </a>
                        </div>
                      ) : (
                        // ── Image (original logic unchanged) ─────────────────
                        <>
                          <img
                            src={imgSrc}
                            className="assembly-image"
                            alt={assembly.assemblyName}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <button
                            className="assembly-zoom-btn"
                            title="Zoom image"
                            onClick={e => openZoom(imgSrc, e)}
                            style={{
                              position: "absolute", top: 6, right: 6,
                              background: "rgba(0,0,0,0.55)", color: "#fff",
                              border: "none", borderRadius: 6, padding: "4px 8px",
                              cursor: "pointer", fontSize: 14, display: "flex",
                              alignItems: "center", gap: 4, zIndex: 2,
                            }}
                          >
                            <FaSearchPlus style={{ fontSize: 12 }} /> Zoom
                          </button>
                        </>
                      )
                    ) : (
                      // ── No image ──────────────────────────────────────────
                      <div style={{
                        width: "100%", height: 140, background: "#f1f5f9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, color: "#94a3b8", borderRadius: 8,
                      }}>
                        No image
                      </div>
                    )}
                  </div>
                  <div className="assembly-name">
                    {assembly.assemblyName}
                    {(assembly.hotspotCount ?? 0) > 0 && (
                      <span className="ac-badge" title="Part numbers on this drawing are clickable"><FaMapMarkerAlt /> Interactive</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Zoom modal — only for images, not PDFs */}
      {zoomImage && !isPdfPath(zoomImage) && (
        <div
          className="image-modal"
          onClick={() => setZoomImage(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
        >
          <button onClick={() => setZoomImage(null)}
            style={{ position: "absolute", top: 18, right: 24, background: "none", border: "none",
              color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>✕</button>
          <div className="zoom-container" onClick={e => e.stopPropagation()} onWheel={handleWheel}
            style={{ overflow: "hidden", maxWidth: "90vw", maxHeight: "90vh", cursor: scale > 1 ? "zoom-out" : "zoom-in" }}>
            <img src={zoomImage} alt="Zoomed assembly"
              style={{ transform: `scale(${scale})`, transformOrigin: origin,
                transition: "transform 0.1s ease", display: "block",
                maxWidth: "90vw", maxHeight: "90vh", userSelect: "none" }} />
          </div>
          <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            Scroll to zoom · Click outside to close
          </div>
        </div>
      )}
    </div>
  );
};

export default AssemblyCatalogue;