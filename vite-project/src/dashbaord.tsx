import { useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "./assets/logo.jpg";
import "./dashbaord.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [colour, setColour] = useState("");

  const [vinError, setVinError] = useState("");
  const [modelError, setModelError] = useState("");

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
    navigate("/parts");
  };

  // ================= MODEL SEARCH =================
  const handleModelSearch = () => {
    if (!model || !variant || !colour) {
      setModelError("All fields are required");
      return;
    }

    setModelError("");
    navigate("/parts");
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

          <div className="floating-input">
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setModelError("");
              }}
            >
              <option value=""> </option>
              <option>C12</option>
              <option>D15</option>
            </select>
            <label>Vehicle Model</label>
          </div>

          <div className="floating-input">
            <select
              value={variant}
              onChange={(e) => {
                setVariant(e.target.value);
                setModelError("");
              }}
            >
              <option value=""> </option>
              <option>Standard</option>
              <option>Pro</option>
            </select>
            <label>Vehicle Variant</label>
          </div>

          <div className="floating-input">
            <select
              value={colour}
              onChange={(e) => {
                setColour(e.target.value);
                setModelError("");
              }}
            >
              <option value=""> </option>
              <option>White</option>
              <option>Black</option>
            </select>
            <label>Vehicle Colour</label>
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
        </div>

      </div>
    </div>
  );
};

export default Dashboard;