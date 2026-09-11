import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

type Insight = {
  type: 'positive' | 'warning' | 'critical';
  title: string;
  message: string;
};

type HealthInsightsData = {
  period: string;
  dataPoints: number;
  averages: {
    heartRate: number;
    spo2: number;
    temperature: number;
  };
  trends: {
    heartRate: { change: number; direction: string };
    spo2: { change: number; direction: string };
    temperature: { change: number; direction: string };
  };
  riskDistribution: { LOW: number; MEDIUM: number; HIGH: number };
  healthScore: number;
  insights: Insight[];
};

const HealthInsights: React.FC<{ patientId: string; token: string }> = ({ patientId, token }) => {
  const [insights, setInsights] = useState<HealthInsightsData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/insights/${patientId}?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message && data.message.includes('Not enough data')) {
          setInsights(null);
        } else {
          setInsights(data);
        }
      } else {
        setInsights(null);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [patientId, period, token]);

  if (!insights) {
    return (
      <div className="ui-card glass">
        <div className="ui-card-content">
          <div style={{ textAlign: 'center', padding: '20px' }}>
            {loading ? (
              <div className="muted">Loading insights...</div>
            ) : (
              <>
                <div className="muted" style={{ marginBottom: 12 }}>
                  📊 Not enough data for insights
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Need at least 2 readings over the selected period ({period}).
                  <br />
                  <strong>Tip:</strong> Click "Start Simulation" and wait for data to accumulate.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getTrendIcon = (direction: string) => {
    if (direction === 'improving') return '📈';
    if (direction === 'worsening') return '📉';
    return '➡️';
  };

  const getTrendColor = (direction: string) => {
    if (direction === 'improving') return '#28a745';
    if (direction === 'worsening') return '#dc3545';
    return '#6c757d';
  };

  return (
    <div className="ui-card glass" style={{ marginBottom: 24 }}>
      <div className="ui-card-content">
        <div className="row-between mb-6">
          <div>
            <div className="title" style={{ fontSize: 20, marginBottom: 4 }}>📊 Health Insights</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {insights.dataPoints} data points analyzed
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`ui-btn ${period === 'week' ? '' : 'btn-secondary'}`}
              onClick={() => setPeriod('week')}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              Week
            </button>
            <button
              className={`ui-btn ${period === 'month' ? '' : 'btn-secondary'}`}
              onClick={() => setPeriod('month')}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              Month
            </button>
          </div>
        </div>

        {/* Health Score */}
        <div style={{
          background: `linear-gradient(135deg, ${getHealthScoreColor(insights.healthScore)}15 0%, ${getHealthScoreColor(insights.healthScore)}05 100%)`,
          border: `2px solid ${getHealthScoreColor(insights.healthScore)}40`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          textAlign: 'center'
        }}>
          <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>Overall Health Score</div>
          <div style={{
            fontSize: 48,
            fontWeight: 700,
            color: getHealthScoreColor(insights.healthScore),
            marginBottom: 4
          }}>
            {insights.healthScore}
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: getHealthScoreColor(insights.healthScore)
          }}>
            {getHealthScoreLabel(insights.healthScore)}
          </div>
        </div>

        {/* Averages */}
        <div className="grid-3 mb-6">
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: 'var(--card)',
            border: '1px solid var(--border)'
          }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Avg Heart Rate</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{insights.averages.heartRate.toFixed(0)}</div>
            <div style={{ fontSize: 12, color: getTrendColor(insights.trends.heartRate.direction), marginTop: 4 }}>
              {getTrendIcon(insights.trends.heartRate.direction)} {Math.abs(insights.trends.heartRate.change).toFixed(1)}% {insights.trends.heartRate.direction}
            </div>
          </div>
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: 'var(--card)',
            border: '1px solid var(--border)'
          }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Avg SpO₂</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{insights.averages.spo2.toFixed(1)}%</div>
            <div style={{ fontSize: 12, color: getTrendColor(insights.trends.spo2.direction), marginTop: 4 }}>
              {getTrendIcon(insights.trends.spo2.direction)} {Math.abs(insights.trends.spo2.change).toFixed(1)}% {insights.trends.spo2.direction}
            </div>
          </div>
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: 'var(--card)',
            border: '1px solid var(--border)'
          }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Avg Temperature</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{insights.averages.temperature.toFixed(1)}°C</div>
            <div style={{ fontSize: 12, color: getTrendColor(insights.trends.temperature.direction), marginTop: 4 }}>
              {getTrendIcon(insights.trends.temperature.direction)} {Math.abs(insights.trends.temperature.change).toFixed(1)}% {insights.trends.temperature.direction}
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div style={{ marginBottom: 24 }}>
          <div className="muted mb-2" style={{ fontSize: 14, fontWeight: 600 }}>Risk Distribution</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: insights.riskDistribution.LOW,
              background: '#28a745',
              padding: '12px',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              textAlign: 'center',
              fontSize: 14
            }}>
              LOW: {insights.riskDistribution.LOW}
            </div>
            <div style={{
              flex: insights.riskDistribution.MEDIUM,
              background: '#ffc107',
              padding: '12px',
              borderRadius: 8,
              color: '#000',
              fontWeight: 600,
              textAlign: 'center',
              fontSize: 14
            }}>
              MEDIUM: {insights.riskDistribution.MEDIUM}
            </div>
            <div style={{
              flex: insights.riskDistribution.HIGH,
              background: '#dc3545',
              padding: '12px',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              textAlign: 'center',
              fontSize: 14
            }}>
              HIGH: {insights.riskDistribution.HIGH}
            </div>
          </div>
        </div>

        {/* AI-Generated Insights */}
        {insights.insights.length > 0 && (
          <div>
            <div className="muted mb-2" style={{ fontSize: 14, fontWeight: 600 }}>AI-Generated Insights</div>
            <div className="list">
              {insights.insights.map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `2px solid ${
                      insight.type === 'positive' ? '#28a745' :
                      insight.type === 'warning' ? '#ffc107' :
                      '#dc3545'
                    }40`,
                    background: `${
                      insight.type === 'positive' ? '#28a745' :
                      insight.type === 'warning' ? '#ffc107' :
                      '#dc3545'
                    }15`,
                    marginBottom: 12
                  }}
                >
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: `${
                      insight.type === 'positive' ? '#28a745' :
                      insight.type === 'warning' ? '#856404' :
                      '#dc3545'
                    }`
                  }}>
                    {insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : '🚨'} {insight.title}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{insight.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthInsights;

