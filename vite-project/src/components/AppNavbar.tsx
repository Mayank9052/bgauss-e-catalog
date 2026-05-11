// src/components/AppNavbar.tsx
// Features:
//  ✅ Full form validation (email domain, 10-digit phone, name words-only)
//  ✅ Kind of Request required
//  ✅ Data Protection Policy fetched from bgauss.com/privacy-policy
//  ✅ Whistle Blower Policy PDF link embedded
//  ✅ Agree checkbox required (unchecked = blocked submit)
//  ✅ Home, Contact, Cart, My Orders buttons

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.jpg"
import AccountMenu from "./AccountMenu"
import axios from "axios"
import {
  FaHome, FaPhoneAlt, FaShoppingCart, FaTimes,
  FaEnvelope, FaListAlt, FaFileAlt, FaExternalLinkAlt,
} from "react-icons/fa"
import "./AppNavbar.css"

// ── Validation Helpers ────────────────────────────────────────
const ALLOWED_EMAIL_DOMAINS = /\.(com|in|org|net|co|io|edu|gov|info|biz)$/i

function validateEmail(email: string): string {
  if (!email.trim()) return "Email is required."
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) return "Enter a valid email address."
  if (!ALLOWED_EMAIL_DOMAINS.test(email.trim())) return "Email must end with a valid domain (e.g. @gmail.com, @bgauss.com)."
  return ""
}

function validateName(name: string, label: string): string {
  if (!name.trim()) return ""   // optional fields
  if (!/^[A-Za-z\s.'-]+$/.test(name.trim()))
    return `${label} must contain letters only.`
  return ""
}

function validatePhone(phone: string): string {
  if (!phone.trim()) return ""  // optional
  const digits = phone.replace(/\D/g, "")
  if (digits.length !== 10) return "Mobile number must be exactly 10 digits."
  if (!/^[6-9]/.test(digits)) return "Enter a valid Indian mobile number."
  return ""
}

// ── Privacy Policy Modal ──────────────────────────────────────
function PrivacyModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState(false)

  // Fetch on mount
  useState(() => {
    const controller = new AbortController()
    fetch("https://www.bgauss.com/privacy-policy/", { signal: controller.signal })
      .then(r => r.text())
      .then(html => {
        // Extract main text from the page — strip scripts/style tags
        const doc = new DOMParser().parseFromString(html, "text/html")
        // Remove script, style, nav, header, footer noise
        doc.querySelectorAll("script, style, nav, header, footer, iframe, noscript").forEach(el => el.remove())
        // Try to find the main content area
        const main =
          doc.querySelector("main") ||
          doc.querySelector(".entry-content") ||
          doc.querySelector(".page-content") ||
          doc.querySelector("article") ||
          doc.body
        setContent(main?.innerHTML ?? "")
        setLoading(false)
      })
      .catch(() => { setErr(true); setLoading(false) })
    return () => controller.abort()
  })

  return (
    <>
      <div className="an-modal-bg" onClick={onClose} style={{ zIndex: 3100 }} />
      <div className="an-modal an-modal--policy" role="dialog" aria-modal="true" style={{ zIndex: 3200 }}>
        <div className="an-modal__header">
          <div>
            <h2 className="an-modal__title"><FaFileAlt style={{ marginRight: 8, verticalAlign: "middle", fontSize: 15 }} />Data Protection & Privacy Policy</h2>
            <p className="an-modal__sub">Source: bgauss.com/privacy-policy</p>
          </div>
          <button className="an-modal__close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="an-policy-body">
          {loading && <p className="an-policy-loading">Loading privacy policy…</p>}
          {err && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ color: "#64748b", marginBottom: 14 }}>Could not load policy. View it directly:</p>
              <a href="https://www.bgauss.com/privacy-policy/" target="_blank" rel="noreferrer" className="an-policy-link">
                <FaExternalLinkAlt style={{ marginRight: 6 }} /> Open Privacy Policy
              </a>
            </div>
          )}
          {!loading && !err && (
            <div
              className="an-policy-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
          <div className="an-policy-whistle">
            <FaFileAlt style={{ marginRight: 8, flexShrink: 0 }} />
            <div>
              <strong>Whistle Blower Policy</strong>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
                For concerns about ethical violations or misconduct:
              </p>
              <a
                href="https://www.bgauss.com/wp-content/uploads/2025/09/Bgauss-Auto-Whistle-Blower-Policy-19.07.2025.pdf"
                target="_blank" rel="noreferrer" className="an-policy-link" style={{ marginTop: 6, display: "inline-flex" }}
              >
                <FaExternalLinkAlt style={{ marginRight: 6 }} /> View Whistle Blower Policy PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Contact Modal ─────────────────────────────────────────────
function ContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    subject: "", salutation: "", firstName: "", lastName: "",
    company: "", email: "", phone: "", message: "", agree: false,
  })
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [serverErr, setServerErr] = useState("")
  const [showPolicy, setShowPolicy] = useState(false)

  const ch = (field: string, val: string | boolean) =>
    setForm(p => ({ ...p, [field]: val }))

  // Live validation on blur
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}

    if (!form.subject.trim())
      e.subject = "Please select a kind of request."

    const firstErr = validateName(form.firstName, "First name")
    if (firstErr) e.firstName = firstErr

    const lastErr = validateName(form.lastName, "Last name")
    if (lastErr) e.lastName = lastErr

    const emailErr = validateEmail(form.email)
    if (emailErr) e.email = emailErr

    const phoneErr = validatePhone(form.phone)
    if (phoneErr) e.phone = phoneErr

    if (!form.message.trim())
      e.message = "Message is required."

    if (!form.agree)
      e.agree = "You must agree to the data protection terms to proceed."

    return e
  }

  const handleBlur = (field: string) => {
    const all = validate()
    setErrors(prev => ({ ...prev, [field]: all[field] ?? "" }))
  }

  // Only allow digits in phone
  const handlePhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10)
    ch("phone", digits)
  }

  // Only allow letters/spaces in name fields
  const handleName = (field: string, val: string) => {
    const cleaned = val.replace(/[^A-Za-z\s.'-]/g, "")
    ch(field, cleaned)
  }

  const handleSubmit = async () => {
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(v => v)) return

    setServerErr(""); setSending(true)
    try {
      await axios.post("/contact/send", {
        subject:    form.subject,
        salutation: form.salutation,
        firstName:  form.firstName,
        lastName:   form.lastName,
        company:    form.company,
        email:      form.email.trim(),
        phone:      form.phone,
        message:    form.message,
      })
      setSent(true)
      setTimeout(onClose, 2800)
    } catch {
      setServerErr("Failed to send message. Please try again or email us directly.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="an-modal-bg" onClick={onClose} />

      <div className="an-modal" role="dialog" aria-modal="true" aria-label="Contact form">
        {/* Header */}
        <div className="an-modal__header">
          <div>
            <h2 className="an-modal__title">
              <FaEnvelope style={{ marginRight: 8, verticalAlign: "middle", fontSize: 15 }} />
              Contact Us
            </h2>
            <p className="an-modal__sub">For assistance, suggestions, and part queries</p>
          </div>
          <button className="an-modal__close" onClick={onClose} aria-label="Close"><FaTimes /></button>
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

            {serverErr && <div className="an-error">{serverErr}</div>}

            {/* Subject — REQUIRED */}
            <div className="an-field">
              <label>Kind of Request <span className="an-req">*</span></label>
              <select
                value={form.subject}
                onChange={e => { ch("subject", e.target.value); setErrors(p => ({ ...p, subject: "" })) }}
                onBlur={() => handleBlur("subject")}
                className={errors.subject ? "an-input--err" : ""}
              >
                <option value="">Please choose…</option>
                <option>Technical Assistance</option>
                <option>Product Suggestion</option>
                <option>Parts Ordering Query</option>
                <option>Return / Replacement</option>
                <option>Other</option>
              </select>
              {errors.subject && <span className="an-field-err">{errors.subject}</span>}
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
                <input
                  value={form.firstName}
                  onChange={e => handleName("firstName", e.target.value)}
                  onBlur={() => handleBlur("firstName")}
                  placeholder="First name"
                  className={errors.firstName ? "an-input--err" : ""}
                />
                {errors.firstName && <span className="an-field-err">{errors.firstName}</span>}
              </div>
              <div className="an-field">
                <label>Last Name</label>
                <input
                  value={form.lastName}
                  onChange={e => handleName("lastName", e.target.value)}
                  onBlur={() => handleBlur("lastName")}
                  placeholder="Last name"
                  className={errors.lastName ? "an-input--err" : ""}
                />
                {errors.lastName && <span className="an-field-err">{errors.lastName}</span>}
              </div>
            </div>

            {/* Company + Phone */}
            <div className="an-row an-row--2">
              <div className="an-field">
                <label>Company</label>
                <input value={form.company} onChange={e => ch("company", e.target.value)} placeholder="Company name" />
              </div>
              <div className="an-field">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => handlePhone(e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  placeholder="10-digit number"
                  maxLength={10}
                  className={errors.phone ? "an-input--err" : ""}
                />
                {errors.phone && <span className="an-field-err">{errors.phone}</span>}
              </div>
            </div>

            {/* Email — REQUIRED */}
            <div className="an-field">
              <label>Email <span className="an-req">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={e => { ch("email", e.target.value); setErrors(p => ({ ...p, email: "" })) }}
                onBlur={() => handleBlur("email")}
                placeholder="your@email.com"
                className={errors.email ? "an-input--err" : ""}
              />
              {errors.email && <span className="an-field-err">{errors.email}</span>}
            </div>

            {/* Message — REQUIRED */}
            <div className="an-field">
              <label>Your Message <span className="an-req">*</span></label>
              <textarea
                rows={4}
                value={form.message}
                onChange={e => { ch("message", e.target.value); setErrors(p => ({ ...p, message: "" })) }}
                onBlur={() => handleBlur("message")}
                placeholder="Describe your query…"
                className={errors.message ? "an-input--err" : ""}
              />
              {errors.message && <span className="an-field-err">{errors.message}</span>}
            </div>

            {/* Agree — REQUIRED */}
            <div className="an-agree">
              <input
                type="checkbox" id="an-agree"
                checked={form.agree}
                onChange={e => { ch("agree", e.target.checked); setErrors(p => ({ ...p, agree: "" })) }}
              />
              <label htmlFor="an-agree">
                I agree to the collection and processing of my personal data.
                See our{" "}
                <button
                  type="button"
                  className="an-policy-btn"
                  onClick={() => setShowPolicy(true)}
                >
                  Data Protection Policy
                </button>
                {" "}and{" "}
                <a
                  href="https://www.bgauss.com/wp-content/uploads/2025/09/Bgauss-Auto-Whistle-Blower-Policy-19.07.2025.pdf"
                  target="_blank" rel="noreferrer" className="an-policy-btn"
                >
                  Whistle Blower Policy
                </a>.
              </label>
            </div>
            {errors.agree && <div className="an-field-err an-field-err--agree">{errors.agree}</div>}

            {/* Submit */}
            <button
              className="an-submit"
              onClick={() => void handleSubmit()}
              disabled={sending}
            >
              {sending ? "Sending…" : <><FaEnvelope style={{ marginRight: 8 }} /> SUBMIT</>}
            </button>
          </div>
        )}
      </div>

      {showPolicy && <PrivacyModal onClose={() => setShowPolicy(false)} />}
    </>
  )
}

// ── AppNavbar Props ────────────────────────────────────────────
interface AppNavbarProps {
  cartCount?:   number
  showOrders?:  boolean
  activeHome?:  boolean
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
        <div className="an-brand">
          <img src={logo} className="an-brand__logo" alt="BGAUSS Logo" />
          <div className="an-brand__text">
            <span className="an-brand__name">BGAUSS</span>
            <span className="an-brand__sub">Electronic Parts Catalog</span>
          </div>
        </div>

        <div className="an-actions">
          <button
            className={`an-btn${activeHome ? " an-btn--active" : ""}`}
            title="Home"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          <button className="an-btn" title="Contact Us" onClick={() => setShowContact(true)}>
            <FaPhoneAlt />
          </button>

          {showOrders && (
            <button className="an-orders-btn" title="My Orders" onClick={() => navigate("/order_history")}>
              <FaListAlt style={{ fontSize: 14 }} />
              <span>My Orders</span>
            </button>
          )}

          <button
            className="an-btn" title="Cart"
            onClick={() => navigate("/checkout")}
            style={{ position: "relative" }}
          >
            <FaShoppingCart />
            {cartCount > 0 && <span className="an-cart-badge">{cartCount}</span>}
          </button>

          <AccountMenu />
        </div>
      </nav>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  )
}