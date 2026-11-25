
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
      setMessage("Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.");
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
      setMessage("Has cerrado sesión correctamente.");
      setError("");
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    }
  };

  const scrollToSections = () => {
    document.getElementById("explorar")?.scrollIntoView({
      behavior: "smooth"
    });
  };

  return (
    <main className="app">
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
          ) : user ? (
            <>
              <span className="user-email">
                {user.email}
              </span>
              <button className="login-button" onClick={handleLogout}>
                CERRAR SESIÓN
              </button>
            </>
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
            onClick={scrollToSections}
          >
            VER CLASIFICACIÓN
          </button>

          {!user && (
            <button
              className="secondary-button"
              onClick={() => openMode("register")}
            >
              CREAR CUENTA
            </button>
          )}
        </div>
      </section>

      {message && mode === "home" && (
        <div className="global-message success-message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {error && mode === "home" && (
        <div className="global-message error-message">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {user && (
        <section className="account-section">
          <div className="account-card">
            <span className="account-icon">✓</span>
            <div>
              <h3>SESIÓN ACTIVA</h3>
              <p>{user.email}</p>
            </div>
          </div>
        </section>
      )}

      <section className="sections" id="explorar">
        <h3>EXPLORA LA LIGA</h3>

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

      {mode !== "home" && (
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
              {mode === "forgot" && "Te enviaremos instrucciones a tu correo."}
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
              <label htmlFor="auth-email">CORREO ELECTRÓNICO</label>

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
                  <label htmlFor="auth-password">CONTRASEÑA</label>

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

      <footer>
        LIGA4VS4 OFICIAL © 2026
        <p>UNA LIGA. UNA COMUNIDAD.</p>
      </footer>
    </main>
  );
}
