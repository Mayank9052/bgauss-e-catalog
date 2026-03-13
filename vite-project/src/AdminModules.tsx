import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.jpg";
import { getRoleFromToken } from "./auth";
import AccountMenu from "./components/AccountMenu";
import "./adminModules.css";
import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa";

interface Module {
  id: number;
  name: string;
}

interface Assembly {
  id?: number;
  assemblyName: string;
  imagePath: string;
  modelId: number;
}

interface VehicleModel {
  id?: number;
  modelName: string;
}

interface VehicleVariant {
  id?: number;
  variantName: string;
  modelId: number;
}

interface VehicleColour {
  id?: number;
  colourName: string;
  modelId: number;
  variantId: number;
  imagePath: string;
}

const AdminModules = () => {

  const navigate = useNavigate();

  const [modules] = useState<Module[]>([
    { id: 1, name: "Vehicle" },
    { id: 2, name: "Assembly" }
  ]);

  const [showImport, setShowImport] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");

  /* ================= VEHICLE STATES ================= */

  const [models, setModels] = useState<VehicleModel[]>([]);
  const [modelName, setModelName] = useState("");

  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [variantName, setVariantName] = useState("");
  const [variantModelId, setVariantModelId] = useState(0);

  const [colours, setColours] = useState<VehicleColour[]>([]);
  const [colourName, setColourName] = useState("");
  const [colourModelId, setColourModelId] = useState(0);
  const [colourVariantId, setColourVariantId] = useState(0);
  const [colourImagePath, setColourImagePath] = useState("");

  /* ================= ASSEMBLY STATES ================= */

  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [assemblyName, setAssemblyName] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [modelId, setModelId] = useState<number>(0);

  useEffect(() => {

    const role = getRoleFromToken();

    if (!role) navigate("/", { replace: true });

    if (role !== "Admin") navigate("/dashboard", { replace: true });

  }, []);

  /* ================= FETCH ================= */

  const fetchModels = async () => {
    const res = await axios.get("/api/VehicleModels");
    setModels(res.data);
  };

  const fetchVariants = async () => {
    const res = await axios.get("/api/VehicleVariants");
    setVariants(res.data);
  };

  const fetchColours = async () => {
    const res = await axios.get("/api/VehicleColours");
    setColours(res.data);
  };

  const fetchAssemblies = async () => {
    const res = await axios.get("/api/Assemblies");
    setAssemblies(res.data);
  };

  useEffect(() => {

    if (selectedModule === "Vehicle") {
      fetchModels();
      fetchVariants();
      fetchColours();
    }

    if (selectedModule === "Assembly") {
      fetchAssemblies();
    }

  }, [selectedModule]);

  /* ================= VEHICLE CRUD ================= */

  const createModel = async () => {
    await axios.post("/api/VehicleModels", { modelName });
    setModelName("");
    fetchModels();
  };

  const deleteModel = async (id: number) => {
    await axios.delete(`/api/VehicleModels/${id}`);
    fetchModels();
  };

  const createVariant = async () => {
    await axios.post("/api/VehicleVariants", {
      variantName,
      modelId: variantModelId
    });
    fetchVariants();
  };

  const deleteVariant = async (id: number) => {
    await axios.delete(`/api/VehicleVariants/${id}`);
    fetchVariants();
  };

  const createColour = async () => {
    await axios.post("/api/VehicleColours", {
      colourName,
      modelId: colourModelId,
      variantId: colourVariantId,
      imagePath: colourImagePath
    });
    fetchColours();
  };

  const deleteColour = async (id: number) => {
    await axios.delete(`/api/VehicleColours/${id}`);
    fetchColours();
  };

  /* ================= ASSEMBLY CRUD ================= */

  const createAssembly = async () => {

    await axios.post("/api/Assemblies", {
      assemblyName,
      imagePath,
      modelId
    });

    setAssemblyName("");
    setImagePath("");
    setModelId(0);

    fetchAssemblies();
  };

  const deleteAssembly = async (id: number) => {

    if (!window.confirm("Delete Assembly?")) return;

    await axios.delete(`/api/Assemblies/${id}`);
    fetchAssemblies();
  };

  return (
    <div className="admin-modules-shell">

      {/* NAVBAR */}

      <div className="modules-navbar">

        <div className="modules-navbar-left">

          <img src={logo} className="modules-logo" />

          <div className="modules-title">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="modules-navbar-right">

          <button
            className="modules-nav-icon"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          <button className="modules-nav-icon">
            <FaPhoneAlt />
          </button>

          <button className="modules-nav-icon">
            <FaShoppingCart />
          </button>

          <AccountMenu />

        </div>

      </div>

      {/* PAGE */}

      <div className="admin-modules-page">

        <div className="modules-content">

          <h2>Module Management</h2>

          <div className="modules-header">

            <button
              className="modules-create-btn"
              onClick={() => setShowImport(true)}
            >
              Manage Module
            </button>

            <button
              className="modules-back-btn"
              onClick={() => navigate("/admin/users")}
            >
              Back
            </button>

          </div>

          <table className="modules-table">

            <thead>
              <tr>
                <th>Module Name</th>
              </tr>
            </thead>

            <tbody>

              {modules.map((module) => (
                <tr key={module.id}>
                  <td>{module.name}</td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* MODAL */}

      {showImport && (

        <div className="import-modal">

          <div className="import-modal-content">

            <h3>Module</h3>

            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="">Select Module</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Assembly">Assembly</option>
            </select>

            {/* VEHICLE */}

            {selectedModule === "Vehicle" && (

              <>
                <h4>Vehicle Models</h4>

                <div className="assembly-form">
                  <input
                    placeholder="Model Name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />

                  <button onClick={createModel}>
                    Add Model
                  </button>
                </div>

                <table className="assembly-table">

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {models.map((m) => (
                      <tr key={m.id}>
                        <td>{m.id}</td>
                        <td>{m.modelName}</td>
                        <td>
                          <button onClick={() => deleteModel(m.id!)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                  </tbody>

                </table>

              </>
            )}

            {/* ASSEMBLY */}

            {selectedModule === "Assembly" && (

              <>
                <div className="assembly-form">

                  <input
                    placeholder="Assembly Name"
                    value={assemblyName}
                    onChange={(e) => setAssemblyName(e.target.value)}
                  />

                  <input
                    placeholder="Image Path"
                    value={imagePath}
                    onChange={(e) => setImagePath(e.target.value)}
                  />

                  <input
                    placeholder="ModelId"
                    type="number"
                    value={modelId}
                    onChange={(e) => setModelId(Number(e.target.value))}
                  />

                  <button onClick={createAssembly}>
                    Add Assembly
                  </button>

                </div>

                <table className="assembly-table">

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Image</th>
                      <th>Model</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {assemblies.map((a) => (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td>{a.assemblyName}</td>
                        <td>{a.imagePath}</td>
                        <td>{a.modelId}</td>
                        <td>
                          <button
                            onClick={() => deleteAssembly(a.id!)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                  </tbody>

                </table>

              </>
            )}

            <div className="modal-buttons">

              <button
                className="cancel-btn"
                onClick={() => setShowImport(false)}
              >
                Cancel
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default AdminModules;