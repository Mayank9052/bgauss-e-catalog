// src/components/BreadcrumbPath.tsx
// Breadcrumb navigation bar — shows the user's current position in the app
// and allows clicking any previous step to navigate back.
//
// Steps:
//  1. Dashboard
//  2. Vehicle Preview
//  3. Assembly Catalogue
//  4. Parts (SearchParts)
//  5. Cart (Checkout)
//  6. Order Details / Order History

import { useNavigate } from "react-router-dom"
import "./BreadcrumbPath.css"

export type BreadcrumbStep =
  | "dashboard"
  | "vehicle_preview"
  | "assembly_catalogue"
  | "parts"
  | "checkout"
  | "order_details"
  | "order_history"

interface StepDef {
  key:   BreadcrumbStep
  label: string
  short: string          // short label for mobile
  route: string
}

const ALL_STEPS: StepDef[] = [
  { key: "dashboard",           label: "Dashboard",          short: "Home",       route: "/dashboard" },
  { key: "vehicle_preview",     label: "Vehicle Preview",    short: "Vehicle",    route: "/vehicle_preview" },
  { key: "assembly_catalogue",  label: "Assembly Catalogue", short: "Assemblies", route: "/assembly_catalogue" },
  { key: "parts",               label: "Parts",              short: "Parts",      route: "/parts" },
  { key: "checkout",            label: "Cart",               short: "Cart",       route: "/checkout" },
  { key: "order_details",       label: "Order Details",      short: "Order",      route: "/order_details" },
  { key: "order_history",       label: "My Orders",          short: "Orders",     route: "/order_history" },
]

// Pages that have a linear flow — only show steps up to and including current
const LINEAR_FLOW: BreadcrumbStep[] = [
  "dashboard",
  "vehicle_preview",
  "assembly_catalogue",
  "parts",
  "checkout",
  "order_details",
]

// Order history is a side branch off checkout
const ORDER_HISTORY_FLOW: BreadcrumbStep[] = [
  "dashboard",
  "vehicle_preview",
  "assembly_catalogue",
  "parts",
  "checkout",
  "order_history",
]

interface BreadcrumbPathProps {
  current: BreadcrumbStep
  // Optional: pass location.state so back-navigation can carry state forward
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateMap?: Record<string, any>
}

export default function BreadcrumbPath({ current, stateMap = {} }: BreadcrumbPathProps) {
  const navigate = useNavigate()

  // Pick the right flow
  const flow = current === "order_history" ? ORDER_HISTORY_FLOW : LINEAR_FLOW

  // Only show steps up to and including current
  const currentIdx = flow.indexOf(current)
  const visibleSteps = flow.slice(0, currentIdx + 1).map(
    key => ALL_STEPS.find(s => s.key === key)!
  )

  const handleClick = (step: StepDef, idx: number) => {
    // Can only navigate to previous steps (not current)
    if (idx >= visibleSteps.length - 1) return
    navigate(step.route, { state: stateMap[step.key] ?? null })
  }

  return (
    <div className="bc-bar" aria-label="Breadcrumb navigation">
      <div className="bc-track">
        {visibleSteps.map((step, idx) => {
          const isActive  = idx === visibleSteps.length - 1
          const isVisited = idx <  visibleSteps.length - 1
          const stepNum   = idx + 1

          return (
            <div key={step.key} className="bc-item-wrap">
              {/* Connector line between steps */}
              {idx > 0 && (
                <div className={`bc-connector${isActive ? "" : " bc-connector--done"}`} />
              )}

              <button
                className={[
                  "bc-step",
                  isActive  ? "bc-step--active"  : "",
                  isVisited ? "bc-step--visited"  : "",
                ].filter(Boolean).join(" ")}
                onClick={() => handleClick(step, idx)}
                disabled={isActive}
                title={isVisited ? `Go back to ${step.label}` : step.label}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="bc-step__circle">
                  {isVisited ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="bc-step__num">{stepNum}</span>
                  )}
                </span>
                <span className="bc-step__label">
                  <span className="bc-step__label--full">{step.label}</span>
                  <span className="bc-step__label--short">{step.short}</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}