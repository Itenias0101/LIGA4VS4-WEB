
import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import { auth } from "./firebase";

const getFirebaseError = (error) => {
  const errors = {
    "auth/invalid-email": "El correo electrónico no es válido.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "La contraseña es incorrecta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/email-already-in-use": "Este correo ya está registrado.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Inténtalo más tarde.",
    "auth/network-request-failed": "Error de conexión. Comprueba tu internet."
  };

  return errors[error.code] || "Ha ocurrido un error. Inténtalo nuevamente.";
};

const menuItems = [
  {
    id: "clasificacion",
    number: "01",
    title: "CLASIFICACIÓN",
    icon: "🏆"
  },
  {
    id: "proximos",
    number: "02",
    title: "PRÓXIMOS ENFRENTAMIENTOS",
    icon: "⚔️"
  },
  {
    id: "resultados",
    number: "03",
    title: "ÚLTIMOS RESULTADOS",
    icon: "📊"
  },
  {
    id: "equipos",
    number: "04",
    title: "EQUIPOS",
    icon: "🛡️"
  },
  {
    id: "jornadas",
    number: "05",
    title: "JORNADAS",
    icon: "📅"
  },
  {
    id: "publicaciones",
    number: "06",
    title: "JUGADAS DESTACADAS",
    icon: "🎥"
  }
];

const bottomItems = [
  { id: "inicio", label: "INICIO", icon: "⌂" },
  { id: "clasificacion", label: "CLASIFICACIÓN", icon: "🏆" },
  { id: "proximos", label: "PRÓXIMOS", icon: "⚔️" },
  { id: "resultados", label: "RESULTADOS", icon: "📊" },
  { id: "equipos", label: "EQUIPOS", icon: "🛡️" }
];

const sectionNames = {
  clasificacion: "CLASIFICACIÓN",
  proximos: "PRÓXIMOS ENFRENTAMIENTOS",
  resultados: "ÚLTIMOS RESULTADOS",
  equipos: "EQUIPOS",
  jornadas: "JORNADAS",
  publicaciones: "JUGADAS DESTACADAS"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("home");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const [activeSection, setActiveSection] = useState("inicio");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const openMode = (newMode) => {
    setMode(newMode);
    setMessage("");
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setProcessing(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setMode("home");
      setActiveSection("inicio");
      setPassword("");
    } catch (err) {
      setError(getFirebaseError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setProcessing(true);

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setMode("home");
      setActiveSection("inicio");
      setPassword("");
      setConfirmPassword("");
      setMessage("¡Tu cuenta se creó correctamente!");
    } catch (err) {
      setError(getFirebaseError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }

    setProcessing(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(
        "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."
      );
    } catch (err) {
      setError(getFirebaseError(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMode("home");
      setActiveSection("inicio");
      setNotificationsOpen(false);
      setMessage("Has cerrado sesión correctamente.");
      setError("");
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    }
  };

  const navigateTo = (section) => {
    setActiveSection(section);
    setNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderMenu = () => (
    <section className="competition-menu">
      <div className="menu-top">
        <div className="menu-sponsor">
          <span>PRESENTED BY</span>
          <h2>LØs_ȺmigØs</h2>
        </div>

        <button
          className="menu-notifications"
          onClick={() => setNotificationsOpen((previous) => !previous)}
          aria-label="Abrir notificaciones"
        >
          🔔
        </button>
      </div>

      {notificationsOpen && (
        <div className="menu-notifications-panel">
          <div className="notifications-heading">
            <div>
              <h3>NOTIFICACIONES</h3>
              <p>CENTRO DE AVISOS</p>
            </div>

            <button
              onClick={() => setNotificationsOpen(false)}
              aria-label="Cerrar notificaciones"
            >
              ✕
            </button>
          </div>

          <div className="notifications-empty">
            Las notificaciones se mostrarán aquí.
          </div>

          <div className="notifications-footer">
            LIGA 4VS4 • SISTEMA DE AVISOS
          </div>
        </div>
      )}

      <div className="menu-section-heading">
        CENTRO DE COMPETICIÓN
      </div>

      <div className="competition-grid">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="competition-card"
            onClick={() => navigateTo(item.id)}
          >
            <span className="competition-card-number">
              {item.number}
            </span>

            <span className="competition-card-icon">
              {item.icon}
            </span>

            <span className="competition-card-title">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      <div className="championship-status">
        <span className="championship-status-dot"></span>
        <span>CAMPEONATO EN CURSO</span>
      </div>

      <div className="menu-footer">
        LIGA 4VS4 - 2026
      </div>
    </section>
  );

  const renderSectionPlaceholder = () => (
    <section className="web-section-placeholder">
      <span className="placeholder-label">
        CENTRO DE COMPETICIÓN
      </span>

      <h2>{sectionNames[activeSection]}</h2>

      <p>
        Este apartado se está preparando para conectarlo
        con los mismos datos de la aplicación Android.
      </p>

      <button
        className="primary-button"
        onClick={() => navigateTo("inicio")}
      >
        VOLVER AL MENÚ
      </button>
    </section>
  );

  return (
    <main className="app">
      {!user && (
        <header className="header">
          <div className="brand">
            <span className="brand-icon">L4</span>

            <div>
              <h1>LIGA4VS4</h1>
              <p>COMPETICIÓN OFICIAL</p>
            </div>
          </div>

          <div className="header-actions">
            {loading ? (
              <span className="header-status">CARGANDO...</span>
            ) : (
              <button
                className="login-button"
                onClick={() => openMode("login")}
              >
                INICIAR SESIÓN
              </button>
            )}
          </div>
        </header>
      )}

      {loading ? (
        <div className="loading-screen">
          <span className="brand-icon">L4</span>
          <p>CARGANDO LIGA4VS4...</p>
        </div>
      ) : user ? (
        <>
          <header className="logged-header">
            <div className="brand">
              <span className="brand-icon">L4</span>

              <div>
                <h1>LIGA4VS4</h1>
                <p>COMPETICIÓN OFICIAL</p>
              </div>
            </div>

            <button
              className="login-button"
              onClick={handleLogout}
            >
              CERRAR SESIÓN
            </button>
          </header>

          {activeSection === "inicio"
            ? renderMenu()
            : renderSectionPlaceholder()}

          <nav className="web-bottom-navigation">
            {bottomItems.map((item) => (
              <button
                key={item.id}
                className={
                  activeSection === item.id ? "active" : ""
                }
                onClick={() => navigateTo(item.id)}
              >
                <span>{item.icon}</span>
                <small>{item.label}</small>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <>
          <section className="hero">
            <div className="hero-label">
              <span className="live-dot"></span>
              PLATAFORMA OFICIAL
            </div>

            <h2>
              LA COMPETICIÓN
              <span> COMIENZA AQUÍ</span>
            </h2>

            <p>
              Sigue las jornadas, consulta los equipos
              y vive cada enfrentamiento de LIGA4VS4.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => openMode("login")}
              >
                ENTRAR AL CAMPEONATO
              </button>

              <button
                className="secondary-button"
                onClick={() => openMode("register")}
              >
                CREAR CUENTA
              </button>
            </div>
          </section>

          {message && (
            <div className="global-message success-message">
              {message}
              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {error && (
            <div className="global-message error-message">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          <section className="sections" id="explorar">
            <h3>UNA LIGA. UNA COMUNIDAD.</h3>

            <div className="section-grid">
              <article className="section-card">
                <span>01</span>
                <h4>CLASIFICACIÓN</h4>
                <p>Consulta las posiciones de los equipos.</p>
              </article>

              <article className="section-card">
                <span>02</span>
                <h4>ENFRENTAMIENTOS</h4>
                <p>Descubre los próximos partidos.</p>
              </article>

              <article className="section-card">
                <span>03</span>
                <h4>EQUIPOS</h4>
                <p>Conoce a los participantes.</p>
              </article>
            </div>
          </section>

          <footer>
            LIGA4VS4 OFICIAL © 2026
            <p>UNA LIGA. UNA COMUNIDAD.</p>
          </footer>
        </>
      )}

      {mode !== "home" && !user && (
        <div
          className="auth-overlay"
          onClick={() => openMode("home")}
        >
          <section
            className="auth-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="auth-close"
              onClick={() => openMode("home")}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="auth-logo">L4</div>

            <h2>
              {mode === "login" && "INICIAR SESIÓN"}
              {mode === "register" && "CREAR CUENTA"}
              {mode === "forgot" && "RECUPERAR CONTRASEÑA"}
            </h2>

            <p className="auth-description">
              {mode === "login" && "Accede a tu cuenta de LIGA4VS4."}
              {mode === "register" && "Únete a la comunidad oficial."}
              {mode === "forgot" &&
                "Te enviaremos instrucciones a tu correo."}
            </p>

            <form
              onSubmit={
                mode === "login"
                  ? handleLogin
                  : mode === "register"
                    ? handleRegister
                    : handlePasswordReset
              }
            >
              <label htmlFor="auth-email">
                CORREO ELECTRÓNICO
              </label>

              <input
                id="auth-email"
                type="email"
                placeholder="tu correo electrónico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />

              {mode !== "forgot" && (
                <>
                  <label htmlFor="auth-password">
                    CONTRASEÑA
                  </label>

                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    required
                  />
                </>
              )}

              {mode === "register" && (
                <>
                  <label htmlFor="auth-confirm">
                    CONFIRMAR CONTRASEÑA
                  </label>

                  <input
                    id="auth-confirm"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />
                </>
              )}

              {error && (
                <div className="auth-message error-message">
                  {error}
                </div>
              )}

              {message && (
                <div className="auth-message success-message">
                  {message}
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={processing}
              >
                {processing
                  ? "PROCESANDO..."
                  : mode === "login"
                    ? "ENTRAR"
                    : mode === "register"
                      ? "REGISTRARME"
                      : "ENVIAR INSTRUCCIONES"}
              </button>
            </form>

            <div className="auth-links">
              {mode === "login" && (
                <>
                  <button onClick={() => openMode("forgot")}>
                    ¿Olvidaste tu contraseña?
                  </button>

                  <p>
                    ¿No tienes cuenta?{" "}
                    <button onClick={() => openMode("register")}>
                      Regístrate
                    </button>
                  </p>
                </>
              )}

              {mode === "register" && (
                <p>
                  ¿Ya tienes cuenta?{" "}
                  <button onClick={() => openMode("login")}>
                    Inicia sesión
                  </button>
                </p>
              )}

              {mode === "forgot" && (
                <p>
                  <button onClick={() => openMode("login")}>
                    Volver al inicio de sesión
                  </button>
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
