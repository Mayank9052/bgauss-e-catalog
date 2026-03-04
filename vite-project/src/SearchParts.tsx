import "./searchparts.css";
import logo from "./assets/logo.jpg";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getFilteredParts, getAllParts } 
from "./services/api";
import type { Part } from "./services/api";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import GlobalSearch from "./components/GlobalSearch";

const SearchParts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q");
  const searchState = location.state as any || {};
  const userId = 1;

  // ===============================
  // FETCH PARTS
  // ===============================
  useEffect(() => {
    const fetchParts = async () => {
      try {
        setLoading(true);
        setError(null);

        if (searchState.searchType === "model") {

          const filteredParts = await getFilteredParts(
            searchState.modelId,
            searchState.variantId,
            searchState.colourId
          );

          setParts(filteredParts);

        } 
        else if (searchState.searchType === "global") {

          setParts(searchState.results);

        } 
        else {

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
  }, [searchState, searchQuery]);

  // ===============================
  // FETCH CART COUNT
  // ===============================
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5176/api/cart/count/${userId}`
        );
        setCartCount(response.data.count);
      } catch (error) {
        console.error("Failed to fetch cart count:", error);
      }
    };

    fetchCartCount();
  }, []);

  const handleBack = () => {
    navigate("/dashboard");
  };

  // ===============================
  // ADD TO CART
  // ===============================
const handleAddToCart = async (partId: number) => {
  try {

    const response = await axios.post(
      "http://localhost:5053/api/cart/add",
      {
        UserId: userId,
        PartId: partId,
        Quantity: 1
      }
    );

    console.log("Cart response:", response.data);

    setCartCount((prev) => prev + 1);

  } catch (error: any) {

    console.error("Full Error:", error);

    if (error.response) {
      console.log("Server error:", error.response.data);
      alert(error.response.data);
    } else {
      alert("Server not reachable");
    }

  }
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
          <button className="back-button" onClick={handleBack}>
            Back to Dashboard
          </button>

          <span>Contact Us</span>
          <GlobalSearch />
          <span>👤</span>

          {/* CART ICON */}
          <div className="cart-icon"
          onClick={() => navigate("/carts")}>
            <span className="cart-emoji">🛒</span>

            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* LOADING */}
      {loading && (
        <div className="center-message">
          <p>Loading parts...</p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="center-message error-text">
          <p>{error}</p>
        </div>
      )}

      {/* RESULTS */}
      {!loading && !error && (
        <div className="results-header">
          <h2>Found {parts.length} parts</h2>
        </div>
      )}

      {/* PRODUCT GRID */}
      <div className="parts-grid">
        {parts.map((part) => (
          <div
            key={part.id}
            className="part-card clickable-card"
            onClick={() => handleAddToCart(part.id)}
          >
            <div className="product-image">
              <img
                src={part.imagePath ? `http://localhost:5053${part.imagePath}`
                : "/placeholder.png"}
                alt={part.partName}
              />
            </div>

            <div className="product-name">
              {part.partName}
            </div>
          </div>
        ))}
      </div>

      {!loading && !error && parts.length === 0 && (
        <div className="center-message">
          <p>No parts found for the selected criteria.</p>
        </div>
      )}

    </div>
  );
};

export default SearchParts;