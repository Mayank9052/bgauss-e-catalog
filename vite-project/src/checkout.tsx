import { useEffect, useState } from "react";
import axios from "axios";
import "./checkout.css";
import logo from "./assets/logo.jpg";
import { useNavigate } from "react-router-dom";
import AccountMenu from "./components/AccountMenu";
import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaSearch,
  FaTrashAlt, FaStore, FaFilePdf, FaFileCsv, FaCheckCircle
} from "react-icons/fa";

interface CartItem {
  id: number;
  partId: number;
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

interface OrderSummary {
  orderId: number | string | null;
  totalAmount: number;
  items: OrderSummaryItem[];
  message?: string;
}

const CheckoutPage = () => {

  const [items, setItems] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncingCart, setIsSyncingCart] = useState(false);

  const navigate = useNavigate();

  const applyCartState = (cartItems: CartItem[]) => {
    setItems(cartItems);
    setQuantities(
      Object.fromEntries(cartItems.map((item) => [item.id, item.quantity]))
    );
  };

  const resolvePartImage = (item: Pick<CartItem, "imagePath">) => {
    const baseUrl = "http://localhost:5053";
    if (!item.imagePath) return null;
    if (item.imagePath.startsWith("http://") || item.imagePath.startsWith("https://"))
      return item.imagePath;
    const normalized = item.imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${baseUrl}/${normalized}`;
  };

  const buildOrderItemsFromCart = (): OrderSummaryItem[] =>
    items.map((item) => {
      const quantity = quantities[item.id] ?? item.quantity;
      return {
        id: item.partId,
        partName: item.partName,
        partNumber: item.partNumber,
        price: item.price,
        quantity,
        subTotal: item.price * quantity,
      };
    });

  const normalizeOrderSummary = (
    rawOrder: any,
    fallbackItems: OrderSummaryItem[] = []
  ): OrderSummary => ({
    orderId: rawOrder.orderId ?? rawOrder.OrderId ?? null,
    totalAmount: Number(
      rawOrder.totalAmount ?? rawOrder.TotalAmount ?? rawOrder.total ?? rawOrder.Total ?? 0
    ),
    items: Array.isArray(rawOrder.items)
      ? rawOrder.items
      : Array.isArray(rawOrder.Items)
        ? rawOrder.Items
        : fallbackItems,
    message: rawOrder.message ?? rawOrder.Message,
  });

  /* ── Fetch cart ── */
  const fetchCart = async (showSyncAlert = false) => {
    try {
      const res = await axios.get("/cart/my-cart");
      const cartItems: CartItem[] = res.data.items || [];
      const invalidItems = cartItems.filter((item) => item.quantity > item.stockQuantity);

      if (invalidItems.length > 0) {
        setIsSyncingCart(true);
        await Promise.all(
          invalidItems.map((item) =>
            axios.put(`/cart/update/${item.id}?quantity=${Math.max(0, item.stockQuantity)}`)
          )
        );
        const refreshed = await axios.get("/cart/my-cart");
        applyCartState(refreshed.data.items || []);
        if (showSyncAlert) alert("Cart quantities were adjusted to match available stock.");
        return;
      }

      applyCartState(cartItems);
    } catch (error) {
      console.error("Fetch cart failed:", error);
    } finally {
      setIsSyncingCart(false);
    }
  };

  useEffect(() => { fetchCart(true); }, []);

  /* ── Update quantity ── */
  const updateQuantity = async (id: number, value: number) => {
    const item = items.find((c) => c.id === id);
    if (!item || value < 1) return;
    if (value > item.stockQuantity) {
      alert(`Only ${item.stockQuantity} items available for ${item.partName}`);
      return;
    }
    setQuantities((prev) => ({ ...prev, [id]: value }));
    try {
      await axios.put(`/cart/update/${id}?quantity=${value}`);
      await fetchCart();
    } catch (error: any) {
      console.error("Update quantity failed:", error);
      alert(error.response?.data || "Failed to update quantity");
      await fetchCart();
    }
  };

  /* ── Remove item ── */
  const removeItemDraft = async (id: number) => {
    try {
      await axios.delete(`/cart/remove/${id}`);
      await fetchCart();
    } catch (error) {
      console.error("Remove item failed:", error);
    }
  };

  /* ── Clear cart ── */
  const clearCheckoutItems = async () => {
    try {
      await axios.delete("/cart/empty");
      setItems([]);
      setQuantities({});
    } catch (error) {
      console.error("Empty cart failed:", error);
    }
  };

  /* ── Total ── */
  const totalSum = items.reduce(
    (sum, item) => sum + item.price * (quantities[item.id] ?? item.quantity),
    0
  );

  /* ── Search ── */
  const filteredItems = items.filter(
    (item) =>
      item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ── Shop more ── */
  const handleShopMore = () => {
    const storedSearchState = sessionStorage.getItem("partsSearchState");
    if (storedSearchState) {
      navigate("/assembly_catalogue", { replace: true, state: JSON.parse(storedSearchState) });
      return;
    }
    navigate("/dashboard");
  };

  /* ── Download CSV ── */
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

  /* ── Download PDF ── */
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

  /* ── Place order ── */
  const placeOrder = async () => {
    if (items.length === 0) { alert("Your cart is empty"); return; }
    if (isSyncingCart) { alert("Cart is syncing with latest stock. Please wait."); return; }
    try {
      const orderItems = buildOrderItemsFromCart();
      const res = await axios.post("/cart/checkout");
      const orderData = normalizeOrderSummary(res.data, orderItems);
      sessionStorage.setItem("latestOrder", JSON.stringify(orderData));
      alert("Order placed successfully");
      navigate("/order_details", { state: { order: orderData } });
    } catch (err: any) {
      console.error("Checkout error:", err);
      if (err.response) {
        alert(err.response.data?.Message || "Checkout failed");
        await fetchCart(true);
      } else {
        alert("Server not responding");
      }
    }
  };

  return (

    <div className="checkout-page">

      {/* ── Navbar ── */}
      <nav className="checkout-topbar">

        {/* Row 1: brand + icon buttons */}
        <div className="checkout-topbar-row">

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

            <div
              className="nav-icon-btn cart-btn"
              onClick={() => navigate("/checkout")}
              style={{ cursor: "pointer" }}
            >
              <FaShoppingCart />
              {items.length > 0 && (
                <span className="cart-badge">{items.length}</span>
              )}
            </div>

            <AccountMenu />

          </div>

        </div>

        {/* Row 2: search strip */}
        <div className="checkout-search-bar">
          <div className="checkout-search">
            <span className="search-icon"><FaSearch /></span>
            <input
              type="text"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

      </nav>

      {/* ── Main content ── */}
      <main className="checkout-content">

        <h1>Cart</h1>

        <div className="checkout-table-panel">

          <div className="checkout-table-actions">
            <span className="checkout-table-title">Cart Items</span>
          </div>

          <div className="checkout-table-wrap">

            <table className="checkout-cart-table">

              <colgroup>
                <col className="checkout-col-action" />
                <col className="checkout-col-product" />
                <col className="checkout-col-part-number" />
                <col className="checkout-col-price" />
                <col className="checkout-col-qty" />
                <col className="checkout-col-total" />
              </colgroup>

              <thead>
                <tr>
                  <th>Action</th>
                  <th>Product</th>
                  <th>Product No.</th>
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

                      {/* Action */}
                      <td data-label="Action">
                        <button
                          className="checkout-remove-btn"
                          onClick={() => removeItemDraft(item.id)}
                          title="Remove"
                        >
                          <FaTrashAlt />
                        </button>
                      </td>

                      {/* Product */}
                      <td className="checkout-product-cell" data-label="Product">
                        <div className="checkout-product-info">
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={item.partName}
                              className="checkout-product-img"
                            />
                          ) : (
                            <div className="checkout-product-placeholder">No Image</div>
                          )}
                          <div className="checkout-product-meta">
                            <span className="checkout-product-name">{item.partName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Part number */}
                      <td className="checkout-part-number" data-label="Part No.">
                        {item.partNumber}
                      </td>

                      {/* Price */}
                      <td className="checkout-money" data-label="Price">
                        Rs. {item.price.toFixed(2)}
                      </td>

                      {/* Quantity */}
                      <td className="checkout-qty-cell" data-label="Quantity">
                        <input
                          type="number"
                          value={qty}
                          min={1}
                          max={item.stockQuantity}
                          className="checkout-qty-input"
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        />
                        {qty >= item.stockQuantity && (
                          <div className="stock-warning">Max stock reached</div>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="checkout-money checkout-subtotal" data-label="Subtotal">
                        Rs. {(item.price * qty).toFixed(2)}
                      </td>

                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="checkout-empty-row" data-label="">
                      No products found in cart
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ── Footer ── */}
        <div className="checkout-footer">

          {/* Desktop: text buttons | Mobile: icon buttons */}
          <div className="checkout-footer-buttons">

            {/* Desktop text buttons */}
            <button className="checkout-page-btn" onClick={clearCheckoutItems}>
              <FaTrashAlt /> Empty Cart
            </button>
            <button className="checkout-page-btn" onClick={handleShopMore}>
              <FaStore /> Shop More
            </button>
            <button className="checkout-page-btn" onClick={downloadPDF}>
              <FaFilePdf /> Download PDF
            </button>
            <button className="checkout-page-btn" onClick={downloadCSV}>
              <FaFileCsv /> Download CSV
            </button>
            <button className="checkout-page-btn" onClick={placeOrder}>
              <FaCheckCircle /> Place Order
            </button>

            {/* Mobile icon-only buttons */}
            <button className="checkout-icon-btn danger" onClick={clearCheckoutItems} title="Empty Cart">
              <FaTrashAlt />
              <span className="icon-label">Empty</span>
            </button>
            <button className="checkout-icon-btn" onClick={handleShopMore} title="Shop More">
              <FaStore />
              <span className="icon-label">Shop</span>
            </button>
            <button className="checkout-icon-btn" onClick={downloadPDF} title="Download PDF">
              <FaFilePdf />
              <span className="icon-label">PDF</span>
            </button>
            <button className="checkout-icon-btn" onClick={downloadCSV} title="Download CSV">
              <FaFileCsv />
              <span className="icon-label">CSV</span>
            </button>
            <button className="checkout-icon-btn success" onClick={placeOrder} title="Place Order">
              <FaCheckCircle />
              <span className="icon-label">Order</span>
            </button>

          </div>

          {/* Summary */}
          <div className="checkout-summary">
            <div className="summary-row">
              <span>Items</span>
              <span>{items.length}</span>
            </div>
            <div className="summary-row">
              <span>Total Amount</span>
              <span className="summary-total">Rs. {totalSum.toFixed(2)}</span>
            </div>
          </div>

        </div>

      </main>

    </div>

  );

};

export default CheckoutPage;