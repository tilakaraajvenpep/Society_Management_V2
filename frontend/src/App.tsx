import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TenantProvider } from './context/TenantContext';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TenantAdminDashboard from './pages/TenantAdminDashboard';
import MemberPortal from './pages/MemberPortal';
import { Sun, Moon } from 'lucide-react';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const RootRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" />;
  if (user.role === 'TENANT_ADMIN') return <Navigate to="/tenant-admin" />;
  return <Navigate to="/member" />;
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/:tenantSlug" element={<LoginPage />} />
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute roles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tenant-admin" 
              element={
                <ProtectedRoute roles={['TENANT_ADMIN']}>
                  <TenantAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/member" 
              element={
                <ProtectedRoute roles={['MEMBER']}>
                  <MemberPortal />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<RootRedirect />} />
          </Routes>
          <ThemeToggle />
        </Router>
      </ThemeProvider>
    </AuthProvider>
    </TenantProvider>
  );
}

export default App;
