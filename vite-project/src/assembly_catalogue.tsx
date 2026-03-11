import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import logo from "./assets/logo.jpg"
import "./assembly_catalogue.css"
import AccountMenu from "./components/AccountMenu"
import { getVehicleImageByVin } from "./services/api"
import type { Assembly } from "./services/api"

interface VehicleSearchState {
  searchType?: "vin" | "model"
  vin?: string
  modelId?: number | string
  variantId?: number | string
  colourId?: number | string
  modelName?: string
  variantName?: string
  colourName?: string
}

const readStoredSearchState = (): VehicleSearchState | null => {
  try {
    const raw = sessionStorage.getItem("partsSearchState")
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const toNumber = (value: number | string | undefined): number | undefined => {
  if (value == null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const resolveAssemblyImage = (imagePath?: string | null): string => {

  if (!imagePath) return ""

  const normalized = imagePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")

  return `http://localhost:5053/${normalized}`
}

const AssemblyCatalogue = () => {

  const location = useLocation()
  const navigate = useNavigate()

  const searchState = useMemo(() => {
    const routeState = location.state as VehicleSearchState | null
    const storedState = readStoredSearchState()
    return routeState && Object.keys(routeState).length > 0
      ? routeState
      : (storedState ?? {})
  }, [location.state])

  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [zoomImage, setZoomImage] = useState<string | null>(null)

  const [showLens, setShowLens] = useState(false)
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 })

  const [resolvedState, setResolvedState] = useState(() => ({
    searchType: searchState.searchType,
    vin: searchState.vin ?? "",
    modelId: toNumber(searchState.modelId),
    variantId: toNumber(searchState.variantId),
    colourId: toNumber(searchState.colourId)
  }))

  useEffect(() => {
    setResolvedState({
      searchType: searchState.searchType,
      vin: searchState.vin ?? "",
      modelId: toNumber(searchState.modelId),
      variantId: toNumber(searchState.variantId),
      colourId: toNumber(searchState.colourId)
    })
  }, [searchState])

  useEffect(() => {

    let active = true

    const fetchAssemblies = async () => {

      setLoading(true)
      setErrorMessage("")

      try {

        let modelId = resolvedState.modelId
        let variantId = resolvedState.variantId
        let colourId = resolvedState.colourId

        if (
          (modelId == null || variantId == null || colourId == null) &&
          resolvedState.searchType === "vin" &&
          resolvedState.vin
        ) {

          const vinData = await getVehicleImageByVin(resolvedState.vin)

          modelId = vinData.modelId
          variantId = vinData.variantId
          colourId = vinData.colourId

          if (modelId == null)
            throw new Error("Unable to resolve vehicle from VIN")

          const nextState = {
            ...searchState,
            modelId,
            variantId,
            colourId
          }

          sessionStorage.setItem(
            "partsSearchState",
            JSON.stringify(nextState)
          )

          if (active) {
            setResolvedState(prev => ({
              ...prev,
              modelId,
              variantId,
              colourId
            }))
          }

        }

        if (modelId == null)
          throw new Error("Vehicle model missing")

        const response = await fetch("/api/assemblies")

        if (!response.ok)
          throw new Error("Failed to fetch assemblies")

        const data: Assembly[] = await response.json()

        const filtered = data.filter(a => (a as any).modelId === modelId)

        if (!active) return

        setAssemblies(filtered)

        if (filtered.length === 0)
          setErrorMessage("No assemblies found for selected vehicle")

      }
      catch (error) {

        console.error("Assembly load failed", error)

        if (active) {
          setAssemblies([])
          setErrorMessage("Unable to load vehicle assemblies")
        }

      }
      finally {

        if (active)
          setLoading(false)

      }

    }

    fetchAssemblies()

    return () => { active = false }

  }, [
    resolvedState.searchType,
    resolvedState.vin,
    resolvedState.modelId,
    resolvedState.variantId,
    resolvedState.colourId,
    searchState
  ])

  return (

    <div className="assembly-page">

      <nav className="epc-navbar">

        <div className="brand">

          <img src={logo} alt="BGAUSS Logo" className="nav-logo" />

          <div className="brand-text">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="nav-actions">

          <button
            className="nav-link active"
            onClick={() => navigate("/dashboard")}
          >
            Home
          </button>

          <button className="nav-link">Contact</button>

          <span className="nav-icon">🛒</span>

          <AccountMenu />

        </div>

      </nav>

      <main className="assembly-content">

        <h2>Assembly Catalogue</h2>

        {loading ? (
          <p>Loading assemblies...</p>
        ) : errorMessage && assemblies.length === 0 ? (
          <p className="error-text">{errorMessage}</p>
        ) : (

          <div className="assembly-grid">

            {assemblies.map((assembly) => (

              <button
                key={assembly.id}
                className="assembly-card"
                onClick={() =>
                  navigate("/parts", {
                    state: {
                      ...searchState,
                      modelId: resolvedState.modelId,
                      variantId: resolvedState.variantId,
                      colourId: resolvedState.colourId,
                      assemblyId: assembly.id
                    }
                  })
                }
              >

                {assembly.imagePath ? (

                  <img
                    src={resolveAssemblyImage(assembly.imagePath)}
                    alt={assembly.assemblyName}
                    className="assembly-image"
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoomImage(resolveAssemblyImage(assembly.imagePath))
                    }}
                  />

                ) : (

                  <div className="assembly-image placeholder">
                    No Image
                  </div>

                )}

                <div className="assembly-name">
                  {assembly.assemblyName}
                </div>

              </button>

            ))}

          </div>

        )}

        {/* ZOOM MODAL */}

        {zoomImage && (

          <div
            className="image-modal"
            onClick={() => setZoomImage(null)}
          >

            <div
              className="image-modal-content"
              onClick={(e) => e.stopPropagation()}
            >

              <div
                className="zoom-container"
                onMouseMove={(e) => {

                  const rect = e.currentTarget.getBoundingClientRect()

                  const x = e.clientX - rect.left
                  const y = e.clientY - rect.top

                  setLensPosition({ x, y })

                }}
                onMouseEnter={() => setShowLens(true)}
                onMouseLeave={() => setShowLens(false)}
              >

                <img
                  src={zoomImage}
                  className="zoom-image"
                />

                {showLens && (

                  <div
                    className="lens"
                    style={{
                      left: lensPosition.x - 75,
                      top: lensPosition.y - 75,
                      backgroundImage: `url(${zoomImage})`,
                      backgroundSize: "2000px 2000px",
                      backgroundPosition: `-${lensPosition.x * 2}px -${lensPosition.y * 2}px`
                    }}
                  />

                )}

              </div>

              <button
                className="close-btn"
                onClick={() => setZoomImage(null)}
              >
                ✕
              </button>

            </div>

          </div>

        )}

      </main>

    </div>

  )

}

export default AssemblyCatalogue