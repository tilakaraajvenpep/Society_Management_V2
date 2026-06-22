import React, { useState, useRef, useEffect } from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../context/LanguageContext';

const LANGUAGES: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* Trigger Button */}
      <button
        id="language-switcher-btn"
        onClick={() => setIsOpen(v => !v)}
        title="Change Language / மொழி மாற்று"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: isOpen ? 'var(--bg-tertiary)' : 'none',
          border: '1px solid var(--border-color)',
          borderRadius: '0.5rem',
          padding: '0.4rem 0.65rem',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-tertiary)';
        }}
        onMouseLeave={e => {
          if (!isOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }}
      >
        <Languages size={15} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '0.875rem' }}>{current.flag}</span>
        <span className="desktop-only" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {current.nativeLabel}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            minWidth: '160px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2), 0 4px 10px -5px rgba(0,0,0,0.1)',
            zIndex: 500,
            overflow: 'hidden',
            animation: 'fadeInDown 0.15s ease',
          }}
        >
          {/* Dropdown header */}
          <div
            style={{
              padding: '0.6rem 1rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            Select Language
          </div>

          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              id={`lang-option-${lang.code}`}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1rem',
                background: language === lang.code ? 'rgba(var(--primary-rgb, 37,99,235), 0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
                color: language === lang.code ? 'var(--primary)' : 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: language === lang.code ? 700 : 500,
                textAlign: 'left',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                if (language !== lang.code)
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
              }}
              onMouseLeave={e => {
                if (language !== lang.code)
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{lang.flag}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
                <span>{lang.nativeLabel}</span>
                {lang.nativeLabel !== lang.label && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    {lang.label}
                  </span>
                )}
              </div>
              {language === lang.code && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LanguageSwitcher;
