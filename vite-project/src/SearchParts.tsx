import "./searchparts.css";
import logo from "./assets/logo.jpg";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { getFilteredParts, getAllParts } from "./services/api";
import type { Part } from "./services/api";
import axios from "axios";
import GlobalSearch from "./components/GlobalSearch";

const readStoredSearchState = () => {
  try {
    const raw = sessionStorage.getItem("partsSearchState");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const SearchParts = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const fallbackImage = "/vite.svg";

  const searchQuery = searchParams.get("q");
  const searchState = useMemo(() => {
    const routeState = location.state as any;
    const storedState = readStoredSearchState();

    return routeState && Object.keys(routeState).length > 0
      ? routeState
      : (storedState || {});
  }, [location.state]);

const {
  searchType,
  modelId,
  variantId,
  colourId,
  results
} = searchState;

  useEffect(() => {
    if (!searchType) return;

    sessionStorage.setItem("partsSearchState", JSON.stringify(searchState));

    if (
      searchType === "model" &&
      typeof modelId === "number" &&
      typeof variantId === "number" &&
      typeof colourId === "number"
    ) {
      localStorage.setItem(
        "selectedVehicle",
        JSON.stringify({ modelId, variantId, colourId })
      );
    }
  }, [searchType, modelId, variantId, colourId, results]);

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

        } else if (searchState.searchType === "global") {

          setParts(searchState.results);

        } else {

          const allParts = await getAllParts();
          setParts(allParts);

        }

      } catch (err) {

        console.error(err);
        setError("Failed to load parts.");

      } finally {

        setLoading(false);

      }

    };

    fetchParts();

  }, [searchType, modelId, variantId, colourId, results, searchQuery]);

  useEffect(() => {

    const fetchCart = async () => {

      try {

        const response = await axios.get("/cart/my-cart");

        if (response.data?.items) {
          setCartCount(response.data.items.length);
        }

      } catch (error) {

        console.error("Cart load failed", error);

      }

    };

    fetchCart();

  }, []);

  const handleAddToCart = async (partId: number) => {

    try {

      await axios.post("/cart/add", {
        PartId: partId,
        Quantity: 1
      });

      setCartCount(prev => prev + 1);

    } catch (error: any) {

      if (error.response?.status === 401) {

        alert("Please login again.");
        localStorage.removeItem("token");
        navigate("/");

      } else {

        alert("Failed to add item");

      }

    }

  };

  const resolvePartImage = (part: Pick<Part, "imagePath" | "partNumber">) => {
    const baseUrl = "http://localhost:5053";
    const imagePath = part.imagePath;

    if (imagePath && imagePath.trim().length > 0) {
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
      }

      const normalized = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const fromImagesFolder = normalized.startsWith("images/")
        ? normalized
        : `images/${normalized}`;

      return `${baseUrl}/${fromImagesFolder}`;
    }

    return `${baseUrl}/images/${part.partNumber}.jpg`;
  };

  return (

    <div className="catalog-wrapper">

      <nav className="catalog-navbar">

        <div className="brand">
          <img src={logo} alt="Logo" className="nav-logo"/>
          <span>Electronic Parts Catalog</span>
        </div>

        <div className="nav-right">

          <button
            className="back-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>

          <GlobalSearch/>

          <div
            className="cart-icon"
            onClick={() => navigate("/carts")}
          >

            🛒

            {cartCount > 0 &&
              <span className="cart-badge">{cartCount}</span>
            }

          </div>

        </div>

      </nav>

      {!loading && !error &&
        <div className="results-header">
          <h2>Found {parts.length} parts</h2>
        </div>
      }

      <div className="parts-grid">

        {parts.map(part => (

          <div
            key={part.id}
            className="part-card"
            onClick={() => handleAddToCart(part.id)}
          >

            <div className="product-image">
              <img
                src={resolvePartImage(part)}
                alt={part.partName || "Part image"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackImage;
                }}
              />
            </div>

            <div className="product-name">
              {part.partName}
            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default SearchParts;
