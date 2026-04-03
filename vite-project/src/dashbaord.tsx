import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import logo from "./assets/logo.jpg";
import "./dashbaord.css";
import TableSelect from "./components/TableSelect";
import AccountMenu from "./components/AccountMenu";
import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa";

import type {
  VehicleModel,
  VehicleVariant,
  VehicleColour
} from "./services/api";

import {
  getVehicleModels,
  getVehicleVariants,
  getVehicleColours
} from "./services/api";

const Dashboard = () => {

  const navigate = useNavigate();

  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [colour, setColour] = useState("");

  const [vinError, setVinError] = useState("");
  const [modelError, setModelError] = useState("");

  const [models, setModels] = useState<VehicleModel[]>([]);
  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [colours, setColours] = useState<VehicleColour[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredColours = useMemo(() => {

    const hasVehicleMapping = colours.some(
      (c) => c.modelId != null && c.variantId != null
    );

    if (!hasVehicleMapping) return colours;
    if (!model || !variant) return [];

    const modelId = Number(model);
    const variantId = Number(variant);

    return colours.filter(
      (c) => c.modelId === modelId && c.variantId === variantId
    );

  }, [colours, model, variant]);

  useEffect(() => {

    const fetchData = async () => {
      try {

        const [modelsData, coloursData] = await Promise.all([
          getVehicleModels(),
          getVehicleColours()
        ]);

        setModels(modelsData);
        setColours(coloursData);
        setLoading(false);

      } catch (error) {

        console.error("Failed to fetch data:", error);
        setLoading(false);

      }
    };

    fetchData();

  }, []);

  useEffect(() => {

    if (model) {

      const fetchVariants = async () => {

        try {

          const modelId = parseInt(model);
          const variantsData = await getVehicleVariants(modelId);

          setVariants(variantsData);
          setVariant("");
          setColour("");

        } catch (error) {

          console.error("Failed to fetch variants:", error);

        }
      };

      fetchVariants();

    } else {

      setVariants([]);

    }

  }, [model]);

  const handleVinSearch = () => {

    if (!vin.trim()) {

      setVinError("VIN number is required");
      return;

    }

    if (vin.trim().length !== 17) {

      setVinError("VIN must be exactly 17 characters");
      return;

    }

    setVinError("");

    const vinSearchState = { searchType: "vin", vin };

    sessionStorage.setItem("partsSearchState", JSON.stringify(vinSearchState));
    localStorage.removeItem("selectedVehicle");

    navigate("/V_Priview", { state: vinSearchState });

  };

  const handleModelSearch = () => {

    if (!model || !variant || !colour) {

      setModelError("All fields are required");
      return;

    }

    setModelError("");

    const selectedModel = models.find((m) => String(m.id) === model);
    const selectedVariant = variants.find((v) => String(v.id) === variant);
    const selectedColour = filteredColours.find((c) => String(c.id) === colour)
      ?? colours.find((c) => String(c.id) === colour);

    const modelSearchState = {
      searchType: "model",
      modelId: parseInt(model),
      variantId: parseInt(variant),
      colourId: parseInt(colour),
      modelName: selectedModel?.modelName ?? "",
      variantName: selectedVariant?.variantName ?? "",
      colourName: selectedColour?.colourName ?? ""
    };

    sessionStorage.setItem("partsSearchState", JSON.stringify(modelSearchState));

    localStorage.setItem(
      "selectedVehicle",
      JSON.stringify({
        modelId: modelSearchState.modelId,
        variantId: modelSearchState.variantId,
        colourId: modelSearchState.colourId
      })
    );

    navigate("/V_Priview", { state: modelSearchState });

  };

  return (

    <div className="epc-wrapper">

      <nav
        className="epc-navbar"
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >

        <div className="brand" style={{ display: "flex", flexDirection: "row", alignItems: "center", flexShrink: 1, flexGrow: 1, flexBasis: "auto", gap: "10px" }}>

          <img src={logo} alt="BGAUSS Logo" className="nav-logo" style={{ width: "36px", height: "auto", flexShrink: 0 }} />

          <div className="brand-text" style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "18px", whiteSpace: "nowrap", lineHeight: "1.2" }}>BGAUSS</span>
            <span style={{ color: "#ffffff", fontSize: "11px", whiteSpace: "nowrap", lineHeight: "1.2", opacity: 1 }}>Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="nav-actions" style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", alignItems: "center", flexShrink: 0, gap: "6px", marginLeft: "auto" }}>

          <button className="nav-icon-btn active" title="Home">
            <FaHome />
          </button>

          <button className="nav-icon-btn" title="Contact">
            <FaPhoneAlt />
          </button>

          <button className="nav-icon-btn" title="Cart">
            <FaShoppingCart />
          </button>

          <AccountMenu />

        </div>

      </nav>

      <div className="dashboard-content">

        <div className="modern-card">

          <h3>Search with VIN</h3>

          <div className="floating-input">

            <input
              type="text"
              placeholder=" "
              value={vin}
              maxLength={17}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase());
                setVinError("");
              }}
            />

            <label>Enter 17 Digit VIN</label>

          </div>

          {vinError && <p className="error-text">{vinError}</p>}

          <button className="primary-btn" onClick={handleVinSearch}>
            Search
          </button>

        </div>

        <div className="modern-card">

          <h3>Search by Model & Colour</h3>

          {loading ? (

            <p>Loading options...</p>

          ) : (

            <>

              <div className="floating-input">

                <TableSelect
                  label="Vehicle Model"
                  columns={["Model Name"]}
                  options={models.map((m) => ({
                    id: m.id,
                    modelName: m.modelName
                  }))}
                  value={model}
                  onChange={(id) => {
                    setModel(String(id));
                    setVariant("");
                    setColour("");
                    setModelError("");
                  }}
                  displayColumn="modelName"
                />

              </div>

              <div className="floating-input">

                <TableSelect
                  label="Vehicle Variant"
                  columns={["Variant Name"]}
                  options={variants.map((v) => ({
                    id: v.id,
                    variantName: v.variantName
                  }))}
                  value={variant}
                  onChange={(id) => {
                    setVariant(String(id));
                    setColour("");
                    setModelError("");
                  }}
                  displayColumn="variantName"
                  disabled={!model}
                />

              </div>

              <div className="floating-input">

                <TableSelect
                  label="Vehicle Colour"
                  columns={["Colour Name"]}
                  options={filteredColours.map((c) => ({
                    id: c.id,
                    colourName: c.colourName
                  }))}
                  value={colour}
                  onChange={(id) => {
                    setColour(String(id));
                    setModelError("");
                  }}
                  displayColumn="colourName"
                  disabled={!variant}
                />

              </div>

              {modelError && <p className="error-text">{modelError}</p>}

              <div className="btn-row">

                <button className="primary-btn" onClick={handleModelSearch}>
                  Search
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => {
                    setModel("");
                    setVariant("");
                    setColour("");
                    setModelError("");
                  }}
                >
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