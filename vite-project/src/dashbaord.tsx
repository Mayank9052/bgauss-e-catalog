import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.jpg";
import "./dashbaord.css";


const Dashboard = () => {
   const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
    
  };

  return (
    <div className="epc-wrapper">

      {/* ===== NAVBAR ===== */}
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

      {/* ===== MAIN CONTENT ===== */}
      <div className="dashboard-content">

        {/* VIN CARD */}
        <div className="modern-card">
          <h3>Search with VIN</h3>

          <div className="floating-input">
            <input type="text" placeholder="Enter 17 Digit VIN" />
          </div>

          <p className="note">
            VIN is a unique 17-digit identification number assigned to every vehicle.
          </p>

          <button className="primary-btn" onClick={() => navigate("/parts")}>Search</button>
        </div>

        {/* MODEL CARD */}
        <div className="modern-card">
          <h3>Search by Model & Colour</h3>

          <div className="floating-input">
            <select>
              <option value=""> </option>
              <option>C12</option>
              <option>D15</option>
            </select>
            <label>Vehicle Model</label>
          </div>

          <div className="floating-input">
            <select>
              <option value=""> </option>
              <option>Standard</option>
              <option>Pro</option>
            </select>
            <label>Vehicle Variant</label>
          </div>

          <div className="floating-input">
            <select>
              <option value=""> </option>
              <option>White</option>
              <option>Black</option>
            </select>
            <label>Vehicle Colour</label>
          </div>
          <div className="btn-row">
            <button className="primary-btn" onClick={() => navigate("/parts")}>Search</button>
            <button className="secondary-btn">Reset</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;