//Navbar
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";
import { useNotifications } from "../contexts/NotificationContext";
import { Bell } from "lucide-react";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ⭐ 여기 추가
  const { unreadCount } = useNotifications();

  const links = [
    { name: "HOME", path: "/" },
    { name: "WITH AI", path: "/Withai" },
    { name: "SUBJECT", path: "/Study" },
    { name: "IMAGE DIARY", path: "/ImageDiary" },
  ];

  return (
    <nav id="global-nav">
      <div className="nav-container">

        <div className="nav-links">
          {links.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`nav-btn ${
                location.pathname === link.path ? "active" : ""
              }`}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="nav-icons">
          {/* 알림 아이콘 */}
          <button 
            className="icon-btn notification-btn" 
            onClick={() => navigate('/Alarm')}
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          <button className="icon-btn">☰</button>
        </div>
      </div>
    </nav>
  );
}
