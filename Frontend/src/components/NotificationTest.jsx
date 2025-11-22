// src/components/NotificationTest.jsx
import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, Send } from 'lucide-react';
import '../styles/design-system.css';

/**
 * 🧪 알림 생성 테스트 컴포넌트
 */
export default function NotificationTest() {
  const [user] = useAuthState(auth);
  const { addNotification, notifications } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testNotifications = [
    {
      type: 'todo',
      tab: 'HOME',
      message: '할 일이 추가되었습니다',
      details: ['테스트 할 일입니다'],
    },
    {
      type: 'schedule',
      tab: 'WITH AI',
      message: '새로운 일정이 생성되었습니다',
      details: ['오늘 오후 3시', '회의'],
    },
    {
      type: 'ai',
      tab: 'WITH AI',
      message: 'AI 추천이 준비되었습니다',
      details: ['오늘의 추천 일정을 확인하세요'],
    },
    {
      type: 'subject',
      tab: 'SUBJECT',
      message: '새로운 과목이 추가되었습니다',
      details: ['수학 - 1주차'],
    },
    {
      type: 'diary',
      tab: 'IMAGE DIARY',
      message: '오늘의 다이어리가 생성되었습니다',
      details: ['기분 좋은 하루 😊'],
    },
  ];

  const createTestNotification = async (notif) => {
    setLoading(true);
    setMessage('');
    
    try {
      const id = await addNotification({
        ...notif,
        sourceId: `test-${Date.now()}`,
      });

      if (id) {
        setMessage(`✅ 알림이 생성되었습니다! (ID: ${id})`);
      } else {
        setMessage('⚠️ 알림 생성 실패 (중복일 수 있습니다)');
      }
    } catch (error) {
      console.error('❌ 알림 생성 오류:', error);
      setMessage(`❌ 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: '#6b7280' }}>로그인이 필요합니다</h2>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Bell size={64} color="#f092a0" />
          <h1 style={{ marginTop: '16px', fontSize: '24px', fontWeight: 'bold' }}>
            🧪 알림 생성 테스트
          </h1>
          <p style={{ marginTop: '8px', color: '#6b7280' }}>
            수동으로 알림을 생성해서 시스템을 테스트합니다
          </p>
        </div>

        {/* 현재 알림 개수 */}
        <div className="card" style={{ marginBottom: '24px', background: '#eff6ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '600', color: '#1e40af' }}>
              📊 현재 알림 개수
            </span>
            <span className="badge badge-primary" style={{ fontSize: '16px', padding: '8px 16px' }}>
              {notifications.length}개
            </span>
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div 
            className="card" 
            style={{ 
              marginBottom: '24px',
              background: message.includes('✅') ? '#d1fae5' : message.includes('❌') ? '#fee2e2' : '#fef3c7',
              border: message.includes('✅') ? '2px solid #6ee7b7' : message.includes('❌') ? '2px solid #fca5a5' : '2px solid #fbbf24'
            }}
          >
            <p style={{ 
              margin: 0, 
              color: message.includes('✅') ? '#047857' : message.includes('❌') ? '#dc2626' : '#92400e'
            }}>
              {message}
            </p>
          </div>
        )}

        {/* 테스트 버튼들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            🎯 테스트 알림 생성
          </h3>

          {testNotifications.map((notif, idx) => (
            <button
              key={idx}
              className="card card-interactive"
              onClick={() => createTestNotification(notif)}
              disabled={loading}
              style={{
                padding: '16px',
                textAlign: 'left',
                border: '2px solid var(--color-border)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Send size={20} color="#f092a0" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {notif.tab} • {notif.type}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 안내 */}
        <div className="card" style={{ marginTop: '32px', background: '#fef3f5' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#f092a0' }}>
            💡 사용 방법
          </h4>
          <ol style={{ 
            fontSize: '13px', 
            color: '#6b7280', 
            paddingLeft: '20px',
            margin: 0,
            lineHeight: '1.6'
          }}>
            <li>위의 버튼을 클릭하여 테스트 알림을 생성합니다</li>
            <li>알림 페이지로 이동하여 생성된 알림을 확인합니다</li>
            <li>알림이 보이면 시스템이 정상 작동하는 것입니다</li>
            <li>알림이 안 보이면 Console 로그를 확인하세요</li>
          </ol>
        </div>

        {/* 알림 페이지 링크 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a 
            href="/alarm" 
            className="btn btn-primary btn-lg"
            style={{ textDecoration: 'none' }}
          >
            🔔 알림 페이지로 이동
          </a>
        </div>

      </div>
    </div>
  );
}