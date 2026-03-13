import { useEffect, useState } from "react";
import axios from "axios";
import "./checkout.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";
import AccountMenu from "./components/AccountMenu";
import { FaHome, FaPhoneAlt, FaShoppingCart, FaSearch } from "react-icons/fa";

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

const CheckoutPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  const resolvePartImage = (item: Pick<CartItem, "imagePath">) => {

    const baseUrl = "http://localhost:5053";

    if (!item.imagePath) return null;

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

    try {

      const res = await axios.get("/cart/my-cart");

      const cartItems: CartItem[] = res.data.items || [];

      setItems(cartItems);

      setQuantities(
        Object.fromEntries(
          cartItems.map((item) => [item.id, item.quantity])
        )
      );

    } catch (error) {

      console.error("Fetch cart failed:", error);

    }

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

    try {

      await axios.delete(`/cart/remove/${id}`);

      fetchCart();

    } catch (error) {

      console.error("Remove item failed:", error);

    }

  };

  /* ================= CLEAR CART ================= */

  const clearCheckoutItems = async () => {

    try {

      await axios.delete("/cart/empty");

      setItems([]);
      setQuantities({});

    } catch (error) {

      console.error("Empty cart failed:", error);

    }

  };

  /* ================= TOTAL ================= */

  const totalSum = items.reduce(
    (sum, item) =>
      sum + item.price * (quantities[item.id] ?? item.quantity),
    0
  );

  /* ================= SEARCH ================= */

  const filteredItems = items.filter(item =>
    item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= SHOP MORE ================= */

  const handleShopMore = () => {

    const storedSearchState = sessionStorage.getItem("partsSearchState");

    if (storedSearchState) {

      navigate("/assembly_catalogue", {
        replace: true,
        state: JSON.parse(storedSearchState)
      });

      return;
    }

    navigate("/dashboard");
  };

  /* ================= DOWNLOAD CSV ================= */

  const downloadCSV = async () => {

    try {

      const res = await axios.get("/cart/download/csv");

      const fileUrl = `http://localhost:5053${res.data.path}`;

      const link = document.createElement("a");

      link.href = fileUrl;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

    } catch (error) {

      console.error("CSV download failed:", error);

    }

  };

  /* ================= DOWNLOAD PDF ================= */

  const downloadPDF = async () => {

    try {

      const res = await axios.get("/cart/download/pdf");

      const fileUrl = `http://localhost:5053${res.data.path}`;

      const link = document.createElement("a");

      link.href = fileUrl;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

    } catch (error) {

      console.error("PDF download failed:", error);

    }

  };

  /* ================= PLACE ORDER ================= */

//   const placeOrder = () => {

//   if (items.length === 0) {
//     alert("Your cart is empty");
//     return;
//   }

//   const orderData = {
//     orderId: Date.now(), // temporary order id
//     totalAmount: totalSum,
//     items: items.map(item => ({
//       id: item.id,
//       partName: item.partName,
//       partNumber: item.partNumber,
//       price: item.price,
//       quantity: quantities[item.id] ?? item.quantity,
//       subTotal: item.price * (quantities[item.id] ?? item.quantity)
//     })),
//     message: "Order placed successfully"
//   };

//   navigate("/order_details", {
//     state: { order: orderData }
//   });

// };

const placeOrder = async () => {

  try {

    if (items.length === 0) {
      alert("Your cart is empty");
      return;
    }

    console.log("Calling checkout API...");

    const res = await axios.post("/cart/checkout");

    console.log("Checkout API response:", res.data);

    const orderData = {
      orderId: res.data.orderId ?? res.data.OrderId,
      totalAmount:
        res.data.totalAmount ??
        res.data.TotalAmount ??
        res.data.Total,
      items: res.data.items ?? res.data.Items ?? [],
      message: res.data.message ?? res.data.Message
    };

    // save order
    sessionStorage.setItem(
      "latestOrder",
      JSON.stringify(orderData)
    );

    alert("Order placed successfully");

    navigate("/order_details");

  } catch (err: any) {

    console.error("Checkout error:", err);

    if (err.response) {

      console.log("Server response:", err.response.data);

      alert(err.response.data?.Message || "Checkout failed");

    } else {

      alert("Server not responding");

    }

  }

};

  return (

    <div className="checkout-page">

      <nav className="checkout-topbar">

        <div className="checkout-topbar-left">

          <img src={logo} alt="Logo" className="checkout-logo" />

          <div className="brand-text">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="checkout-topbar-right">

          <button
            className="nav-icon-btn"
            onClick={() => navigate("/dashboard")}
            title="Home"
          >
            <FaHome />
          </button>

          <button className="nav-icon-btn" title="Contact">
            <FaPhoneAlt />
          </button>

          <div className="checkout-search">

            <span className="search-icon">
              <FaSearch />
            </span>

            <input
              type="text"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

          </div>

          <div
            className="nav-icon-btn cart-btn"
            onClick={() => navigate("/checkout")}
          >
            <FaShoppingCart />

            {items.length > 0 && (
              <span className="cart-badge">{items.length}</span>
            )}

          </div>

          <AccountMenu />

        </div>

      </nav>

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

              {filteredItems.map((item) => {

                const qty = quantities[item.id] ?? item.quantity;
                const imageSrc = resolvePartImage(item);

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
                      {imageSrc && (
                        <img
                          src={imageSrc}
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