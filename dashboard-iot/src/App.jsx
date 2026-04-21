import { useAuth0 } from '@auth0/auth0-react';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const handleLogin  = () => loginWithRedirect();
  const handleSignup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
  const handleLogout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  /* ── Pantalla de carga ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Cargando sesión…</span>
      </div>
    );
  }

  /* ── Dashboard autenticado ──────────────────────────────────── */
  if (isAuthenticated) {
    return <Dashboard onLogout={handleLogout} />;
  }

  /* ── Pantalla de login ──────────────────────────────────────── */
  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Monitoreo de Energía IoT</h1>
        <p>Sistema de monitoreo en tiempo real</p>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Error: {error.message}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button id="btn-login" className="btn btn-primary" onClick={handleLogin}>
            Iniciar Sesión
          </button>
          <button id="btn-signup" className="btn btn-ghost" onClick={handleSignup}>
            Crear Cuenta
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
