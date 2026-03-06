import { useEffect, useState } from "react";
import axios from "axios";
import "./checkout.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

interface CartItem {
  id: number;
  partName: string;
  partNumber: string;
  imagePath?: string | null;
  price: number;
  quantity: number;
  subTotal: number;
}

const CheckoutPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const navigate = useNavigate();
  const fallbackImage = "/vite.svg";

  const resolvePartImage = (item: Pick<CartItem, "imagePath">) => {

  const baseUrl = "http://localhost:5053";

    if (!item.imagePath) return "";

    if (
      item.imagePath.startsWith("http://") ||
      item.imagePath.startsWith("https://")
    ) {
      return item.imagePath;
    }

    const normalized = item.imagePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    return `${baseUrl}/${normalized}`;
  };

  /* ================= FETCH CART ================= */

  const fetchCart = async () => {

    const res = await axios.get("/cart/my-cart");

    const cartItems: CartItem[] = res.data.items || [];

    setItems(cartItems);

    setQuantities(
      Object.fromEntries(
        cartItems.map((item) => [item.id, item.quantity])
      )
    );
  };

  useEffect(() => {
    fetchCart();
  }, []);

  /* ================= UPDATE QUANTITY ================= */

  const updateQuantityDraft = (id: number, value: number) => {

    if (value < 1) return;

    setQuantities((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  /* ================= REMOVE ITEM ================= */

  const removeItemDraft = async (id: number) => {

    try {

      await axios.delete(`/cart/remove/${id}`);

      await fetchCart();

    } catch (error) {

      console.error("Failed to remove checkout item", error);

    }
  };

  /* ================= CLEAR CART ================= */

  const clearCheckoutItems = async () => {

    try {

      await axios.delete("/cart/empty");

      setItems([]);

      setQuantities({});

    } catch (error) {

      console.error("Failed to clear checkout items", error);

    }
  };

  /* ================= TOTAL SUM ================= */

  const totalSum = items.reduce(
    (sum, item) =>
      sum + item.price * (quantities[item.id] ?? item.quantity),
    0
  );

  /* ================= SHOP MORE ================= */

  const handleShopMore = () => {
    const storedSearchState = sessionStorage.getItem("partsSearchState");

    if (storedSearchState) {
      try {
        navigate("/parts", {
          replace: true,
          state: JSON.parse(storedSearchState)
        });
        return;
      } catch (error) {
        console.error("Invalid saved parts search state", error);
      }
    }

    const vehicle = localStorage.getItem("selectedVehicle");

    if (!vehicle) {

      navigate("/parts");

      return;

    }

    const { modelId, variantId, colourId } = JSON.parse(vehicle);

    navigate("/parts", {
      replace: true,
      state: {
        searchType: "model",
        modelId,
        variantId,
        colourId
      }
    });
  };
/* ================= DOWNLOAD CSV ================= */

const downloadCSV = async () => {

  try {

    const res = await axios.get("/cart/download/csv");

    const fileUrl = `http://localhost:5053${res.data.path}`;

    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = "";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

  } catch (error) {

    console.error("CSV download failed", error);

  }

};


/* ================= DOWNLOAD PDF ================= */

const downloadPDF = async () => {

  try {

    const res = await axios.get("/cart/download/pdf");

    const fileUrl = `http://localhost:5053${res.data.path}`;

    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = "";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

  } catch (error) {

    console.error("PDF download failed", error);

  }

};

const handleProfileClick = () => {

  const token = localStorage.getItem("token");

  if (!token) {
    navigate("/login");
    return;
  }

  try {

    const decoded: any = jwtDecode(token);

    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      decoded.role;

    if (role === "Admin") {

      navigate("/admin/users");

    } else {

      navigate("/dashboard");

    }

  } catch (error) {

    console.error("Invalid token", error);
    navigate("/login");

  }

};
  return (

    <div className="checkout-page">

      {/* ================= NAVBAR ================= */}

      <nav className="checkout-topbar">

        <div className="checkout-topbar-left">

          <img src={logo} alt="BGAUSS Logo" className="checkout-logo" />

          <span>Electronic Parts Catalog</span>

        </div>

        <div className="checkout-topbar-right">

          <span onClick={() => navigate("/dashboard")}>
            Home
          </span>

          <span>Contact Us</span>

          <span className="checkout-icon">
            🔍
          </span>

          <span className="checkout-icon" onClick={handleProfileClick}
                style={{ cursor: "pointer" }}>
            👤
          </span>

          <span className="checkout-cart">

            🛒

            <span className="checkout-cart-badge">
              {items.length}
            </span>

          </span>

        </div>

      </nav>

      {/* ================= CONTENT ================= */}

      <main className="checkout-content">

        <h1>Cart</h1>

        {/* ================= TABLE ================= */}

        <div className="checkout-table-wrap">
        <table className="checkout-cart-table">

          <colgroup>
            <col className="col-remove" />
            <col className="col-image" />
            <col className="col-name" />
            <col className="col-price" />
            <col className="col-qty" />
            <col className="col-subtotal" />
          </colgroup>

          <thead>

            <tr>

              <th></th>
              <th>Product Image</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>

            </tr>

          </thead>

          <tbody>

            {items.map((item) => {

              const qty =
                quantities[item.id] ?? item.quantity;

              return (

                <tr key={item.id}>

                  <td>

                    <button
                      className="checkout-remove-btn"
                      onClick={() =>
                        removeItemDraft(item.id)
                      }
                    >
                      x
                    </button>

                  </td>

                  <td>

                    {item.imagePath && (
                      <img
                        src={resolvePartImage(item)}
                        className="checkout-product-img"
                        alt="product"
                      />
                    )}

                  </td>

                  <td>{item.partNumber}</td>

                  <td>
                    Rs{item.price.toFixed(2)}
                  </td>

                  <td>

                    <input
                      type="number"
                      value={qty}
                      min={1}
                      className="checkout-qty-input"
                      onChange={(e) =>
                        updateQuantityDraft(
                          item.id,
                          Number(e.target.value)
                        )
                      }
                    />

                  </td>

                  <td>
                    Rs {(item.price * qty).toFixed(2)}
                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>
        </div>

        {/* ================= FOOTER ================= */}

        <div className="checkout-footer">

          <div className="checkout-footer-buttons">

            <button
              className="checkout-page-btn"
              onClick={clearCheckoutItems}
            >
              Empty Cart
            </button>

            <button className="checkout-page-btn"
                    onClick={handleShopMore}
                    >
              Update Cart
            </button>

            <button
              className="checkout-page-btn"
              onClick={handleShopMore}
            >
              Shop More
            </button>

            <button className="checkout-page-btn" onClick={downloadPDF}>
              Download Cart as PDF
            </button>

            <button className="checkout-page-btn" onClick={downloadCSV}>
              Download Cart Data as CSV
            </button>

          </div>

          <div className="checkout-total">

            Total Sum: Rs {totalSum.toFixed(2)}

          </div>

        </div>

      </main>

    </div>
  );
};

export default CheckoutPage;
