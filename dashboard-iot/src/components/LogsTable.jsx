import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:4000'; // URL base del backend

const CRITICALITY_OPTS = [
  { value: '',        label: 'Todas' },
  { value: 'info',    label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error',   label: 'Error' },
];

const DATE_OPTS = [
  { value: 'today',      label: 'Hoy' },
  { value: 'yesterday',  label: 'Ayer' },
  { value: 'last_month', label: 'Último Mes' },
];

const fmtTs = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

export default function LogsTable({ token }) {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);

  // Filtros
  const [dateRange, setDateRange]     = useState('today');
  const [criticality, setCriticality] = useState('');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Paginación
  const [page, setPage]   = useState(1);
  const limit             = 15;
  const totalPages        = Math.ceil(total / limit);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams({
      dateRange,
      page,
      limit,
      ...(criticality && { criticality }),
      ...(search       && { search }),
    });

    try {
      const res = await fetch(`${API}/api/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      console.error('[LogsTable]', err);
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, criticality, search, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Resetear página al cambiar filtros
  useEffect(() => { setPage(1); }, [dateRange, criticality, search]);

  // Búsqueda con debounce de 400ms
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const badgeClass = (c) => {
    if (c === 'error')   return 'badge badge-error';
    if (c === 'warning') return 'badge badge-warning';
    return 'badge badge-info';
  };

  const statusColor = (code) => {
    if (code === 500) return 'var(--danger)';
    if (code === 400) return 'var(--warning)';
    return 'var(--success)';
  };

  return (
    <>
      <div className="chart-header">
        <div>
          <div className="chart-title">Historial de Logs</div>
          <div className="chart-subtitle">{total} registros encontrados</div>
        </div>
        <button id="btn-refresh-logs" className="btn btn-ghost" onClick={fetchLogs}>
          Actualizar
        </button>
      </div>

      {/* FILTROS */}
      <div className="logs-filters">
        {/* Rango de fechas */}
        <select
          id="filter-date"
          className="select"
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
        >
          {DATE_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Criticidad */}
        <select
          id="filter-criticality"
          className="select"
          value={criticality}
          onChange={e => setCriticality(e.target.value)}
        >
          {CRITICALITY_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Búsqueda por nodo o ubicación */}
        <input
          id="filter-search"
          type="text"
          className="input"
          placeholder="Buscar por nodo o ubicación…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ flex: 2, minWidth: 200 }}
        />
      </div>

      {/* TABLA */}
      <div className="table-wrapper">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando logs…
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron registros con los filtros aplicados.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Nodo</th>
                <th>Ubicación</th>
                <th>Vatios</th>
                <th>Voltaje</th>
                <th>Status</th>
                <th>Criticidad</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="mono">{fmtTs(log.timestamp)}</td>
                  <td style={{ fontWeight: 500 }}>{log.nodo_nombre}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.ubicacion}</td>
                  <td className="mono">{parseFloat(log.vatios_generados).toFixed(1)} W</td>
                  <td className="mono">{parseFloat(log.voltaje).toFixed(1)} V</td>
                  <td>
                    <span
                      className="mono"
                      style={{ color: statusColor(log.status_code), fontWeight: 600 }}
                    >
                      {log.status_code}
                    </span>
                  </td>
                  <td>
                    <span className={badgeClass(log.criticidad)}>
                      {log.criticidad}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.mensaje}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="pagination">
          <span>
            Página {page} de {totalPages} ({total} registros)
          </span>
          <div className="pagination-controls">
            <button
              id="btn-page-prev"
              className="btn btn-ghost"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Anterior
            </button>
            <button
              id="btn-page-next"
              className="btn btn-ghost"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
