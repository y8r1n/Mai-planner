// src/components/NavBar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { Bell } from "lucide-react";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  // 현재 경로를 소문자로 변환 → 일관된 비교
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
        
        {/* 왼쪽 링크들 */}
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

        {/* 오른쪽 아이콘들 */}
        <div className="nav-icons">
          {/* 🔔 알림 */}
          <button
            className="icon-btn notification-btn"
            onClick={() => navigate("/Alarm")}
          >
            <Bell size={22} />

            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {/* ☰ 메뉴 (추가 기능 대비) */}
          <button className="icon-btn menu-btn">
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
}
