import React from 'react';
import { Loader2, Shield, Building, Sparkles } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  message?: string;
  subtitle?: string;
  inline?: boolean;
  centered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeMap = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 36,
  xl: 48,
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color,
  message,
  subtitle,
  inline = false,
  centered = true,
  className = '',
  style = {},
}) => {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 24;

  const content = (
    <div
      className={`loading-spinner-wrapper ${className}`}
      style={{
        display: inline ? 'inline-flex' : 'flex',
        flexDirection: inline ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: inline ? '0.5rem' : '0.85rem',
        padding: inline ? '0.25rem 0' : '1.5rem',
        color: color || 'var(--text-secondary)',
        ...style,
      }}
    >
      <Loader2
        size={pixelSize}
        className="animate-spin"
        style={{
          color: color || 'var(--primary)',
          flexShrink: 0,
        }}
      />
      {(message || subtitle) && (
        <div style={{ textAlign: inline ? 'left' : 'center' }}>
          {message && (
            <div
              style={{
                fontSize: inline ? '0.875rem' : '0.925rem',
                fontWeight: 500,
                color: color || 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {message}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                fontSize: '0.775rem',
                color: 'var(--text-secondary)',
                marginTop: '0.2rem',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (centered && !inline) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export interface PageLoaderProps {
  message?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  minHeight?: string;
  portalType?: 'superadmin' | 'admin' | 'member' | 'default';
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Loading...',
  subtitle = 'Please wait while we prepare your workspace',
  icon,
  minHeight = '100vh',
  portalType = 'default',
}) => {
  const renderIcon = () => {
    if (icon) return icon;
    if (portalType === 'superadmin') return <Shield size={36} />;
    if (portalType === 'admin') return <Building size={36} />;
    if (portalType === 'member') return <Sparkles size={36} />;
    return <Building size={36} />;
  };

  return (
    <div
      className="page-loader-root"
      style={{
        display: 'flex',
        minHeight,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem 1.5rem',
      }}
    >
      <div
        className="card page-loader-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
          padding: '2.5rem 2rem',
          borderRadius: '1.25rem',
          boxShadow: 'var(--card-shadow)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Animated ambient background ring */}
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.75rem',
          }}
        >
          {/* Outer rotating gradient ring */}
          <div
            className="loader-outer-spinner"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: 'var(--primary)',
              borderRightColor: 'var(--accent)',
              animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite',
            }}
          />
          {/* Inner pulsating icon badge */}
          <div
            className="animate-pulse"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            {renderIcon()}
          </div>
        </div>

        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          {message}
        </h3>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>

        {/* Linear progress bar animation */}
        <div
          style={{
            width: '160px',
            height: '4px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '9999px',
            marginTop: '1.75rem',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            className="loader-progress-bar"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '45%',
              background: 'linear-gradient(90deg, var(--primary), var(--accent))',
              borderRadius: '9999px',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const TableLoader: React.FC<{
  colSpan: number;
  message?: string;
  height?: string;
}> = ({ colSpan, message = 'Loading data...', height = '180px' }) => {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          textAlign: 'center',
          padding: '2.5rem 1rem',
          height,
          verticalAlign: 'middle',
        }}
      >
        <LoadingSpinner message={message} size="md" />
      </td>
    </tr>
  );
};

export default LoadingSpinner;
