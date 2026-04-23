import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "./admin.css"
import logo from "./assets/logo.jpg"
import { getRoleFromToken } from "./auth"
import AccountMenu from "./components/AccountMenu"
import { FaHome, FaPhoneAlt, FaShoppingCart } from "react-icons/fa"

interface User {
  id: number
  username: string
  role: string
  isActive: boolean
}

const AdminUsers = () => {
  const navigate = useNavigate()

  const [users,  setUsers]  = useState<User[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "User" })

  /* ── Auth helpers ── */
  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token")
    navigate("/", { replace: true })
  }, [navigate])

  const isAuthError = (error: unknown) =>
    axios.isAxiosError(error) &&
    (error.response?.status === 401 || error.response?.status === 403)

  /* ── Fetch users — wrapped in useCallback so it can safely go in dep arrays ── */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("/admin/users")
      setUsers(res.data)
    } catch (error) {
      if (isAuthError(error)) handleUnauthorized()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleUnauthorized])

  /* ── Init effect — role check then fetch ── */
  useEffect(() => {
    const role = getRoleFromToken()
    if (!role) { handleUnauthorized(); return }
    if (role !== "Admin") { navigate("/dashboard", { replace: true }); return }
    // fetchUsers is stable via useCallback — safe to call here
    void fetchUsers()
  }, [fetchUsers, handleUnauthorized, navigate])

  /* ── Create user ── */
  const createUser = async () => {
    try {
      await axios.post("/admin/users", newUser)
      setShowCreate(false)
      setNewUser({ username: "", password: "", role: "User" })
      void fetchUsers()
    } catch (error) {
      if (isAuthError(error)) handleUnauthorized()
      else alert("Failed to create user")
    }
  }

  /* ── Delete user ── */
  const deleteUser = async (id: number) => {
    if (!window.confirm("Delete this user?")) return
    try {
      await axios.delete(`/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      void fetchUsers()
    } catch (error) {
      if (isAuthError(error)) handleUnauthorized()
      else alert("Delete failed")
    }
  }

  /* ── Change password ── */
  const changePassword = async (id: number) => {
    const newPassword = prompt("Enter new password")
    if (!newPassword) return
    try {
      await axios.put(`/admin/users/${id}/change-password`, { newPassword })
      alert("Password updated")
    } catch (error) {
      if (isAuthError(error)) handleUnauthorized()
      else alert("Password update failed")
    }
  }

  /* ═══════════════════════════════════════════ RENDER ══ */

  return (
    <div className="admin-shell">

      {/* ── Navbar ── */}
      <div className="admin-navbar">
        <div className="admin-navbar-left">
          <img src={logo} alt="BGAUSS" className="admin-logo" />
          <div className="admin-title-wrap">
            <span className="logo-text">BGAUSS</span>
            <span className="sub-title">Electronic Parts Catalog</span>
          </div>
        </div>
        <div className="admin-navbar-right">
          <button className="nav-icon-btn" onClick={() => navigate("/dashboard")}><FaHome /></button>
          <button className="nav-icon-btn"><FaPhoneAlt /></button>
          <button className="nav-icon-btn" onClick={() => navigate("/checkout")}><FaShoppingCart /></button>
          <AccountMenu />
        </div>
      </div>

      {/* ── Page ── */}
      <div className="admin-page">
        <div className="admin-content">

          <div className="admin-header">
            <button className="back-btn" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
            <div className="admin-actions">
              <button className="create-module-btn" onClick={() => navigate("/admin/modules")}>
                Open Module
              </button>
              <button className="create-user-btn" onClick={() => setShowCreate(true)}>
                Create User
              </button>
            </div>
          </div>

          {/* ── Create-user form (shown inline when showCreate is true) ── */}
          {showCreate && (
            <div className="admin-create-form">
              <h3>Create New User</h3>
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              />
              <select
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
              <div className="admin-create-form__actions">
                <button className="create-user-btn" onClick={() => void createUser()}>Save</button>
                <button className="back-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── Users table ── */}
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
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>
                      <span className={`role-badge ${user.role === "Admin" ? "admin" : "user"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button className="icon-btn lock" onClick={() => void changePassword(user.id)}>🔒</button>
                      <button className="icon-btn delete" onClick={() => void deleteUser(user.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}

export default AdminUsers