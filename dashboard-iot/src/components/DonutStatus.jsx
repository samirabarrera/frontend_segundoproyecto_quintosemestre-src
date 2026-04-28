import { useState, useEffect } from "react";
import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";

const API = "http://localhost:4000";

const GLOBAL_CONFIG = {
  Online: { color: "#22c55e" },
  Alerta: { color: "#f59e0b" },
  Offline: { color: "#4b5563" },
};

const NODE_CONFIG = {
  info: { color: "#22c55e", label: "Info" },
  warning: { color: "#f59e0b", label: "Warning" },
  error: { color: "#f87171", label: "Error" },
};

const CustomTooltip = ({ active, payload, mode }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const cfg = mode === "node" ? NODE_CONFIG[name] : GLOBAL_CONFIG[name];
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-light)",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: "0.82rem",
      }}
    >
      <span style={{ color: cfg?.color || "#fff", fontWeight: 600 }}>
        {mode === "node" ? (NODE_CONFIG[name]?.label ?? name) : name}
      </span>
      <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>
        {value} {mode === "node" ? "lecturas" : "nodos"}
      </span>
    </div>
  );
};

export default function DonutStatus({ token, nodeId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  /* mode: 'global' → distribución de todos los nodos
           'node'   → distribución de criticidad del nodo seleccionado */
  const mode = nodeId ? "node" : "global";

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const url = nodeId
      ? `${API}/api/metricas/${nodeId}/distribution` // por nodo
      : `${API}/api/nodos/distribution`; // global

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        const shaped = rows.map((r) => ({
          name: r.estado, // 'info'/'warning'/'error'
          value: r.cantidad,
        }));
        setData(shaped);
        setTotal(shaped.reduce((s, r) => s + r.value, 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, nodeId]); // recarga cuando cambia el nodo

  const getColor = (name) =>
    mode === "node"
      ? NODE_CONFIG[name]?.color || "#6b7280"
      : GLOBAL_CONFIG[name]?.color || "#6b7280";

  const getLabel = (name) =>
    mode === "node" ? (NODE_CONFIG[name]?.label ?? name) : name;

  return (
    <>
      <div className="chart-header">
        <div>
          <div className="chart-title">
            {mode === "node" ? "Criticidad del Nodo" : "Estado de Nodos"}
          </div>
          <div className="chart-subtitle">
            {mode === "node"
              ? "Distribución de lecturas (últimos 30 días)"
              : "Distribución por estado actual"}
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
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
                  <Cell key={idx} fill={getColor(entry.name)} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip mode={mode} />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Leyenda */}
          <div className="donut-legend">
            {data.map((entry) => {
              const pct =
                total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={entry.name} className="donut-legend-item">
                  <div className="donut-legend-label">
                    <span
                      className="donut-legend-dot"
                      style={{ background: getColor(entry.name) }}
                    />
                    {getLabel(entry.name)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.78rem",
                      }}
                    >
                      {pct}%
                    </span>
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
