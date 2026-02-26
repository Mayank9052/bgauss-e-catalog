import { useState } from "react";
import "./login.css";
import { login } from "./services/api";
import logo from "./assets/logo.jpg";
import ev from "./assets/ev.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setError("");
      const data = await login(username, password);
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
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

          <div className="form-group">
            <input
              type="text"
              placeholder="User"
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