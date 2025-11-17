// src/components/NavBar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { Bell } from "lucide-react";
import "../styles/navbar.css";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const currentPath = location.pathname.toLowerCase();

  const links = [
    { name: "HOME", path: "/" },
    { name: "WITH AI", path: "/withai" },
    { name: "SUBJECT", path: "/study" },
    { name: "IMAGE DIARY", path: "/imagediary" },
  ];

  const isActive = (path) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <nav id="global-nav">
      <div className="nav-container">

        <div className="nav-links">
          {links.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`nav-btn ${isActive(link.path) ? "active" : ""}`}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="nav-icons">
          <button
            className="icon-btn notification-btn"
            onClick={() => navigate("/alarm")}
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          <button className="icon-btn menu-btn">☰</button>
        </div>
      </div>
    </nav>
  );
}
