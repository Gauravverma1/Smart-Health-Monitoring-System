import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const styles = `
  .auth-card { transition: all 0.3s ease; }
  .auth-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(15, 18, 25, 0.15); }
  .auth-input { transition: all 0.2s ease; }
  .auth-input:hover { border-color: var(--btn); }
  .auth-input:focus { outline: none; border-color: var(--btn); box-shadow: 0 0 0 3px rgba(18, 24, 38, 0.1); }
  .auth-btn { transition: all 0.2s ease; position: relative; overflow: hidden; }
  .auth-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(18, 24, 38, 0.2); }
  .auth-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .auth-link { transition: all 0.2s ease; cursor: pointer; }
  .auth-link:hover { transform: scale(1.05); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.4s ease; }
`;

const Card: React.FC<{ className?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ className = '', children, style }) => (
  <div className={'ui-card auth-card fade-in ' + className} style={style}>{children}</div>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ui-card-content">{children}</div>
);

interface LoginProps {
  onLogin: (token: string, role: string, patientId: string, fullName: string) => void;
  onSwitch: () => void;
}

export default function LoginPage({ onLogin, onSwitch }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        alert('Invalid username or password');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onLogin(data.token, data.role, data.patientId || '', data.fullName || '');
    } catch {
      alert('Login error');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Card className="glass" style={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="brand-logo" style={{ margin: '0 auto 12px', width: 48, height: 48, fontSize: 24, transition: 'transform 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(10deg) scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0) scale(1)'}>❤</div>
            <div className="title" style={{ fontSize: 24, marginBottom: 8 }}>Sign In</div>
            <div className="muted">Enter your credentials to continue</div>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                placeholder="Username"
                className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" className="ui-btn auth-btn" disabled={loading} style={{ width: '100%', marginBottom: 16, padding: '12px', fontSize: 15, fontWeight: 600 }}>
              {loading ? '🔄 Signing In...' : '🚀 Sign In'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <span className="muted" style={{ fontSize: 14 }}>Don't have an account? </span>
              <button type="button" className="ui-btn btn-secondary auth-link" onClick={onSwitch} style={{ padding: '4px 12px', fontSize: 14, fontWeight: 600 }}>Sign Up</button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
