// V_Preview.tsx — updated with BreadcrumbPath
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getVehicleImage, getVehicleImageByVin } from "./services/api";
import "./V_Preview.css";
import AppNavbar from "./components/AppNavbar";
import BreadcrumbPath from "./components/BreadcrumbPath";
import axios from "axios";

interface VehicleSearchState {
  searchType?: "vin" | "model";
  vin?: string;
  modelId?:   number | string;
  variantId?: number | string;
  colourId?:  number | string;
  modelName?:   string;
  variantName?: string;
  colourName?:  string;
}

interface CartCountResponse { items: { id: number }[] }

const readStoredSearchState = (): VehicleSearchState | null => {
  try {
    const raw = sessionStorage.getItem("partsSearchState");
    return raw ? (JSON.parse(raw) as VehicleSearchState) : null;
  } catch { return null; }
};

const toNumber = (v: number | string | undefined): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const resolveVehicleImage = (imagePath: string): string => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;
  if (imagePath.startsWith("/api/")) return imagePath;
  const normalized = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  // Dev: full URL to backend; Production: use `/${normalized}` (relative)
  //return `http://localhost:5053/${normalized}`;
  return `/${normalized}`;
};

const VehiclePreview = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  const searchState = useMemo(() => {
    const routeState = location.state as VehicleSearchState | null;
    const stored     = readStoredSearchState();
    return routeState && Object.keys(routeState).length > 0 ? routeState : (stored ?? {});
  }, [location.state]);

  const searchType = searchState.searchType;
  const vin        = searchState.vin ?? "";
  const modelId    = toNumber(searchState.modelId);
  const variantId  = toNumber(searchState.variantId);
  const colourId   = toNumber(searchState.colourId);

  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cartCount,    setCartCount]    = useState(0);
  const [resolvedIds,  setResolvedIds]  = useState<{ modelId?: number; variantId?: number; colourId?: number }>({
    modelId, variantId, colourId,
  });

  useEffect(() => { setResolvedIds({ modelId, variantId, colourId }); }, [modelId, variantId, colourId]);

  // Fetch cart count for badge
  const fetchCartCount = useCallback(async () => {
    try {
      const res = await axios.get<CartCountResponse>("/cart/my-cart");
      setCartCount(res.data?.items?.length ?? 0);
    } catch { setCartCount(0); }
  }, []);

  useEffect(() => { void fetchCartCount(); }, [fetchCartCount]);

  useEffect(() => {
    const fetchVehicle = async () => {
      setErrorMessage("");
      try {
        if (searchType === "vin") {
          const data = await getVehicleImageByVin(vin);
          setVehicleImage(resolveVehicleImage(data.imagePath));
          setResolvedIds({ modelId: data.modelId, variantId: data.variantId, colourId: data.colourId });
          sessionStorage.setItem("partsSearchState", JSON.stringify({
            ...searchState, modelId: data.modelId, variantId: data.variantId, colourId: data.colourId,
            modelName: data.modelName ?? "", variantName: data.variantName ?? "", colourName: data.colourName ?? "",
          }));
          return;
        }
        if (searchType === "model") {
          if (modelId == null || variantId == null || colourId == null)
            throw new Error("Selected vehicle details are missing");
          const data = await getVehicleImage(modelId, variantId, colourId);
          setVehicleImage(resolveVehicleImage(data.imagePath));
          return;
        }
        throw new Error("Search details are missing");
      } catch (err) {
        console.error("Vehicle load failed", err);
        setErrorMessage("Unable to load selected vehicle image");
        setVehicleImage(null);
      }
    };
    void fetchVehicle();
  }, [searchType, vin, modelId, variantId, colourId, searchState]);

  const goToCatalogue = () => {
    navigate("/assembly_catalogue", {
      state: {
        searchType,
        vin,
        modelId:   resolvedIds.modelId,
        variantId: resolvedIds.variantId,
        colourId:  resolvedIds.colourId,
      }
    });
  };

  return (
    <div className="vehicle-page">

      {/* Shared navbar */}
      <AppNavbar cartCount={cartCount} />

      {/* Breadcrumb */}
      <BreadcrumbPath
        current="vehicle_preview"
        stateMap={{
          dashboard: null,
        }}
      />

      <div className="vehicle-container">
        {errorMessage ? (
          <p className="error-text">{errorMessage}</p>
        ) : vehicleImage ? (
          <>
            <img
              src={vehicleImage}
              alt="Vehicle"
              className="vehicle-image"
              onClick={goToCatalogue}
              style={{ cursor: "pointer" }}
              onError={() => { setErrorMessage("Vehicle image not found"); setVehicleImage(null); }}
            />

            {/* ── Vehicle info badge below image ── */}
            <div className="vehicle-info-badge">
              {searchState.modelName && (
                <div className="vib-row">
                  <span className="vib-label">Model</span>
                  <span className="vib-value">{searchState.modelName}</span>
                </div>
              )}
              {searchState.variantName && (
                <div className="vib-row">
                  <span className="vib-label">Variant</span>
                  <span className="vib-value">{searchState.variantName}</span>
                </div>
              )}
              {searchState.colourName && (
                <div className="vib-row">
                  <span className="vib-label">Colour</span>
                  <span className="vib-value">
                    <span className="vib-colour-dot" style={{ background: "#888" }} />
                    {searchState.colourName}
                  </span>
                </div>
              )}
<<<<<<< fix/QuantityDatatype
              {/* {searchState.vin && (
=======
              {searchState.vin && (
>>>>>>> main
                <div className="vib-row">
                  <span className="vib-label">VIN</span>
                  <span className="vib-value vib-vin">{searchState.vin}</span>
                </div>
<<<<<<< fix/QuantityDatatype
              )} */}
=======
              )}
>>>>>>> main
            </div>

            {/* <button className="primary-btn" onClick={goToCatalogue}>
              View Parts Catalogue →
            </button> */}
          </>
        ) : (
          <p>Loading vehicle image...</p>
        )}
      </div>
    </div>
  );
};

export default VehiclePreview;