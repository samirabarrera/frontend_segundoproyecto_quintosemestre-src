import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth0 } from "@auth0/auth0-react";
import GraficaLinea from "./GraficaLinea";
import BarChartGeneration from "./BarChartGeneration";
import DonutStatus from "./DonutStatus";
import LogsTable from "./LogsTable";
import "../css/Dashboard.css";
import "bootstrap/dist/css/bootstrap.min.css";

const API_URL = "http://localhost:4000";

/* Datos iniciales de KPIs */
const KPI_INITIAL = { total: 0, online: 0, alerta: 0, offline: 0 };

export default function Dashboard({ onLogout }) {
  const { getAccessTokenSilently, user } = useAuth0();

  /* Estado */
  const [token, setToken] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [kpis, setKpis] = useState(KPI_INITIAL);
  const [selectedNode, setSelectedNode] = useState("");
  const [toasts, setToasts] = useState([]); // alertas críticas
  const [socketOk, setSocketOk] = useState(false);

  const socketRef = useRef(null); // referencia a instancia Socket.io

  useEffect(() => {
    getAccessTokenSilently()
      .then(setToken)
      .catch((err) => console.error("[Dashboard] Token error:", err));
  }, [getAccessTokenSilently]);

  /*Cargando nodos con axios*/
  const loadNodes = useCallback(
    async (tkn) => {
      try {
        const { data } = await axios.get(`${API_URL}/api/nodos`, {
          headers: { Authorization: `Bearer ${tkn}` },
        });

        if (!Array.isArray(data)) return;

        setNodes(data);

        // Seleccionar el primer nodo si aún no hay ninguno seleccionado
        if (!selectedNode && data.length > 0) {
          setSelectedNode(data[0].id);
        }

        // Actualizar información de los nodos
        const online = data.filter((n) => n.estado === "online").length;
        const alerta = data.filter((n) => n.estado === "alerta").length;
        const offline = data.filter((n) => n.estado === "offline").length;
        setKpis({ total: data.length, online, alerta, offline });
      } catch (err) {
        console.error("[Dashboard] loadNodes:", err);
      }
    },
    [selectedNode],
  );

  useEffect(() => {
    if (token) loadNodes(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Socket.io */
  useEffect(() => {
    if (!token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Dashboard Socket] Conectado:", socket.id);
      setSocketOk(true);
    });

    socket.on("disconnect", () => {
      console.log("[Dashboard Socket] Desconectado");
      setSocketOk(false);
    });

    /* Evento: alerta_critica → mostrar toast */
    socket.on("alerta_critica", (data) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, ...data }]);
      // Auto-dismiss después de 6 s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    });

    /* Evento: nueva_metrica → refrescar KPIs en background */
    socket.on("nueva_metrica", () => {
      loadNodes(token);
    });

    /* Cleanup: desconectar socket al desmontar */
    return () => {
      socket.disconnect();
      console.log("[Dashboard Socket] Socket limpiado correctamente");
    };
  }, [token]);

  /* Helpers */
  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  /* Configuración de tarjetas de KPIs */
  const kpiCards = [
    {
      id: "kpi-total",
      label: "Total Nodos",
      value: kpis.total,
      icon: "🌐",
      color: "var(--magenta)",
    },
    {
      id: "kpi-online",
      label: "En Línea",
      value: kpis.online,
      icon: "✅",
      color: "var(--sol-success)",
    },
    {
      id: "kpi-alerta",
      label: "En Alerta",
      value: kpis.alerta,
      icon: "⚠️",
      color: "var(--sol-warning)",
    },
    {
      id: "kpi-offline",
      label: "Offline",
      value: kpis.offline,
      icon: "🔴",
      color: "var(--sol-danger)",
    },
  ];

  /*  RENDER */
  return (
    <div className="dashboard-solar">
      {/* Navbar */}
      <nav className="solar-navbar d-flex align-items-center justify-content-between">
        {/* Marca */}
        <div className="navbar-brand mb-0">
          <span className="brand-icon">☀️</span>
          <span className="ms-2">Solar IoT Monitor</span>
        </div>

        {/* Centro: estado socket */}
        <span className="status-badge d-none d-md-flex">
          <span
            className={`pulse-dot ${socketOk ? "dot-online" : "dot-offline"}`}
          />
          {socketOk ? "Tiempo real activo" : "Reconectando…"}
        </span>

        {/* Derecha: usuario + logout */}
        <div className="d-flex align-items-center gap-3">
          {user?.picture && (
            <img src={user.picture} alt="avatar" className="user-avatar" />
          )}
          <span
            className="d-none d-sm-inline"
            style={{ fontSize: "0.8rem", color: "var(--sol-text-muted)" }}
          >
            {user?.email}
          </span>
          <button
            id="btn-logout"
            className="btn-solar-ghost"
            onClick={onLogout}
          >
            Salir
          </button>
        </div>
      </nav>

      {/*  MAIN CONTENT  */}
      <main
        className="container-fluid px-3 px-md-4 py-4"
        style={{ maxWidth: 1600 }}
      >
        {/* SECCIÓN: KPIs — Bootstrap Grid 4 columnas */}
        <p className="section-title">
          <span>📊</span> Resumen General
        </p>

        <div className="row g-3 mb-4">
          {kpiCards.map((kpi, i) => (
            <div key={kpi.id} className="col-6 col-md-3 animate-fade-up">
              <div id={kpi.id} className="kpi-card-solar">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
                <span className="kpi-icon" aria-hidden="true">
                  {kpi.icon}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* SECCIÓN: Selector de nodo */}
        {nodes.length > 0 && (
          <div
            className="d-flex align-items-center gap-2 mb-4"
            style={{ fontSize: "0.82rem" }}
          >
            <span style={{ color: "var(--sol-text-muted)" }}>
              Nodo seleccionado:
            </span>
            <select
              id="node-selector"
              className="solar-select"
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
            <span className="badge bg-magenta rounded-pill px-3">
              {nodes.length} nodo{nodes.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* SECCIÓN: Gráficas Principales */}
        <p className="section-title">
          <span>⚡</span> Monitoreo en Tiempo Real
        </p>

        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-8 animate-fade-up">
            <GraficaLinea
              nodeId={selectedNode}
              socketUrl={API_URL}
              token={token}
              title="Vatios Generados — Tiempo Real"
            />
          </div>

          <div className="col-12 col-lg-4 animate-fade-up">
            <div className="card card-solar h-100">
              <div className="card-body">
                <DonutStatus token={token} nodeId={selectedNode} />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: Generación Histórica — full width */}
        <p className="section-title">
          <span>📈</span> Generación Histórica
        </p>

        <div className="row g-3 mb-4">
          <div className="col-12 animate-fade-up">
            <div className="card card-solar">
              <div className="card-body">
                {/* Título con clase .text-magenta */}
                <h6 className="chart-card-title text-magenta mb-1">
                  Producción por Período
                </h6>
                <p className="chart-card-subtitle mb-3">
                  Vatios acumulados agrupados por día o mes
                </p>
                <BarChartGeneration token={token} />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: Tabla de Logs */}
        <p className="section-title">
          <span>📋</span> Historial de Logs
        </p>

        <div className="row g-3 mb-5">
          <div className="col-12 animate-fade-up">
            <div className="card card-solar">
              <div className="card-body">
                <LogsTable token={token} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TOAST CONTAINER: alertas críticas */}
      <div
        className="solar-toast-container"
        role="region"
        aria-label="Alertas críticas"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            id={`toast-${t.id}`}
            className="solar-toast"
            role="alert"
            onClick={() => dismissToast(t.id)}
            title="Clic para cerrar"
          >
            <span className="toast-icon">🔴</span>
            <div>
              <div className="toast-title">
                Alerta Crítica — {t.nodoNombre ?? t.nodo_nombre}
              </div>
              <div className="toast-msg">{t.mensaje}</div>
              {(t.vatios !== undefined || t.voltaje !== undefined) && (
                <div className="toast-meta">
                  {t.vatios !== undefined && `${t.vatios}W`}
                  {t.vatios !== undefined && t.voltaje !== undefined && " · "}
                  {t.voltaje !== undefined && `${t.voltaje}V`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
