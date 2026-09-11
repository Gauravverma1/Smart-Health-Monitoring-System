import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface UserAccount {
  id: number;
  username: string;
  role: string;
  patientId: string;
  fullName: string;
  email: string;
  age: number;
  gender: string;
}

interface DBStats {
  totalUsers: number;
  totalVitals: number;
  patientCount: number;
  doctorCount: number;
  alertCount: number;
}

interface AdminDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
}

export const AdminDatabaseModal: React.FC<AdminDatabaseModalProps> = ({ isOpen, onClose, token }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [stats, setStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchDatabaseData = async () => {
    setLoading(true);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers })
      ]);

      if (usersRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const statsData = await statsRes.json();
        setUsers(usersData.users || []);
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch database data', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      fetchDatabaseData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      u.username.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.patientId && u.patientId.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  const exportCSV = () => {
    if (!users.length) return;
    const headers = ['ID', 'Username', 'Role', 'Patient ID', 'Full Name', 'Email', 'Age', 'Gender'];
    const csvRows = [headers.join(',')];

    users.forEach(u => {
      csvRows.push([
        u.id,
        `"${u.username}"`,
        `"${u.role}"`,
        `"${u.patientId || ''}"`,
        `"${u.fullName || ''}"`,
        `"${u.email || ''}"`,
        u.age || 0,
        `"${u.gender || ''}"`
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarthealth_users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="ui-card glass" style={{
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>📊 Live Database Inspector</h2>
              <span className="badge badge-green" style={{ fontSize: '11px' }}>🟢 SQLite Connected</span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              Real-time user accounts and system metrics from backend database
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="ui-btn btn-secondary" onClick={exportCSV}>📥 Export CSV</button>
            <button className="ui-btn btn-secondary" onClick={fetchDatabaseData}>🔄 Refresh</button>
            <button className="ui-btn" onClick={onClose}>✖ Close</button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Stats KPI Grid */}
          {stats && (
            <div className="grid-3 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="ui-card ui-card-content kpi">
                <div className="kpi-top">
                  <span className="stat-label muted">Total Users</span>
                  <span className="kpi-icon">👥</span>
                </div>
                <div className="kpi-value">{stats.totalUsers}</div>
              </div>
              <div className="ui-card ui-card-content kpi">
                <div className="kpi-top">
                  <span className="stat-label muted">Patients</span>
                  <span className="kpi-icon">🏥</span>
                </div>
                <div className="kpi-value" style={{ color: 'var(--green-text)' }}>{stats.patientCount}</div>
              </div>
              <div className="ui-card ui-card-content kpi">
                <div className="kpi-top">
                  <span className="stat-label muted">Doctors</span>
                  <span className="kpi-icon">🩺</span>
                </div>
                <div className="kpi-value" style={{ color: '#38bdf8' }}>{stats.doctorCount}</div>
              </div>
              <div className="ui-card ui-card-content kpi">
                <div className="kpi-top">
                  <span className="stat-label muted">Recorded Vitals</span>
                  <span className="kpi-icon">📈</span>
                </div>
                <div className="kpi-value" style={{ color: '#c084fc' }}>{stats.totalVitals.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search user, email, patient ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'patient', 'doctor'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`ui-btn ${roleFilter === r ? '' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize', fontSize: '13px' }}
                >
                  {r === 'all' ? `All (${users.length})` : `${r}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              Loading database records...
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Patient ID</th>
                    <th>Email</th>
                    <th>Age / Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                        No matching user records found in database.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td><strong>#{u.id}</strong></td>
                        <td><span style={{ fontWeight: 600 }}>{u.username}</span></td>
                        <td>{u.fullName || <span className="muted">N/A</span>}</td>
                        <td>
                          <span className={`badge ${u.role === 'doctor' ? 'badge-yellow' : 'badge-green'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td><code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>{u.patientId || 'N/A'}</code></td>
                        <td>{u.email || <span className="muted">None</span>}</td>
                        <td>{u.age || 'N/A'} {u.gender ? `/ ${u.gender}` : ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDatabaseModal;
