import React, { useEffect, useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { API_BASE_URL } from '../config';

type Prediction = {
  timestamp: number;
  heartRate: number;
  spo2: number;
  temperature: number;
  risk: string;
  confidence: number;
};

type PredictionData = {
  patientId: string;
  predictionHours: number;
  dataPoints: number;
  model: {
    heartRate: { slope: number; intercept: number };
    spo2: { slope: number; intercept: number };
    temperature: { slope: number; intercept: number };
  };
  predictions: Prediction[];
  warnings: Array<{
    timestamp: number;
    type: string;
    message: string;
    severity: string;
  }>;
  lastReading: {
    timestamp: number;
    heartRate: number;
    spo2: number;
    temperature: number;
  };
};

const PredictiveTrends: React.FC<{ patientId: string; token: string; history: Array<{ timestamp: number; heartRate: number; spo2: number; temperature: number }> }> = ({ 
  patientId, 
  token,
  history 
}) => {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);
  const [showPredictions, setShowPredictions] = useState(false);

  const fetchPredictions = async () => {
    console.log('Fetching predictions...', { patientId, hours, historyLength: history.length });
    
    if (history.length < 5) {
      alert(`Need at least 5 readings to generate predictions. You have ${history.length}. Please start simulation and wait for more data.`);
      return;
    }
    
    setLoading(true);
    setPredictionData(null);
    
    try {
      const url = `${API_BASE_URL}/api/v1/predict/${patientId}?hours=${hours}`;
      console.log('Fetching from:', url);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Prediction data received:', data);
        
        if (data.error) {
          alert(`Prediction Error: ${data.error}. ${data.required ? `Need ${data.required} readings, have ${data.available}.` : ''}`);
          setPredictionData(null);
        } else {
          setPredictionData(data);
          setShowPredictions(true);
        }
      } else {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        alert(`Failed to generate predictions: ${res.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to server. Make sure backend is running on port 8000.';
      alert(`Network error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (history.length < 5) {
    return (
      <div className="ui-card glass" style={{ marginBottom: 24 }}>
        <div className="ui-card-content">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div className="muted" style={{ marginBottom: 12 }}>
              🔮 Need at least 5 readings to generate predictions
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              You currently have <strong>{history.length}</strong> readings.
              <br />
              <strong>Tip:</strong> Click "Start Simulation" and wait for more data to accumulate.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fmtTime = (d: number) => new Date(d).toLocaleTimeString();
  const fmtDateTime = (d: number) => new Date(d).toLocaleString();

  // Prepare data for charts - combine actual and predicted with separate fields
  const actualData = history.map(h => ({ 
    timestamp: h.timestamp, 
    heartRate_actual: h.heartRate,
    spo2_actual: h.spo2,
    temperature_actual: h.temperature,
    heartRate_predicted: null,
    spo2_predicted: null,
    temperature_predicted: null
  }));
  
  const predictedData = (predictionData?.predictions || []).map(p => ({
    timestamp: p.timestamp,
    heartRate_actual: null,
    spo2_actual: null,
    temperature_actual: null,
    heartRate_predicted: p.heartRate,
    spo2_predicted: p.spo2,
    temperature_predicted: p.temperature,
    confidence: p.confidence
  }));
  
  // Combined dataset
  const combinedData = [...actualData, ...predictedData];

  const getRiskColor = (risk: string) => {
    if (risk === 'HIGH') return '#dc3545';
    if (risk === 'MEDIUM') return '#ffc107';
    return '#28a745';
  };

  return (
    <div className="ui-card glass" style={{ marginBottom: 24 }}>
      <div className="ui-card-content">
        <div className="row-between mb-6">
          <div>
            <div className="title" style={{ fontSize: 20, marginBottom: 4 }}>
              🔮 Predictive Health Trends (ML-Powered)
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              AI predicts your future vital signs using machine learning
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14
              }}
            >
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
            <button
              className="ui-btn"
              onClick={fetchPredictions}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              {loading ? 'Predicting...' : '🔮 Predict'}
            </button>
          </div>
        </div>

        {predictionData && (
          <>
            {/* Model Info */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(106, 17, 203, 0.1) 0%, rgba(37, 117, 252, 0.1) 100%)',
              border: '1px solid rgba(106, 17, 203, 0.3)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#6a11cb' }}>
                🤖 ML Model Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                <div>
                  <div className="muted">Heart Rate Trend</div>
                  <div style={{ fontWeight: 600 }}>
                    {predictionData.model.heartRate.slope > 0 ? '📈' : '📉'} 
                    {predictionData.model.heartRate.slope > 0 ? 'Increasing' : 'Decreasing'}
                  </div>
                </div>
                <div>
                  <div className="muted">SpO₂ Trend</div>
                  <div style={{ fontWeight: 600 }}>
                    {predictionData.model.spo2.slope > 0 ? '📈' : '📉'} 
                    {predictionData.model.spo2.slope > 0 ? 'Improving' : 'Declining'}
                  </div>
                </div>
                <div>
                  <div className="muted">Temperature Trend</div>
                  <div style={{ fontWeight: 600 }}>
                    {predictionData.model.temperature.slope > 0 ? '📈' : '📉'} 
                    {predictionData.model.temperature.slope > 0 ? 'Rising' : 'Falling'}
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {predictionData.warnings.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="muted mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
                  ⚠️ Predicted Alerts
                </div>
                <div className="list">
                  {predictionData.warnings.slice(0, 5).map((warning, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        border: `2px solid ${warning.severity === 'HIGH' ? '#dc3545' : '#ffc107'}40`,
                        background: `${warning.severity === 'HIGH' ? '#dc3545' : '#ffc107'}15`,
                        marginBottom: 8
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4, color: warning.severity === 'HIGH' ? '#dc3545' : '#856404' }}>
                        {warning.severity === 'HIGH' ? '🚨' : '⚠️'} {warning.type}
                      </div>
                      <div style={{ fontSize: 13 }}>{warning.message}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Predicted for: {fmtDateTime(warning.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction Charts */}
            <div className="grid-2 mb-6">
              {/* Heart Rate Prediction */}
              <div>
                <div className="muted mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
                  ❤️ Heart Rate Prediction
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={fmtTime} 
                      minTickGap={30}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }} 
                      stroke="var(--border)" 
                    />
                    <YAxis domain={[50, 150]} tick={{ fontSize: 11, fill: 'var(--muted)' }} stroke="var(--border)" />
                    <Tooltip 
                      labelFormatter={fmtDateTime}
                      contentStyle={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 8,
                        color: 'var(--text)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="heartRate_actual"
                      stroke="#7c8cfa"
                      strokeWidth={3}
                      dot={false}
                      name="Actual"
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="heartRate_predicted"
                      stroke="#ff6b81"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Predicted (ML)"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* SpO₂ & Temperature Prediction */}
              <div>
                <div className="muted mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
                  🫁 SpO₂ & Temperature Prediction
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={combinedData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={fmtTime} 
                      minTickGap={30}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }} 
                      stroke="var(--border)" 
                    />
                    <YAxis yAxisId="left" domain={[85, 100]} tick={{ fontSize: 11, fill: '#f093fb' }} stroke="#f093fb" />
                    <YAxis yAxisId="right" orientation="right" domain={[35, 40.5]} tick={{ fontSize: 11, fill: '#ff6b81' }} stroke="#ff6b81" />
                    <Tooltip 
                      labelFormatter={fmtDateTime}
                      contentStyle={{ 
                        background: 'var(--card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 8,
                        color: 'var(--text)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="spo2_actual"
                      stroke="#f093fb"
                      strokeWidth={3}
                      dot={false}
                      name="SpO₂ Actual"
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="spo2_predicted"
                      stroke="#ff6b81"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="SpO₂ Predicted (ML)"
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature_actual"
                      stroke="#ff6b81"
                      strokeWidth={3}
                      dot={false}
                      name="Temp Actual"
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature_predicted"
                      stroke="#ff6b81"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Temp Predicted (ML)"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Prediction Summary */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16
            }}>
              <div className="muted mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
                📊 Prediction Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Final Predicted HR</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {predictionData.predictions[predictionData.predictions.length - 1]?.heartRate.toFixed(0)} bpm
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Confidence: {(predictionData.predictions[predictionData.predictions.length - 1]?.confidence || 0) * 100}%
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Final Predicted SpO₂</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {predictionData.predictions[predictionData.predictions.length - 1]?.spo2.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Confidence: {(predictionData.predictions[predictionData.predictions.length - 1]?.confidence || 0) * 100}%
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Final Predicted Temp</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {predictionData.predictions[predictionData.predictions.length - 1]?.temperature.toFixed(1)}°C
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Confidence: {(predictionData.predictions[predictionData.predictions.length - 1]?.confidence || 0) * 100}%
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {!predictionData && !loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔮</div>
            <div className="title" style={{ marginBottom: 8 }}>AI-Powered Health Predictions</div>
            <div className="muted" style={{ marginBottom: 16 }}>
              Click "Predict" to see ML-based forecasts of your future vital signs
            </div>
            <button 
              className="ui-btn" 
              onClick={(e) => {
                e.preventDefault();
                console.log('Generate Predictions button clicked');
                fetchPredictions();
              }} 
              style={{ padding: '12px 24px', cursor: 'pointer' }}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Predictions'}
            </button>
            {history.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                Current readings: {history.length} {history.length < 5 ? '(need 5+)' : '✓ Ready'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveTrends;

