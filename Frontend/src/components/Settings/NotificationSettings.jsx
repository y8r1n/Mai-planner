// src/components/Settings/NotificationSettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Bell, BellOff } from 'lucide-react';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import '../../styles/Settings.css';

/**
 * 🔔 알림 설정 페이지
 */
export default function NotificationSettings() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  const {
    permission,
    isGranted,
    isDenied,
    isSupported,
    requestPermission,
    loading: permissionLoading,
  } = useNotificationPermission(userId);

  const [settings, setSettings] = useState({
    enabled: true,
    pushEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    if (!userId) return;

    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'users', userId, 'settings', 'preferences');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.notifications) {
            setSettings(data.notifications);
          }
        }
      } catch (error) {
        console.error('❌ 설정 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  // 설정 저장
  const saveSettings = async (newSettings) => {
    if (!userId) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', userId, 'settings', 'preferences'),
        { notifications: newSettings },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 알림 활성화 토글
  const toggleNotifications = async () => {
    const newValue = !settings.enabled;
    const newSettings = { ...settings, enabled: newValue };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // 푸시 알림 토글
  const togglePush = async () => {
    if (!isGranted && !settings.pushEnabled) {
      // 권한 요청
      const granted = await requestPermission();
      if (!granted) return;
    }

    const newValue = !settings.pushEnabled;
    const newSettings = { ...settings, pushEnabled: newValue };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-empty">
          <p>불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        
        {/* 헤더 */}
        <div className="settings-header">
          <button 
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="settings-title">알림 설정</h1>
        </div>

        {/* 설정 항목 */}
        <div className="settings-sections">
          
          {/* 앱 알림 */}
          <div className="settings-section">
            <h3 className="section-title">📱 앱 알림</h3>
            
            <div className="settings-card">
              <div className="toggle-item">
                <div className="toggle-item-left">
                  <Bell size={24} />
                  <div className="toggle-item-info">
                    <h4>알림 받기</h4>
                    <p>앱 내에서 알림을 표시합니다</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={toggleNotifications}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* 푸시 알림 */}
          <div className="settings-section">
            <h3 className="section-title">🔔 푸시 알림</h3>
            
            {!isSupported && (
              <div className="settings-card warning-card">
                <BellOff size={24} />
                <p>이 브라우저는 푸시 알림을 지원하지 않습니다</p>
              </div>
            )}

            {isSupported && (
              <>
                <div className="settings-card">
                  <div className="toggle-item">
                    <div className="toggle-item-left">
                      <Bell size={24} />
                      <div className="toggle-item-info">
                        <h4>푸시 알림</h4>
                        <p>
                          {isDenied 
                            ? '브라우저 설정에서 권한을 허용해주세요'
                            : '앱이 닫혀있어도 알림을 받습니다'}
                        </p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.pushEnabled && isGranted}
                        onChange={togglePush}
                        disabled={saving || permissionLoading || isDenied}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {/* 권한 상태 */}
                <div className={`status-card ${
                  isGranted ? 'success' : isDenied ? 'error' : 'warning'
                }`}>
                  <div className="status-icon">
                    {isGranted ? '✅' : isDenied ? '❌' : '⏳'}
                  </div>
                  <div className="status-info">
                    <h4>
                      {isGranted && '푸시 알림 활성화'}
                      {isDenied && '푸시 알림 차단됨'}
                      {!isGranted && !isDenied && '권한 필요'}
                    </h4>
                    <p>
                      {isGranted && '푸시 알림을 받을 수 있습니다'}
                      {isDenied && '브라우저 설정에서 권한을 허용해주세요'}
                      {!isGranted && !isDenied && '푸시 알림을 받으려면 권한을 허용하세요'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 안내 */}
          <div className="settings-section">
            <div className="settings-card info-card">
              <h4>💡 알림 안내</h4>
              <ul>
                <li>TODO 완료, 일정 추가 등의 이벤트 발생 시 알림이 전송됩니다</li>
                <li>방해금지 시간에는 알림이 전송되지 않습니다</li>
                <li>중요한 알림은 방해금지 시간에도 전송될 수 있습니다</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}