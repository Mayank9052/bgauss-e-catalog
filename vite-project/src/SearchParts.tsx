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

  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const fallbackImage = "/vite.svg";

  const searchQuery = searchParams.get("q");

  const searchState = useMemo(() => {

    const routeState = location.state as any;
    const storedState = readStoredSearchState();

    return routeState && Object.keys(routeState).length > 0
      ? routeState
      : (storedState || {});

  }, [location.state]);

  const { searchType, modelId, variantId, colourId, results } = searchState;

  /* ================= FETCH PARTS ================= */

  useEffect(() => {

    const fetchParts = async () => {

      try {

        setLoading(true);

        if (searchType === "model") {

          const filtered = await getFilteredParts(modelId, variantId, colourId);
          setParts(filtered);

        } else if (searchType === "global") {

          setParts(results);

        } else {

          const all = await getAllParts();
          setParts(all);

        }

      } catch {

        setError("Failed to load parts");

      } finally {

        setLoading(false);

      }

    };

    fetchParts();

  }, [searchType, modelId, variantId, colourId, results, searchQuery]);

  /* ================= INIT QUANTITY ================= */

  useEffect(() => {

    const qty: Record<number, number> = {};

    parts.forEach(p => qty[p.id] = 1);

    setQuantities(qty);

  }, [parts]);

  /* ================= CART COUNT ================= */

  useEffect(() => {

    const fetchCart = async () => {

      try {

        const res = await axios.get("/cart/my-cart");

        if (res.data?.items) {
          setCartCount(res.data.items.length);
        }

      } catch {}

    };

    fetchCart();

  }, []);

  /* ================= SELECT PART ================= */

  const toggleSelect = (id: number) => {

    setSelectedParts(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );

  };

  /* ================= QUANTITY ================= */

  const changeQty = (id: number, delta: number) => {

    setQuantities(prev => {

      const newQty = Math.max(1, (prev[id] || 1) + delta);

      return { ...prev, [id]: newQty };

    });

  };

  /* ================= ADD TO CART ================= */

  const addSelectedToCart = async () => {

    try {

      for (const partId of selectedParts) {

        await axios.post("/cart/add", {
          PartId: partId,
          Quantity: quantities[partId]
        });

      }

      setCartCount(prev => prev + selectedParts.length);

      alert("Items added to cart");

    } catch {

      alert("Failed to add items");

    }

  };

  /* ================= CHECKOUT ================= */

  const checkoutSelected = async () => {

    try {

      for (const partId of selectedParts) {

        await axios.post("/cart/add", {
          PartId: partId,
          Quantity: quantities[partId]
        });

      }

      navigate("/checkout");

    } catch {

      alert("Checkout failed");

    }

  };

  /* ================= IMAGE ================= */

  const resolvePartImage = (part: Pick<Part, "imagePath">) => {

    const baseUrl = "http://localhost:5053";

    if (!part.imagePath) return "";

    const normalized = part.imagePath.replace(/\\/g, "/").replace(/^\/+/, "");

    return `${baseUrl}/${normalized}`;

  };

  return (

    <div className="catalog-wrapper">

      {/* NAVBAR */}

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

          <div className="cart-icon" onClick={() => navigate('/checkout')}>
            🛒
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </div>

        </div>

      </nav>

      {/* ACTION BUTTONS */}

      <div className="parts-actions">

        <button
          disabled={!selectedParts.length}
          onClick={addSelectedToCart}
        >
          Add Selected to Cart
        </button>

        <button
          disabled={!selectedParts.length}
          onClick={checkoutSelected}
        >
          Checkout Selected
        </button>

      </div>

      {/* PARTS GRID */}

      <div className="parts-grid">

        {parts.map(part => (

          <div key={part.id} className="part-card">

            <input
              type="checkbox"
              checked={selectedParts.includes(part.id)}
              onChange={() => toggleSelect(part.id)}
            />

            <div className="product-image">

              {part.imagePath && (
                <img
                  src={resolvePartImage(part)}
                  alt={part.partName}
                />
              )}

            </div>

            <div className="product-name">
              {part.partName}
            </div>

            {/* QUANTITY */}

            <div className="qty-control">

              <button onClick={() => changeQty(part.id, -1)}>-</button>

              <span>{quantities[part.id]}</span>

              <button onClick={() => changeQty(part.id, 1)}>+</button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default SearchParts;