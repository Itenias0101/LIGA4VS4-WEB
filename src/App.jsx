
import React, { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";

import { auth, db } from "./firebase";

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

const formatNotificationDate = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
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

  // =========================================
  // NOTIFICACIONES FIRESTORE
  // =========================================

  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationAction, setNotificationAction] = useState(false);

  const unreadNotifications = notifications.filter(
    (notification) => notification.leida !== true
  ).length;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsLoading(false);
      setNotificationError("");
      return;
    }

    setNotificationsLoading(true);
    setNotificationError("");

    const notificationsRef = collection(
      db,
      "jugadores",
      user.uid,
      "notificaciones"
    );

    const notificationsQuery = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationList = snapshot.docs.map((notificationDoc) => ({
          id: notificationDoc.id,
          ...notificationDoc.data()
        }));

        setNotifications(notificationList);
        setNotificationsLoading(false);
        setNotificationError("");
      },
      (firebaseError) => {
        console.error(
          "Error al cargar las notificaciones:",
          firebaseError
        );

        setNotificationsLoading(false);
        setNotificationError(
          "No se pudieron cargar las notificaciones."
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  const markNotificationAsRead = async (notification) => {
    if (notification.leida === true || notificationAction) return;

    try {
      const notificationRef = doc(
        db,
        "jugadores",
        user.uid,
        "notificaciones",
        notification.id
      );

      await updateDoc(notificationRef, {
        leida: true,
        leidaAt: new Date()
      });
    } catch (err) {
      console.error("Error al marcar notificación:", err);
      setNotificationError(
        "No se pudo marcar la notificación como leída."
      );
    }
  };

  const deleteNotification = async (notificationId) => {
    if (notificationAction) return;

    const confirmed = window.confirm(
      "¿Deseas eliminar esta notificación?"
    );

    if (!confirmed) return;

    setNotificationAction(true);
    setNotificationError("");

    try {
      const notificationRef = doc(
        db,
        "jugadores",
        user.uid,
        "notificaciones",
        notificationId
      );

      await deleteDoc(notificationRef);
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
      setNotificationError(
        "No se pudo eliminar la notificación."
      );
    } finally {
      setNotificationAction(false);
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0 || notificationAction) return;

    const confirmed = window.confirm(
      "¿Deseas eliminar todas tus notificaciones? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    setNotificationAction(true);
    setNotificationError("");

    try {
      const notificationsRef = collection(
        db,
        "jugadores",
        user.uid,
        "notificaciones"
      );

      // Firestore permite hasta 500 operaciones por lote.
      // Se utilizan lotes de 450 para mantener un margen de seguridad.
      const chunks = [];

      for (let i = 0; i < notifications.length; i += 450) {
        chunks.push(notifications.slice(i, i + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);

        chunk.forEach((notification) => {
          const notificationRef = doc(
            notificationsRef,
            notification.id
          );

          batch.delete(notificationRef);
        });

        await batch.commit();
      }
    } catch (err) {
      console.error("Error al eliminar todas las notificaciones:", err);
      setNotificationError(
        "No se pudieron eliminar todas las notificaciones."
      );
    } finally {
      setNotificationAction(false);
    }
  };

  // =========================================
  // AUTENTICACIÓN
  // =========================================

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
      setNotifications([]);
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

  // =========================================
  // PANEL DE NOTIFICACIONES
  // =========================================

  const renderNotifications = () => (
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

      <div
        style={{
          height: "2px",
          background: "linear-gradient(90deg, #00D9FF, transparent)",
          margin: "10px 0"
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          gap: "8px"
        }}
      >
        <span
          style={{
            color: "#8EA6BA",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
          {unreadNotifications} SIN LEER
        </span>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={deleteAllNotifications}
            disabled={notificationAction}
            style={{
              background: "transparent",
              border: "none",
              color: "#FF6677",
              fontSize: "10px",
              fontWeight: "700",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            ELIMINAR TODAS
          </button>
        )}
      </div>

      <div
        style={{
          maxHeight: "245px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingRight: "3px"
        }}
      >
        {notificationsLoading && (
          <div className="notifications-empty">
            CARGANDO NOTIFICACIONES...
          </div>
        )}

        {!notificationsLoading &&
          !notificationError &&
          notifications.length === 0 && (
            <div className="notifications-empty">
              No tienes notificaciones todavía.
            </div>
          )}

        {notifications.map((notification) => {
          const unread = notification.leida !== true;

          return (
            <article
              key={notification.id}
              onClick={() => markNotificationAsRead(notification)}
              style={{
                background: unread ? "#102333" : "#09141E",
                border: `1px solid ${
                  unread ? "rgba(0,217,255,0.45)" : "rgba(142,166,186,0.16)"
                }`,
                borderRadius: "9px",
                padding: "10px",
                cursor: unread ? "pointer" : "default",
                position: "relative"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px"
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "5px"
                    }}
                  >
                    {unread && (
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          minWidth: "7px",
                          borderRadius: "50%",
                          background: "#00D9FF"
                        }}
                      />
                    )}

                    <strong
                      style={{
                        color: unread ? "#00D9FF" : "#B8C8D6",
                        fontSize: "12px",
                        overflowWrap: "anywhere"
                      }}
                    >
                      {notification.titulo || "AVISO DE LIGA4VS4"}
                    </strong>
                  </div>

                  <p
                    style={{
                      color: "#D0DCE5",
                      fontSize: "11px",
                      lineHeight: "1.5",
                      margin: "0",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere"
                    }}
                  >
                    {notification.mensaje || ""}
                  </p>

                  <small
                    style={{
                      display: "block",
                      color: "#71879A",
                      fontSize: "9px",
                      marginTop: "7px"
                    }}
                  >
                    {formatNotificationDate(notification.createdAt)}
                  </small>
                </div>

                <button
                  type="button"
                  aria-label="Eliminar notificación"
                  disabled={notificationAction}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#FF6677",
                    fontSize: "15px",
                    cursor: "pointer",
                    padding: "0 2px"
                  }}
                >
                  ×
                </button>
              </div>

              {unread && (
                <div
                  style={{
                    color: "#00D9FF",
                    fontSize: "9px",
                    fontWeight: "700",
                    marginTop: "7px"
                  }}
                >
                  TOCA PARA MARCAR COMO LEÍDA
                </div>
              )}
            </article>
          );
        })}
      </div>

      {notificationError && (
        <p
          style={{
            color: "#FF7B85",
            fontSize: "11px",
            textAlign: "center",
            margin: "8px 0"
          }}
        >
          {notificationError}
        </p>
      )}

      <div className="notifications-footer">
        LIGA 4VS4 • SISTEMA DE AVISOS
      </div>
    </div>
  );

  // =========================================
  // MENÚ PRINCIPAL
  // =========================================

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
          style={{ position: "relative" }}
        >
          🔔

          {unreadNotifications > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                minWidth: "18px",
                height: "18px",
                padding: "0 4px",
                borderRadius: "20px",
                background: "#FF354F",
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: "900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #05080D"
              }}
            >
              {unreadNotifications > 99
                ? "99+"
                : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {notificationsOpen && renderNotifications()}

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

  // =========================================
  // APARTADOS PROVISIONALES
  // =========================================

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

  // =========================================
  // INTERFAZ PRINCIPAL
  // =========================================

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
