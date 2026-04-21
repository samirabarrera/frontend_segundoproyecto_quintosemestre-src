import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const API = 'http://localhost:4000';

const fmtPeriodo = (iso, groupBy) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (groupBy === 'month') {
    return d.toLocaleString('es', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
};

const COLORS = [
  '#3b82f6', '#60a5fa', '#818cf8', '#a78bfa',
  '#c084fc', '#e879f9', '#f472b6', '#fb7185',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#60a5fa', fontWeight: 600 }}>
        {(payload[0]?.value / 1000).toFixed(2)} kWh
      </div>
      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
        {payload[0]?.payload?.lecturas} lecturas
      </div>
    </div>
  );
};

export default function BarChartGeneration({ token }) {
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    fetch(`${API}/api/metricas/aggregated?groupBy=${groupBy}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return;
        const formatted = rows.map(r => ({
          periodo:  fmtPeriodo(r.periodo, groupBy),
          vatios:   parseFloat(r.total_vatios) || 0,
          lecturas: r.lecturas,
        }));
        setData(formatted.reverse());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, groupBy]);

  return (
    <>
      <div className="chart-header">
        <div>
          <div className="chart-title">Generación Histórica</div>
          <div className="chart-subtitle">Total de vatios acumulados por {groupBy === 'day' ? 'día' : 'mes'}</div>
        </div>
        <div className="chart-controls">
          <button
            id="btn-group-day"
            className={`btn ${groupBy === 'day' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setGroupBy('day')}
          >
            Día
          </button>
          <button
            id="btn-group-month"
            className={`btn ${groupBy === 'month' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setGroupBy('month')}
          >
            Mes
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Cargando…
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Sin datos disponibles
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 6, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="periodo"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              unit=" W"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
            <Bar dataKey="vatios" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}
