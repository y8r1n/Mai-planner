// src/components/common/SubjectHeader.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/subject-header.css";

export default function SubjectHeader({ title, onBack }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="subject-header">
      <button 
        className="subject-back-btn" 
        onClick={handleBack}
        aria-label="뒤로가기"
      >
        ←
      </button>
      <h1 className="subject-header-title">{title}</h1>
      <div className="subject-header-spacer" />
    </header>
  );
}