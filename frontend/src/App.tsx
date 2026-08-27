import React, { useState, useEffect } from 'react';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import AdminDatabaseModal from './components/AdminDatabaseModal';

const StyleTag: React.FC = () => (
  <style>{`
    :root{
      --bg:#f7f8fb; --card:#ffffffcc; --border:#e6e8ef; --text:#1f2430; --muted:#6c7393;
      --green:#d4edda; --green-b:#c3e6cb; --green-text:#155724;
      --yellow:#fff3cd; --yellow-b:#ffeeba; --yellow-text:#856404;
      --red:#f8d7da; --red-b:#f5c6cb; --red-text:#721c24;
      --btn:#121826; --btn-text:#fff;
    }
    [data-theme="dark"]{
      --bg:#0f1219; --card:#1a1f2bcc; --border:#2a3142; --text:#e9edf5; --muted:#a3a9bd; --btn:#e9edf5; --btn-text:#121826;
      --green:#1e4620; --green-b:#28a745; --green-text:#fff;
      --yellow:#4a3800; --yellow-b:#ffc107; --yellow-text:#fff;
      --red:#5c1f1f; --red-b:#dc3545; --red-text:#fff;
    }
    body{ margin:0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial; color:var(--text); background:var(--bg);}
    .container{ max-width:1100px; margin:0 auto; padding:0 16px; }
    .app-shell{ min-height:100vh; }
    .app-header{ position:sticky; top:0; z-index:10; background:var(--bg); border-bottom:1px solid var(--border); }
    .header-inner{ display:flex; align-items:center; justify-content:space-between; padding:12px 0; }
    .brand{ display:flex; align-items:center; gap:10px; }
    .brand-logo{ width:28px; height:28px; border-radius:8px; background:#ff7b7b; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 12px #ff7b7b55; }
    .brand-text{ font-weight:700; }
    .header-actions{ display:flex; align-items:center; gap:10px; }
    .ui-btn{ padding:8px 12px; border-radius:10px; border:1px solid var(--border); background:var(--btn); color:var(--btn-text); cursor:pointer; }
    .btn-secondary{ background:transparent; color:var(--text); }
    .ui-card{ border:1px solid var(--border); border-radius:16px; background:var(--card); box-shadow:0 8px 24px #0f121913; }
    .glass{ backdrop-filter: saturate(140%) blur(10px); }
    .ui-card-content{ padding:16px; }
    .row-between{ display:flex; align-items:center; justify-content:space-between; }
    .muted{ color:var(--muted); }
    .title{ font-weight:700; }
    .grid-3{ display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; }
    .grid-2{ display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; }
    .mb-2{ margin-bottom:8px; }
    .mb-6{ margin-bottom:24px; }
    .mb-8{ margin-bottom:32px; }
    .badge{ padding:6px 10px; border-radius:999px; border:1px solid; display:inline-block; font-weight:700; }
    .badge-green{ background:var(--green); border-color:var(--green-b); color:var(--green-text); }
    .badge-yellow{ background:var(--yellow); border-color:var(--yellow-b); color:var(--yellow-text); }
    .badge-red{ background:var(--red); border-color:var(--red-b); color:var(--red-text); }
    .kpi .kpi-top{ display:flex; align-items:center; justify-content:space-between; }
    .kpi .kpi-icon{ font-size:20px; }
    .kpi .kpi-value{ font-size:22px; font-weight:700; margin-top:6px; }
    .list{ display:flex; flex-direction:column; gap:8px; }
    .list-row{ display:flex; align-items:center; justify-content:space-between; padding:10px; border:1px dashed var(--border); border-radius:12px; }
    table{ width:100%; border-collapse:collapse; }
    th, td{ padding:10px; border-bottom:1px solid var(--border); text-align:left; }
  `}</style>
);

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('token') ?? '');
  const [role, setRole] = useState<'patient' | 'doctor' | ''>(() => (localStorage.getItem('role') as any) ?? '');
  const [patientId, setPatientId] = useState<string>(() => localStorage.getItem('patientId') ?? '');
  const [fullName, setFullName] = useState<string>(() => localStorage.getItem('fullName') ?? '');
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [showDbModal, setShowDbModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        if (!role && decoded.role) {
          setRole(decoded.role);
          localStorage.setItem('role', decoded.role);
        }
        if (!patientId && decoded.patientId) {
          setPatientId(decoded.patientId);
          localStorage.setItem('patientId', decoded.patientId);
        }
        if (!fullName && decoded.fullName) {
          setFullName(decoded.fullName);
          localStorage.setItem('fullName', decoded.fullName);
        }
      }
    }
  }, [token, role, patientId, fullName]);

  const handleLogin = (tok: string, r: string, pid: string, fname: string) => {
    setToken(tok);
    localStorage.setItem('token', tok);
    setRole(r as any);
    localStorage.setItem('role', r);
    setPatientId(pid);
    localStorage.setItem('patientId', pid);
    setFullName(fname);
    localStorage.setItem('fullName', fname);
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('patientId');
    localStorage.removeItem('fullName');
    setRole('');
    setPatientId('');
    setFullName('');
    setView('login');
  };


  return (
    <div className="app-shell">
      <StyleTag/>

      {/* Header */}
      <header className="app-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-logo">❤</div>
            <div className="brand-text">Smart Health Monitoring</div>
          </div>
          <div className="header-actions">
            {(role === 'doctor' || role === 'admin') && (
              <button className="ui-btn btn-secondary" onClick={() => setShowDbModal(true)}>
                📊 Database
              </button>
            )}
            <button className="ui-btn" onClick={()=> setDark(d=>!d)}>{dark ? '☀ Light' : '🌙 Dark'}</button>
            {token && (
              <>
                <span style={{ color: 'var(--muted)' }}>{fullName || role || 'User'}</span>
                <button className="ui-btn btn-secondary" onClick={logout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <AdminDatabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} token={token} />

      {/* Main */}
      <main className="container" style={{ padding: '24px 16px' }}>
        {!token ? (
          view === 'login' ? (
            <LoginPage onLogin={handleLogin} onSwitch={() => setView('signup')} />
          ) : (
            <SignupPage onSignup={handleLogin} onSwitch={() => setView('login')} />
          )
        ) : (
          <>
            {role === 'patient' ? (
              <PatientDashboard token={token} patientId={patientId || 'P081181'} />
            ) : (
              <DoctorDashboard token={token} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
