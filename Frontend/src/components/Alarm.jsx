// src/components/Alarm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useNotifications,
  getTimeAgo,
} from '../contexts/NotificationContext';

import {
  Bell,
  Trash2,
  CheckCheck,
} from 'lucide-react';

import '../styles/alarm.css';

export default function Alarm() {
  const navigate = useNavigate();

  const {
    notifications,
    deleteNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    getNotificationRoute,
  } = useNotifications();

  const [filter, setFilter] = useState("all"); // all | unread | read

  // 🔥 필터링된 알림
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  // 🔥 알림 클릭 시
  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }

    const route = getNotificationRoute(notif);
    if (route) navigate(route);
  };

  // 🔥 타입별 아이콘
  const getNotificationIcon = (type) => {
    const icons = {
      todo: "✅",
      schedule: "📅",
      event: "🎉",
      ai: "🤖",
      subject: "📚",
      diary: "📔",
      timetable: "🗓️",
    };
    return icons[type] || "🔔";
  };

  // 🔥 타입별 색상
  const getNotificationColor = (type) => {
    const colors = {
      todo: "#10b981",
      schedule: "#3b82f6",
      event: "#8b5cf6",
      ai: "#f59e0b",
      subject: "#ec4899",
      diary: "#f472b6",
      timetable: "#6366f1",
    };
    return colors[type] || "#6b7280";
  };

  return (
    <div className="alarm-page">
      <div className="alarm-container">

        {/* 헤더 */}
        <div className="alarm-header">
          <h1 className="alarm-title">
            <Bell size={32} strokeWidth={2.5} />
            알림
          </h1>

          {notifications.length > 0 && (
            <div className="alarm-actions">
              <button
                onClick={markAllAsRead}
                className="alarm-action-btn"
                title="모두 읽음"
              >
                <CheckCheck size={24} strokeWidth={2.5} />
              </button>

              <button
                onClick={() => {
                  if (window.confirm("모든 알림을 삭제하시겠습니까?")) {
                    clearAllNotifications();
                  }
                }}
                className="alarm-action-btn danger"
                title="전체 삭제"
              >
                <Trash2 size={24} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* 필터 */}
        {notifications.length > 0 && (
          <div className="alarm-filters">
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              전체 ({notifications.length})
            </button>

            <button
              className={`filter-btn ${filter === "unread" ? "active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              읽지 않음 ({notifications.filter((n) => !n.read).length})
            </button>

            <button
              className={`filter-btn ${filter === "read" ? "active" : ""}`}
              onClick={() => setFilter("read")}
            >
              읽음 ({notifications.filter((n) => n.read).length})
            </button>
          </div>
        )}

        {/* 알림 리스트 */}
        <div className="alarm-list">
          {filteredNotifications.length === 0 ? (
            <div className="alarm-empty">
              <Bell size={48} color="#d1d5db" />
              <p>
                {filter === "all"
                  ? "알림이 없습니다"
                  : filter === "unread"
                  ? "읽지 않은 알림이 없습니다"
                  : "읽은 알림이 없습니다"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`alarm-card ${notif.read ? "read" : "unread"}`}
                onClick={() => handleNotificationClick(notif)}
              >
                {/* 삭제 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="alarm-delete"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>

                {/* 아이콘 */}
                <div
                  className="alarm-icon"
                  style={{ color: getNotificationColor(notif.type) }}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                {/* 내용 */}
                <div className="alarm-content">
                  <div className="alarm-header-row">
                    <span
                      className="alarm-tab"
                      style={{ color: getNotificationColor(notif.type) }}
                    >
                      {notif.tab}
                    </span>

                    <span className="alarm-dot">•</span>

                    <span className="alarm-time">
                      {getTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <h3 className="alarm-message">{notif.message}</h3>

                  {notif.details &&
                    notif.details.length > 0 &&
                    notif.details.map((d, i) => (
                      <p className="alarm-details" key={i}>
                        {d}
                      </p>
                    ))}

                  {!notif.read && <span className="unread-badge">NEW</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
