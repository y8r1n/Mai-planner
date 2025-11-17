// src/components/common/LoadingSpinner.jsx
import React from 'react';
import { useApp } from '../contexts/AppContext';
import '../../styles/loading.css';

export default function LoadingSpinner() {
  const { loading, loadingMessage } = useApp();

  if (!loading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        {loadingMessage && (
          <p className="loading-message">{loadingMessage}</p>
        )}
      </div>
    </div>
  );
}