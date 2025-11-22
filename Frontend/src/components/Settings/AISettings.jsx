// src/components/Settings/AISettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Brain, MessageCircle, Zap } from 'lucide-react';
import '../../styles/Settings.css';

/**
 * 🤖 AI 설정 페이지
 */
export default function AISettings() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const userId = user?.uid;

  const [settings, setSettings] = useState({
    summaryStyle: 'concise', // 'brief' | 'concise' | 'detailed'
    mentorTone: 'friendly', // 'formal' | 'friendly' | 'casual'
    recommendStrength: 'medium', // 'low' | 'medium' | 'high'
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
          if (data.ai) {
            setSettings(data.ai);
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
        { ai: newSettings },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 요약 스타일 변경
  const handleSummaryStyleChange = async (value) => {
    const newSettings = { ...settings, summaryStyle: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // 멘토 톤 변경
  const handleMentorToneChange = async (value) => {
    const newSettings = { ...settings, mentorTone: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // 추천 강도 변경
  const handleRecommendStrengthChange = async (value) => {
    const newSettings = { ...settings, recommendStrength: value };
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
          <h1 className="settings-title">AI 설정</h1>
        </div>

        {/* 설정 항목 */}
        <div className="settings-sections">
          
          {/* 요약 스타일 */}
          <div className="settings-section">
            <h3 className="section-title">📝 요약 스타일</h3>
            
            <div className="settings-card">
              <div className="option-group">
                <div className="option-header">
                  <Brain size={24} />
                  <div>
                    <h4>AI 요약 스타일 선택</h4>
                    <p>강의 자료 요약 시 적용됩니다</p>
                  </div>
                </div>

                <div className="radio-group">
                  <label className={`radio-item ${settings.summaryStyle === 'brief' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="summaryStyle"
                      value="brief"
                      checked={settings.summaryStyle === 'brief'}
                      onChange={(e) => handleSummaryStyleChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">간단 요약</span>
                      <span className="radio-desc">핵심만 빠르게</span>
                    </div>
                  </label>

                  <label className={`radio-item ${settings.summaryStyle === 'concise' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="summaryStyle"
                      value="concise"
                      checked={settings.summaryStyle === 'concise'}
                      onChange={(e) => handleSummaryStyleChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">표준 요약</span>
                      <span className="radio-desc">균형잡힌 요약</span>
                    </div>
                  </label>

                  <label className={`radio-item ${settings.summaryStyle === 'detailed' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="summaryStyle"
                      value="detailed"
                      checked={settings.summaryStyle === 'detailed'}
                      onChange={(e) => handleSummaryStyleChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">상세 요약</span>
                      <span className="radio-desc">자세한 설명 포함</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 멘토 톤 */}
          <div className="settings-section">
            <h3 className="section-title">💬 AI 멘토 톤</h3>
            
            <div className="settings-card">
              <div className="option-group">
                <div className="option-header">
                  <MessageCircle size={24} />
                  <div>
                    <h4>AI 멘토 대화 스타일</h4>
                    <p>멘토 채팅 시 적용됩니다</p>
                  </div>
                </div>

                <div className="radio-group">
                  <label className={`radio-item ${settings.mentorTone === 'formal' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="mentorTone"
                      value="formal"
                      checked={settings.mentorTone === 'formal'}
                      onChange={(e) => handleMentorToneChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">격식있는 말투</span>
                      <span className="radio-desc">존댓말, 전문적인 톤</span>
                    </div>
                  </label>

                  <label className={`radio-item ${settings.mentorTone === 'friendly' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="mentorTone"
                      value="friendly"
                      checked={settings.mentorTone === 'friendly'}
                      onChange={(e) => handleMentorToneChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">친근한 말투</span>
                      <span className="radio-desc">부드럽고 다정한 톤</span>
                    </div>
                  </label>

                  <label className={`radio-item ${settings.mentorTone === 'casual' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="mentorTone"
                      value="casual"
                      checked={settings.mentorTone === 'casual'}
                      onChange={(e) => handleMentorToneChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">편한 말투</span>
                      <span className="radio-desc">반말, 친구같은 톤</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 추천 강도 */}
          <div className="settings-section">
            <h3 className="section-title">⚡ AI 추천 강도</h3>
            
            <div className="settings-card">
              <div className="option-group">
                <div className="option-header">
                  <Zap size={24} />
                  <div>
                    <h4>일정 추천 적극성</h4>
                    <p>WithAI 타임라인 생성 시 적용됩니다</p>
                  </div>
                </div>

                <div className="radio-group">
                  <label className={`radio-item ${settings.recommendStrength === 'low' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="recommendStrength"
                      value="low"
                      checked={settings.recommendStrength === 'low'}
                      onChange={(e) => handleRecommendStrengthChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">낮음</span>
                      <span className="radio-desc">최소한의 추천만</span>
                    </div>
                  </label>

                  <label className={`radio-item ${settings.recommendStrength === 'medium' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="recommendStrength"
                      value="medium"
                      checked={settings.recommendStrength === 'medium'}
                      onChange={(e) => handleRecommendStrengthChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">중간</span>
                      <span className="radio-desc">적절한 추천</span>
                    </div>
                  </label>

                  <label className={`radio-item ${settings.recommendStrength === 'high' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="recommendStrength"
                      value="high"
                      checked={settings.recommendStrength === 'high'}
                      onChange={(e) => handleRecommendStrengthChange(e.target.value)}
                      disabled={saving}
                    />
                    <div className="radio-content">
                      <span className="radio-title">높음</span>
                      <span className="radio-desc">적극적인 추천</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 안내 */}
          <div className="settings-section">
            <div className="settings-card info-card">
              <h4>💡 AI 설정 안내</h4>
              <ul>
                <li>설정은 즉시 적용되며 Firestore에 저장됩니다</li>
                <li>요약 스타일은 과목별 강의 자료 요약에 영향을 줍니다</li>
                <li>멘토 톤은 AI 멘토와의 대화 스타일을 결정합니다</li>
                <li>추천 강도는 WithAI 타임라인 생성 시 적용됩니다</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}