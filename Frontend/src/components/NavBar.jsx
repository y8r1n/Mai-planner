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

  // 현재 경로 (소문자 통일)
  const currentPath = location.pathname.toLowerCase();

  const links = [
    { name: "HOME", path: "/" },
    { name: "WITH AI", path: "/withai" },
    { name: "SUBJECT", path: "/study" },   // ← 여기는 건들지 말기
    { name: "IMAGE DIARY", path: "/imagediary" },
  ];

  // active 판별 로직 수정
  const isActive = (path) => {
    // 홈
    if (path === "/") return currentPath === "/";

    // SUBJECT (Study.jsx)
    if (path === "/study") 
      return currentPath.startsWith("/study");
    

    // WITH AI
    if (path === "/withai") return currentPath.startsWith("/withai");

    // IMAGE DIARY
    if (path === "/imagediary") return currentPath.startsWith("/imagediary");

    return false;
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
