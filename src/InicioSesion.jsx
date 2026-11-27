
import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./firebase";

export default function InicioSesion({
  mode,
  onModeChange,
  onUserChange
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (onUserChange) {
        onUserChange(currentUser);
      }
    });

    return () => unsubscribe();
  }, [onUserChange]);

  // =========================================
  // CREAR PERFIL DEL JUGADOR EN FIRESTORE
  // =========================================

  const createPlayerDocument = async (user) => {
    if (!user) {
      throw new Error("No se encontró el usuario de Firebase.");
    }

    const playerRef = doc(db, "jugadores", user.uid);

    // No sobrescribir perfiles que ya existen.
    const playerSnapshot = await getDoc(playerRef);

    if (playerSnapshot.exists()) {
      console.info(
        "[LIGA4VS4] El perfil del jugador ya existe:",
        user.uid
      );
      return;
    }

    const originalName =
      user.displayName?.trim() ||
      user.email?.split("@")[0] ||
      "NUEVO JUGADOR";

    await setDoc(playerRef, {
      uid: user.uid,
      correo: user.email || "",
      nombre: originalName,
      nombreOriginal: originalName,
      nick: "",
      equipo: "",
      estado: "PENDIENTE",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.info(
      "[LIGA4VS4] Perfil de jugador creado correctamente:",
      user.uid
    );
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setError("");
    setProcessing(false);
  };

  const openMode = (newMode) => {
    resetForm();

    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const closeModal = () => {
    resetForm();

    if (onModeChange) {
      onModeChange(null);
    }
  };

  // =========================================
  // ERRORES FIREBASE
  // =========================================

  const getFirebaseError = (errorCode) => {
    const errors = {
      "auth/invalid-email": "El correo electrónico no es válido.",
      "auth/user-not-found": "No existe una cuenta con ese correo.",
      "auth/wrong-password": "La contraseña es incorrecta.",
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/email-already-in-use": "Este correo ya está registrado.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/missing-password": "Debes ingresar una contraseña.",
      "auth/too-many-requests": "Demasiados intentos. Inténtalo más tarde.",
      "auth/network-request-failed": "Error de conexión. Revisa tu internet.",
      "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
      "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.",
      "auth/account-exists-with-different-credential": "Ya existe una cuenta con este correo usando otro método de acceso.",
      "auth/operation-not-allowed": "Este método de acceso todavía no está habilitado en Firebase.",
      "permission-denied": "Firebase no permite crear el perfil del jugador. Revisa las reglas de Firestore.",
      "firestore/permission-denied": "Firebase no permite crear el perfil del jugador. Revisa las reglas de Firestore."
    };

    return errors[errorCode] || "Ocurrió un error. Inténtalo nuevamente.";
  };

  // =========================================
  // INICIAR SESIÓN
  // =========================================

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Completa todos los campos.");
      return;
    }

    try {
      setProcessing(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      closeModal();
    } catch (error) {
      console.error("[LIGA4VS4] Error al iniciar sesión:", error);
      setError(getFirebaseError(error.code));
    } finally {
      setProcessing(false);
    }
  };

  // =========================================
  // REGISTRO CON CORREO Y CONTRASEÑA
  // =========================================

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setProcessing(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Crear también el documento en Firestore.
      await createPlayerDocument(credential.user);

      closeModal();
    } catch (error) {
      console.error("[LIGA4VS4] Error durante el registro:", error);

      if (
        error.code === "permission-denied" ||
        error.code === "firestore/permission-denied"
      ) {
        setError(
          "Tu cuenta se creó, pero no se pudo guardar tu perfil en Firestore. Contacta con el administrador."
        );
      } else {
        setError(getFirebaseError(error.code));
      }
    } finally {
      setProcessing(false);
    }
  };

  // =========================================
  // RECUPERAR CONTRASEÑA
  // =========================================

  const handlePasswordReset = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    try {
      setProcessing(true);

      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setMessage(
        "Te enviamos un correo con las instrucciones para recuperar tu contraseña."
      );
    } catch (error) {
      console.error("[LIGA4VS4] Error al recuperar contraseña:", error);
      setError(getFirebaseError(error.code));
    } finally {
      setProcessing(false);
    }
  };

  // =========================================
  // INICIAR SESIÓN / REGISTRARSE CON GOOGLE
  // =========================================

  const handleGoogleLogin = async () => {
    setError("");
    setMessage("");

    try {
      setProcessing(true);

      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(auth, provider);

      // Crear perfil solamente si Google acaba de crear
      // una cuenta nueva. No alterar perfiles existentes.
      const additionalInfo = getAdditionalUserInfo(result);

      if (additionalInfo?.isNewUser) {
        await createPlayerDocument(result.user);
      }

      closeModal();
    } catch (error) {
      console.error("[LIGA4VS4] Error con Google:", error);

      if (
        error.code === "permission-denied" ||
        error.code === "firestore/permission-denied"
      ) {
        setError(
          "Tu cuenta de Google se creó, pero no se pudo guardar tu perfil en Firestore. Contacta con el administrador."
        );
      } else {
        setError(getFirebaseError(error.code));
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!mode) {
    return null;
  }

  return (
    <>
      <style>{`
        .auth-google {
          position: relative;
          width: 100%;
          min-height: 54px;
          margin-top: 2px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid rgba(0, 220, 255, 0.55);
          border-radius: 12px;
          background:
            linear-gradient(115deg,
              rgba(0, 35, 53, 0.98),
              rgba(5, 15, 29, 0.98),
              rgba(0, 42, 61, 0.98));
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          cursor: pointer;
          transition:
            transform 0.22s ease,
            border-color 0.22s ease,
            box-shadow 0.22s ease,
            background 0.22s ease;
          box-shadow:
            0 0 12px rgba(0, 200, 255, 0.12),
            inset 0 0 12px rgba(0, 200, 255, 0.045);
        }

        .auth-google::before {
          content: "";
          position: absolute;
          z-index: -1;
          top: -80%;
          left: -65%;
          width: 45%;
          height: 260%;
          transform: rotate(25deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 220, 255, 0.18),
            rgba(255, 255, 255, 0.22),
            transparent
          );
          transition: left 0.65s ease;
        }

        .auth-google:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: #00e5ff;
          background:
            linear-gradient(115deg,
              rgba(0, 48, 69, 1),
              rgba(5, 20, 36, 1),
              rgba(0, 57, 76, 1));
          box-shadow:
            0 0 9px rgba(0, 220, 255, 0.38),
            0 0 24px rgba(0, 220, 255, 0.16),
            inset 0 0 15px rgba(0, 220, 255, 0.09);
        }

        .auth-google:hover:not(:disabled)::before {
          left: 125%;
        }

        .auth-google:active:not(:disabled) {
          transform: scale(0.975);
          box-shadow:
            0 0 18px rgba(0, 220, 255, 0.32),
            inset 0 0 15px rgba(0, 220, 255, 0.12);
        }

        .auth-google:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .auth-google-icon {
          width: 25px;
          height: 25px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.16);
        }

        .auth-google-icon svg {
          width: 17px;
          height: 17px;
          display: block;
        }

        .auth-google-text {
          position: relative;
          z-index: 1;
        }

        .auth-google-loader {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #00e5ff;
          border-radius: 50%;
          animation: authGoogleSpin 0.7s linear infinite;
        }

        @keyframes authGoogleSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 16px;
          color: rgba(190, 210, 225, 0.55);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 210, 255, 0.35),
            transparent
          );
        }
      `}</style>

      <div
        className="auth-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeModal();
          }
        }}
      >
        <div className="auth-card">

          <button
            type="button"
            className="auth-close"
            onClick={closeModal}
            disabled={processing}
          >
            ×
          </button>

          <div className="auth-logo">
            LIGA<span>4VS4</span>
          </div>

          <p className="auth-description">
            {mode === "login" && "Inicia sesión para continuar"}
            {mode === "register" && "Crea tu cuenta"}
            {mode === "forgot" && "Recupera tu contraseña"}
          </p>

          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message auth-success">
              {message}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin}>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={processing}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={processing}
              />

              <button
                type="submit"
                className="auth-submit"
                disabled={processing}
              >
                {processing ? "Iniciando sesión..." : "INICIAR SESIÓN"}
              </button>

            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister}>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={processing}
              />

              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={processing}
              />

              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={processing}
              />

              <button
                type="submit"
                className="auth-submit"
                disabled={processing}
              >
                {processing ? "Creando cuenta..." : "CREAR CUENTA"}
              </button>

            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handlePasswordReset}>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={processing}
              />

              <button
                type="submit"
                className="auth-submit"
                disabled={processing}
              >
                {processing ? "Enviando..." : "RECUPERAR CONTRASEÑA"}
              </button>

            </form>
          )}

          {(mode === "login" || mode === "register") && (
            <>
              <div className="auth-divider">
                <span>O CONTINÚA CON</span>
              </div>

              <button
                type="button"
                className="auth-google"
                onClick={handleGoogleLogin}
                disabled={processing}
              >
                {processing ? (
                  <span className="auth-google-loader" />
                ) : (
                  <span className="auth-google-icon">
                    <svg
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.77 7.18l7.73 6C44.41 37.85 46.98 31.7 46.98 24.55z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </span>
                )}

                <span className="auth-google-text">
                  {processing ? "CONECTANDO CON GOOGLE..." : "CONTINUAR CON GOOGLE"}
                </span>
              </button>
            </>
          )}

          <div className="auth-links">

            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => openMode("forgot")}
                  disabled={processing}
                >
                  ¿Olvidaste tu contraseña?
                </button>

                <p>
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => openMode("register")}
                    disabled={processing}
                  >
                    Regístrate
                  </button>
                </p>
              </>
            )}

            {mode === "register" && (
              <p>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => openMode("login")}
                  disabled={processing}
                >
                  Inicia sesión
                </button>
              </p>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => openMode("login")}
                disabled={processing}
              >
                Volver al inicio de sesión
              </button>
            )}

          </div>

        </div>
      </div>
    </>
  );
}
