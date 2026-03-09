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
  stockQuantity: number;
}

interface OrderSummaryItem {
  id: number;
  partName: string;
  partNumber: string;
  price: number;
  quantity: number;
  subTotal: number;
}

const CheckoutPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const navigate = useNavigate();

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

    const item = items.find(i => i.id === id);

    if (!item) return;

    if (value < 1) return;

    if (value > item.stockQuantity) {

      alert(`Only ${item.stockQuantity} items available for ${item.partName}`);

      return;

    }

    setQuantities((prev) => ({
      ...prev,
      [id]: value
    }));

  };

  /* ================= REMOVE ITEM ================= */

  const removeItemDraft = async (id: number) => {

    await axios.delete(`/cart/remove/${id}`);

    fetchCart();

  };

  /* ================= CLEAR CART ================= */

  const clearCheckoutItems = async () => {

    await axios.delete("/cart/empty");

    setItems([]);

    setQuantities({});

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
      navigate("/parts", {
        replace: true,
        state: JSON.parse(storedSearchState)
      });
      return;
    }

    navigate("/parts");

  };

  /* ================= DOWNLOAD CSV ================= */

  const downloadCSV = async () => {

    const res = await axios.get("/cart/download/csv");

    const fileUrl = `http://localhost:5053${res.data.path}`;

    const link = document.createElement("a");

    link.href = fileUrl;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };

  /* ================= DOWNLOAD PDF ================= */

  const downloadPDF = async () => {

    const res = await axios.get("/cart/download/pdf");

    const fileUrl = `http://localhost:5053${res.data.path}`;

    const link = document.createElement("a");

    link.href = fileUrl;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };

  const handleProfileClick = () => {

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const decoded: any = jwtDecode(token);

    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      decoded.role;

    if (role === "Admin") {
      navigate("/admin/users");
    } else {
      navigate("/dashboard");
    }

  };

  /* ================= PLACE ORDER ================= */

  const placeOrder = async () => {

    try {

      if (items.length === 0) {
        alert("Your cart is empty");
        return;
      }

      const summaryItems: OrderSummaryItem[] = items.map((item) => {
        const quantity = quantities[item.id] ?? item.quantity;
        return {
          id: item.id,
          partName: item.partName,
          partNumber: item.partNumber,
          price: item.price,
          quantity,
          subTotal: item.price * quantity
        };
      });

      const quantityUpdates = items
        .map((item) => {
          const quantity = quantities[item.id] ?? item.quantity;
          if (quantity === item.quantity) return null;
          return axios.put(`/cart/update/${item.id}`, null, {
            params: { quantity }
          });
        })
        .filter(Boolean);

      if (quantityUpdates.length > 0) {
        await Promise.all(quantityUpdates);
      }

      const fallbackTotal = summaryItems.reduce(
        (sum, item) => sum + item.subTotal,
        0
      );

      const res = await axios.post("/cart/checkout");

      alert("Order placed successfully");

      const orderId = res.data?.orderId ?? res.data?.OrderId ?? null;
      const totalAmount =
        Number(res.data?.total ?? res.data?.Total) || fallbackTotal;
      const message = res.data?.message ?? res.data?.Message;
      const backendItems = res.data?.items ?? res.data?.Items;
      const normalizedItems = Array.isArray(backendItems)
        ? backendItems.map((item: any) => ({
          id: item.id,
          partName: item.partName,
          partNumber: item.partNumber,
          price: Number(item.price),
          quantity: Number(item.quantity),
          subTotal: Number(item.subTotal)
        }))
        : summaryItems;

      navigate("/order_details", {
        state: {
          order: {
            orderId,
            totalAmount,
            items: normalizedItems,
            message
          }
        }
      });

    } catch (error: any) {

      const responseData = error.response?.data;
      const message =
        (typeof responseData === "string" ? responseData : null) ||
        responseData?.message ||
        responseData?.Message ||
        responseData?.details ||
        responseData?.Details ||
        "Checkout failed";

      alert(message);

    }

  };

  return (

    <div className="checkout-page">

      {/* ================= NAVBAR ================= */}

      <nav className="checkout-topbar">

        <div className="checkout-topbar-left">

          <img src={logo} alt="Logo" className="checkout-logo" />

          <span>Electronic Parts Catalog</span>

        </div>

        <div className="checkout-topbar-right">

          <span onClick={() => navigate("/dashboard")}>Home</span>

          <span>Contact Us</span>

          <span className="checkout-icon">🔍</span>

          <span className="checkout-icon" onClick={handleProfileClick}>👤</span>

          <span className="checkout-cart">
            🛒
            <span className="checkout-cart-badge">{items.length}</span>
          </span>

        </div>

      </nav>

      {/* CONTENT */}

      <main className="checkout-content">

        <h1>Cart</h1>

        <div className="checkout-table-wrap">

          <table className="checkout-cart-table">

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

                const qty = quantities[item.id] ?? item.quantity;

                return (

                  <tr key={item.id}>

                    <td>
                      <button
                        className="checkout-remove-btn"
                        onClick={() => removeItemDraft(item.id)}
                      >
                        ×
                      </button>
                    </td>

                    <td>
                      {item.imagePath && (
                        <img
                          src={resolvePartImage(item)}
                          className="checkout-product-img"
                        />
                      )}
                    </td>

                    <td>{item.partNumber}</td>

                    <td>₹ {item.price.toFixed(2)}</td>

                    <td>

                      <input
                        type="number"
                        value={qty}
                        min={1}
                        max={item.stockQuantity}
                        className="checkout-qty-input"
                        onChange={(e) =>
                          updateQuantityDraft(
                            item.id,
                            Number(e.target.value)
                          )
                        }
                      />

                      {qty >= item.stockQuantity && (
                        <div className="stock-warning">
                          Max stock reached
                        </div>
                      )}

                    </td>

                    <td>₹ {(item.price * qty).toFixed(2)}</td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

        {/* FOOTER */}

        <div className="checkout-footer">

          <div className="checkout-footer-buttons">

            <button className="checkout-page-btn" onClick={clearCheckoutItems}>
              Empty Cart
            </button>

            <button className="checkout-page-btn" onClick={handleShopMore}>
              Shop More
            </button>

            <button className="checkout-page-btn" onClick={downloadPDF}>
              Download Cart as PDF
            </button>

            <button className="checkout-page-btn" onClick={downloadCSV}>
              Download Cart Data as CSV
            </button>

            <button className="checkout-page-btn" onClick={placeOrder}>
              Place Order
            </button>

          </div>

          <div className="checkout-summary">

            <div className="summary-row">
              <span>Items</span>
              <span>{items.length}</span>
            </div>

            <div className="summary-row">
              <span>Total Amount</span>
              <span className="summary-total">
                ₹ {totalSum.toFixed(2)}
              </span>
            </div>

          </div>

        </div>

      </main>

    </div>

  );

};

export default CheckoutPage;
