import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import logo from "./assets/logo.jpg";
import "./assembly_catalogue.css";

import AccountMenu from "./components/AccountMenu";
import type { Assembly } from "./services/api";

import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa";

interface VehicleSearchState {
  modelId?: number | string;
}

const resolveAssemblyImage = (imagePath?: string | null): string => {
  if (!imagePath) return "";

  const normalized = imagePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  return `http://localhost:5053/${normalized}`;
};

const AssemblyCatalogue = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const searchState = location.state as VehicleSearchState;

  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);

  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState("center center");

  useEffect(() => {

    const fetchAssemblies = async () => {

      const res = await fetch("/api/assemblies");
      const data = await res.json();

      setAssemblies(data);
      setLoading(false);

    };

    fetchAssemblies();

  }, []);

  useEffect(() => {

    if (zoomImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };

  }, [zoomImage]);

  const openZoom = (image: string) => {
    setZoomImage(image);
    setScale(1);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {

    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setOrigin(`${x}% ${y}%`);

    setScale(prev => {

      const zoomAmount = e.deltaY < 0 ? 0.2 : -0.2;

      let next = prev + zoomAmount;

      if (next < 1) next = 1;
      if (next > 4) next = 4;

      return next;

    });

  };

  return (

    <div className="assembly-page">

      <nav className="epc-navbar">

        <div className="brand">

          <img src={logo} className="nav-logo"/>

          <div className="brand-text">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="nav-actions">

          <button
            className="nav-icon-btn active"
            title="Home"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          <button
            className="nav-icon-btn"
            title="Contact"
          >
            <FaPhoneAlt />
          </button>

          <button
            className="nav-icon-btn"
            title="Cart"
          >
            <FaShoppingCart />
          </button>

          <AccountMenu/>

        </div>

      </nav>


      <main className="assembly-content">

        <h2>Assembly Catalogue</h2>

        {loading ? (

          <p>Loading assemblies...</p>

        ) : (

          <div className="assembly-grid">

            {assemblies.map((assembly) => (

              <button
                key={assembly.id}
                className="assembly-card"
                onClick={() =>
                  navigate("/parts", {
                    state:{
                      modelId: searchState?.modelId,
                      assemblyId: assembly.id
                    }
                  })
                }
              >

                <img
                  src={resolveAssemblyImage(assembly.imagePath)}
                  className="assembly-image"
                  onClick={(e)=>{
                    e.stopPropagation();
                    openZoom(resolveAssemblyImage(assembly.imagePath));
                  }}
                />

                <div className="assembly-name">
                  {assembly.assemblyName}
                </div>

              </button>

            ))}

          </div>

        )}

      </main>


      {zoomImage && (

        <div
          className="image-modal"
          onClick={()=>setZoomImage(null)}
        >

          <div
            className="zoom-container"
            onClick={(e)=>e.stopPropagation()}
            onWheel={handleWheel}
          >

            <img
              src={zoomImage}
              className="zoomed-image"
              style={{
                transform:`scale(${scale})`,
                transformOrigin:origin
              }}
            />

          </div>

        </div>

      )}

    </div>

  );

};

export default AssemblyCatalogue;