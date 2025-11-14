//임시 알림 삭제 파일
import React, { useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ClearNotifications() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const clearAllNotifications = async () => {
    if (!window.confirm('모든 알림을 삭제하시겠습니까?')) return;
    
    setLoading(true);
    setResult('');

    try {
      const notificationsRef = collection(db, 'notifications');
      const snapshot = await getDocs(notificationsRef);
      
      console.log(`총 ${snapshot.size}개의 알림을 찾았습니다.`);
      
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'notifications', docSnap.id))
      );
      
      await Promise.all(deletePromises);
      
      setResult(`✅ ${snapshot.size}개의 알림이 성공적으로 삭제되었습니다!`);
      console.log('✅ 모든 알림 삭제 완료');
    } catch (error) {
      console.error('❌ 삭제 실패:', error);
      setResult(`❌ 삭제 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '40px',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h2 style={{ marginBottom: '20px' }}>🗑️ 알림 데이터 삭제</h2>
      
      <button
        onClick={clearAllNotifications}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600'
        }}
      >
        {loading ? '삭제 중...' : '모든 알림 삭제하기'}
      </button>

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: result.includes('✅') ? '#d1fae5' : '#fee2e2',
          borderRadius: '8px',
          color: result.includes('✅') ? '#065f46' : '#991b1b'
        }}>
          {result}
        </div>
      )}

      <div style={{
        marginTop: '30px',
        padding: '16px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#92400e'
      }}>
        ⚠️ 이 작업은 되돌릴 수 없습니다!<br/>
        모든 알림 데이터가 영구적으로 삭제됩니다.
      </div>
    </div>
  );
}