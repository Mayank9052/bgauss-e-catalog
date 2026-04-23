// checkout.tsx — updated with BreadcrumbPath
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./checkout.css";
import { useNavigate } from "react-router-dom";
import AppNavbar from "./components/AppNavbar";
import BreadcrumbPath from "./components/BreadcrumbPath";
import {
  FaSearch, FaTrashAlt, FaStore, FaFilePdf, FaFileCsv, FaCheckCircle,
} from "react-icons/fa";

interface CartItem {
  id:            number;
  partId:        number;
  partName:      string;
  partNumber:    string;
  imagePath?:    string | null;
  price:         number;
  quantity:      number;
  subTotal:      number;
  stockQuantity: number;
}

interface CartResponse { items: CartItem[]; }

interface OrderSummaryItem {
  id: number; partName: string; partNumber: string;
  price: number; quantity: number; subTotal: number;
}

interface OrderApiResponse {
  orderId?: number | string | null; OrderId?: number | string | null;
  totalAmount?: number; TotalAmount?: number; total?: number; Total?: number;
  items?: OrderSummaryItem[]; Items?: OrderSummaryItem[];
  message?: string; Message?: string;
}

interface OrderSummary {
  orderId: number | string | null; totalAmount: number;
  items: OrderSummaryItem[]; message?: string;
}

interface DownloadResponse { path: string; }

const CheckoutPage = () => {
  const [items,         setItems]         = useState<CartItem[]>([]);
  const [quantities,    setQuantities]    = useState<Record<number, number>>({});
  const [searchTerm,    setSearchTerm]    = useState("");
  const [isSyncingCart, setIsSyncingCart] = useState(false);
  const navigate = useNavigate();

  const applyCartState = (cartItems: CartItem[]) => {
    setItems(cartItems);
    setQuantities(Object.fromEntries(cartItems.map(item => [item.id, item.quantity])));
  };

  const buildOrderItemsFromCart = (): OrderSummaryItem[] =>
    items.map(item => {
      const quantity = quantities[item.id] ?? item.quantity;
      return { id: item.partId, partName: item.partName, partNumber: item.partNumber,
               price: item.price, quantity, subTotal: item.price * quantity };
    });

  const normalizeOrderSummary = (raw: OrderApiResponse, fallback: OrderSummaryItem[] = []): OrderSummary => ({
    orderId:     raw.orderId ?? raw.OrderId ?? null,
    totalAmount: Number(raw.totalAmount ?? raw.TotalAmount ?? raw.total ?? raw.Total ?? 0),
    items:       Array.isArray(raw.items) ? raw.items : Array.isArray(raw.Items) ? raw.Items : fallback,
    message:     raw.message ?? raw.Message,
  });

  const fetchCart = useCallback(async (showSyncAlert = false) => {
    try {
      const res = await axios.get<CartResponse>("/cart/my-cart");
      const cartItems = res.data.items || [];
      const invalid = cartItems.filter(i => i.quantity > i.stockQuantity);
      if (invalid.length > 0) {
        setIsSyncingCart(true);
        await Promise.all(invalid.map(i =>
          axios.put(`/cart/update/${i.id}?quantity=${Math.max(0, i.stockQuantity)}`)
        ));
        const refreshed = await axios.get<CartResponse>("/cart/my-cart");
        applyCartState(refreshed.data.items || []);
        if (showSyncAlert) alert("Cart quantities adjusted to available stock.");
        return;
      }
      applyCartState(cartItems);
    } catch (err) {
      console.error("Fetch cart failed:", err);
    } finally {
      setIsSyncingCart(false);
    }
  }, []);

  useEffect(() => { void fetchCart(true); }, [fetchCart]);

  const updateQuantity = async (id: number, value: number) => {
    const item = items.find(c => c.id === id);
    if (!item || value < 1) return;
    if (value > item.stockQuantity) { alert(`Only ${item.stockQuantity} items available for ${item.partName}`); return; }
    setQuantities(prev => ({ ...prev, [id]: value }));
    try {
      await axios.put(`/cart/update/${id}?quantity=${value}`);
      await fetchCart();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as string | undefined) : undefined;
      alert(msg ?? "Failed to update quantity");
      await fetchCart();
    }
  };

  const removeItemDraft = async (id: number) => {
    try {
      await axios.delete(`/cart/remove/${id}`); await fetchCart();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 405) {
        try { await axios.delete(`/api/cart/remove/${id}`); await fetchCart(); }
        catch { alert("Could not remove item."); }
      } else { console.error("Remove item failed:", err); }
    }
  };

  const clearCheckoutItems = async () => {
    try { await axios.delete("/cart/empty"); setItems([]); setQuantities({}); }
    catch (err) { console.error("Empty cart failed:", err); }
  };

  const totalSum = items.reduce((sum, item) => sum + item.price * (quantities[item.id] ?? item.quantity), 0);

  const filteredItems = items.filter(item =>
    item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShopMore = () => {
    const stored = sessionStorage.getItem("partsSearchState");
    if (stored) { navigate("/assembly_catalogue", { replace: true, state: JSON.parse(stored) }); return; }
    navigate("/dashboard");
  };

  const downloadCSV = async () => {
    try {
      const res  = await axios.get<DownloadResponse>("/cart/download/csv");
      const link = document.createElement("a");
      // Dev: use localhost:5053; Production: use relative path below
      link.href = `http://localhost:5053${res.data.path}`;
      //link.href = res.data.path.startsWith("/") ? res.data.path : `/${res.data.path}`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) { console.error("CSV download failed:", err); }
  };

  const downloadPDF = async () => {
    try {
      const res  = await axios.get<DownloadResponse>("/cart/download/pdf");
      const link = document.createElement("a");
      // Dev: use localhost:5053; Production: use relative path below
      link.href = `http://localhost:5053${res.data.path}`;
      //link.href = res.data.path.startsWith("/") ? res.data.path : `/${res.data.path}`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) { console.error("PDF download failed:", err); }
  };

  const placeOrder = async () => {
    if (items.length === 0)  { alert("Your cart is empty"); return; }
    if (isSyncingCart)       { alert("Cart is syncing. Please wait."); return; }
    try {
      const orderItems = buildOrderItemsFromCart();
      const res        = await axios.post<OrderApiResponse>("/cart/checkout");
      const orderData  = normalizeOrderSummary(res.data, orderItems);
      sessionStorage.setItem("latestOrder", JSON.stringify(orderData));
      alert("Order placed successfully");
      navigate("/order_details", { state: { order: orderData } });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { Message?: string } | string | undefined;
        const msg = typeof data === "object" ? data?.Message : data;
        alert(msg ?? "Checkout failed"); await fetchCart(true);
      } else {
        alert("Server not responding");
      }
    }
  };

  // Restore back-nav state for breadcrumb
  const storedPartsState = (() => {
    try { return JSON.parse(sessionStorage.getItem("partsSearchState") ?? "null"); }
    catch { return null; }
  })();

  return (
    <div className="checkout-page">

      {/* Shared navbar */}
      <AppNavbar cartCount={items.length} showOrders />

      {/* Breadcrumb */}
      <BreadcrumbPath
        current="checkout"
        stateMap={{
          dashboard:           null,
          vehicle_preview:     storedPartsState,
          assembly_catalogue:  storedPartsState,
          parts:               storedPartsState,
        }}
      />

      <main className="checkout-content">
        <h1>Cart</h1>

        <div className="checkout-table-panel">
          <div className="checkout-table-actions">
            <span className="checkout-table-title">Cart Items</span>
            <div className="checkout-search">
              <span className="search-icon"><FaSearch /></span>
              <input
                type="text" placeholder="Search parts..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
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
                  <th>Action</th><th>Product</th><th>Product No.</th>
                  <th>Price</th><th>Quantity</th><th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const qty = quantities[item.id] ?? item.quantity;
                  return (
                    <tr key={item.id}>
                      <td data-label="Action">
                        <button className="checkout-remove-btn" onClick={() => void removeItemDraft(item.id)} title="Remove">
                          <FaTrashAlt />
                        </button>
                      </td>
                      <td className="checkout-product-cell" data-label="Product">
                        <div className="checkout-product-info">
                          <div className="checkout-product-meta">
                            <span className="checkout-product-name">{item.partName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="checkout-part-number" data-label="Part No.">{item.partNumber}</td>
                      <td className="checkout-money" data-label="Price">Rs. {item.price.toFixed(2)}</td>
                      <td className="checkout-qty-cell" data-label="Quantity">
                        <div style={{ display:"flex", alignItems:"center", border:"1.5px solid #e2e8f0", borderRadius:8, overflow:"hidden", width:"fit-content", margin:"0 auto" }}>
                          <button
                            onClick={() => void updateQuantity(item.id, Math.max(1, qty - 1))}
                            disabled={qty <= 1}
                            style={{ width:30, height:32, border:"none", borderRight:"1px solid #e2e8f0", background: qty<=1?"#f8fafc":"#f1f5f9", color: qty<=1?"#cbd5e1":"#374151", fontWeight:800, fontSize:16, cursor: qty<=1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                          >−</button>
                          <input
                            type="number" value={qty} min={1} max={item.stockQuantity}
                            onChange={e => { const v=Number(e.target.value); if(!isNaN(v)&&v>=1&&v<=item.stockQuantity) void updateQuantity(item.id,v); }}
                            style={{ width:42, height:32, border:"none", outline:"none", textAlign:"center", fontWeight:700, fontSize:13, color:"#0f172a", background:"#fff", MozAppearance:"textfield" }}
                          />
                          <button
                            onClick={() => void updateQuantity(item.id, Math.min(item.stockQuantity, qty + 1))}
                            disabled={qty >= item.stockQuantity}
                            style={{ width:30, height:32, border:"none", borderLeft:"1px solid #e2e8f0", background: qty>=item.stockQuantity?"#f8fafc":"#f1f5f9", color: qty>=item.stockQuantity?"#cbd5e1":"#374151", fontWeight:800, fontSize:16, cursor: qty>=item.stockQuantity?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                          >+</button>
                        </div>
                        {qty >= item.stockQuantity && (
                          <div style={{ fontSize:10, color:"#f59e0b", fontWeight:700, textAlign:"center", marginTop:3 }}>Max stock reached</div>
                        )}
                      </td>
                      <td className="checkout-money checkout-subtotal" data-label="Subtotal">
                        Rs. {(item.price * qty).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={6} className="checkout-empty-row">No products found in cart</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="checkout-footer">
          <div className="checkout-footer-buttons">
            <button className="checkout-page-btn" onClick={() => void clearCheckoutItems()}><FaTrashAlt /> Empty Cart</button>
            <button className="checkout-page-btn" onClick={handleShopMore}><FaStore /> Shop More</button>
            <button className="checkout-page-btn" onClick={() => void downloadPDF()}><FaFilePdf /> Download PDF</button>
            <button className="checkout-page-btn" onClick={() => void downloadCSV()}><FaFileCsv /> Download CSV</button>
            <button className="checkout-page-btn" onClick={() => void placeOrder()}><FaCheckCircle /> Place Order</button>

            {/* Mobile icon-only versions */}
            <button className="checkout-icon-btn danger" onClick={() => void clearCheckoutItems()} title="Empty Cart"><FaTrashAlt /><span className="icon-label">Empty</span></button>
            <button className="checkout-icon-btn" onClick={handleShopMore} title="Shop More"><FaStore /><span className="icon-label">Shop</span></button>
            <button className="checkout-icon-btn" onClick={() => void downloadPDF()} title="Download PDF"><FaFilePdf /><span className="icon-label">PDF</span></button>
            <button className="checkout-icon-btn" onClick={() => void downloadCSV()} title="Download CSV"><FaFileCsv /><span className="icon-label">CSV</span></button>
            <button className="checkout-icon-btn success" onClick={() => void placeOrder()} title="Place Order"><FaCheckCircle /><span className="icon-label">Order</span></button>
          </div>

          <div className="checkout-summary">
            <div className="summary-row"><span>Items</span><span>{items.length}</span></div>
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