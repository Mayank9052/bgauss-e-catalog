// Dashboard.tsx — updated to use shared AppNavbar
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import "./dashbaord.css";
import AppNavbar from "./components/AppNavbar";
import TableSelect from "./components/TableSelect";
import axios from "axios";

import type { VehicleModel, VehicleVariant, VehicleColour } from "./services/api";
import { getVehicleModels, getVehicleVariants, getVehicleColours } from "./services/api";

interface CartCountResponse { items: { id: number }[] }

const Dashboard = () => {
  const navigate = useNavigate();

  const [vin,      setVin]      = useState("");
  const [model,    setModel]    = useState("");
  const [variant,  setVariant]  = useState("");
  const [colour,   setColour]   = useState("");

  const [vinError,   setVinError]   = useState("");
  const [modelError, setModelError] = useState("");

  const [models,   setModels]   = useState<VehicleModel[]>([]);
  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [colours,  setColours]  = useState<VehicleColour[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count for badge
  const fetchCartCount = useCallback(async () => {
    try {
      const res = await axios.get<CartCountResponse>("/cart/my-cart");
      setCartCount(res.data?.items?.length ?? 0);
    } catch { setCartCount(0); }
  }, []);

  const filteredColours = useMemo(() => {
    const hasVehicleMapping = colours.some(c => c.modelId != null && c.variantId != null);
    if (!hasVehicleMapping) return colours;
    if (!model || !variant) return [];
    return colours.filter(c => c.modelId === Number(model) && c.variantId === Number(variant));
  }, [colours, model, variant]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsData, coloursData] = await Promise.all([
          getVehicleModels(),
          getVehicleColours(),
        ]);
        setModels(modelsData);
        setColours(coloursData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
    void fetchCartCount();
  }, [fetchCartCount]);

  useEffect(() => {
    if (!model) { setVariants([]); return; }
    const fetchVariants = async () => {
      try {
        const data = await getVehicleVariants(parseInt(model));
        setVariants(data);
        setVariant(""); setColour("");
      } catch (err) { console.error("Failed to fetch variants:", err); }
    };
    void fetchVariants();
  }, [model]);

  const handleVinSearch = () => {
    if (!vin.trim())              { setVinError("VIN number is required"); return; }
    if (vin.trim().length !== 17) { setVinError("VIN must be exactly 17 characters"); return; }
    setVinError("");
    const state = { searchType: "vin", vin };
    sessionStorage.setItem("partsSearchState", JSON.stringify(state));
    localStorage.removeItem("selectedVehicle");
    navigate("/V_Priview", { state });
  };

  const handleModelSearch = () => {
    if (!model || !variant || !colour) { setModelError("All fields are required"); return; }
    setModelError("");
    const selectedModel   = models.find(m => String(m.id) === model);
    const selectedVariant = variants.find(v => String(v.id) === variant);
    const selectedColour  = filteredColours.find(c => String(c.id) === colour) ?? colours.find(c => String(c.id) === colour);
    const state = {
      searchType: "model",
      modelId:     parseInt(model),
      variantId:   parseInt(variant),
      colourId:    parseInt(colour),
      modelName:   selectedModel?.modelName   ?? "",
      variantName: selectedVariant?.variantName ?? "",
      colourName:  selectedColour?.colourName  ?? "",
    };
    sessionStorage.setItem("partsSearchState", JSON.stringify(state));
    localStorage.setItem("selectedVehicle", JSON.stringify({ modelId: state.modelId, variantId: state.variantId, colourId: state.colourId }));
    navigate("/V_Priview", { state });
  };

  return (
    <div className="epc-wrapper">

      {/* Shared navbar — contact + cart both work */}
      <AppNavbar cartCount={cartCount} activeHome />

      <div className="dashboard-content">

        {/* VIN search card */}
        <div className="modern-card">
          <h3>Search with VIN</h3>
          <div className="floating-input">
            <input
              type="text"
              placeholder=" "
              value={vin}
              maxLength={17}
              onChange={e => { setVin(e.target.value.toUpperCase()); setVinError(""); }}
            />
            <label>Enter 17 Digit VIN</label>
          </div>
          {vinError && <p className="error-text">{vinError}</p>}
          <button className="primary-btn" onClick={handleVinSearch}>Search</button>
        </div>

        {/* Model / Colour search card */}
        <div className="modern-card">
          <h3>Search by Model &amp; Colour</h3>
          {loading ? <p>Loading options...</p> : (
            <>
              <div className="floating-input">
                <TableSelect
                  label="Vehicle Model"
                  columns={["Model Name"]}
                  options={models.map(m => ({ id: m.id, modelName: m.modelName }))}
                  value={model}
                  onChange={id => { setModel(String(id)); setVariant(""); setColour(""); setModelError(""); }}
                  displayColumn="modelName"
                />
              </div>

              <div className="floating-input">
                <TableSelect
                  label="Vehicle Variant"
                  columns={["Variant Name"]}
                  options={variants.map(v => ({ id: v.id, variantName: v.variantName }))}
                  value={variant}
                  onChange={id => { setVariant(String(id)); setColour(""); setModelError(""); }}
                  displayColumn="variantName"
                  disabled={!model}
                />
              </div>

              <div className="floating-input">
                <TableSelect
                  label="Vehicle Colour"
                  columns={["Colour Name"]}
                  options={filteredColours.map(c => ({ id: c.id, colourName: c.colourName }))}
                  value={colour}
                  onChange={id => { setColour(String(id)); setModelError(""); }}
                  displayColumn="colourName"
                  disabled={!variant}
                />
              </div>

              {modelError && <p className="error-text">{modelError}</p>}

              <div className="btn-row">
                <button className="primary-btn" onClick={handleModelSearch}>Search</button>
                <button className="secondary-btn" onClick={() => { setModel(""); setVariant(""); setColour(""); setModelError(""); }}>
                  Reset
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;