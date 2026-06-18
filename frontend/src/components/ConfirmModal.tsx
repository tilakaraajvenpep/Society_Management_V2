import React, { createContext, useContext, useState, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

// ─── Provider Component ───────────────────────────────────────────────────────
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  
  // Keep track of the resolve function of the active confirmation promise
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: '1.5rem',
          animation: 'confirmFadeIn 0.2s ease-out',
        }}>
          <style>{`
            @keyframes confirmFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes confirmScaleIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
          <div style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '0.875rem',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            animation: 'confirmScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {/* Header */}
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary, #0f172a)',
              marginBottom: '0.75rem',
              marginTop: 0,
            }}>
              {options.title || 'Confirm Action'}
            </h3>
            
            {/* Body */}
            <div style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary, #64748b)',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
              whiteSpace: 'pre-line',
            }}>
              {options.message}
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: 'var(--bg-primary, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #f1f5f9)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary, #ffffff)'}
              >
                {options.cancelLabel || 'Cancel'}
              </button>
              
              <button
                onClick={handleConfirm}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: options.danger ? 'var(--error, #ef4444)' : 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {options.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useConfirm = () => useContext(ConfirmContext);
