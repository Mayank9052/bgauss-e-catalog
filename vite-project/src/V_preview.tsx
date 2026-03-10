import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getVehicleImage,
  getVehicleImageByVin
} from "./services/api";

import logo from "./assets/logo.jpg";
import "./V_Preview.css";
import AccountMenu from "./components/AccountMenu";

interface VehicleInfo {
  model: string;
  variant: string;
  colour: string;
}

interface VehicleSearchState {
  searchType?: "vin" | "model";
  vin?: string;
  modelId?: number | string;
  variantId?: number | string;
  colourId?: number | string;
  modelName?: string;
  variantName?: string;
  colourName?: string;
}

const readStoredSearchState = (): VehicleSearchState | null => {
  try {
    const raw = sessionStorage.getItem("partsSearchState");
    return raw ? JSON.parse(raw) as VehicleSearchState : null;
  } catch {
    return null;
  }
};

const toNumber = (value: number | string | undefined): number | undefined => {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveVehicleImage = (imagePath: string): string => {
  if (!imagePath) return "";

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }

  if (imagePath.startsWith("/api/")) {
    return imagePath;
  }

  const normalized = imagePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  return `http://localhost:5053/${normalized}`;
};

const VehiclePreview = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const searchState = useMemo(() => {
    const routeState = location.state as VehicleSearchState | null;
    const storedState = readStoredSearchState();
    return routeState && Object.keys(routeState).length > 0
      ? routeState
      : (storedState ?? {});
  }, [location.state]);

  const searchType = searchState.searchType;
  const vin = searchState.vin ?? "";
  const modelId = toNumber(searchState.modelId);
  const variantId = toNumber(searchState.variantId);
  const colourId = toNumber(searchState.colourId);

  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(() => {
    if (
      !searchState.modelName &&
      !searchState.variantName &&
      !searchState.colourName
    ) {
      return null;
    }

    return {
      model: searchState.modelName ?? "",
      variant: searchState.variantName ?? "",
      colour: searchState.colourName ?? ""
    };
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedIds, setResolvedIds] = useState<{
    modelId?: number;
    variantId?: number;
    colourId?: number;
  }>({
    modelId,
    variantId,
    colourId
  });

  useEffect(() => {
    setResolvedIds({
      modelId,
      variantId,
      colourId
    });
  }, [modelId, variantId, colourId]);

  const goToCatalogue = () => {

    navigate("/assembly_catalogue", {
      state: {
        searchType,
        vin,
        modelId: resolvedIds.modelId,
        variantId: resolvedIds.variantId,
        colourId: resolvedIds.colourId
      }
    });

  };

  useEffect(() => {

    const fetchVehicle = async () => {

      setErrorMessage("");

      try {

        if (searchType === "vin") {

          const data = await getVehicleImageByVin(vin);

          setVehicleImage(resolveVehicleImage(data.imagePath));

          setVehicleInfo({
            model: data.modelName ?? "",
            variant: data.variantName ?? "",
            colour: data.colourName ?? ""
          });

          setResolvedIds({
            modelId: data.modelId,
            variantId: data.variantId,
            colourId: data.colourId
          });

          sessionStorage.setItem("partsSearchState", JSON.stringify({
            ...searchState,
            modelId: data.modelId,
            variantId: data.variantId,
            colourId: data.colourId,
            modelName: data.modelName ?? "",
            variantName: data.variantName ?? "",
            colourName: data.colourName ?? ""
          }));

          return;
        }

        if (searchType === "model") {

          if (
            modelId == null ||
            variantId == null ||
            colourId == null
          ) {
            throw new Error("Selected vehicle details are missing");
          }

          const data = await getVehicleImage(
            modelId,
            variantId,
            colourId
          );

          setVehicleImage(resolveVehicleImage(data.imagePath));

          setVehicleInfo({
            model: searchState.modelName ?? data.modelName ?? "",
            variant: searchState.variantName ?? data.variantName ?? "",
            colour: searchState.colourName ?? data.colourName ?? ""
          });

          return;

        }

        throw new Error("Search details are missing");

      } catch (error) {

        console.error("Vehicle load failed", error);
        setErrorMessage("Unable to load selected vehicle image");
        setVehicleImage(null);

      }

    };

    fetchVehicle();

  }, [
    searchType,
    vin,
    modelId,
    variantId,
    colourId,
    searchState
  ]);

  return (

    <div className="vehicle-page">

      <nav className="epc-navbar">

        <div className="brand">

          <img src={logo} alt="BGAUSS Logo" className="nav-logo" />

          <div className="brand-text">

            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>

          </div>

        </div>

        <div className="nav-actions">

          <button
            className="nav-link active"
            onClick={() => navigate("/dashboard")}
          >
            Home
          </button>

          <button className="nav-link">Contact</button>

          <span className="nav-icon">🛒</span>

          <AccountMenu />

        </div>

      </nav>

      <div className="vehicle-container">

        <h2>Vehicle Preview</h2>

        {vehicleInfo && (

          <div className="vehicle-info">

            <p><strong>Model:</strong> {vehicleInfo.model}</p>
            <p><strong>Variant:</strong> {vehicleInfo.variant}</p>
            <p><strong>Colour:</strong> {vehicleInfo.colour}</p>

          </div>

        )}

        {errorMessage ? (

          <p className="error-text">{errorMessage}</p>

        ) : vehicleImage ? (

          <img
            src={vehicleImage}
            alt="Vehicle"
            className="vehicle-image"
            onClick={goToCatalogue}
            style={{ cursor: "pointer" }}
            onError={() => {
              setErrorMessage("Vehicle image not found for selected vehicle");
              setVehicleImage(null);
            }}
          />

        ) : (

          <p>Loading vehicle image...</p>

        )}

        <div className="vehicle-buttons">

          <button
            className="primary-btn"
            onClick={goToCatalogue}
          >
            View Assemblies
          </button>

          <button
            className="secondary-btn"
            onClick={() => navigate("/dashboard")}
          >
            Back
          </button>

        </div>

      </div>

    </div>

  );

};

export default VehiclePreview;
