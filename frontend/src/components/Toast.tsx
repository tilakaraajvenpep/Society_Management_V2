import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

// ─── Individual Toast item ────────────────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const colors: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
    success: { bg: 'rgba(16,185,129,0.12)', border: '#10b981', icon: '✓', color: '#059669' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', icon: '✕', color: '#dc2626' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', icon: '⚠', color: '#d97706' },
    info:    { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', icon: 'ℹ', color: '#2563eb' },
  };
  const c = colors[toast.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        padding: '0.875rem 1rem',
        borderRadius: '0.625rem',
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '280px',
        maxWidth: '420px',
        backdropFilter: 'blur(8px)',
        animation: 'toastSlideIn 0.25s ease',
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={() => onDismiss(toast.id)}
      title="Click to dismiss"
    >
      <span style={{
        flexShrink: 0,
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: c.border,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        marginTop: '0.05rem',
      }}>
        {c.icon}
      </span>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5, color: 'var(--text-primary, #0f172a)', flex: 1 }}>
        {toast.message}
      </span>
      <span style={{ fontSize: '1rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1, flexShrink: 0 }}>×</span>
    </div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────
const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0)  scale(1); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useToast = () => useContext(ToastContext);
