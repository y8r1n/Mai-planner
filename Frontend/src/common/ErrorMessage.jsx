// src/components/common/ErrorMessage.jsx
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { AlertCircle, X } from 'lucide-react';
import '../../styles/error.css';

export default function ErrorMessage() {
  const { error, clearError } = useApp();

  if (!error) return null;

  return (
    <div className="error-container">
      <div className="error-content">
        <div className="error-icon">
          <AlertCircle size={24} />
        </div>
        <div className="error-message">
          {error}
        </div>
        <button 
          className="error-close"
          onClick={clearError}
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}