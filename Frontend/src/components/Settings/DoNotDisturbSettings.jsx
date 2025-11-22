// src/components/Settings/DoNotDisturbSettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import '../../styles/Settings.css';

/**
 * 🌙 방해금지 시간 설정
 */
export default function DoNotDisturbSettings() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  const [settings, setSettings] = useState({
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
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
          if (data.doNotDisturb) {
            setSettings(data.doNotDisturb);
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
        { doNotDisturb: newSettings },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 활성화 토글
  const toggleEnabled = async () => {
    const newValue = !settings.enabled;
    const newSettings = { ...settings, enabled: newValue };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // 시작 시간 변경
  const handleStartTimeChange = async (e) => {
    const newValue = e.target.value;
    const newSettings = { ...settings, startTime: newValue };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // 종료 시간 변경
  const handleEndTimeChange = async (e) => {
    const newValue = e.target.value;
    const newSettings = { ...settings, endTime: newValue };
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
          <h1 className="settings-title">방해금지 시간</h1>
        </div>

        {/* 설정 항목 */}
        <div className="settings-sections">
          
          {/* 활성화 */}
          <div className="settings-section">
            <h3 className="section-title">🌙 방해금지 모드</h3>
            
            <div className="settings-card">
              <div className="toggle-item">
                <div className="toggle-item-left">
                  <Moon size={24} />
                  <div className="toggle-item-info">
                    <h4>방해금지 시간 사용</h4>
                    <p>설정한 시간에는 알림을 받지 않습니다</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={toggleEnabled}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* 시간 설정 */}
          {settings.enabled && (
            <div className="settings-section">
              <h3 className="section-title">⏰ 시간 설정</h3>
              
              <div className="settings-card">
                <div className="time-picker-group">
                  
                  {/* 시작 시간 */}
                  <div className="time-picker-item">
                    <div className="time-picker-label">
                      <Moon size={20} />
                      <span>시작 시간</span>
                    </div>
                    <input
                      type="time"
                      value={settings.startTime}
                      onChange={handleStartTimeChange}
                      className="time-input"
                      disabled={saving}
                    />
                  </div>

                  {/* 구분선 */}
                  <div className="time-picker-divider">~</div>

                  {/* 종료 시간 */}
                  <div className="time-picker-item">
                    <div className="time-picker-label">
                      <Sun size={20} />
                      <span>종료 시간</span>
                    </div>
                    <input
                      type="time"
                      value={settings.endTime}
                      onChange={handleEndTimeChange}
                      className="time-input"
                      disabled={saving}
                    />
                  </div>

                </div>
              </div>

              {/* 미리보기 */}
              <div className="dnd-preview">
                <div className="preview-label">설정 미리보기</div>
                <div className="preview-time">
                  {settings.startTime} ~ {settings.endTime}
                </div>
                <div className="preview-desc">
                  이 시간 동안 알림이 전송되지 않습니다
                </div>
              </div>
            </div>
          )}

          {/* 안내 */}
          <div className="settings-section">
            <div className="settings-card info-card">
              <h4>💡 방해금지 안내</h4>
              <ul>
                <li>설정한 시간 동안 모든 알림이 차단됩니다</li>
                <li>중요한 알림은 예외적으로 전송될 수 있습니다</li>
                <li>방해금지 시간에도 앱 사용은 가능합니다</li>
                <li>알림은 방해금지 시간 종료 후 확인할 수 있습니다</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}