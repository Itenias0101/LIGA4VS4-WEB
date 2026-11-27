
import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

import { auth } from "./firebase";

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

  // =========================================
  // ESCUCHAR EL ESTADO DE AUTENTICACIÓN
  // =========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (onUserChange) {
        onUserChange(currentUser);
      }
    });

    return () => unsubscribe();
  }, [onUserChange]);

  // =========================================
  // LIMPIAR FORMULARIOS
  // =========================================

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
  // TRADUCIR ERRORES DE FIREBASE
  // =========================================

  const getFirebaseError = (errorCode) => {
    const errors = {
      "auth/invalid-email":
        "El correo electrónico no es válido.",

      "auth/user-not-found":
        "No existe una cuenta con ese correo.",

      "auth/wrong-password":
        "La contraseña es incorrecta.",

      "auth/invalid-credential":
        "Correo o contraseña incorrectos.",

      "auth/email-already-in-use":
        "Este correo ya está registrado.",

      "auth/weak-password":
        "La contraseña debe tener al menos 6 caracteres.",

      "auth/missing-password":
        "Debes ingresar una contraseña.",

      "auth/too-many-requests":
        "Demasiados intentos. Inténtalo más tarde.",

      "auth/network-request-failed":
        "Error de conexión. Revisa tu internet.",

      "auth/popup-closed-by-user":
        "Cerraste la ventana de Google antes de terminar.",

      "auth/popup-blocked":
        "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.",

      "auth/account-exists-with-different-credential":
        "Ya existe una cuenta con este correo usando otro método de acceso.",

      "auth/operation-not-allowed":
        "Este método de acceso todavía no está habilitado en Firebase."
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
      setError(getFirebaseError(error.code));
    } finally {
      setProcessing(false);
    }
  };

  // =========================================
  // REGISTRAR CUENTA
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

      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      closeModal();
    } catch (error) {
      setError(getFirebaseError(error.code));
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
      setError(getFirebaseError(error.code));
    } finally {
      setProcessing(false);
    }
  };

  // =========================================
  // INICIAR SESIÓN CON GOOGLE
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

      await signInWithPopup(auth, provider);

      closeModal();
    } catch (error) {
      setError(getFirebaseError(error.code));
    } finally {
      setProcessing(false);
    }
  };

  // =========================================
  // SI NO HAY MODAL ABIERTO
  // =========================================

  if (!mode) {
    return null;
  }

  // =========================================
  // INTERFAZ DE AUTENTICACIÓN
  // =========================================

  return (
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

        {/* INICIO DE SESIÓN */}

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

        {/* REGISTRO */}

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

        {/* RECUPERACIÓN DE CONTRASEÑA */}

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

        {/* ACCESO CON GOOGLE */}

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
              <span>G</span>
              Continuar con Google
            </button>
          </>
        )}

        {/* ENLACES */}

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
  );
}
