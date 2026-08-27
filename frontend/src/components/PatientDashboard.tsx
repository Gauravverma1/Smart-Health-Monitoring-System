import React, { useEffect, useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import FloatingChatBot from './FloatingChatBot';
import HealthInsights from './HealthInsights';
import HealthReport from './HealthReport';
import PredictiveTrends from './PredictiveTrends';

type Reading = { timestamp: number; heartRate: number; spo2: number; temperature: number; risk?: string };
type Alert = { id: number; level: string; message: string; createdAt: number; acknowledged: boolean };
const API = 'http://localhost:8000/api/v1';

const fmtTime = (d: number) => new Date(d).toLocaleTimeString();

function riskBadgeClass(label: string) {
  if (label === 'HIGH') return 'badge badge-red';
  if (label === 'MEDIUM') return 'badge badge-yellow';
  return 'badge badge-green';
}

const Card: React.FC<{ className?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ className = '', children, style }) => (
  <div className={'ui-card ' + className} style={style}>{children}</div>
);
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ui-card-content">{children}</div>
);

export default function PatientDashboard({ token, patientId }: { token: string; patientId: string }) {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const headers = token ? { Authorization: `Bearer ${token}` } : {} as any;

  useEffect(() => {
    const t = setInterval(() => {
      fetch(`${API}/vitals/${patientId}/latest`, { headers }).then(r => r.status === 204 ? null : r.json()).then(setLatest).catch(()=>{});
      fetch(`${API}/vitals/${patientId}/recent`, { headers }).then(r => r.json()).then(setHistory).catch(()=>{});
      fetch(`${API}/alerts/${patientId}?activeOnly=true`, { headers }).then(r => r.json()).then(setAlerts).catch(()=>{});
    }, 2000);
    return () => clearInterval(t);
  }, [patientId, token]);

  const ack = async (id: number) => {
    await fetch(`${API}/alerts/${id}/ack`, { method: 'POST', headers }).catch(()=>{});
    const list = await fetch(`${API}/alerts/${patientId}?activeOnly=true`, { headers });
    setAlerts(await list.json());
  };

  const toggleSim = async () => {
    const next = !simulating;
    setSimulating(next);
    try {
      await fetch(`${API}/simulate/${patientId}?enable=${next}`, { method: 'POST', headers });
    } catch (error) {
      // If API call fails, revert state
      setSimulating(!next);
      console.error('Failed to toggle simulation:', error);
    }
  };

  // Cleanup: Stop simulation when component unmounts
  useEffect(() => {
    return () => {
      if (simulating) {
        fetch(`${API}/simulate/${patientId}?enable=false`, { method: 'POST', headers }).catch(()=>{});
      }
    };
  }, []);

  const risk = latest?.risk || 'LOW';

  return (
    <div style={{ marginTop: 16 }}>
      {/* Floating Chatbot - Side Widget */}
      <FloatingChatBot 
        patientId={patientId} 
        heartRate={latest?.heartRate}
        spo2={latest?.spo2}
        temperature={latest?.temperature}
        risk={latest?.risk}
      />

      {/* Patient Info */}
      <Card className="mb-6 glass">
        <CardContent>
          <div className="row-between">
            <div>
              <div className="muted">Patient</div>
              <div className="title">{patientId}</div>
            </div>
            <div className={riskBadgeClass(risk)} style={{ fontWeight: 700, fontSize: 14, padding: '8px 16px', opacity: 1 }}>
              Risk: {risk}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message if no data */}
      {!latest && !simulating && (
        <Card className="mb-6 glass" style={{ background: '#d4edda', borderColor: '#c3e6cb' }}>
          <CardContent>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>👋 Welcome!</div>
              <div className="muted">Click "Start Simulation" below to begin monitoring your vitals</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Banner */}
      {alerts[0] && (
        <Card className="mb-6 glass" style={{ 
          background: alerts[0].level === 'HIGH' ? 'rgba(220, 53, 69, 0.2)' : alerts[0].level === 'MEDIUM' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(40, 167, 69, 0.2)',
          borderColor: alerts[0].level === 'HIGH' ? '#dc3545' : alerts[0].level === 'MEDIUM' ? '#ffc107' : '#28a745',
          borderWidth: 2
        }}>
          <CardContent>
            <div className="row-between">
              <div style={{ color: 'var(--text)', fontWeight: 500 }}>
                <strong style={{ color: alerts[0].level === 'HIGH' ? '#ff5252' : alerts[0].level === 'MEDIUM' ? '#ffb300' : '#4caf50' }}>{alerts[0].level} alert:</strong> {alerts[0].message}
              </div>
              <button 
                className="ui-btn" 
                onClick={() => ack(alerts[0].id)} 
                style={{ 
                  background: alerts[0].level === 'HIGH' ? '#dc3545' : alerts[0].level === 'MEDIUM' ? '#ff8c00' : '#28a745',
                  color: '#ffffff', 
                  fontWeight: 700,
                  padding: '10px 20px',
                  fontSize: 14,
                  border: 'none',
                  opacity: 1
                }}
              >
                Acknowledge
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div style={{ marginBottom: 24 }}>
        <button className="ui-btn" onClick={toggleSim} style={{ padding: '12px 24px', fontSize: 16, fontWeight: 600 }}>
          {simulating ? '⏸ Stop Simulation' : '▶ Start Simulation'}
        </button>
        {simulating && (
          <span style={{ marginLeft: 12, color: 'var(--muted)' }}>🟢 Simulation running...</span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid-3 mb-6">
        <Card className="glass kpi">
          <CardContent>
            <div className="kpi-top">
              <div className="muted">Heart Rate</div>
              <div className="kpi-icon">❤️</div>
            </div>
            <div className="kpi-value">{latest ? Math.round(latest.heartRate) : '—'} bpm</div>
          </CardContent>
        </Card>
        <Card className="glass kpi">
          <CardContent>
            <div className="kpi-top">
              <div className="muted">SpO₂</div>
              <div className="kpi-icon">🫁</div>
            </div>
            <div className="kpi-value">{latest ? Math.round(latest.spo2) : '—'} %</div>
          </CardContent>
        </Card>
        <Card className="glass kpi">
          <CardContent>
            <div className="kpi-top">
              <div className="muted">Temperature</div>
              <div className="kpi-icon">🌡️</div>
            </div>
            <div className="kpi-value">{latest ? latest.temperature.toFixed(1) : '—'} °C</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid-2 mb-6">
        <Card className="glass" style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)', borderColor: 'rgba(102, 126, 234, 0.2)' }}>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>❤️</span>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Heart Rate Monitor</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#7c8cfa' }}>
                  {latest ? Math.round(latest.heartRate) : '—'} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>bpm</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c8cfa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c8cfa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="timestamp" tickFormatter={fmtTime} minTickGap={24} tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--border)" />
                <YAxis domain={[50, 150]} tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--border)" />
                <Tooltip 
                  labelFormatter={fmtTime} 
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line 
                  type="monotone" 
                  dataKey="heartRate" 
                  stroke="#7c8cfa" 
                  strokeWidth={3} 
                  dot={false} 
                  fill="url(#heartGradient)"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass" style={{ background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.08) 0%, rgba(245, 87, 108, 0.08) 100%)', borderColor: 'rgba(240, 147, 251, 0.2)' }}>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>🫁</span>
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 12 }}>Oxygen & Temperature</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#f093fb' }}>{latest ? Math.round(latest.spo2) : '—'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>% SpO₂</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#ff6b81' }}>{latest ? latest.temperature.toFixed(1) : '—'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>°C</span>
                  </div>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spo2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f093fb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f093fb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b81" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff6b81" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="timestamp" tickFormatter={fmtTime} minTickGap={24} tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--border)" />
                <YAxis yAxisId="left" domain={[85, 100]} tick={{ fontSize: 12, fill: '#f093fb' }} stroke="#f093fb" />
                <YAxis yAxisId="right" orientation="right" domain={[35, 40.5]} tick={{ fontSize: 12, fill: '#ff6b81' }} stroke="#ff6b81" />
                <Tooltip 
                  labelFormatter={fmtTime} 
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="spo2" 
                  stroke="#f093fb" 
                  strokeWidth={3} 
                  dot={false} 
                  fill="url(#spo2Gradient)"
                  isAnimationActive={false}
                  name="SpO₂ (%)"
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ff6b81" 
                  strokeWidth={3} 
                  dot={false} 
                  fill="url(#tempGradient)"
                  isAnimationActive={false}
                  name="Temp (°C)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Predictive Health Trends - ML Powered */}
      <PredictiveTrends patientId={patientId} token={token} history={history} />

      {/* Health Insights */}
      <HealthInsights patientId={patientId} token={token} />

      {/* Health Report */}
      <HealthReport patientId={patientId} token={token} />

      {/* Alerts */}
      <Card className="glass">
        <CardContent>
          <div className="row-between mb-2">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>My Alerts (Recent 10)</div>
            <div className={riskBadgeClass(risk)} style={{ fontWeight: 700, fontSize: 13, padding: '6px 12px' }}>Current Risk: {risk}</div>
          </div>
          <div className="list">
            {alerts.length === 0 ? (
              <div className="muted">No active alerts</div>
            ) : (
              alerts.slice(0, 10).map(a => (
                <div key={a.id} className="list-row" style={{ 
                  background: a.level === 'HIGH' ? 'rgba(220, 53, 69, 0.15)' : a.level === 'MEDIUM' ? 'rgba(255, 193, 7, 0.15)' : a.level === 'LOW' ? 'rgba(40, 167, 69, 0.15)' : 'transparent',
                  borderLeft: `4px solid ${a.level === 'HIGH' ? '#dc3545' : a.level === 'MEDIUM' ? '#ffc107' : '#28a745'}`,
                  padding: '12px 16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={riskBadgeClass(a.level)} style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}>{a.level}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtTime(a.createdAt)}</span>
                    </div>
                    <div style={{ color: 'var(--text)', fontWeight: 500 }}>{a.message}</div>
                  </div>
                  <button 
                    className="ui-btn btn-secondary" 
                    onClick={() => ack(a.id)} 
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    Ack
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}