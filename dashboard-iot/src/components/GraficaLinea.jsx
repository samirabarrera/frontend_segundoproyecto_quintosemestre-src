import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import '../css/Dashboard.css'; // estilos específicos para esta gráfica

/* ── Constantes ─────────────────────────────────────────────────── */
const MAX_POINTS   = 20;
const DEFAULT_URL  = 'http://localhost:4000';

/* ── Helpers ────────────────────────────────────────────────────── */
const formatTime = (ts) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

/* ── Tooltip personalizado ──────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1028',
      border: '1px solid rgba(217,70,239,0.35)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: '#9b72b8', marginBottom: 5 }}>{label}</div>
      <div style={{ color: '#D946EF', fontWeight: 700, fontSize: '0.9rem' }}>
        {payload[0]?.value?.toFixed(1)} W
      </div>
      {payload[1] && (
        <div style={{ color: '#fbbf24', marginTop: 3 }}>
          {payload[1]?.value?.toFixed(1)} V
        </div>
      )}
    </div>
  );
};

/*Componente Principal*/
export default function GraficaLinea({
  nodeId,
  socketUrl = DEFAULT_URL,
  token,
  title = 'Vatios Generados — Tiempo Real',
}) {
  const [data, setData]       = useState([]);       // puntos del gráfico
  const [loading, setLoading] = useState(false);    // carga inicial
  const [error, setError]     = useState(null);     // error de carga
  const [connected, setConnected] = useState(false); // estado socket
  const dataRef               = useRef([]);         // referencia mutable (evita stale closure)
  const socketRef             = useRef(null);       // instancia socket

  /* ── 1. Carga inicial vía axios ───────────────────────────────── */
  useEffect(() => {
    if (!nodeId) return;

    const controller = new AbortController(); // para cancelar la petición si se desmonta
    setLoading(true);
    setError(null);

    axios
      .get(`${socketUrl}/api/metricas/${nodeId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params:  { minutes: 10 },
        signal:  controller.signal,
      })
      .then(({ data: rows }) => {
        if (!Array.isArray(rows)) return;
        const points = rows
          .slice(-MAX_POINTS)
          .map((r) => ({
            time:   formatTime(r.timestamp),
            vatios: parseFloat(r.vatios_generados) || 0,
            voltaje: parseFloat(r.voltaje) || 0,
          }));
        dataRef.current = points;
        setData([...points]);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.error('[GraficaLinea] Error al cargar métricas:', err);
          setError('No se pudieron cargar los datos iniciales.');
        }
      })
      .finally(() => setLoading(false));

    // Limpieza: cancelar petición si el componente se desmonta antes de que termine
    return () => controller.abort();
  }, [nodeId, socketUrl, token]);

  /* Conexión Socket.io */
  useEffect(() => {
    const socket = io(socketUrl, {
      ...(token && { auth: { token } }),
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[GraficaLinea] Socket conectado:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[GraficaLinea] Socket desconectado');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[GraficaLinea] Error de conexión:', err.message);
      setConnected(false);
    });

    /* Evento nueva_metrica */
    const handleMetric = (metric) => {
      // Si el punto pertenece a un nodo diferente, ignorar
      if (nodeId && metric.nodo_id !== nodeId) return;

      const point = {
        time:    formatTime(metric.timestamp ?? Date.now()),
        vatios:  parseFloat(metric.vatios_generados) || 0,
        voltaje: parseFloat(metric.voltaje) || 0,
      };

      // Mantener solo los últimos MAX_POINTS puntos
      dataRef.current = [...dataRef.current, point].slice(-MAX_POINTS);
      setData([...dataRef.current]);
    };

    socket.on('nueva_metrica', handleMetric);

    /* Limpieza: desconectar socket al desmontar */
    return () => {
      socket.off('nueva_metrica', handleMetric);
      socket.disconnect();
      console.log('[GraficaLinea] Socket limpiado correctamente');
    };
  }, [socketUrl, token, nodeId]); // re-conectar si cambia la URL, token o nodo

  /* Render */
  return (
    <div className="card card-solar h-100">
      <div className="card-body">

        {/* Header */}
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <p className="chart-card-title mb-1">{title}</p>
            <p className="chart-card-subtitle">
              Últimos {MAX_POINTS} puntos de datos · {data.length} activos
            </p>
          </div>

          {/* Indicador de conexión */}
          <span className="status-badge">
            <span className={`pulse-dot ${connected ? 'dot-online' : 'dot-offline'}`} />
            {connected ? 'En vivo' : 'Reconectando…'}
          </span>
        </div>

        {/* Estado de carga / error */}
        {loading && (
          <div className="d-flex align-items-center justify-content-center" style={{ height: 260 }}>
            <div className="spinner-border spinner-border-sm text-magenta me-2" role="status" />
            <span style={{ color: '#9b72b8', fontSize: '0.85rem' }}>Cargando datos…</span>
          </div>
        )}

        {error && !loading && (
          <div className="alert" style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.35)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: '0.82rem',
            padding: '10px 14px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Gráfica Recharts */}
        {!loading && !error && (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(217,70,239,0.07)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#9b72b8' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9b72b8' }}
                tickLine={false}
                axisLine={false}
                unit=" W"
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', color: '#9b72b8', paddingTop: 4 }}
                formatter={(value) => value === 'vatios' ? 'Vatios (W)' : 'Voltaje (V)'}
              />

              {/* Líneas de referencia */}
              <ReferenceLine
                y={50}
                stroke="#fbbf24"
                strokeDasharray="4 4"
                label={{ value: '50W', fill: '#fbbf24', fontSize: 9, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={200}
                stroke="#34d399"
                strokeDasharray="4 4"
                label={{ value: '200W', fill: '#34d399', fontSize: 9, position: 'insideTopRight' }}
              />

              {/* Línea principal: vatios */}
              <Line
                type="monotone"
                dataKey="vatios"
                stroke="#D946EF"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#D946EF', stroke: '#f5e6ff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Línea secundaria: voltaje */}
              <Line
                type="monotone"
                dataKey="voltaje"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 3"
                activeDot={{ r: 4, fill: '#fbbf24' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Mensaje cuando no hay datos */}
        {!loading && !error && data.length === 0 && (
          <div className="d-flex align-items-center justify-content-center" style={{ height: 200 }}>
            <span style={{ color: '#9b72b8', fontSize: '0.85rem' }}>
              Esperando métricas en tiempo real…
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
