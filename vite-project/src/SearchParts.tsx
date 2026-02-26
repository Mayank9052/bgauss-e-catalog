import "./searchparts.css";
import logo from "./assets/logo.jpg";

const parts = [
  "Front Panel",
  "Wheel Assembly",
  "Battery Pack",
  "Handle Assembly",
  "Wiring Kit",
  "Chain System",
  "Mirror Unit",
  "Radiator",
  "Brake System",
  "Controller",
  "Seat Assembly",
  "Head Lamp"
];

const SearchParts = () => {
  return (
    <div className="catalog-wrapper">

      {/* NAVBAR */}
      <nav className="catalog-navbar">
        <div className="brand">
          <img src={logo} alt="Logo" className="nav-logo" />
          <span>Electronic Parts Catalog</span>
        </div>

        <div className="nav-right">
          <span>Home</span>
          <span>Contact Us</span>
          <span>🔍</span>
          <span>👤</span>
          <span>🛒</span>
        </div>
      </nav>

  

      {/* GRID */}
      <div className="parts-grid">
        {parts.map((part, index) => (
          <div key={index} className="part-card">
            {part}
          </div>
        ))}
      </div>

    </div>
  );
};

export default SearchParts;