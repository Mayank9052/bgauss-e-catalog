import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./admin.css";
import logo from "./assets/logo.jpg";
import { getRoleFromToken } from "./auth";
import AccountMenu from "./components/AccountMenu";

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
      if (isAuthError(error)) {
        handleUnauthorized();
        return;
      }
      console.error("Failed to fetch users", error);
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

      if (isAuthError(error)) {
        handleUnauthorized();
        return;
      }

      alert("Failed to create user");
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

      if (isAuthError(error)) {
        handleUnauthorized();
        return;
      }

      console.error("Delete failed", error);
      alert("Delete failed");

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

      if (isAuthError(error)) {
        handleUnauthorized();
        return;
      }

      alert("Password update failed");
    }
  };

  return (
    <div className="admin-shell">

      <div className="admin-page">

        {/* Navbar */}

        <div className="admin-navbar">

          <div className="admin-navbar-left">
            <img src={logo} alt="EPC Logo" className="admin-logo" />
            <span className="admin-title">Electronic Parts Catalog</span>
          </div>

          <div className="admin-navbar-right">
            <span className="admin-panel-text">Admin Panel</span>
            <AccountMenu />
          </div>

        </div>


        <div className="admin-content">

          {/* Header */}

          <div className="admin-header">

            <button
              className="back-btn"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>

            <button
              className="create-user-btn"
              onClick={() => setShowCreate(true)}
            >
              {/* <svg viewBox="0 0 24 24">
                <path d="M15 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 8a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1H7Zm15-9h-2V8h-2v2h-2v2h2v2h2v-2h2Z" />
              </svg> */}
              <span>Create User</span>
            </button>

          </div>


          {/* Table */}

          <div className="admin-table-wrap">

            <table className="admin-table">

              <colgroup>
                <col className="col-username" />
                <col className="col-role" />
                <col className="col-actions" />
              </colgroup>

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


        {/* Create User Modal */}

        {showCreate && (

          <div className="modal">

            <div className="modal-content">

              <h3>Create User</h3>

              <input
                placeholder="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
              />

              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />

              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>

              <div className="modal-buttons">

                <button className="modal-create" onClick={createUser}>
                  Create
                </button>

                <button
                  className="modal-cancel"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
};

export default AdminUsers;