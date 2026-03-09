import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, getProfileFromToken, type AuthProfile } from "../auth";
import "./AccountMenu.css";

const AccountMenu = () => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  useEffect(() => {
    setProfile(getProfileFromToken());
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const toggleMenu = () => {
    setProfile(getProfileFromToken());
    setIsOpen((prev) => !prev);
  };

  const handleLogout = () => {
    clearToken();
    sessionStorage.removeItem("partsSearchState");
    localStorage.removeItem("selectedVehicle");
    navigate("/login", { replace: true });
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu-trigger"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="account-menu-name">{profile?.username ?? "Account"}</span>
        <span className="account-menu-caret">{isOpen ? "▴" : "▾"}</span>
      </button>

      {isOpen && (
        <div className="account-menu-dropdown" role="menu">
          <div className="account-menu-item">
            <span>Role</span>
            <strong>{profile?.role ?? "-"}</strong>
          </div>

          <div className="account-menu-item">
            <span>User ID</span>
            <strong>{profile?.userId ?? "-"}</strong>
          </div>

          <button
            type="button"
            className="account-menu-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
