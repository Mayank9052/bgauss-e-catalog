import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getVehicleImage,
  getVehicleImageByVin
} from "./services/api";
import logo from "./assets/logo.jpg";
import "./V_Preview.css";
import AccountMenu from "./components/AccountMenu";

const VehiclePreview = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const {
    searchType,
    vin,
    modelId,
    variantId,
    colourId
  } = location.state || {};

  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  useEffect(() => {

    const fetchVehicle = async () => {

      try {

        // VIN SEARCH
        if (searchType === "vin") {

          const data = await getVehicleImageByVin(vin);

          setVehicleImage(`http://localhost:5000${data.imagePath}`);

          setVehicleInfo({
            model: data.modelName,
            variant: data.variantName,
            colour: data.colourName
          });

        }

        // MODEL SEARCH
        if (searchType === "model") {

          const data = await getVehicleImage(
            modelId,
            variantId,
            colourId
          );

          setVehicleImage(`http://localhost:5000${data.imagePath}`);

        }

      } catch (error) {

        console.error("Vehicle load failed", error);

      }

    };

    fetchVehicle();

  }, [searchType, vin, modelId, variantId, colourId]);

  return (

    <div className="vehicle-page">

      {/* HEADER */}

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

    <button className="nav-link">
      Contact
    </button>

    <span className="nav-icon">🛒</span>

        <AccountMenu />

        </div>

      </nav>

      {/* CONTENT */}

      <div className="vehicle-container">

        <h2>Vehicle Preview</h2>

        {vehicleInfo && (
          <div className="vehicle-info">

            <p><strong>Model:</strong> {vehicleInfo.model}</p>
            <p><strong>Variant:</strong> {vehicleInfo.variant}</p>
            <p><strong>Colour:</strong> {vehicleInfo.colour}</p>

          </div>
        )}

        {vehicleImage ? (

          <img
            src={vehicleImage}
            alt="Vehicle"
            className="vehicle-image"
          />

        ) : (

          <p>Loading vehicle image...</p>

        )}

        <div className="vehicle-buttons">

          <button
            className="primary-btn"
            onClick={() =>
              navigate("/v_catalogue", {
                state: {
                  searchType,
                  vin,
                  modelId,
                  variantId,
                  colourId
                }
              })
            }
          >
            View Parts
          </button>

          <button
            className="secondary-btn"
            onClick={() => navigate("/dashboard")}
          >
            Back
          </button>

        </div>

      </div>

    </div>

  );

};

export default VehiclePreview;