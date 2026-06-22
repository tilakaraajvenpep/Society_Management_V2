import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
  updateUser: (userData: any, newToken?: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(() => {
    const savedSession = sessionStorage.getItem('user');
    if (savedSession) return JSON.parse(savedSession);
    const savedLocal = localStorage.getItem('user');
    if (savedLocal) {
      const parsed = JSON.parse(savedLocal);
      if (parsed.role !== 'TENANT_ADMIN' && parsed.role !== 'MEMBER') {
        return parsed;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const savedSession = sessionStorage.getItem('token');
    if (savedSession) return savedSession;
    
    const savedLocalUser = localStorage.getItem('user');
    if (savedLocalUser) {
      const parsed = JSON.parse(savedLocalUser);
      if (parsed.role !== 'TENANT_ADMIN' && parsed.role !== 'MEMBER') {
        return localStorage.getItem('token');
      }
    }
    return null;
  });

  const login = (userData: any, token: string) => {
    setUser(userData);
    setToken(token);
    if (userData.role === 'TENANT_ADMIN' || userData.role === 'MEMBER') {
      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('token', token);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } else {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  const updateUser = (userData: any, newToken?: string) => {
    const updated = { ...user, ...userData };
    setUser(updated);
    if (updated.role === 'TENANT_ADMIN' || updated.role === 'MEMBER') {
      sessionStorage.setItem('user', JSON.stringify(updated));
      if (newToken) {
        setToken(newToken);
        sessionStorage.setItem('token', newToken);
      }
    } else {
      localStorage.setItem('user', JSON.stringify(updated));
      if (newToken) {
        setToken(newToken);
        localStorage.setItem('token', newToken);
      }
    }
  };

  useEffect(() => {
    if (!user || (user.role !== 'TENANT_ADMIN' && user.role !== 'MEMBER')) {
      return;
    }

    const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes
    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        logout();
      }, TIMEOUT_DURATION);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'click'];

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
