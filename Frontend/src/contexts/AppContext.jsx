// src/contexts/AppContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useApp must be used within AppProvider");
  return context;
};

export function AppProvider({ children }) {
  /** ============================
   * 🔥 전역 상태
   * ============================ */
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [error, setError] = useState(null);

  const [toast, setToast] = useState(null); // { message, type }

  /** ============================
   * 🔥 로딩 컨트롤
   * ============================ */
  const startLoading = useCallback((message = "처리 중...") => {
    setLoading(true);
    setLoadingMessage(message);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
    setLoadingMessage("");
  }, []);

  /** ============================
   * 🔥 오류 처리
   * ============================ */
  const showError = useCallback((msg, duration = 4000) => {
    setError(msg);
    if (duration > 0) {
      setTimeout(() => setError(null), duration);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** ============================
   * 🔥 Toast 메시지
   * ============================ */
  const showToast = useCallback(
    (message, type = "success", duration = 3000) => {
      setToast({ message, type, id: Date.now() });

      if (duration > 0) {
        setTimeout(() => {
          setToast(null);
        }, duration);
      }
    },
    []
  );

  const closeToast = useCallback(() => setToast(null), []);

  /** ============================================================
   * 🔥 withLoading: 비동기 작업 자동 로딩 + 성공 메시지 표시
   * ============================================================ */
  const withLoading = useCallback(
    async (
      asyncFn,
      loadingMsg = "처리 중...",
      successMsg = null,
      errorMsg = "오류가 발생했습니다."
    ) => {
      try {
        startLoading(loadingMsg);
        const result = await asyncFn();
        stopLoading();

        if (successMsg) {
          showToast(successMsg, "success");
        }
        return result;
      } catch (err) {
        stopLoading();
        const message =
          err?.response?.data?.message ||
          err?.message ||
          errorMsg;

        showError(message);
        throw err;
      }
    },
    [startLoading, stopLoading, showToast, showError]
  );

  /** ============================================================
   * 🔥 withToast: 성공 메시지만 표시
   * ============================================================ */
  const withToast = useCallback(
    async (asyncFn, successMsg = null) => {
      try {
        const result = await asyncFn();
        if (successMsg) {
          showToast(successMsg, "success");
        }
        return result;
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "오류가 발생했습니다.";
        showError(message);
        throw err;
      }
    },
    [showToast, showError]
  );

  /** ============================================================
   * 🔥 withError: 오류만 자동 처리하고, 성공/로딩은 필요 없을 때
   * ============================================================ */
  const withError = useCallback(
    async (asyncFn, errorMsg = "오류가 발생했습니다.") => {
      try {
        return await asyncFn();
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          errorMsg;

        showError(message);
        throw err;
      }
    },
    [showError]
  );

  /** ============================
   * 🔥 Context 값
   * ============================ */
  const value = {
    loading,
    loadingMessage,
    error,
    toast,

    startLoading,
    stopLoading,
    showError,
    clearError,
    showToast,
    closeToast,

    withLoading,
    withToast,
    withError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
