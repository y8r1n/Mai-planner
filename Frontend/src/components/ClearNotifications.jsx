import React, { useState } from 'react';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ClearNotifications() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const clearAllNotifications = async () => {
    if (!window.confirm("정말 모든 알림을 삭제할까요? 되돌릴 수 없습니다.")) return;

    setLoading(true);
    setResult('');

    try {
      const ref = collection(db, "notifications");
      const snap = await getDocs(ref);

      if (snap.empty) {
        setResult("⚠️ 삭제할 알림이 없습니다.");
        setLoading(false);
        return;
      }

      const deletes = snap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletes);

      setResult(`✅ 총 ${snap.size}개의 알림이 삭제되었습니다.`);
    } catch (err) {
      console.error("❌ 삭제 오류:", err);
      setResult("❌ 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      <h2>🗑️ 알림 전체 삭제</h2>

      <button
        onClick={clearAllNotifications}
        disabled={loading}
        style={{
          padding: "12px 24px",
          marginTop: "12px",
          backgroundColor: loading ? "#ccc" : "#ef4444",
          color: "white",
          borderRadius: "8px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {loading ? "삭제 중..." : "모든 알림 삭제하기"}
      </button>

      {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            backgroundColor: result.includes("❌") ? "#fee2e2" : "#d1fae5",
            borderRadius: "8px",
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}
