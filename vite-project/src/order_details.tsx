import { useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/logo.jpg";
import "./checkout.css";
import AccountMenu from "./components/AccountMenu";
import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa";

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

  const navigate = useNavigate();
  const location = useLocation();

  /* ================= GET ORDER DATA ================= */

  const stateOrder = location.state?.order;

  const storedOrder = sessionStorage.getItem("latestOrder");

  const rawOrder =
    stateOrder ||
    (storedOrder ? JSON.parse(storedOrder) : null);

  const order: OrderSummary | null = rawOrder
    ? {
        orderId: rawOrder.orderId ?? rawOrder.OrderId ?? null,
        totalAmount: Number(
          rawOrder.totalAmount ??
          rawOrder.TotalAmount ??
          rawOrder.total ??
          rawOrder.Total ??
          0
        ),
        items: Array.isArray(rawOrder.items)
          ? rawOrder.items.map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              partName: item.partName ?? item.PartName ?? "-",
              partNumber: item.partNumber ?? item.PartNumber ?? "-",
              price: Number(item.price ?? item.Price ?? 0),
              quantity: Number(item.quantity ?? item.Quantity ?? 0),
              subTotal: Number(
                item.subTotal ?? item.SubTotal ?? item.subtotal ?? 0
              )
            }))
          : Array.isArray(rawOrder.Items)
          ? rawOrder.Items.map((item: any) => ({
              id: item.id ?? item.Id ?? 0,
              partName: item.partName ?? item.PartName ?? "-",
              partNumber: item.partNumber ?? item.PartNumber ?? "-",
              price: Number(item.price ?? item.Price ?? 0),
              quantity: Number(item.quantity ?? item.Quantity ?? 0),
              subTotal: Number(
                item.subTotal ?? item.SubTotal ?? item.subtotal ?? 0
              )
            }))
          : [],
        message: rawOrder.message ?? rawOrder.Message
      }
    : null;

  /* ================= NO ORDER ================= */

  if (!order) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>No Order Found</h2>
        <button onClick={() => navigate("/dashboard")}>
          Go Back
        </button>
      </div>
    );
  }

  /* ================= UI ================= */

  return (

    <div className="checkout-page">

      {/* NAVBAR */}

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

          <button
            className="nav-icon-btn"
            onClick={() => navigate("/checkout")}
            title="Cart"
          >
            <FaShoppingCart />
          </button>

          <AccountMenu />
        </div>

      </nav>

      {/* CONTENT */}

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

        {/* SUMMARY */}

        <div className="checkout-summary" style={{ marginTop: "30px" }}>

          <div className="summary-row">
            <span>Order ID</span>
            <span>{order.orderId ?? "-"}</span>
          </div>

          <div className="summary-row">
            <span>Total Amount</span>
            <span className="summary-total">
              Rs. {order.totalAmount.toFixed(2)}
            </span>
          </div>

        </div>

        {/* BUTTON */}

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
