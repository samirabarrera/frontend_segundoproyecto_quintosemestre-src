import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:4000'; // URL base del backend

const STATE_CONFIG = {
  Online:  { color: '#22c55e', dot: 'green'  },
  Alerta:  { color: '#f59e0b', dot: 'yellow' },
  Offline: { color: '#4b5563', dot: 'gray'   },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: '0.82rem',
    }}>
      <span style={{ color: STATE_CONFIG[name]?.color || '#fff', fontWeight: 600 }}>
        {name}
      </span>
      <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{value} nodos</span>
    </div>
  );
};

export default function DonutStatus({ token }) {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]   = useState(0);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    fetch(`${API}/api/nodos/distribution`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return;
        const shaped = rows.map(r => ({
          name:  r.estado,
          value: r.cantidad,
        }));
        setData(shaped);
        setTotal(shaped.reduce((s, r) => s + r.value, 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <div className="chart-header">
        <div>
          <div className="chart-title">Estado de Nodos</div>
          <div className="chart-subtitle">Distribución por estado actual</div>
        </div>
      </div>

      {loading ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Cargando…
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={(STATE_CONFIG[entry.name]?.color) || '#6b7280'}
                    opacity={0.9}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Leyenda */}
          <div className="donut-legend">
            {data.map((entry) => {
              const cfg = STATE_CONFIG[entry.name] || {};
              const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={entry.name} className="donut-legend-item">
                  <div className="donut-legend-label">
                    <span
                      className="donut-legend-dot"
                      style={{ background: cfg.color || '#6b7280' }}
                    />
                    {entry.name}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{pct}%</span>
                    <span className="donut-legend-count">{entry.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}