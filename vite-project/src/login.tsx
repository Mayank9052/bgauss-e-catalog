import { useState } from "react";
import "./login.css";
import { login } from "./services/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [debugTrigger, setDebugTrigger] = useState(false);

  const handleLogin = async () => {
    try {
      setError("");
      const data = await login(username, password, debugTrigger);
      localStorage.setItem("token", data.token);
      alert("Login Successful!");
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
        <div className="login-left">

          <div className="form-group">
            <input
              type="text"
              placeholder="User"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <span className="icon">👤</span>
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="icon">👁</span>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={debugTrigger}
                onChange={(e) => setDebugTrigger(e.target.checked)}
              />
              <span style={{ fontSize: 12 }}>Trigger Debugger</span>
            </label>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>
        </div>

        <div className="login-right">
          <h2>
            Electronic Parts <br />
            Catalog
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Login;