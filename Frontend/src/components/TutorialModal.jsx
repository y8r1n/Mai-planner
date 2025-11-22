// src/components/TutorialModal.jsx
import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/tutorial.css";

const TUTORIAL_STEPS = [
  {
    id: 1,
    icon: "🏠",
    title: "홈 화면",
    description: "오늘의 할 일, 시간표, 캘린더를 한눈에 확인하세요.",
    highlight: "Daily와 AnyTime으로 나뉜 TODO를 관리할 수 있습니다.",
  },
  {
    id: 2,
    icon: "✨",
    title: "WithAI 타임라인",
    description: "AI가 추천하는 하루 일정을 자동으로 생성해드립니다.",
    highlight: "TODO를 기반으로 최적의 시간표를 만들어보세요.",
  },
  {
    id: 3,
    icon: "📚",
    title: "과목별 학습 관리",
    description: "주차별 강의 자료를 업로드하고 AI 멘토와 대화하세요.",
    highlight: "AI 퀴즈 생성과 오답노트로 효율적인 복습이 가능합니다.",
  },
  {
    id: 4,
    icon: "📅",
    title: "시간표 & 캘린더",
    description: "주간 시간표와 월별 일정을 쉽게 관리하세요.",
    highlight: "모든 일정이 자동으로 연동됩니다.",
  },
];

export default function TutorialModal({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("tutorialShown", "true");
    onClose();
  };

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <div className="tutorial-backdrop">
      <div className="tutorial-modal">
        {/* 닫기 버튼 */}
        <button className="tutorial-close-btn" onClick={handleFinish}>
          <X size={24} />
        </button>

        {/* 아이콘 */}
        <div className="tutorial-icon">{step.icon}</div>

        {/* 제목 */}
        <h2 className="tutorial-title">{step.title}</h2>

        {/* 설명 */}
        <p className="tutorial-description">{step.description}</p>

        {/* 하이라이트 */}
        <div className="tutorial-highlight">
          <span className="highlight-icon">💡</span>
          {step.highlight}
        </div>

        {/* 진행 표시 */}
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`progress-dot ${index === currentStep ? "active" : ""} ${
                index < currentStep ? "completed" : ""
              }`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        {/* 버튼 */}
        <div className="tutorial-buttons">
          {currentStep > 0 && (
            <button className="tutorial-btn tutorial-btn-prev" onClick={handlePrev}>
              <ChevronLeft size={18} />
              이전
            </button>
          )}

          <button className="tutorial-btn tutorial-btn-next" onClick={handleNext}>
            {currentStep === TUTORIAL_STEPS.length - 1 ? "시작하기" : "다음"}
            {currentStep < TUTORIAL_STEPS.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>

        {/* 건너뛰기 */}
        <button className="tutorial-skip" onClick={handleFinish}>
          건너뛰기
        </button>
      </div>
    </div>
  );
}