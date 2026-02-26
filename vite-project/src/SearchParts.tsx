import "./searchparts.css";
import logo from "./assets/logo.jpg";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getFilteredParts, getAllParts, Part } from "./services/api";

const SearchParts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchState = location.state as any || {};

  // Fetch parts based on search type
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        setError(null);

        if (searchState.searchType === "model") {
          // Search by model, variant, and colour
          const filteredParts = await getFilteredParts(
            searchState.modelId,
            searchState.variantId,
            searchState.colourId
          );
          setParts(filteredParts);
        } else if (searchState.searchType === "vin") {
          // TODO: Implement VIN search - fetch parts for specific VIN
          // For now, fetch all parts as placeholder
          const allParts = await getAllParts();
          setParts(allParts);
        } else {
          // No search parameters, fetch all parts
          const allParts = await getAllParts();
          setParts(allParts);
        }
      } catch (err) {
        console.error("Failed to fetch parts:", err);
        setError("Failed to load parts. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchParts();
  }, [searchState]);

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="catalog-wrapper">

      {/* NAVBAR */}
      <nav className="catalog-navbar">
        <div className="brand">
          <img src={logo} alt="Logo" className="nav-logo" />
          <span>Electronic Parts Catalog</span>
        </div>

        <div className="nav-right">
          <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            Back to Dashboard
          </button>
          <span>Contact Us</span>
          <span>🔍</span>
          <span>👤</span>
          <span>🛒</span>
        </div>
      </nav>

      {/* LOADING STATE */}
      {loading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>Loading parts...</p>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
          <p>{error}</p>
        </div>
      )}

      {/* RESULTS INFO */}
      {!loading && !error && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h2>Found {parts.length} parts</h2>
        </div>
      )}

      {/* GRID */}
      <div className="parts-grid">
        {parts.map((part) => (
          <div key={part.id} className="part-card">
            <span>{part.partName}</span>
          </div>
        ))}
      </div>

      {!loading && !error && parts.length === 0 && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>No parts found for the selected criteria.</p>
        </div>
      )}

    </div>
  );
};

export default SearchParts;