import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import logo from "./assets/logo.jpg"
import "./assembly_catalogue.css"
import AccountMenu from "./components/AccountMenu"
import type { Assembly } from "./services/api"

interface VehicleSearchState {
  searchType?: "vin" | "model"
  vin?: string
  modelId?: number | string
  variantId?: number | string
  colourId?: number | string
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

  const searchState = location.state as VehicleSearchState

  const [assemblies,setAssemblies] = useState<Assembly[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    const fetchAssemblies = async()=>{

      const res = await fetch("/api/assemblies")
      const data = await res.json()

      setAssemblies(data)
      setLoading(false)

    }

    fetchAssemblies()

  },[])

  return (

    <div className="assembly-page">

      {/* NAVBAR */}

      <nav className="epc-navbar">

        <div className="brand">

          <img src={logo} className="nav-logo"/>

          <span className="logo-text">
            Electronic Parts Catalog
          </span>

        </div>

        <div className="nav-actions">

          <button
            className="nav-link"
            onClick={()=>navigate("/dashboard")}
          >
            Home
          </button>

          <span className="nav-icon">🛒</span>

          <AccountMenu/>

        </div>

      </nav>

      {/* CONTENT */}

      <main className="assembly-content">

        <h2>Assembly Catalogue</h2>

        {loading ? (

          <p>Loading assemblies...</p>

        ) : (

          <div className="assembly-grid">

            {assemblies.map(assembly=>(

              <button
                key={assembly.id}
                className="assembly-card"
                onClick={()=>navigate("/parts",{
                  state:{
                    modelId: searchState?.modelId,
                    assemblyId: assembly.id,
                    assemblyName: assembly.assemblyName
                  }
                })}
              >

                <img
                  src={resolveAssemblyImage(assembly.imagePath)}
                  className="assembly-image"
                />

                <div className="assembly-name">
                  {assembly.assemblyName}
                </div>

              </button>

            ))}

          </div>

        )}

      </main>

    </div>

  )

}

export default AssemblyCatalogue