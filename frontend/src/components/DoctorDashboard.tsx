import React, { useEffect, useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '../config';
const API = `${API_BASE_URL}/api/v1`;

type PatientSummary = { id: string; name: string; risk: string; latestAt: number };
type Reading = { timestamp: number; heartRate: number; spo2: number; temperature: number; risk?: string };
type Note = { id: number; title: string; body: string; author: string; createdAt: number };
type Alert = { id: number; level: string; message: string; createdAt: number; acknowledged: boolean };

function riskBadgeClass(label: string) {
  if (label === 'HIGH') return 'badge badge-red';
  if (label === 'MEDIUM') return 'badge badge-yellow';
  return 'badge badge-green';
}

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={'ui-card ' + className}>{children}</div>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ui-card-content">{children}</div>
);

export default function DoctorDashboard({ token }: { token: string }) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [history, setHistory] = useState<Reading[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [thresholds, setThresholds] = useState<{ spo2Low: number; tempHigh: number; hrHigh: number } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [deviceToken, setDeviceToken] = useState('');

  useEffect(() => {
    const t = setInterval(() => {
      fetch(`${API}/patients`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setPatients).catch(()=>{});
    }, 3000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => {
    if (!selected) return;
    fetch(`${API}/vitals/${selected}/recent?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setHistory).catch(()=>{});
    fetch(`${API}/patients/${selected}/notes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setNotes).catch(()=>{});
    fetch(`${API}/thresholds/${selected}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setThresholds).catch(()=>{});
    fetch(`${API}/alerts/${selected}?activeOnly=true`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setAlerts).catch(()=>{});
  }, [selected, token]);

  const addNote = async () => {
    if (!selected) return;
    const res = await fetch(`${API}/patients/${selected}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, body })
    });
    if (res.ok) {
      setTitle(''); setBody('');
      const list = await fetch(`${API}/patients/${selected}/notes`, { headers: { Authorization: `Bearer ${token}` } });
      setNotes(await list.json());
    } else {
      alert('Failed to add note');
    }
  };

  const saveThresholds = async () => {
    if (!selected || !thresholds) return;
    const res = await fetch(`${API}/thresholds/${selected}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(thresholds)
    });
    if (!res.ok) alert('Failed to save thresholds');
  };

  const ackAlert = async (id: number) => {
    const res = await fetch(`${API}/alerts/${id}/ack`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const list = await fetch(`${API}/alerts/${selected}?activeOnly=true`, { headers: { Authorization: `Bearer ${token}` } });
      setAlerts(await list.json());
    }
  };

  const registerToken = async () => {
    if (!selected || !deviceToken) return;
    const res = await fetch(`${API}/notify/${selected}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: deviceToken })
    });
    if (!res.ok) alert('Failed to register token');
  };

  const counts = patients.reduce((acc, p) => {
    acc[p.risk] = (acc[p.risk] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fmtTime = (d: number) => new Date(d).toLocaleTimeString();

  return (
    <div style={{ marginTop: 16 }}>
      {/* Stats */}
      <div className="grid-3 mb-6">
        <Card className="glass"><CardContent><div className="muted">Total Patients</div><div className="title">{patients.length}</div></CardContent></Card>
        <Card className="glass"><CardContent><div className="muted">High Risk</div><div className="title">{counts['HIGH'] ?? 0}</div></CardContent></Card>
        <Card className="glass"><CardContent><div className="muted">Active Alerts</div><div className="title">{alerts.length}</div></CardContent></Card>
      </div>

      {/* Patient List */}
      <Card className="glass mb-6">
        <CardContent>
          <div className="muted mb-2">Patients Overview</div>
          <table>
            <thead>
              <tr><th align="left">Patient</th><th align="left">Risk</th><th align="left">Latest</th><th align="left">Action</th></tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer', background: selected===p.id?'var(--card)':'' }} onClick={() => setSelected(p.id)}>
                  <td>{p.name} · <span className="muted">{p.id}</span></td>
                  <td><span className={riskBadgeClass(p.risk)}>{p.risk}</span></td>
                  <td>{new Date(p.latestAt).toLocaleTimeString()}</td>
                  <td><button className="ui-btn btn-secondary">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Patient Details */}
      {selected && (
        <div>
          <Card className="glass mb-6">
            <CardContent>
              <div className="title mb-2">Patient: {selected}</div>
              
              {/* Charts - Full Width */}
              <div className="grid-2 mb-6">
                <div>
                  <div className="muted mb-2">Heart Rate Trend (bpm)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="timestamp" tickFormatter={fmtTime} minTickGap={24} tick={{ fill: 'var(--muted)' }} stroke="var(--border)" />
                      <YAxis domain={[50, 150]} tick={{ fill: 'var(--muted)' }} stroke="var(--border)" />
                      <Tooltip 
                        labelFormatter={fmtTime}
                        contentStyle={{ 
                          background: 'var(--card)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 8, 
                          color: 'var(--text)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                        itemStyle={{ color: 'var(--text)' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="heartRate" stroke="#8884d8" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="muted mb-2">SpO₂ & Temperature Trend</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="timestamp" tickFormatter={fmtTime} minTickGap={24} tick={{ fill: 'var(--muted)' }} stroke="var(--border)" />
                      <YAxis yAxisId="left" domain={[85, 100]} tick={{ fill: 'var(--muted)' }} stroke="var(--border)" />
                      <YAxis yAxisId="right" orientation="right" domain={[35, 40.5]} tick={{ fill: 'var(--muted)' }} stroke="var(--border)" />
                      <Tooltip 
                        labelFormatter={fmtTime}
                        contentStyle={{ 
                          background: 'var(--card)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 8, 
                          color: 'var(--text)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                        itemStyle={{ color: 'var(--text)' }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="spo2" stroke="#82ca9d" dot={false} strokeWidth={2} isAnimationActive={false} name="SpO₂ (%)" />
                      <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#ff7300" dot={false} strokeWidth={2} isAnimationActive={false} name="Temp (°C)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table and Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                <div>
                  <div className="muted mb-2">Recent Vitals (last 20)</div>
                  <table>
                    <thead>
                      <tr><th align="left">Time</th><th align="left">HR</th><th align="left">SpO₂</th><th align="left">Temp</th><th align="left">Risk</th></tr>
                    </thead>
                    <tbody>
                      {history.slice().reverse().slice(0, 20).map(h => (
                        <tr key={h.timestamp}>
                          <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
                          <td>{Math.round(h.heartRate)}</td>
                          <td>{Math.round(h.spo2)}</td>
                          <td>{h.temperature.toFixed(1)}</td>
                          <td><span className={riskBadgeClass(h.risk || 'LOW')}>{h.risk}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="muted mb-2">Active Alerts</div>
                  <div className="list" style={{ marginBottom: 16 }}>
                    {alerts.length === 0 ? (
                      <div className="muted">No active alerts</div>
                    ) : (
                      alerts.slice(0, 8).map(a => (
                        <div key={a.id} className="list-row">
                          <div>
                            <div><strong>{a.level}</strong>: {a.message}</div>
                            <div className="muted">{new Date(a.createdAt).toLocaleTimeString()}</div>
                          </div>
                          <button className="ui-btn btn-secondary" onClick={() => ackAlert(a.id)}>Ack</button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="muted mb-2">Alert Thresholds</div>
                  {thresholds && (
                    <div style={{ background: 'var(--card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🫁</span>
                          <label style={{ flex: 1, fontWeight: 500 }}>SpO₂ Low</label>
                          <input 
                            type="number" 
                            step="1" 
                            value={thresholds.spo2Low} 
                            onChange={e=>setThresholds({ ...thresholds, spo2Low: Number(e.target.value) })} 
                            style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', fontSize: 14 }} 
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>%</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>🌡️</span>
                          <label style={{ flex: 1, fontWeight: 500 }}>Temp High</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={thresholds.tempHigh} 
                            onChange={e=>setThresholds({ ...thresholds, tempHigh: Number(e.target.value) })} 
                            style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', fontSize: 14 }} 
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>°C</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>❤️</span>
                          <label style={{ flex: 1, fontWeight: 500 }}>HR High</label>
                          <input 
                            type="number" 
                            step="1" 
                            value={thresholds.hrHigh} 
                            onChange={e=>setThresholds({ ...thresholds, hrHigh: Number(e.target.value) })} 
                            style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', fontSize: 14 }} 
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 13 }}>bpm</span>
                        </div>
                      </div>
                      <button className="ui-btn" onClick={saveThresholds} style={{ width: '100%', padding: '10px', fontWeight: 600 }}>Save Thresholds</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section - Full Width at Bottom */}
              <div style={{ marginTop: 24 }}>
                <div className="muted mb-2">Clinical Notes</div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <input 
                    placeholder="Title" 
                    value={title} 
                    onChange={e=>setTitle(e.target.value)} 
                    style={{ flex: '0 0 200px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} 
                  />
                  <input 
                    placeholder="Note body..." 
                    value={body} 
                    onChange={e=>setBody(e.target.value)} 
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} 
                  />
                  <button className="ui-btn" onClick={addNote}>Add Note</button>
                </div>
                <div className="list">
                  {notes.map(n => (
                    <div key={n.id} className="list-row">
                      <div style={{ flex: 1 }}>
                        <div><strong>{n.title}</strong> — {n.body}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{n.author} · {new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
