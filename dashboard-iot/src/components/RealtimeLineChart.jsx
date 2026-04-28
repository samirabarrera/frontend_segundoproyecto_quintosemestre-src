import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const API = "http://localhost:40000";
const MAX_POINTS = 30; // máximo puntos en pantalla

const fmt = (ts) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-light)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: "0.8rem",
      }}
    >
      <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#60a5fa", fontWeight: 600 }}>
        {payload[0]?.value?.toFixed(1)} W
      </div>
      {payload[1] && (
        <div style={{ color: "#f59e0b", marginTop: 2 }}>
          {payload[1]?.value?.toFixed(1)} V
        </div>
      )}
    </div>
  );
};

export default function RealtimeLineChart({
  token,
  selectedNode,
  nodes,
  onNodeChange,
  socket,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const dataRef = useRef([]);

  /* Carga inicial (cada 5 min) */
  useEffect(() => {
    if (!token || !selectedNode) return;

    setLoading(true);
    fetch(`${API}/api/metrics/${selectedNode}?minutes=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((rows) => {
        const points = rows.map((r) => ({
          time: fmt(r.timestamp),
          vatios: parseFloat(r.vatios_generados),
          voltaje: parseFloat(r.voltaje),
        }));
        dataRef.current = points;
        setData([...points]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, selectedNode]);

  /* Actualización en tiempo real con socket */
  useEffect(() => {
    if (!socket) return;

    const handler = (metric) => {
      if (metric.nodo_id !== selectedNode) return;

      const point = {
        time: fmt(metric.timestamp),
        vatios: parseFloat(metric.vatios_generados),
        voltaje: parseFloat(metric.voltaje),
      };

      dataRef.current = [...dataRef.current, point].slice(-MAX_POINTS);
      setData([...dataRef.current]);
    };

    socket.on("nueva_metrica", handler);
    return () => socket.off("nueva_metrica", handler);
  }, [socket, selectedNode]);

  return (
    <>
      <div className="chart-header">
        <div>
          <div className="chart-title">Potencia en Tiempo Real</div>
          <div className="chart-subtitle">Vatios generados — últimos 5 min</div>
        </div>
        <div className="node-select-wrap">
          <label htmlFor="node-select">Nodo:</label>
          <select
            id="node-select"
            className="select"
            value={selectedNode}
            onChange={(e) => onNodeChange(e.target.value)}
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          Cargando datos…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={data}
            margin={{ top: 6, right: 16, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              domain={[0, 550]}
              unit=" W"
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Línea warning */}
            <ReferenceLine
              y={50}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: "50W", fill: "#f59e0b", fontSize: 10 }}
            />
            <ReferenceLine
              y={200}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: "200W", fill: "#22c55e", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="vatios"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#60a5fa" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </>
  );
}
