// src/components/FCMTest.jsx
import React, { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../services/firebase';
import { useNotificationPermission } from '../hooks/useNotificationPermission';
import { onForegroundMessage } from '../services/notificationService';
import { Bell, BellOff, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/design-system.css';

/**
 * 🧪 FCM 테스트 컴포넌트
 */
export default function FCMTest() {
  const [user] = useAuthState(auth);
  const {
    permission,
    fcmToken,
    isSupported,
    loading,
    error,
    requestPermission,
    isGranted,
    isDenied,
    isDefault,
  } = useNotificationPermission(user?.uid);

  // 포그라운드 메시지 리스너
  useEffect(() => {
    if (!isGranted) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📬 메시지 수신:', payload);
      // NotificationContext에 추가하거나 Toast 표시
    });

    return () => unsubscribe();
  }, [isGranted]);

  if (!user) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ marginTop: '16px', color: '#6b7280' }}>로그인이 필요합니다</h2>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <BellOff size={48} color="#6b7280" />
        <h2 style={{ marginTop: '16px', color: '#6b7280' }}>알림 미지원 브라우저</h2>
        <p style={{ marginTop: '8px', color: '#9ca3af' }}>
          이 브라우저는 푸시 알림을 지원하지 않습니다.
        </p>
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
            🔔 FCM 테스트
          </h1>
          <p style={{ marginTop: '8px', color: '#6b7280' }}>
            Firebase Cloud Messaging 테스트 페이지
          </p>
        </div>

        {/* 상태 카드 */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            📊 현재 상태
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 권한 상태 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '500', minWidth: '100px' }}>권한 상태:</span>
              <span 
                className="badge"
                style={{
                  background: isGranted ? '#d1fae5' : isDenied ? '#fee2e2' : '#fef3c7',
                  color: isGranted ? '#047857' : isDenied ? '#dc2626' : '#ca8a04'
                }}
              >
                {isGranted && '✅ 허용'}
                {isDenied && '❌ 거부'}
                {isDefault && '⏳ 미설정'}
              </span>
            </div>

            {/* FCM 토큰 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '500', minWidth: '100px' }}>FCM 토큰:</span>
              <span style={{ 
                fontSize: '12px', 
                color: fcmToken ? '#047857' : '#9ca3af',
                wordBreak: 'break-all'
              }}>
                {fcmToken ? '✅ 발급됨' : '❌ 없음'}
              </span>
            </div>

            {/* 사용자 ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '500', minWidth: '100px' }}>User ID:</span>
              <span style={{ fontSize: '12px', color: '#6b7280', wordBreak: 'break-all' }}>
                {user.uid.slice(0, 20)}...
              </span>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div 
            className="card" 
            style={{ 
              marginBottom: '24px',
              background: '#fee2e2',
              border: '2px solid #fca5a5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={24} color="#dc2626" />
              <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          </div>
        )}

        {/* 성공 메시지 */}
        {isGranted && fcmToken && (
          <div 
            className="card" 
            style={{ 
              marginBottom: '24px',
              background: '#d1fae5',
              border: '2px solid #6ee7b7'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={24} color="#047857" />
              <p style={{ color: '#047857', margin: 0 }}>
                FCM이 정상적으로 설정되었습니다! 🎉
              </p>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isDefault && (
            <button
              className="btn btn-primary btn-lg"
              onClick={requestPermission}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? '처리 중...' : '🔔 알림 권한 요청'}
            </button>
          )}

          {isDenied && (
            <div 
              className="card" 
              style={{ 
                background: '#fef3c7',
                border: '2px solid #fbbf24',
                padding: '16px'
              }}
            >
              <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>
                ⚠️ 알림 권한이 거부되었습니다.<br/>
                브라우저 설정에서 직접 권한을 허용해주세요.
              </p>
            </div>
          )}

          {isGranted && fcmToken && (
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                navigator.clipboard.writeText(fcmToken);
                alert('FCM 토큰이 복사되었습니다!');
              }}
              style={{ width: '100%' }}
            >
              📋 토큰 복사
            </button>
          )}
        </div>

        {/* 토큰 상세 */}
        {fcmToken && (
          <div className="card" style={{ marginTop: '24px', background: '#f9fafb' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
              🔑 FCM Token (전체)
            </h4>
            <pre style={{
              fontSize: '11px',
              color: '#4b5563',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              background: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {fcmToken}
            </pre>
          </div>
        )}

        {/* 안내 */}
        <div className="card" style={{ marginTop: '24px', background: '#eff6ff' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>
            ℹ️ 테스트 방법
          </h4>
          <ol style={{ 
            fontSize: '13px', 
            color: '#1e40af', 
            paddingLeft: '20px',
            margin: 0,
            lineHeight: '1.6'
          }}>
            <li>알림 권한을 허용합니다</li>
            <li>FCM 토큰이 발급되는지 확인합니다</li>
            <li>Firebase Console에서 테스트 메시지를 전송합니다</li>
            <li>브라우저에서 알림이 표시되는지 확인합니다</li>
          </ol>
        </div>

      </div>
    </div>
  );
}