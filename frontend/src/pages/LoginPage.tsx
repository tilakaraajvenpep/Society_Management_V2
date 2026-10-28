import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { PageLoader } from '../components/LoadingSpinner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [forgotClicked, setForgotClicked] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    try {
      const response = await axios.post('/auth/login', { 
        identifier: email, 
        password,
        tenantId: tenant?.id
      });
      login(response.data.user, response.data.token);
      
      const { role } = response.data.user;
      if (role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (role === 'TENANT_ADMIN') navigate('/tenant-admin');
      else navigate('/member');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (tenantLoading) {
    return (
      <PageLoader 
        message="Connecting to Society Portal..." 
        subtitle="Verifying credentials and society workspace..."
      />
    );
  }


  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <img 
              src="/societyarena-logo.jpeg" 
              alt="SocietyArena" 
              style={{ height: '72px', width: '72px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 8px 24px rgba(10, 17, 40, 0.2)' }}
            />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            {tenant ? tenant.name : 'SocietyArena'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {tenant ? 'Society Management Portal' : 'Sign in to your society management platform'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Email or Phone Number</label>
            <input 
              type="text" 
              placeholder="name@example.com or 9876543210" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
              {forgotClicked ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 600 }}>Contact Admin (7812860791)</span>
              ) : (
                <a href="#" onClick={(e) => { e.preventDefault(); setForgotClicked(true); }} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>Forgot?</a>
              )}
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8125rem', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

          <button 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              padding: '0.75rem'
            }} 
            disabled={isLoggingIn}
          >
            {isLoggingIn && <Loader2 size={18} className="animate-spin" />}
            <span>{isLoggingIn ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Need a platform account? <a href="tel:7812860791" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Contact Sales: 7812860791</a>
          </p>
          <a href="/landing" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            ← Back to SocietyArena Overview
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
