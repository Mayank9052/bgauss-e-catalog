import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "./assets/logo.jpg";
import "./dashbaord.css";
import TableSelect from "./components/TableSelect";
import {
  getVehicleModels,
  getVehicleVariants,
  getVehicleColours,
  VehicleModel,
  VehicleVariant,
  VehicleColour,
} from "./services/api";

const Dashboard = () => {
  const navigate = useNavigate();

  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [colour, setColour] = useState("");

  const [vinError, setVinError] = useState("");
  const [modelError, setModelError] = useState("");

  // API data states
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [colours, setColours] = useState<VehicleColour[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch models and colours on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsData, coloursData] = await Promise.all([
          getVehicleModels(),
          getVehicleColours(),
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

  // Fetch variants when model changes
  useEffect(() => {
    if (model) {
      const fetchVariants = async () => {
        try {
          const modelId = parseInt(model);
          const variantsData = await getVehicleVariants(modelId);
          setVariants(variantsData);
          setVariant(""); // Reset variant when model changes
        } catch (error) {
          console.error("Failed to fetch variants:", error);
        }
      };

      fetchVariants();
    } else {
      setVariants([]);
    }
  }, [model]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ================= VIN SEARCH =================
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
    navigate("/parts", { state: { searchType: "vin", vin } });
  };

  // ================= MODEL SEARCH =================
  const handleModelSearch = () => {
    if (!model || !variant || !colour) {
      setModelError("All fields are required");
      return;
    }

    setModelError("");
    navigate("/parts", {
      state: {
        searchType: "model",
        modelId: parseInt(model),
        variantId: parseInt(variant),
        colourId: parseInt(colour),
      },
    });
  };

  return (
    <div className="epc-wrapper">

      {/* ================= NAVBAR ================= */}
      <nav className="epc-navbar">
        <div className="brand">
          <img src={logo} alt="BGAUSS Logo" className="nav-logo" />
          <div className="brand-text">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>
        </div>

        <div className="nav-actions">
          <button className="nav-link active">Home</button>
          <button className="nav-link">Contact</button>
          <span className="nav-icon">🔍</span>
          <span className="nav-icon">🛒</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ================= CONTENT ================= */}
      <div className="dashboard-content">

        {/* ================= VIN CARD ================= */}
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

        {/* ================= MODEL CARD ================= */}
        <div className="modern-card">
          <h3>Search by Model & Colour</h3>

          {loading ? (
            <p>Loading options...</p>
          ) : (
            <>
              <div className="floating-input">
                <TableSelect
                  label="Vehicle Model"
                  columns={["Model Name", "ID"]}
                  options={models.map((m) => ({
                    id: m.id,
                    "Model Name": m.modelName,
                    "Model name": m.modelName,
                    id: m.id,
                  }))}
                  value={model}
                  onChange={(id) => {
                    setModel(String(id));
                    setModelError("");
                  }}
                  displayColumn="modelName"
                />
              </div>

              <div className="floating-input">
                <TableSelect
                  label="Vehicle Variant"
                  columns={["Variant Name", "Model ID"]}
                  options={variants.map((v) => ({
                    id: v.id,
                    "Variant Name": v.variantName,
                    "variant name": v.variantName,
                    "Model ID": v.modelId,
                    "model id": v.modelId,
                  }))}
                  value={variant}
                  onChange={(id) => {
                    setVariant(String(id));
                    setModelError("");
                  }}
                  displayColumn="variantName"
                  disabled={!model}
                />
              </div>

              <div className="floating-input">
                <TableSelect
                  label="Vehicle Colour"
                  columns={["Colour Name", "ID"]}
                  options={colours.map((c) => ({
                    id: c.id,
                    "Colour Name": c.colourName,
                    "colour name": c.colourName,
                    id: c.id,
                  }))}
                  value={colour}
                  onChange={(id) => {
                    setColour(String(id));
                    setModelError("");
                  }}
                  displayColumn="colourName"
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