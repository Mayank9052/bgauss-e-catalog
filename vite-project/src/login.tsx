import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { login } from "./services/api";
import logo from "./assets/logo.jpg";
import ev from "./assets/ev.png";
import { getDefaultPathForRole, getRoleFromToken, type AppRole } from "./auth";

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("User");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setError("");

      if (!username.trim() || !password.trim()) {
        setError("Username and password are required");
        return;
      }

      const data = await login(username, password);
      localStorage.setItem("token", data.token);

      const role = getRoleFromToken();

      if (!role) {
        localStorage.removeItem("token");
        setError("Unable to identify account role");
        return;
      }

      if (role !== selectedRole) {
        localStorage.removeItem("token");
        setError(`Selected ${selectedRole} login, but this account is ${role}`);
        return;
      }

      navigate(getDefaultPathForRole(role), { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* LEFT SIDE - LOGIN */}
        <div className="login-left">
          <div className="logo-section">
            <img src={logo} alt="BGAUSS Logo" />
            <h2>BGAUSS Auto India Pvt Ltd</h2>
          </div>

          <div className="login-role">
            <p>Login As</p>
            <div className="role-options">
              <button
                type="button"
                className={selectedRole === "User" ? "role-btn active" : "role-btn"}
                onClick={() => setSelectedRole("User")}
              >
                User
              </button>
              <button
                type="button"
                className={selectedRole === "Admin" ? "role-btn active" : "role-btn"}
                onClick={() => setSelectedRole("Admin")}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>
        </div>

        {/* RIGHT SIDE - EV IMAGE */}
        <div className="login-right">
          <img src={ev} alt="Electric Scooter" className="ev-image" />
        </div>

      </div>
    </div>
  );
};

export default Login;
