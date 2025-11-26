// src/components/NavBar.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { Bell, Menu } from "lucide-react";
import HamburgerMenu from "./HamburgerMenu"; 
import "../styles/navbar.css";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  // 🔥 햄버거 메뉴 열림/닫힘 상태
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPath = location.pathname;

  const links = [
    { name: "HOME", path: "/" },
    { name: "WITH AI", path: "/withai" },
    { name: "SUBJECT", path: "/study" },
    { name: "IMAGE DIARY", path: "/imagediary" },
  ];

  const isActive = (path) => {
    if (path === "/") return currentPath === "/";
    if (path === "/study") return currentPath.startsWith("/study");
    if (path === "/withai") return currentPath.startsWith("/withai");
    if (path === "/imagediary") return currentPath.startsWith("/imagediary");
    return false;
  };

  return (
    <>
      <nav id="global-nav">
        <div className="nav-container">
          
          {/* 탭 링크 */}
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

          {/* 오른쪽 아이콘 */}
          <div className="nav-icons">
            {/* 알림 버튼 */}
            <button
              className="icon-btn notification-btn"
              onClick={() => navigate("/alarm")}
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            {/* 🔥 햄버거 버튼 */}
            <button
              className="icon-btn menu-btn"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={26} />
            </button>
          </div>
        </div>
      </nav>

      {/* 🔥 햄버거 메뉴 UI */}
      <HamburgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
