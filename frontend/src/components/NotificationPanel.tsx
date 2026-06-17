import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Bell, MessageSquare, CreditCard, Landmark, 
  Megaphone, Info
} from 'lucide-react';

interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationPanelProps {
  token: string | null;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Poll for notifications every 20 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.patch(`/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TICKET':
        return <MessageSquare size={16} style={{ color: '#2563eb' }} />;
      case 'PAYMENT':
        return <CreditCard size={16} style={{ color: '#10b981' }} />;
      case 'CASH':
        return <Landmark size={16} style={{ color: '#f59e0b' }} />;
      case 'ANNOUNCEMENT':
        return <Megaphone size={16} style={{ color: '#7c3aed' }} />;
      default:
        return <Info size={16} style={{ color: '#64748b' }} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'TICKET':
        return 'rgba(37, 99, 235, 0.1)';
      case 'PAYMENT':
        return 'rgba(16, 185, 129, 0.1)';
      case 'CASH':
        return 'rgba(245, 158, 11, 0.1)';
      case 'ANNOUNCEMENT':
        return 'rgba(124, 58, 237, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          position: 'relative',
          transition: 'background-color 0.2s',
        }}
        className="hover-bg-effect"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span 
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: 'var(--error)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '9999px',
              height: '16px',
              minWidth: '16px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--card-bg)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            width: '320px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            boxShadow: 'var(--card-shadow)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '400px',
          }}
        >
          {/* Header */}
          <div 
            style={{
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div 
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Bell size={28} style={{ opacity: 0.2, marginBottom: '0.25rem' }} />
                <span>All caught up!</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>No notifications yet.</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={(e) => !n.isRead && markAsRead(n.id, e)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '0.75rem',
                    cursor: n.isRead ? 'default' : 'pointer',
                    backgroundColor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.03)',
                    transition: 'background-color 0.2s',
                    position: 'relative',
                  }}
                  className="notification-item"
                >
                  {/* Icon */}
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: getIconBg(n.type),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getIcon(n.type)}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: n.isRead ? 600 : 700,
                        color: 'var(--text-primary)',
                        marginBottom: '0.15rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 400, flexShrink: 0 }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <p 
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.35,
                        margin: 0,
                        wordBreak: 'break-word',
                      }}
                    >
                      {n.message}
                    </p>
                  </div>

                  {/* Unread indicator / action */}
                  {!n.isRead && (
                    <button
                      onClick={(e) => markAsRead(n.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                        color: 'var(--primary)',
                      }}
                      title="Mark as read"
                    >
                      <div 
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary)',
                        }}
                      />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationPanel;
