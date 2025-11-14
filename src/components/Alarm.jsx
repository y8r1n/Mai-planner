import React from 'react';
import { useNotifications, getTimeAgo } from '../contexts/NotificationContext';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'; // ⭐ 추가
import { db } from '../services/firebase'; // ⭐ 추가
import { Bell } from 'lucide-react';
import '../styles/alarm.css';

export default function Alarm() {
  const { notifications, deleteNotification } = useNotifications();

  // ⭐ 전체 삭제 함수 추가
  const clearAllNotifications = async () => {
    if (!window.confirm('모든 알림을 삭제하시겠습니까?')) return;
    
    try {
      const snapshot = await getDocs(collection(db, 'notifications'));
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'notifications', docSnap.id))
      );
      await Promise.all(deletePromises);
      alert(`✅ ${snapshot.size}개 알림 삭제 완료!`);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 실패!');
    }
  };

  return (
    <div className="alarm-page">
      <div className="alarm-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="alarm-title">알림 알림</h1>
          {/* ⭐ 전체 삭제 버튼 추가 */}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              전체 삭제
            </button>
          )}
        </div>

        <div className="alarm-list">
          {/* 기존 코드 그대로 */}
          {notifications.length === 0 ? (
            <div className="alarm-empty">
              <Bell size={48} color="#d1d5db" />
              <p>알림이 없습니다</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className="alarm-card">
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="alarm-delete"
                  title="삭제"
                />

                <div className="alarm-icon">🔔</div>
                
                <div className="alarm-content">
                  <div className="alarm-header">
                    <span className="alarm-tab">{notif.tab}</span>
                    <span className="alarm-dot">•</span>
                    <span className="alarm-time">
                      {getTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  
                  <h3 className="alarm-message">{notif.message}</h3>
                  
                  {notif.details && notif.details.length > 0 && (
                    <div className="alarm-details">
                      {notif.details.filter(Boolean).map((detail, idx) => (
                        <p key={idx}>{detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}