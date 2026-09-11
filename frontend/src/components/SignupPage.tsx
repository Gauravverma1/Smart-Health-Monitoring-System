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
  .role-btn { transition: all 0.2s ease; }
  .role-btn:hover { transform: scale(1.02); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.4s ease; }
`;

const Card: React.FC<{ className?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ className = '', children, style }) => (
  <div className={'ui-card auth-card fade-in ' + className} style={style}>{children}</div>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ui-card-content">{children}</div>
);

interface SignupProps {
  onSignup: (token: string, role: string, patientId: string, fullName: string) => void;
  onSwitch: () => void;
}

export default function SignupPage({ onSignup, onSwitch }: SignupProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role,
          fullName,
          email,
          age: age ? parseInt(age) : 0,
          gender,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Signup failed');
        setLoading(false);
        return;
      }
      const data = await res.json();
      onSignup(data.token, data.role, data.patientId || '', data.fullName || '');
    } catch {
      alert('Signup error');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', paddingTop: 40, paddingBottom: 40 }}>
      <Card className="glass" style={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="brand-logo" style={{ margin: '0 auto 12px', width: 48, height: 48, fontSize: 24, transition: 'transform 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(10deg) scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0) scale(1)'}>❤</div>
            <div className="title" style={{ fontSize: 24, marginBottom: 8 }}>Create Account</div>
            <div className="muted">Join the Smart Health Monitoring platform</div>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="muted" style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500 }}>Role</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={role === 'patient' ? 'ui-btn auth-btn role-btn' : 'ui-btn btn-secondary role-btn'}
                  onClick={() => setRole('patient')}
                  style={{ flex: 1, padding: '10px' }}
                >
                  👤 Patient
                </button>
                <button
                  type="button"
                  className={role === 'doctor' ? 'ui-btn auth-btn role-btn' : 'ui-btn btn-secondary role-btn'}
                  onClick={() => setRole('doctor')}
                  style={{ flex: 1, padding: '10px' }}
                >
                  🩺 Doctor
                </button>
              </div>
            </div>
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
            <div style={{ marginBottom: 16 }}>
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
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Full Name"
                className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="Age"
                  className="auth-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="auth-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15, boxSizing: 'border-box' }}
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>
            <button type="submit" className="ui-btn auth-btn" disabled={loading} style={{ width: '100%', marginBottom: 16, padding: '12px', fontSize: 15, fontWeight: 600 }}>
              {loading ? '🔄 Creating Account...' : '✨ Create Account'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <span className="muted" style={{ fontSize: 14 }}>Already have an account? </span>
              <button type="button" className="ui-btn btn-secondary auth-link" onClick={onSwitch} style={{ padding: '4px 12px', fontSize: 14, fontWeight: 600 }}>Sign In</button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
