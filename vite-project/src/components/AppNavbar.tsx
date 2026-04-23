// src/components/AppNavbar.tsx
// Shared navbar used by ALL pages: Dashboard, AssemblyCatalogue, VehiclePreview,
// SearchParts, Checkout, OrderDetails, OrderHistory.
//
// Features:
//  ✅ Home button → /dashboard
//  ✅ Contact button → opens full contact form modal
//  ✅ Cart button → /checkout (shows live badge count)
//  ✅ My Orders button (optional) → /order_history
//  ✅ Contact form POSTs to /api/contact/send → emails both recipients
//  ✅ Cart count passed as prop (each page fetches its own)

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.jpg"
import AccountMenu from "./AccountMenu"
import axios from "axios"
import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaTimes,
  FaEnvelope, FaListAlt,
} from "react-icons/fa"
import "./AppNavbar.css"

// ── Contact Modal ─────────────────────────────────────────────
function ContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    subject: "", salutation: "", firstName: "", lastName: "",
    company: "", email: "", phone: "", message: "", agree: false,
  })
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState("")

  const ch = (field: string, val: string | boolean) =>
    setForm(p => ({ ...p, [field]: val }))

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.message.trim()) {
      setError("Please fill in your email and message."); return
    }
    if (!form.agree) {
      setError("Please agree to the data protection terms."); return
    }
    setError(""); setSending(true)
    try {
      await axios.post("/api/contact/send", {
        subject:    form.subject || "General Enquiry",
        salutation: form.salutation,
        firstName:  form.firstName,
        lastName:   form.lastName,
        company:    form.company,
        email:      form.email,
        phone:      form.phone,
        message:    form.message,
      })
      setSent(true)
      setTimeout(onClose, 2500)
    } catch {
      setError("Failed to send message. Please try again or email us directly.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="an-modal-bg" onClick={onClose} />

      {/* Modal */}
      <div className="an-modal" role="dialog" aria-modal="true" aria-label="Contact form">
        {/* Header */}
        <div className="an-modal__header">
          <div>
            <h2 className="an-modal__title">
              <FaEnvelope style={{ marginRight: 8, verticalAlign: "middle", fontSize: 16 }} />
              Contact Us
            </h2>
            <p className="an-modal__sub">
              For assistance, suggestions, and part queries
            </p>
          </div>
          <button className="an-modal__close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        {sent ? (
          <div className="an-sent">
            <div className="an-sent__icon">✅</div>
            <h3>Message Sent!</h3>
            <p>We'll get back to you as soon as possible.</p>
          </div>
        ) : (
          <div className="an-modal__body">
            <p className="an-modal__intro">
              Fill in the form and we'll respond quickly. You can also email us at{" "}
              <a href="mailto:sachin.raut@bgauss.com">sachin.raut@bgauss.com</a>.
            </p>

            {error && <div className="an-error">{error}</div>}

            {/* Subject */}
            <div className="an-field">
              <label>Kind of Request *</label>
              <select value={form.subject} onChange={e => ch("subject", e.target.value)}>
                <option value="">Please choose</option>
                <option>Technical Assistance</option>
                <option>Product Suggestion</option>
                <option>Parts Ordering Query</option>
                <option>Return / Replacement</option>
                <option>Other</option>
              </select>
            </div>

            {/* Name row */}
            <div className="an-row an-row--3">
              <div className="an-field">
                <label>Salutation</label>
                <select value={form.salutation} onChange={e => ch("salutation", e.target.value)}>
                  <option value="">—</option>
                  <option>Mr.</option><option>Ms.</option>
                  <option>Mrs.</option><option>Dr.</option>
                </select>
              </div>
              <div className="an-field">
                <label>First Name</label>
                <input value={form.firstName} onChange={e => ch("firstName", e.target.value)} placeholder="First name" />
              </div>
              <div className="an-field">
                <label>Last Name</label>
                <input value={form.lastName}  onChange={e => ch("lastName",  e.target.value)} placeholder="Last name" />
              </div>
            </div>

            {/* Company + Phone */}
            <div className="an-row an-row--2">
              <div className="an-field">
                <label>Company</label>
                <input value={form.company} onChange={e => ch("company", e.target.value)} placeholder="Company name" />
              </div>
              <div className="an-field">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={e => ch("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>

            {/* Email */}
            <div className="an-field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => ch("email", e.target.value)} placeholder="your@email.com" />
            </div>

            {/* Message */}
            <div className="an-field">
              <label>Your Message *</label>
              <textarea rows={4} value={form.message} onChange={e => ch("message", e.target.value)} placeholder="Describe your query…" />
            </div>

            {/* Agree */}
            <div className="an-agree">
              <input
                type="checkbox" id="an-agree"
                checked={form.agree}
                onChange={e => ch("agree", e.target.checked)}
              />
              <label htmlFor="an-agree">
                I agree to the collection and processing of my personal data.
                See our <a href="#">Data Protection Policy</a>.
              </label>
            </div>

            {/* Submit */}
            <button className="an-submit" onClick={() => void handleSubmit()} disabled={sending}>
              {sending ? "Sending…" : <><FaEnvelope style={{ marginRight: 8 }} /> SUBMIT</>}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── AppNavbar Props ────────────────────────────────────────────
interface AppNavbarProps {
  cartCount?:    number          // badge number on cart icon
  showOrders?:   boolean         // show "My Orders" button (checkout / order pages)
  activeHome?:   boolean         // highlight home icon
}

// ── AppNavbar ─────────────────────────────────────────────────
export default function AppNavbar({
  cartCount   = 0,
  showOrders  = false,
  activeHome  = false,
}: AppNavbarProps) {
  const navigate = useNavigate()
  const [showContact, setShowContact] = useState(false)

  return (
    <>
      <nav className="an-navbar">
        {/* Brand */}
        <div className="an-brand">
          <img src={logo} className="an-brand__logo" alt="BGAUSS Logo" />
          <div className="an-brand__text">
            <span className="an-brand__name">BGAUSS</span>
            <span className="an-brand__sub">Electronic Parts Catalog</span>
          </div>
        </div>

        {/* Actions */}
        <div className="an-actions">
          {/* Home */}
          <button
            className={`an-btn${activeHome ? " an-btn--active" : ""}`}
            title="Home"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          {/* Contact — opens modal */}
          <button
            className="an-btn"
            title="Contact Us"
            onClick={() => setShowContact(true)}
          >
            <FaPhoneAlt />
          </button>

          {/* My Orders (optional) */}
          {showOrders && (
            <button
              className="an-orders-btn"
              title="My Orders"
              onClick={() => navigate("/order_history")}
            >
              <FaListAlt style={{ fontSize: 14 }} />
              <span>My Orders</span>
            </button>
          )}

          {/* Cart */}
          <button
            className="an-btn"
            title="Cart"
            onClick={() => navigate("/checkout")}
            style={{ position: "relative" }}
          >
            <FaShoppingCart />
            {cartCount > 0 && (
              <span className="an-cart-badge">{cartCount}</span>
            )}
          </button>

          <AccountMenu />
        </div>
      </nav>

      {/* Contact modal */}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  )
}