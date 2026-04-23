// OrderHistory.tsx — BGAUSS My Orders page
// Like Amazon/Flipkart order history
// Route: /order_history

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import logo from "./assets/logo.jpg"
import "./order_details.css"
import "./order_history.css"
import AccountMenu from "./components/AccountMenu"
import BreadcrumbPath from "./components/BreadcrumbPath"
import { FaHome, FaPhoneAlt, FaShoppingCart, FaBoxOpen, FaChevronRight } from "react-icons/fa"

interface OrderItem {
  id:         number
  partName:   string
  partNumber: string
  price:      number
  quantity:   number
  subTotal:   number
}

interface Order {
  id:          number
  orderId?:    number
  totalAmount: number
  status:      string
  createdAt?:  string
  items:       OrderItem[]
}

interface ApiOrder {
  id?:          number
  orderId?:     number
  totalAmount?: number
  TotalAmount?: number
  total?:       number
  status?:      string
  Status?:      string
  createdAt?:   string
  CreatedAt?:   string
  orderItems?:  ApiOrderItem[]
  OrderItems?:  ApiOrderItem[]
  items?:       ApiOrderItem[]
}

interface ApiOrderItem {
  id?:         number
  partId?:     number
  partName?:   string
  PartName?:   string
  partNumber?: string
  PartNumber?: string
  price?:      number
  Price?:      number
  quantity?:   number
  Quantity?:   number
  subTotal?:   number
  SubTotal?:   number
}

function parseOrders(raw: ApiOrder[]): Order[] {
  return raw.map(o => {
    const rawItems: ApiOrderItem[] = o.orderItems ?? o.OrderItems ?? o.items ?? []
    return {
      id:          o.id ?? o.orderId ?? 0,
      totalAmount: Number(o.totalAmount ?? o.TotalAmount ?? o.total ?? 0),
      status:      String(o.status ?? o.Status ?? "Pending"),
      createdAt:   o.createdAt ?? o.CreatedAt,
      items:       rawItems.map(i => ({
        id:         Number(i.id ?? i.partId ?? 0),
        partName:   String(i.partName   ?? i.PartName   ?? "—"),
        partNumber: String(i.partNumber ?? i.PartNumber ?? "—"),
        price:      Number(i.price      ?? i.Price      ?? 0),
        quantity:   Number(i.quantity   ?? i.Quantity   ?? 0),
        subTotal:   Number(i.subTotal   ?? i.SubTotal   ?? 0),
      })),
    }
  })
}

const statusColor = (s: string) => {
  const l = s.toLowerCase()
  if (l === "delivered")  return { bg: "#dcfce7", color: "#166534", border: "#86efac" }
  if (l === "cancelled")  return { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" }
  if (l === "confirmed")  return { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" }
  return                         { bg: "#fef9c3", color: "#854d0e", border: "#fde047" }
}

const fmtDate = (d?: string) => {
  if (!d) return "—"
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }
  catch { return d }
}

export default function OrderHistory() {
  const navigate = useNavigate()
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // GET /api/orders/my — returns current user's orders
        const res = await axios.get<ApiOrder[]>("/orders/my")
        setOrders(parseOrders(res.data ?? []))
      } catch {
        setError("Failed to load orders. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    void fetchOrders()
  }, [])

  const openOrder = (order: Order) => {
    // Navigate to order details with the order data
    const orderData = {
      orderId:     order.id,
      totalAmount: order.totalAmount,
      status:      order.status,
      message:     "Order placed successfully",
      items:       order.items.map(i => ({
        id:         i.id,
        partName:   i.partName,
        partNumber: i.partNumber,
        price:      i.price,
        quantity:   i.quantity,
        subTotal:   i.subTotal,
      })),
    }
    navigate("/order_details", { state: { order: orderData } })
  }

  // Restore stored parts state for back-nav
  const storedPartsState = (() => {
    try { return JSON.parse(sessionStorage.getItem("partsSearchState") ?? "null"); }
    catch { return null; }
  })()

  return (
    <div className="oh-wrapper">

      {/* Navbar */}
      <nav className="od-navbar">
        <div className="od-brand">
          <img src={logo} alt="BGAUSS" className="od-brand__logo" />
          <div className="od-brand__text">
            <span className="od-brand__name">BGAUSS</span>
            <span className="od-brand__sub">Electronic Parts Catalog</span>
          </div>
        </div>
        <div className="od-navbar__actions">
          <button className="od-nav-btn" onClick={() => navigate("/dashboard")} title="Home"><FaHome /></button>
          <button className="od-nav-btn" title="Contact"><FaPhoneAlt /></button>
          <button className="od-nav-btn" onClick={() => navigate("/checkout")} title="Cart"><FaShoppingCart /></button>
          <AccountMenu />
        </div>
      </nav>

      {/* Breadcrumb */}
      <BreadcrumbPath
        current="order_history"
        stateMap={{
          dashboard:           null,
          vehicle_preview:     storedPartsState,
          assembly_catalogue:  storedPartsState,
          parts:               storedPartsState,
          checkout:            null,
        }}
      />

      <main className="oh-content">
        <div className="oh-page-header">
          <h1 className="oh-title"><FaBoxOpen style={{ marginRight: 10, verticalAlign: "middle" }} />My Orders</h1>
          <p className="oh-subtitle">Track and manage your part orders</p>
        </div>

        {loading && (
          <div className="oh-loading">
            <div className="oh-spinner" />
            Loading your orders…
          </div>
        )}

        {error && (
          <div className="oh-error">{error}</div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="oh-empty">
            <div className="oh-empty__icon">📦</div>
            <h2>No Orders Yet</h2>
            <p>You haven't placed any orders yet. Start shopping to see your orders here.</p>
            <button className="oh-btn" onClick={() => navigate("/dashboard")}>Continue Shopping</button>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="oh-orders-list">
            {orders.map(order => {
              const sc = statusColor(order.status)
              return (
                <div
                  key={order.id}
                  className="oh-order-card"
                  onClick={() => openOrder(order)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && openOrder(order)}
                >
                  {/* Order header */}
                  <div className="oh-order-header">
                    <div className="oh-order-meta">
                      <span className="oh-order-id">Order #{order.id}</span>
                      <span className="oh-order-date">{fmtDate(order.createdAt)}</span>
                    </div>
                    <div className="oh-order-right">
                      <span
                        className="oh-status-badge"
                        style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}
                      >
                        {order.status}
                      </span>
                      <FaChevronRight className="oh-chevron" />
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="oh-order-items">
                    {order.items.slice(0, 3).map(item => (
                      <div key={item.id} className="oh-order-item">
                        <div className="oh-item-thumb">🔩</div>
                        <div className="oh-item-info">
                          <div className="oh-item-name">{item.partName}</div>
                          <div className="oh-item-num">{item.partNumber} · Qty: {item.quantity}</div>
                        </div>
                        {item.price > 0 && (
                          <div className="oh-item-price">₹{item.subTotal.toFixed(2)}</div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="oh-order-more">+{order.items.length - 3} more item{order.items.length - 3 !== 1 ? "s" : ""}</div>
                    )}
                  </div>

                  {/* Order footer */}
                  <div className="oh-order-footer">
                    <span className="oh-order-count">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                    <span className="oh-order-total">
                      {order.totalAmount > 0 ? `Total: ₹${order.totalAmount.toFixed(2)}` : "View Details →"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
