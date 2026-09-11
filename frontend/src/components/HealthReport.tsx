import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

type ReportData = {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    email: string;
  };
  reportDate: string;
  latestReading: {
    heartRate: number | null;
    spo2: number | null;
    temperature: number | null;
    risk: string | null;
    timestamp: number | null;
  };
  thresholds: {
    spo2Low: number;
    tempHigh: number;
    hrHigh: number;
  };
  readings: Array<{
    timestamp: number;
    heartRate: number;
    spo2: number;
    temperature: number;
    risk: string;
  }>;
  alerts: Array<{
    level: string;
    message: string;
    createdAt: number;
    acknowledged: boolean;
  }>;
  notes: Array<{
    title: string;
    body: string;
    author: string;
    createdAt: number;
  }>;
};

const HealthReport: React.FC<{ patientId: string; token: string }> = ({ patientId, token }) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/report/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        setShowReport(true);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    window.print();
  };

  const downloadAsText = () => {
    if (!reportData) return;
    
    let text = `HEALTH MONITORING REPORT\n`;
    text += `================================\n\n`;
    text += `Patient: ${reportData.patient.name} (${reportData.patient.id})\n`;
    text += `Age: ${reportData.patient.age || 'N/A'}\n`;
    text += `Gender: ${reportData.patient.gender || 'N/A'}\n`;
    text += `Report Date: ${new Date(reportData.reportDate).toLocaleString()}\n\n`;
    
    text += `LATEST READING\n`;
    text += `--------------------------------\n`;
    if (reportData.latestReading.heartRate) {
      text += `Heart Rate: ${reportData.latestReading.heartRate.toFixed(0)} bpm\n`;
      text += `SpO₂: ${reportData.latestReading.spo2?.toFixed(1)}%\n`;
      text += `Temperature: ${reportData.latestReading.temperature?.toFixed(1)}°C\n`;
      text += `Risk Level: ${reportData.latestReading.risk}\n`;
      text += `Timestamp: ${new Date(reportData.latestReading.timestamp || 0).toLocaleString()}\n\n`;
    }
    
    text += `THRESHOLDS\n`;
    text += `--------------------------------\n`;
    text += `SpO₂ Low: ${reportData.thresholds.spo2Low}%\n`;
    text += `Temperature High: ${reportData.thresholds.tempHigh}°C\n`;
    text += `Heart Rate High: ${reportData.thresholds.hrHigh} bpm\n\n`;
    
    text += `ALERTS (${reportData.alerts.length})\n`;
    text += `--------------------------------\n`;
    reportData.alerts.slice(0, 10).forEach((alert, idx) => {
      text += `${idx + 1}. [${alert.level}] ${alert.message}\n`;
      text += `   ${new Date(alert.createdAt).toLocaleString()} ${alert.acknowledged ? '(Acknowledged)' : ''}\n\n`;
    });
    
    text += `CLINICAL NOTES (${reportData.notes.length})\n`;
    text += `--------------------------------\n`;
    reportData.notes.forEach((note, idx) => {
      text += `${idx + 1}. ${note.title}\n`;
      text += `   ${note.body}\n`;
      text += `   By: ${note.author} on ${new Date(note.createdAt).toLocaleString()}\n\n`;
    });
    
    text += `READINGS SUMMARY\n`;
    text += `--------------------------------\n`;
    text += `Total Readings: ${reportData.readings.length}\n`;
    const riskCounts = reportData.readings.reduce((acc, r) => {
      acc[r.risk] = (acc[r.risk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    text += `Risk Distribution: LOW: ${riskCounts.LOW || 0}, MEDIUM: ${riskCounts.MEDIUM || 0}, HIGH: ${riskCounts.HIGH || 0}\n`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${reportData.patient.id}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!showReport || !reportData) {
    return (
      <div className="ui-card glass" style={{ marginBottom: 24 }}>
        <div className="ui-card-content">
          <div className="row-between">
            <div>
              <div className="title" style={{ fontSize: 18, marginBottom: 4 }}>📄 Health Report</div>
              <div className="muted" style={{ fontSize: 13 }}>Generate a comprehensive health report</div>
            </div>
            <button
              className="ui-btn"
              onClick={fetchReportData}
              disabled={loading}
              style={{ padding: '10px 20px', fontSize: 14 }}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const riskCounts = reportData.readings.reduce((acc, r) => {
    acc[r.risk] = (acc[r.risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .report-container, .report-container * {
            visibility: visible;
          }
          .report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="report-container">
        <div className="ui-card glass" style={{ marginBottom: 24 }}>
          <div className="ui-card-content">
            <div className="row-between mb-6 no-print">
              <div>
                <div className="title" style={{ fontSize: 18 }}>📄 Health Report</div>
                <div className="muted" style={{ fontSize: 13 }}>Ready to download or print</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ui-btn btn-secondary" onClick={() => setShowReport(false)}>
                  Close
                </button>
                <button className="ui-btn btn-secondary" onClick={downloadAsText}>
                  Download TXT
                </button>
                <button className="ui-btn" onClick={generatePDF}>
                  Print/PDF
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div style={{
              background: '#fff',
              padding: 40,
              borderRadius: 8,
              color: '#000',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 40, borderBottom: '3px solid #6a11cb', paddingBottom: 20 }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, color: '#6a11cb', margin: 0 }}>Health Monitoring Report</h1>
                <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Smart Health Monitoring System</p>
              </div>

              {/* Patient Info */}
              <div style={{ marginBottom: 30 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#333' }}>Patient Information</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600, width: '150px' }}>Patient ID:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.patient.id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Name:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.patient.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Age:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.patient.age || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Gender:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.patient.gender || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Report Date:</td>
                    <td style={{ padding: '8px 0' }}>{new Date(reportData.reportDate).toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              {/* Latest Reading */}
              {reportData.latestReading.heartRate && (
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#333' }}>Latest Vital Signs</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Heart Rate</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{reportData.latestReading.heartRate.toFixed(0)} bpm</div>
                    </div>
                    <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>SpO₂</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{reportData.latestReading.spo2?.toFixed(1)}%</div>
                    </div>
                    <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Temperature</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{reportData.latestReading.temperature?.toFixed(1)}°C</div>
                    </div>
                    <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Risk Level</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: reportData.latestReading.risk === 'HIGH' ? '#dc3545' : reportData.latestReading.risk === 'MEDIUM' ? '#ffc107' : '#28a745' }}>
                        {reportData.latestReading.risk}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                    Recorded: {new Date(reportData.latestReading.timestamp || 0).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Thresholds */}
              <div style={{ marginBottom: 30 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#333' }}>Alert Thresholds</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>SpO₂ Low Threshold:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.thresholds.spo2Low}%</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Temperature High Threshold:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.thresholds.tempHigh}°C</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Heart Rate High Threshold:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.thresholds.hrHigh} bpm</td>
                  </tr>
                </table>
              </div>

              {/* Alerts */}
              {reportData.alerts.length > 0 && (
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#333' }}>Recent Alerts ({reportData.alerts.length})</h2>
                  {reportData.alerts.slice(0, 10).map((alert, idx) => (
                    <div key={idx} style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 6,
                      borderLeft: `4px solid ${alert.level === 'HIGH' ? '#dc3545' : alert.level === 'MEDIUM' ? '#ffc107' : '#28a745'}`,
                      background: '#f8f9fa'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        [{alert.level}] {alert.message}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {new Date(alert.createdAt).toLocaleString()} {alert.acknowledged ? '• Acknowledged' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Clinical Notes */}
              {reportData.notes.length > 0 && (
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#333' }}>Clinical Notes ({reportData.notes.length})</h2>
                  {reportData.notes.map((note, idx) => (
                    <div key={idx} style={{
                      padding: 12,
                      marginBottom: 12,
                      borderRadius: 6,
                      border: '1px solid #dee2e6',
                      background: '#f8f9fa'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{note.title}</div>
                      <div style={{ marginBottom: 8 }}>{note.body}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        By {note.author} on {new Date(note.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: '2px solid #dee2e6' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#333' }}>Summary</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Total Readings:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.readings.length}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Risk Distribution:</td>
                    <td style={{ padding: '8px 0' }}>
                      LOW: {riskCounts.LOW || 0}, MEDIUM: {riskCounts.MEDIUM || 0}, HIGH: {riskCounts.HIGH || 0}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Total Alerts:</td>
                    <td style={{ padding: '8px 0' }}>{reportData.alerts.length}</td>
                  </tr>
                </table>
              </div>

              {/* Footer */}
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #dee2e6', textAlign: 'center', fontSize: 12, color: '#666' }}>
                <p>This report was generated by Smart Health Monitoring System</p>
                <p>For medical emergencies, please contact your healthcare provider immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HealthReport;



