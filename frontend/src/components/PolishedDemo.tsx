import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// Minimal UI primitives
const Card: React.FC<{ className?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ className = "", children, style }) => (
  <div className={"ui-card " + className} style={style}>{children}</div>
);
const CardContent: React.FC<{ className?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ className = "", children, style }) => (
  <div className={"ui-card-content " + className} style={style}>{children}</div>
);
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", children, ...rest }) => (
  <button {...rest} className={"ui-btn " + className}>{children}</button>
);

function Tabs({ value, onChange }: { value: "patient" | "doctor"; onChange: (v: "patient" | "doctor") => void }) {
  return (
    <div className="tabs">
      <button className={"tab " + (value === "patient" ? "active" : "")} onClick={() => onChange("patient")}>👤 Patient</button>
      <button className={"tab " + (value === "doctor" ? "active" : "")} onClick={() => onChange("doctor")}>🩺 Doctor</button>
    </div>
  );
}

// Helpers
const fmtTime = (d: number) => new Date(d).toLocaleTimeString();
const nowTS = () => Date.now();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function computeRisk(hr: number, spo2: number, temp: number) {
  if (spo2 < 92 || temp >= 38.5 || hr > 120) return { label: "High" as const, score: 0.85 };
  if ((spo2 >= 92 && spo2 < 95) || (temp >= 37.5 && temp < 38.5) || (hr >= 100 && hr <= 120)) return { label: "Medium" as const, score: 0.55 };
  return { label: "Low" as const, score: 0.15 };
}

function riskBadgeClass(label: "Low" | "Medium" | "High") {
  if (label === "High") return "badge badge-red";
  if (label === "Medium") return "badge badge-yellow";
  return "badge badge-green";
}

// Types
type RiskLabel = "Low" | "Medium" | "High";
interface AlertItem { id: string; ts: number; type: string; message: string; severity: "WARN" | "CRIT"; acknowledged: boolean }
interface PatientRow { id: string; name: string; hr: number; spo2: number; temp: number; risk: { label: RiskLabel; score: number } }

const KpiCard: React.FC<{ label: string; value: string; icon?: string }> = ({ label, value, icon }) => (
  <Card className="glass kpi">
    <CardContent>
      <div className="kpi-top">
        <div className="muted">{label}</div>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <div className="kpi-value">{value}</div>
    </CardContent>
  </Card>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="glass">
    <CardContent>
      <div className="muted mb-2">{title}</div>
      {children}
    </CardContent>
  </Card>
);

const StyleTag: React.FC = () => (
  <style>{`
    :root{
      --bg:#f7f8fb; --card:#ffffffcc; --border:#e6e8ef; --text:#1f2430; --muted:#6c7393;
      --green:#d4edda; --green-b:#c3e6cb; --yellow:#fff3cd; --yellow-b:#ffeeba; --red:#f8d7da; --red-b:#f5c6cb;
      --btn:#121826; --btn-text:#fff; --glass:backdrop-filter: saturate(140%) blur(10px);
    }
    [data-theme="dark"]{
      --bg:#0f1219; --card:#1a1f2bcc; --border:#2a3142; --text:#e9edf5; --muted:#a3a9bd; --btn:#e9edf5; --btn-text:#121826;
    }
    body{ margin:0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial; color:var(--text); background:var(--bg);} 
    .container{ max-width:1100px; margin:0 auto; padding:0 16px; }
    .app-shell{ min-height:100vh; }
    .bg-risk-low{ background:linear-gradient(180deg, #eef7f1, var(--bg)); }
    .bg-risk-med{ background:linear-gradient(180deg, #fff6e5, var(--bg)); }
    .bg-risk-high{ background:linear-gradient(180deg, #ffe9ea, var(--bg)); }
    .app-header{ position:sticky; top:0; z-index:10; background:var(--bg); border-bottom:1px solid var(--border); }
    .header-inner{ display:flex; align-items:center; justify-content:space-between; padding:12px 0; }
    .brand{ display:flex; align-items:center; gap:10px; }
    .brand-logo{ width:28px; height:28px; border-radius:8px; background:#ff7b7b; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 12px #ff7b7b55; }
    .brand-text{ font-weight:700; }
    .header-actions{ display:flex; align-items:center; gap:10px; }
    .field{ display:flex; align-items:center; gap:6px; color:var(--muted); }
    .field select{ padding:6px 8px; border:1px solid var(--border); border-radius:8px; background:var(--card); color:var(--text); }
    .ui-btn{ padding:8px 12px; border-radius:10px; border:1px solid var(--border); background:var(--btn); color:var(--btn-text); cursor:pointer; }
    .btn-secondary{ background:transparent; color:var(--text); }
    .tabs{ display:flex; gap:8px; margin:16px 0; }
    .tab{ padding:8px 12px; border-radius:10px; border:1px solid var(--border); background:var(--card); color:var(--text); cursor:pointer; }
    .tab.active{ background:#1f2430; color:#fff; }
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
    .badge{ padding:6px 10px; border-radius:999px; border:1px solid; display:inline-block; }
    .badge-green{ background:var(--green); border-color:var(--green-b); }
    .badge-yellow{ background:var(--yellow); border-color:var(--yellow-b); }
    .badge-red{ background:var(--red); border-color:var(--red-b); }
    .kpi .kpi-top{ display:flex; align-items:center; justify-content:space-between; }
    .kpi .kpi-icon{ font-size:20px; }
    .kpi .kpi-value{ font-size:22px; font-weight:700; margin-top:6px; }
    .list{ display:flex; flex-direction:column; gap:8px; }
    .list-row{ display:flex; align-items:center; justify-content:space-between; padding:10px; border:1px dashed var(--border); border-radius:12px; }
    .toast{ position:fixed; right:16px; bottom:16px; background:#121826; color:#fff; padding:10px 14px; border-radius:12px; box-shadow:0 10px 20px #12182655; }
    table{ width:100%; border-collapse:collapse; }
    th, td{ padding:10px; border-bottom:1px solid var(--border); }
  `}</style>
);

const PolishedDemo: React.FC = () => {
  const [streaming, setStreaming] = useState(false);
  const [tab, setTab] = useState<"patient" | "doctor">("patient");
  const [dark, setDark] = useState(false);

  const [patient] = useState({ id: "P001", name: "Umer (Demo)", age: 22, gender: "M" });
  const [hr, setHr] = useState(78);
  const [spo2, setSpo2] = useState(98.0);
  const [temp, setTemp] = useState(36.9);
  const [data, setData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [toast, setToast] = useState<{ show: boolean; text: string }>({ show: false, text: "" });
  const [intervalMs, setIntervalMs] = useState(1500);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);

  const raiseAlert = (type: string, message: string, severity: "WARN" | "CRIT") => {
    setAlerts(prev => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ts: nowTS(), type, message, severity, acknowledged: false }, ...prev]);
    if (severity === "CRIT") {
      setToast({ show: true, text: `${type}: ${message}` });
      window.setTimeout(() => setToast({ show: false, text: "" }), 3000);
    }
  };

  const tick = () => {
    const nHr = clamp(Math.round(hr + (Math.random() * 6 - 3)), 55, 145);
    const nSpo2 = clamp(Number((spo2 + (Math.random() * 2 - 1)).toFixed(1)), 85, 100);
    const nTemp = clamp(Number((temp + (Math.random() * 0.15 - 0.075)).toFixed(1)), 35.2, 40.2);
    setHr(nHr); setSpo2(nSpo2); setTemp(nTemp);

    const point = { ts: nowTS(), HR: nHr, SpO2: nSpo2, Temp: nTemp };
    setData(prev => (prev.length > 200 ? [...prev.slice(-199), point] : [...prev, point]));

    if (nSpo2 < 92) raiseAlert("SPO2_LOW", `SpO₂ dropped to ${nSpo2}%`, "CRIT");
    if (nTemp >= 38.5) raiseAlert("FEVER", `Body temperature high: ${nTemp}°C`, "CRIT");
    if (nHr > 120) raiseAlert("TACHYCARDIA", `Heart rate high: ${nHr} bpm`, "WARN");
  };

  const start = () => { if (timerRef.current) return; setStreaming(true); timerRef.current = window.setInterval(tick, intervalMs); };
  const stop = () => { setStreaming(false); if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);
  useEffect(() => { if (streaming) { stop(); start(); } }, [intervalMs]);

  const risk = useMemo(() => computeRisk(hr, spo2, temp), [hr, spo2, temp]);

  const patients: PatientRow[] = [
    { id: "P001", name: "Umer (Demo)", hr, spo2, temp, risk: computeRisk(hr, spo2, temp) },
    { id: "P002", name: "Aisha", hr: clamp(hr + 8, 55, 145), spo2: clamp(Number((spo2 - 3).toFixed(1)), 85, 100), temp: clamp(Number((temp + 0.2).toFixed(1)), 35.2, 40.2), risk: computeRisk(clamp(hr + 8, 55, 145), clamp(Number((spo2 - 3).toFixed(1)), 85, 100), clamp(Number((temp + 0.2).toFixed(1)), 35.2, 40.2)) },
    { id: "P003", name: "Rahul", hr: clamp(hr - 6, 55, 145), spo2: clamp(Number((spo2 - 6).toFixed(1)), 85, 100), temp: clamp(Number((temp + 0.6).toFixed(1)), 35.2, 40.2), risk: computeRisk(clamp(hr - 6, 55, 145), clamp(Number((spo2 - 6).toFixed(1)), 85, 100), clamp(Number((temp + 0.6).toFixed(1)), 35.2, 40.2)) },
    { id: "P004", name: "Sara", hr: clamp(hr + 2, 55, 145), spo2: clamp(Number((spo2 - 1).toFixed(1)), 85, 100), temp: clamp(Number((temp - 0.1).toFixed(1)), 35.2, 40.2), risk: computeRisk(clamp(hr + 2, 55, 145), clamp(Number((spo2 - 1).toFixed(1)), 85, 100), clamp(Number((temp - 0.1).toFixed(1)), 35.2, 40.2)) },
  ];

  const gradientClass = risk.label === "High" ? "bg-risk-high" : risk.label === "Medium" ? "bg-risk-med" : "bg-risk-low";

  return (
    <div className={"app-shell " + gradientClass}>
      <StyleTag/>

      {/* Header */}
      <header className="app-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-logo">❤</div>
            <div className="brand-text">Smart Health Monitoring</div>
          </div>
          <div className="header-actions">
            <div className="field">
              <label>Speed</label>
              <select value={intervalMs} onChange={e=> setIntervalMs(Number(e.target.value))}>
                <option value={2500}>Slow</option>
                <option value={1500}>Normal</option>
                <option value={800}>Fast</option>
              </select>
            </div>
            <Button onClick={()=> setDark(d=>!d)}>{dark ? "☀ Light" : "🌙 Dark"}</Button>
            {!streaming ? (
              <Button onClick={start}>▶ Start</Button>
            ) : (
              <Button className="btn-secondary" onClick={stop}>⏸ Stop</Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container">
        <Tabs value={tab} onChange={setTab} />

        {/* Patient View */}
        {tab === "patient" && (
          <>
            <Card className="mb-6 glass">
              <CardContent className="row-between">
                <div>
                  <div className="muted">Patient</div>
                  <div className="title">{patient.name} — <span className="muted">{patient.id}</span></div>
                  <div className="muted">Age {patient.age} · {patient.gender}</div>
                </div>
                <div className={riskBadgeClass(risk.label)}>
                  Risk: {risk.label} · Score: {Math.round(risk.score * 100)}%
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid-3 mb-6">
              <KpiCard label="Heart Rate" value={`${hr} bpm`} icon="❤️"/>
              <KpiCard label="SpO₂" value={`${spo2} %`} icon="🫁"/>
              <KpiCard label="Temperature" value={`${temp} °C`} icon="🌡️"/>
            </div>

            {/* Charts */}
            <div className="grid-2">
              <ChartCard title="Heart Rate (bpm)">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ts" tickFormatter={fmtTime} minTickGap={24} />
                    <YAxis domain={[50, 150]} />
                    <Tooltip labelFormatter={fmtTime} />
                    <Legend />
                    <Line type="monotone" dataKey="HR" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="SpO₂ (%) & Temperature (°C)">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ts" tickFormatter={fmtTime} minTickGap={24} />
                    <YAxis yAxisId="left" domain={[85, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[35, 40.5]} />
                    <Tooltip labelFormatter={fmtTime} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="SpO2" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="Temp" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Alerts */}
            <section className="mb-8">
              <Card className="glass">
                <CardContent>
                  <div className="row-between mb-2">
                    <div className="muted">My Alerts</div>
                    <div className={riskBadgeClass(risk.label)}>Current Risk: {risk.label}</div>
                  </div>
                  <div className="list">
                    {alerts.length === 0 ? (
                      <div className="muted">No alerts yet. Start the stream.</div>
                    ) : (
                      alerts.map(a => (
                        <div key={a.id} className="list-row">
                          <div>
                            <div className="muted">{fmtTime(a.ts)} · {a.type}</div>
                            <div>{a.message}</div>
                          </div>
                          <div>
                            <span className={"badge " + (a.severity === "CRIT" ? "badge-red" : "badge-yellow")}>{a.severity}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}

        {/* Doctor View */}
        {tab === "doctor" && (
          <>
            <div className="grid-3 mb-6">
              <Card className="glass"><CardContent><div className="muted">Total Patients</div><div className="title">{patients.length}</div></CardContent></Card>
              <Card className="glass"><CardContent><div className="muted">High Risk</div><div className="title">{patients.filter(p=>p.risk.label==='High').length}</div></CardContent></Card>
              <Card className="glass"><CardContent><div className="muted">Active Alerts</div><div className="title">{alerts.length}</div></CardContent></Card>
            </div>
            <Card className="glass">
              <CardContent>
                <table>
                  <thead>
                    <tr><th align="left">Patient</th><th align="left">HR (bpm)</th><th align="left">SpO₂ (%)</th><th align="left">Temp (°C)</th><th align="left">Risk</th><th align="left">Action</th></tr>
                  </thead>
                  <tbody>
                    {patients.map(p => (
                      <tr key={p.id}>
                        <td>{p.name} · <span className="muted">{p.id}</span></td>
                        <td>{p.hr}</td>
                        <td>{p.spo2}</td>
                        <td>{p.temp}</td>
                        <td><span className={riskBadgeClass(p.risk.label)}>{p.risk.label}</span></td>
                        <td><Button className="btn-secondary">Open</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {toast.show && <div className="toast">{toast.text}</div>}
    </div>
  );
};

export default PolishedDemo;
