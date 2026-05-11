// assembly_catalogue.tsx — fetches assemblies filtered by modelId + variantId
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./assembly_catalogue.css";
import AppNavbar from "./components/AppNavbar";
import BreadcrumbPath from "./components/BreadcrumbPath";
import axios from "axios";
import type { Assembly } from "./services/api";
import { commonSearch } from "./services/serachapi";
import { FaSearchPlus } from "react-icons/fa";

interface VehicleSearchState {
  searchType?: "vin" | "model";
  vin?: string;
  modelId?:   number | string;
  variantId?: number | string;   // ← used for variant-scoped assembly filtering
  colourId?:  number | string;
}
interface CartCountResponse { items: { id: number }[] }

const resolveAssemblyImage = (imagePath?: string | null): string => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  const normalized = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `http://localhost:5053/${normalized}`;
  //return `/${normalized}`;
};

const AssemblyCatalogue = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  const searchState = location.state as VehicleSearchState;
  const modelId   = Number(searchState?.modelId);
  const variantId = searchState?.variantId ? Number(searchState.variantId) : undefined;

  const [assemblies,        setAssemblies]        = useState<Assembly[]>([]);
  const [visibleAssemblies, setVisibleAssemblies] = useState<Assembly[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [searchLoading,     setSearchLoading]     = useState(false);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [cartCount,         setCartCount]         = useState(0);

  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [scale,     setScale]     = useState(1);
  const [origin,    setOrigin]    = useState("center center");

  // ── Persist state for breadcrumb back-nav ──
  useEffect(() => {
    if (searchState && Object.keys(searchState).length > 0) {
      sessionStorage.setItem("assemblyCatalogueState", JSON.stringify(searchState));
    }
  }, [searchState]);

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await axios.get<CartCountResponse>("/cart/my-cart");
      setCartCount(res.data?.items?.length ?? 0);
    } catch { setCartCount(0); }
  }, []);

  useEffect(() => {
    const fetchAssemblies = async () => {
      if (!Number.isFinite(modelId)) {
        setAssemblies([]); setVisibleAssemblies([]); setLoading(false); return;
      }
      setLoading(true);
      try {
        // ── Pass variantId to backend for variant-scoped filtering ──
        // The API returns: assemblies matching variantId + assemblies with no variantId (fallback)
        const variantParam = variantId != null ? `&variantId=${variantId}` : "";
        const res = await fetch(`/api/assemblies?modelId=${modelId}${variantParam}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data: Assembly[] = await res.json();
        setAssemblies(data); setVisibleAssemblies(data);
      } catch {
        setAssemblies([]); setVisibleAssemblies([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchAssemblies();
    void fetchCartCount();
  }, [modelId, variantId, fetchCartCount]);

  useEffect(() => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) { setVisibleAssemblies(assemblies); setSearchLoading(false); return; }
    if (!Number.isFinite(modelId)) { setVisibleAssemblies([]); setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await commonSearch<Assembly>("assemblies", trimmedTerm);
        if (cancelled) return;
        setVisibleAssemblies(data.filter(a => Number(a.modelId) === modelId));
      } catch {
        if (!cancelled) setVisibleAssemblies([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
  }, [assemblies, modelId, searchTerm]);

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
        <h2>Assembly Catalogue</h2>

        <div className="content-search-bar">
          <input
            type="text"
            placeholder="Search assembly..."
            className="nav-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <p className="assembly-status">
          {loading ? "Loading assemblies…"
            : searchLoading ? "Searching…"
            : `${visibleAssemblies.length} assemblies found`}
        </p>

        {loading ? <p></p> : (
          <div className="assembly-grid">
            {visibleAssemblies.length === 0 ? (
              <p>No assemblies found</p>
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
                    ) : (
                      <div style={{
                        width: "100%", height: 140, background: "#f1f5f9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, color: "#94a3b8", borderRadius: 8,
                      }}>
                        No image
                      </div>
                    )}
                  </div>
                  <div className="assembly-name">{assembly.assemblyName}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Zoom modal */}
      {zoomImage && (
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