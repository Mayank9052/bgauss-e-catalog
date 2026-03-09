import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import logo from "./assets/logo.jpg";
import "./checkout.css";

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

const OrderDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const rawOrder = location.state?.order;
  const order: OrderSummary | null = rawOrder
    ? {
      orderId: rawOrder.orderId ?? rawOrder.OrderId ?? null,
      totalAmount: Number(
        rawOrder.totalAmount ?? rawOrder.total ?? rawOrder.Total ?? 0
      ),
      items: Array.isArray(rawOrder.items) ? rawOrder.items : [],
      message: rawOrder.message ?? rawOrder.Message
    }
    : null;

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

  if (!order) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>No Order Found</h2>
        <button onClick={() => navigate("/dashboard")}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <nav className="checkout-topbar">
        <div className="checkout-topbar-left">
          <img src={logo} alt="Logo" className="checkout-logo" />
          <span>Electronic Parts Catalog</span>
        </div>

        <div className="checkout-topbar-right">
          <span onClick={() => navigate("/dashboard")}>Home</span>
          <span>Contact Us</span>
          <span className="checkout-icon">🔍</span>
          <span className="checkout-icon" onClick={handleProfileClick}>
            👤
          </span>
          <span className="checkout-cart">🛒</span>
        </div>
      </nav>

      <main className="checkout-content">
        <h1>Order Summary</h1>
        {order.message && <p>{order.message}</p>}

        <div className="checkout-table-wrap">
          <table className="checkout-cart-table">
            <thead>
              <tr>
                <th>Part Name</th>
                <th>Part Number</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {order.items.length > 0 ? (
                order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.partName}</td>
                    <td>{item.partNumber}</td>
                    <td>Rs. {Number(item.price).toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td>Rs. {Number(item.subTotal).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No items found for this order.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="checkout-summary" style={{ marginTop: "30px" }}>
          <div className="summary-row">
            <span>Order ID</span>
            <span>{order.orderId ?? "-"}</span>
          </div>

          <div className="summary-row">
            <span>Total Amount</span>
            <span className="summary-total">Rs. {order.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ marginTop: "30px" }}>
          <button
            className="checkout-page-btn"
            onClick={() => navigate("/dashboard")}
          >
            Continue Shopping
          </button>
        </div>
      </main>
    </div>
  );
};

export default OrderDetails;
