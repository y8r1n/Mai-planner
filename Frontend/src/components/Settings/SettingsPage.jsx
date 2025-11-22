import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Bell, 
  Moon, 
  Brain, 
  ChevronRight,
  Sun,
  Monitor,
  Settings as SettingsIcon,
  ArrowLeft
} from 'lucide-react';
import '../../styles/Settings.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  const [settings, setSettings] = useState({
    notifications: {
      enabled: true,
      pushEnabled: true,
    },
    doNotDisturb: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
    },
    ai: {
      summaryStyle: 'concise',
      mentorTone: 'friendly',
      recommendStrength: 'medium',
    },
    theme: 'light',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'users', userId, 'settings', 'preferences');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings((prev) => ({
            ...prev,
            ...data,
          }));
        }

        const savedTheme = localStorage.getItem('app-theme') || 'light';
        setSettings((prev) => ({
          ...prev,
          theme: savedTheme,
        }));

        applyTheme(savedTheme);
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setSettings((prev) => ({
      ...prev,
      theme: newTheme,
    }));

    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);

    if (userId) {
      try {
        await setDoc(
          doc(db, 'users', userId, 'settings', 'preferences'),
          { theme: newTheme },
          { merge: true }
        );
      } catch (error) {
        console.error('테마 저장 실패:', error);
      }
    }
  };

  const getThemeIcon = (theme) => {
    switch (theme) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'auto':
        return <Monitor size={20} />;
      default:
        return <Sun size={20} />;
    }
  };

  const getThemeLabel = (theme) => {
    switch (theme) {
      case 'light':
        return '라이트';
      case 'dark':
        return '다크';
      case 'auto':
        return '자동';
      default:
        return '라이트';
    }
  };

  if (!user) {
    return (
      <div className="settings-page">
        <div className="settings-empty">
          <p>로그인이 필요합니다</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-empty">
          <p>설정 불러오는 중...</p>
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
          <h1 className="settings-title">설정</h1>
        </div>

        {/* 설정 섹션들 */}
        <div className="settings-sections">
          
          {/* 테마 설정 */}
          <div className="settings-section">
            <h3 className="section-title">🎨 테마</h3>
            
            <div className="settings-card theme-card">
              <div className="theme-options">
                {['light', 'dark', 'auto'].map((theme) => (
                  <button
                    key={theme}
                    className={`theme-option ${settings.theme === theme ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme)}
                  >
                    <div className="theme-icon">
                      {getThemeIcon(theme)}
                    </div>
                    <span className="theme-label">
                      {getThemeLabel(theme)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div className="settings-section">
            <h3 className="section-title">🔔 알림</h3>
            
            <button 
              className="settings-card settings-item"
              onClick={() => navigate('/settings/notifications')}
            >
              <div className="settings-item-left">
                <Bell size={24} />
                <div className="settings-item-info">
                  <h4>알림 설정</h4>
                  <p>푸시 알림 및 권한 관리</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>

            <button 
              className="settings-card settings-item"
              onClick={() => navigate('/settings/dnd')}
            >
              <div className="settings-item-left">
                <Moon size={24} />
                <div className="settings-item-info">
                  <h4>방해금지 시간</h4>
                  <p>
                    {settings.doNotDisturb.enabled 
                      ? `${settings.doNotDisturb.startTime} ~ ${settings.doNotDisturb.endTime}`
                      : '설정 안 함'}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* AI 설정 */}
          <div className="settings-section">
            <h3 className="section-title">🤖 AI</h3>
            
            <button 
              className="settings-card settings-item"
              onClick={() => navigate('/settings/ai')}
            >
              <div className="settings-item-left">
                <Brain size={24} />
                <div className="settings-item-info">
                  <h4>AI 설정</h4>
                  <p>요약 스타일, 멘토 톤, 추천 강도</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 앱 정보 */}
          <div className="settings-section">
            <h3 className="section-title">ℹ️ 정보</h3>
            
            <div className="settings-card app-info">
              <div className="info-row">
                <span className="info-label">버전</span>
                <span className="info-value">1.0.0</span>
              </div>
              <div className="info-row">
                <span className="info-label">사용자 ID</span>
                <span className="info-value">{userId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}