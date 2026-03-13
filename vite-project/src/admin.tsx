import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import logo from "./assets/logo.jpg";
import { getRoleFromToken } from "./auth";
import AccountMenu from "./components/AccountMenu";
import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa";

interface User {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
}

const AdminUsers = () => {

  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "User"
  });

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const isAuthError = (error: unknown) =>
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      if (isAuthError(error)) handleUnauthorized();
    }
  };

  useEffect(() => {

    const role = getRoleFromToken();

    if (!role) {
      handleUnauthorized();
      return;
    }

    if (role !== "Admin") {
      navigate("/dashboard", { replace: true });
      return;
    }

    fetchUsers();

  }, []);

  const createUser = async () => {

    try {

      await axios.post("/admin/users", newUser);

      setShowCreate(false);

      setNewUser({
        username: "",
        password: "",
        role: "User"
      });

      fetchUsers();

    } catch (error) {

      if (isAuthError(error)) handleUnauthorized();
      else alert("Failed to create user");

    }

  };

  const deleteUser = async (id: number) => {

    if (!window.confirm("Delete this user?")) return;

    try {

      await axios.delete(`/admin/users/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      fetchUsers();

    } catch (error) {

      if (isAuthError(error)) handleUnauthorized();
      else alert("Delete failed");

    }

  };

  const changePassword = async (id: number) => {

    const newPassword = prompt("Enter new password");
    if (!newPassword) return;

    try {

      await axios.put(`/admin/users/${id}/change-password`, {
        newPassword
      });

      alert("Password updated");

    } catch (error) {

      if (isAuthError(error)) handleUnauthorized();
      else alert("Password update failed");

    }

  };

  return (

    <div className="admin-shell">

      {/* NAVBAR */}

      <div className="admin-navbar">

        <div className="admin-navbar-left">

          <img src={logo} alt="BGAUSS" className="admin-logo"/>

          <div className="admin-title-wrap">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>

        </div>

        <div className="admin-navbar-right">

          <button
            className="nav-icon-btn"
            onClick={() => navigate("/dashboard")}
          >
            <FaHome />
          </button>

          <button className="nav-icon-btn">
            <FaPhoneAlt />
          </button>

          <button
            className="nav-icon-btn"
            onClick={() => navigate("/checkout")}
          >
            <FaShoppingCart />
          </button>

          <AccountMenu />

        </div>

      </div>

      {/* PAGE */}

      <div className="admin-page">

        <div className="admin-content">

          <div className="admin-header">

            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>

            <div className="admin-actions">

              <button
                className="create-module-btn"
                onClick={() => navigate("/admin/modules")}
              >
                Open Module
              </button>

              <button
                className="create-user-btn"
                onClick={() => setShowCreate(true)}
              >
                Create User
              </button>

            </div>

          </div>

          {/* TABLE */}

          <div className="admin-table-wrap">

            <table className="admin-table">

              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {users.map((user) => (

                  <tr key={user.id}>

                    <td>{user.username}</td>

                    <td>
                      <span className={user.role === "Admin" ? "role-badge admin" : "role-badge user"}>
                        {user.role}
                      </span>
                    </td>

                    <td>

                      <button
                        className="icon-btn lock"
                        onClick={() => changePassword(user.id)}
                      >
                        🔒
                      </button>

                      <button
                        className="icon-btn delete"
                        onClick={() => deleteUser(user.id)}
                      >
                        🗑
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>

  );

};

export default AdminUsers;