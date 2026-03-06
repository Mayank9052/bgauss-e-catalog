import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import "./admin.css";
import logo from "./assets/logo.jpg";

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

  const getRoleFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded: any = jwtDecode(token);
      return (
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
        decoded.role ||
        null
      );
    } catch {
      return null;
    }
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

      await axios.delete(`/admin/users/${id}`);
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }

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
        <div className="admin-navbar">
          <div className="admin-navbar-left">
            <img
              src={logo}
              alt="EPC Logo"
              className="admin-logo"
            />
            <span className="admin-title">Electronic Parts Catalog</span>
          </div>

          <div className="admin-navbar-right">
            <span className="admin-panel-text">Admin Panel</span>
            <button className="admin-profile-btn" aria-label="Admin profile">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="admin-content">
          <div className="admin-header">
            <button
              className="create-user-btn"
              onClick={() => setShowCreate(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 8a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1H7Zm15-9h-2V8h-2v2h-2v2h2v2h2v-2h2Z" />
              </svg>
              <span>Create User</span>
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <colgroup>
                <col className="col-username" />
                <col className="col-role" />
                <col className="col-actions" />
              </colgroup>

              <thead>
                <tr>
                  <th className="col-username">Username</th>
                  <th className="col-role">Role</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="col-username">{user.username}</td>
                    <td className="col-role">
                      <span
                        className={
                          user.role === "Admin"
                            ? "role-badge admin"
                            : "role-badge user"
                        }
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="col-actions">
                      <button
                        className="icon-btn lock"
                        onClick={() => changePassword(user.id)}
                        aria-label={`Change password for ${user.username}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4Z" />
                        </svg>
                      </button>

                      <button
                        className="icon-btn delete"
                        onClick={() => deleteUser(user.id)}
                        aria-label={`Delete ${user.username}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 3h6l1 2h4v2H4V5h4Zm1 6h2v9h-2Zm4 0h2v9h-2ZM7 9h2v9H7Zm1 12h8a2 2 0 0 0 2-2V8H6v11a2 2 0 0 0 2 2Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showCreate && (
          <div className="modal">
            <div className="modal-content">
              <h3>Create User</h3>

              <input
                placeholder="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    username: e.target.value
                  })
                }
              />

              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    password: e.target.value
                  })
                }
              />

              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    role: e.target.value
                  })
                }
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>

              <div className="modal-buttons">
                <button
                  className="modal-create"
                  onClick={createUser}
                >
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
