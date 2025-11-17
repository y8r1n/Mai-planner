// src/components/common/Toast.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import '../../styles/toast.css';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

export default function Toast() {
  const { toast, closeToast } = useApp();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      // 애니메이션을 위해 약간의 지연
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [toast]);

  if (!toast) return null;

  const Icon = icons[toast.type] || Info;

  return (
    <div className={`toast-container ${isVisible ? 'visible' : ''}`}>
      <div className={`toast toast-${toast.type}`}>
        <div className="toast-icon">
          <Icon size={20} />
        </div>
        <div className="toast-message">
          {toast.message}
        </div>
        <button 
          className="toast-close"
          onClick={closeToast}
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}