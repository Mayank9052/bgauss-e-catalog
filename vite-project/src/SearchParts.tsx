import "./searchparts.css";
import logo from "./assets/logo.jpg";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { getFilteredParts, getAllParts } from "./services/api";
import type { Part } from "./services/api";
import axios from "axios";
import GlobalSearch from "./components/GlobalSearch";
import AccountMenu from "./components/AccountMenu";

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
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [cartCount, setCartCount] = useState(0);

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

        if (searchType === "model") {

          const filtered = await getFilteredParts(modelId, variantId, colourId);
          setParts(filtered);
          setFilteredParts(filtered);

        } else if (searchType === "global") {

          setParts(results);
          setFilteredParts(results);

        } else {

          const all = await getAllParts();
          setParts(all);
          setFilteredParts(all);

        }

      } catch {

        alert("Failed to load parts");

      }

    };

    fetchParts();

  }, [searchType, modelId, variantId, colourId, results, searchQuery]);

  /* ================= INIT QUANTITY ================= */

  useEffect(() => {

    const qty: Record<number, number> = {};

    parts.forEach(p => {

      qty[p.id] = 1;

      p.subParts?.forEach(sp => {
        qty[sp.id] = 1;
      });

    });

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

  useEffect(() => {
    setFilteredParts(parts);
  }, [parts]);

  /* ================= SELECT PART ================= */

  const toggleSelect = (part: any) => {

    setSelectedParts(prev => {

      let updated = [...prev];

      const isSelected = updated.includes(part.id);

      if (isSelected) {

        updated = updated.filter(id => id !== part.id);

        part.subParts?.forEach((sp: any) => {
          updated = updated.filter(id => id !== sp.id);
        });

      } else {

        updated.push(part.id);

        part.subParts?.forEach((sp: any) => {
          if (!updated.includes(sp.id)) {
            updated.push(sp.id);
          }
        });

      }

      return updated;

    });

  };

  /* ================= QUANTITY ================= */

  const changeQty = (id: number, delta: number) => {

    const part =
      parts.find(p => p.id === id) ||
      parts.flatMap(p => p.subParts ?? []).find(sp => sp.id === id);

    if (!part) return;

    setQuantities(prev => {

      const currentQty = prev[id] || 1;
      const newQty = currentQty + delta;

      if (newQty < 1) return prev;

      if (newQty > part.stockQuantity) {

        alert(`⚠ Stock limit reached\n\n${part.partName}\nAvailable: ${part.stockQuantity}`);

        return prev;

      }

      return {
        ...prev,
        [id]: newQty
      };

    });

  };
  
  /* ================= CHECKOUT ================= */

  const checkoutSelected = async () => {

    try {
      
    if (selectedParts.length === 0) {
      alert("Please select at least one item");
      return;
    }

      for (const partId of selectedParts) {

        const qty = quantities[partId] ?? 1;

         const part =
        parts.find(p => p.id === partId) ||
        parts.flatMap(p => p.subParts ?? []).find(sp => sp.id === partId);

      if (!part) continue;

        if (qty > part.stockQuantity) {
          alert(`${part.partName} only has ${part.stockQuantity} items available`);
          return;
        }

        await axios.post("/cart/add", {
          PartId: partId,
          Quantity: qty
        });

      }

      navigate("/checkout");

    } catch (error) {

    console.error(error);
    alert("Failed to proceed to checkout");

    }

  };

  

  /* ================= IMAGE ================= */

  const resolvePartImage = (part: Pick<Part, "imagePath">) => {

    const baseUrl = "http://localhost:5053";

    if (!part.imagePath) return "";

    const normalized = part.imagePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

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
            ← Back to Dashboard
          </button>

          <GlobalSearch parts={parts} setFilteredParts={setFilteredParts} />

          <div
            className="cart-icon"
            onClick={() => navigate('/checkout')}
          >
            🛒
            {cartCount > 0 &&
              <span className="cart-badge">{cartCount}</span>
            }
          </div>

          <AccountMenu />

        </div>

      </nav>

      {/* ACTION BUTTONS */}

      <div className="parts-actions">

        <button
          disabled={!selectedParts.length}
          onClick={checkoutSelected}
        >
          Checkout Selected
        </button>

      </div>

      {/* PARTS GRID */}

      <div className="parts-grid">

        {filteredParts.map(part => (

          <div key={part.id} className="part-card">

            <div className="part-select">
              <input
                type="checkbox"
                checked={selectedParts.includes(part.id)}
                onChange={() => toggleSelect(part)}
              />
            </div>

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

            <div className="stock-text">
              Stock: {part.stockQuantity}
            </div>

            <div className="qty-control">

              <button onClick={() => changeQty(part.id, -1)}>-</button>

              <span>{quantities[part.id]}</span>

              <button
                onClick={() => changeQty(part.id, 1)}
                disabled={quantities[part.id] >= part.stockQuantity}
              >
                +
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default SearchParts;
