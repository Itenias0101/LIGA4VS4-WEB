
import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";

import { auth, db } from "./firebase";
import "./Publicaciones.css";

const MAX_PUBLICACIONES = 50;
const WORKER_URL = "https://liga4vs4-media-api.itenias01.workers.dev";

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4"
];

function obtenerIniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "L4";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function formatearFecha(fecha) {
  if (!fecha) return "RECIENTE";

  const date = fecha?.toDate
    ? fecha.toDate()
    : new Date(fecha);

  if (Number.isNaN(date.getTime())) return "RECIENTE";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatearTamano(bytes = 0) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function llamarWorker(body, token) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const resultado = await response.json().catch(() => ({}));

  if (!response.ok || !resultado.success) {
    throw new Error(
      resultado.error ||
      resultado.message ||
      "No se pudo completar la operación."
    );
  }

  return resultado;
}

function AvatarJugador({ nombre, foto }) {
  const [fotoError, setFotoError] = useState(false);

  useEffect(() => {
    setFotoError(false);
  }, [foto]);

  if (foto && !fotoError) {
    return (
      <img
        className="publicacion-avatar"
        src={foto}
        alt={`Perfil de ${nombre}`}
        onError={() => setFotoError(true)}
      />
    );
  }

  return (
    <div className="publicacion-avatar publicacion-avatar-fallback">
      {obtenerIniciales(nombre)}
    </div>
  );
}

function TarjetaPublicacion({
  publicacion,
  perfil,
  puedeEliminar,
  eliminando,
  onEliminar
}) {
  const nombre =
    publicacion.nick ||
    publicacion.nombre ||
    "JUGADOR";

  const equipo = publicacion.equipo || "SIN EQUIPO";
  const esVideo = publicacion.mediaType === "video/mp4";

  return (
    <article className="publicacion-card">

      <div className="publicacion-card-header">

        <AvatarJugador
          nombre={nombre}
          foto={perfil?.fotoPerfil}
        />

        <div className="publicacion-autor">
          <strong>{nombre}</strong>
          <span>{equipo}</span>
        </div>

        <div className="publicacion-fecha">
          {formatearFecha(publicacion.createdAt)}
        </div>

      </div>

      {publicacion.descripcion && (
        <p className="publicacion-descripcion">
          {publicacion.descripcion}
        </p>
      )}

      <div className="publicacion-media">

        {esVideo ? (
          <video
            src={publicacion.mediaUrl}
            controls
            playsInline
            preload="metadata"
          >
            Tu navegador no puede reproducir este video.
          </video>
        ) : (
          <img
            src={publicacion.mediaUrl}
            alt={`Jugada destacada de ${nombre}`}
            loading="lazy"
          />
        )}

        {esVideo && (
          <span className="publicacion-media-label">
            VIDEO DESTACADO
          </span>
        )}

      </div>

      <div className="publicacion-card-footer">
        <span className="publicacion-footer-icon">◈</span>
        <span>JUGADA DESTACADA</span>
        <span className="publicacion-footer-brand">LIGA4VS4</span>
      </div>

      {puedeEliminar && (
        <div className="publicacion-acciones">

          <button
            type="button"
            className="publicacion-btn-eliminar"
            disabled={eliminando}
            onClick={() => onEliminar(publicacion)}
          >
            <span className="publicacion-eliminar-icon">⌫</span>
            <span>
              {eliminando ? "ELIMINANDO..." : "ELIMINAR PUBLICACIÓN"}
            </span>
          </button>

        </div>
      )}

    </article>
  );
}

export default function Publicaciones() {

  const [usuario, setUsuario] = useState(auth.currentUser);

  const [publicaciones, setPublicaciones] = useState([]);
  const [perfiles, setPerfiles] = useState({});

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [jugadorAsignado, setJugadorAsignado] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);

  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);

  const [publicando, setPublicando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState("");
  const [mensajeAccion, setMensajeAccion] = useState("");
  const [errorAccion, setErrorAccion] = useState("");

  const archivoRef = useRef(null);

  // =========================================
  // ESCUCHAR SESIÓN DE FIREBASE
  // =========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUsuario(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // =========================================
  // COMPROBAR PERMISOS DEL USUARIO
  // =========================================

  useEffect(() => {

    let activo = true;

    async function comprobarPermisos() {

      setJugadorAsignado(false);
      setEsAdmin(false);
      setCargandoPermisos(true);

      if (!usuario) {
        setCargandoPermisos(false);
        return;
      }

      try {

        const jugadorRef = doc(db, "jugadores", usuario.uid);
        const adminRef = doc(db, "administradores", usuario.uid);

        const [jugadorSnapshot, adminSnapshot] = await Promise.all([
          getDoc(jugadorRef),
          getDoc(adminRef)
        ]);

        if (!activo) return;

        if (jugadorSnapshot.exists()) {
          const jugador = jugadorSnapshot.data();

          setJugadorAsignado(
            jugador.estado === "ASIGNADO" &&
            Boolean(jugador.nick?.trim()) &&
            Boolean(jugador.equipo?.trim())
          );
        }

        if (adminSnapshot.exists()) {
          const administrador = adminSnapshot.data();

          setEsAdmin(administrador.activo === true);
        }

      } catch (permisoError) {

        console.error(
          "Error al comprobar permisos:",
          permisoError
        );

        if (activo) {
          setJugadorAsignado(false);
          setEsAdmin(false);
        }

      } finally {

        if (activo) {
          setCargandoPermisos(false);
        }

      }
    }

    comprobarPermisos();

    return () => {
      activo = false;
    };

  }, [usuario]);

  // =========================================
  // CARGAR PUBLICACIONES EN TIEMPO REAL
  // =========================================

  useEffect(() => {

    if (!usuario) {
      setPublicaciones([]);
      setPerfiles({});
      setCargando(false);
      setError("");
      return;
    }

    let componenteActivo = true;

    setCargando(true);
    setError("");

    const publicacionesRef = collection(db, "publicaciones");

    const publicacionesQuery = query(
      publicacionesRef,
      orderBy("createdAt", "desc"),
      limit(MAX_PUBLICACIONES)
    );

    const unsubscribe = onSnapshot(
      publicacionesQuery,

      async (snapshot) => {

        const lista = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data()
        }));

        if (!componenteActivo) return;

        setPublicaciones(lista);
        setCargando(false);
        setError("");

        const uids = [
          ...new Set(
            lista
              .map((publicacion) => publicacion.uid)
              .filter(Boolean)
          )
        ];

        const nuevosPerfiles = {};

        await Promise.all(
          uids.map(async (uid) => {

            try {
              const perfilRef = doc(db, "perfiles_publicos", uid);
              const perfilSnapshot = await getDoc(perfilRef);

              if (perfilSnapshot.exists()) {
                nuevosPerfiles[uid] = perfilSnapshot.data();
              }

            } catch (perfilError) {

              console.warn(
                "No se pudo cargar el perfil público:",
                uid,
                perfilError
              );

            }

          })
        );

        if (componenteActivo) {
          setPerfiles(nuevosPerfiles);
        }

      },

      (firebaseError) => {

        console.error(
          "Error al cargar publicaciones:",
          firebaseError
        );

        if (!componenteActivo) return;

        setCargando(false);

        if (firebaseError.code === "permission-denied") {
          setError(
            "Firebase no permite consultar las publicaciones con esta sesión."
          );
        } else {
          setError(
            "No se pudieron cargar las jugadas destacadas. Comprueba tu conexión."
          );
        }

      }
    );

    return () => {
      componenteActivo = false;
      unsubscribe();
    };

  }, [usuario]);

  // =========================================
  // SELECCIONAR ARCHIVO
  // =========================================

  const seleccionarArchivo = (event) => {

    const seleccionado = event.target.files?.[0];

    setErrorAccion("");
    setMensajeAccion("");

    if (!seleccionado) {
      setArchivo(null);
      return;
    }

    if (!TIPOS_PERMITIDOS.includes(seleccionado.type)) {
      setArchivo(null);
      event.target.value = "";

      setErrorAccion(
        "Formato no permitido. Selecciona JPEG, PNG, WEBP o MP4."
      );

      return;
    }

    const esVideo = seleccionado.type === "video/mp4";
    const limite = esVideo
      ? 80 * 1024 * 1024
      : 15 * 1024 * 1024;

    if (seleccionado.size <= 0 || seleccionado.size > limite) {
      setArchivo(null);
      event.target.value = "";

      setErrorAccion(
        esVideo
          ? "El video no puede superar los 80 MB."
          : "La imagen no puede superar los 15 MB."
      );

      return;
    }

    setArchivo(seleccionado);
  };

  // =========================================
  // PUBLICAR JUGADA DESTACADA
  // =========================================

  const publicarJugada = async (event) => {

    event.preventDefault();

    setErrorAccion("");
    setMensajeAccion("");

    if (!usuario) {
      setErrorAccion("Debes iniciar sesión para publicar.");
      return;
    }

    if (!jugadorAsignado) {
      setErrorAccion(
        "Solo los jugadores asignados pueden publicar jugadas."
      );
      return;
    }

    if (!archivo) {
      setErrorAccion("Selecciona una imagen o un video.");
      return;
    }

    if (descripcion.trim().length > 500) {
      setErrorAccion(
        "La descripción no puede superar los 500 caracteres."
      );
      return;
    }

    setPublicando(true);

    try {

      const token = await usuario.getIdToken();

      // Primero se sube el archivo a R2.

      const subidaResponse = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": archivo.type
        },
        body: archivo
      });

      const subida = await subidaResponse.json().catch(() => ({}));

      if (!subidaResponse.ok || !subida.success) {
        throw new Error(
          subida.error ||
          subida.message ||
          "No se pudo subir el archivo."
        );
      }

      // Después se registra la publicación en Firestore
      // mediante el Worker.

      await llamarWorker(
        {
          action: "createPublication",
          descripcion: descripcion.trim(),
          mediaUrl: subida.url,
          mediaType: subida.type
        },
        token
      );

      setDescripcion("");
      setArchivo(null);

      if (archivoRef.current) {
        archivoRef.current.value = "";
      }

      setMensajeAccion(
        "¡Tu jugada destacada se publicó correctamente!"
      );

    } catch (publicacionError) {

      console.error(
        "Error al publicar jugada:",
        publicacionError
      );

      setErrorAccion(
        publicacionError.message ||
        "No se pudo publicar la jugada."
      );

    } finally {

      setPublicando(false);

    }
  };

  // =========================================
  // ELIMINAR PUBLICACIÓN
  // =========================================

  const eliminarPublicacion = async (publicacion) => {

    if (!usuario || !publicacion?.id) return;

    const esPropietario = publicacion.uid === usuario.uid;

    if (!esPropietario && !esAdmin) {
      setErrorAccion(
        "No tienes permiso para eliminar esta publicación."
      );
      return;
    }

    const confirmar = window.confirm(
      "¿Estás seguro de eliminar esta jugada destacada? También se eliminarán sus comentarios y reacciones."
    );

    if (!confirmar) return;

    setErrorAccion("");
    setMensajeAccion("");
    setEliminandoId(publicacion.id);

    try {

      const token = await usuario.getIdToken();

      await llamarWorker(
        {
          action: "deletePublication",
          publicationId: publicacion.id
        },
        token
      );

      setMensajeAccion(
        "La publicación y su contenido asociado fueron eliminados."
      );

    } catch (eliminacionError) {

      console.error(
        "Error al eliminar publicación:",
        eliminacionError
      );

      setErrorAccion(
        eliminacionError.message ||
        "No se pudo eliminar la publicación."
      );

    } finally {

      setEliminandoId("");

    }
  };

  // =========================================
  // PANTALLA PRINCIPAL
  // =========================================

  return (
    <main className="publicaciones-page">

      {/* =====================================
          FORMULARIO DE PUBLICACIÓN
      ===================================== */}

      {usuario && jugadorAsignado && (

        <section className="publicaciones-composer">

          <div className="publicaciones-composer-header">

            <div className="publicaciones-composer-icon">
              <span>▶</span>
            </div>

            <div className="publicaciones-composer-titulo">
              <span className="publicaciones-composer-etiqueta">
                COMUNIDAD · LIGA4VS4
              </span>

              <h2>COMPARTE TU JUGADA</h2>

              <p>
                Publica tu mejor momento en la competición.
              </p>
            </div>

          </div>

          <form onSubmit={publicarJugada}>

            <div className="publicaciones-textarea-contenedor">

              <textarea
                className="publicaciones-descripcion-input"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Describe tu jugada... (opcional)"
                maxLength={500}
                rows={3}
                disabled={publicando}
              />

              <div className="publicaciones-contador">
                <span>{descripcion.length}</span>/500
              </div>

            </div>

            <input
              ref={archivoRef}
              id="archivo-jugada"
              className="publicaciones-archivo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              onChange={seleccionarArchivo}
              disabled={publicando}
            />

            <div className="publicaciones-composer-actions">

              <label
                className="publicaciones-seleccionar-archivo"
                htmlFor="archivo-jugada"
                onClick={(event) => {
                  event.preventDefault();

                  if (!publicando) {
                    archivoRef.current?.click();
                  }
                }}
              >
                <span className="publicaciones-icono-adjuntar">＋</span>
                <span>SELECCIONAR ARCHIVO</span>
              </label>

              <button
                type="submit"
                className="publicaciones-btn-publicar"
                disabled={publicando || !archivo}
              >
                {publicando ? (
                  <>
                    <span className="publicaciones-mini-spinner" />
                    PUBLICANDO...
                  </>
                ) : (
                  <>
                    <span>↑</span>
                    PUBLICAR JUGADA
                  </>
                )}
              </button>

            </div>

            {archivo && (
              <div className="publicaciones-archivo-seleccionado">

                <div className="publicaciones-archivo-icono">
                  {archivo.type === "video/mp4" ? "▶" : "▧"}
                </div>

                <div className="publicaciones-archivo-info">
                  <span className="publicaciones-archivo-nombre">
                    {archivo.name}
                  </span>

                  <span className="publicaciones-archivo-peso">
                    {formatearTamano(archivo.size)}
                  </span>
                </div>

                <button
                  type="button"
                  className="publicaciones-quitar-archivo"
                  aria-label="Quitar archivo seleccionado"
                  onClick={() => {
                    setArchivo(null);

                    if (archivoRef.current) {
                      archivoRef.current.value = "";
                    }
                  }}
                  disabled={publicando}
                >
                  ✕
                </button>

              </div>
            )}

            <div className="publicaciones-limites">
              <span>ⓘ</span>
              IMÁGENES: MÁX. 15 MB
              <i />
              VIDEOS MP4: MÁX. 80 MB
            </div>

          </form>

        </section>

      )}

      {usuario && !cargandoPermisos && !jugadorAsignado && (
        <div className="publicaciones-aviso-permisos">
          <span>🔒</span>
          <p>
            La publicación está habilitada únicamente para jugadores asignados.
          </p>
        </div>
      )}

      {!usuario && (
        <div className="publicaciones-aviso-permisos">
          <span>🔒</span>
          <p>
            Inicia sesión para acceder a las opciones de publicación.
          </p>
        </div>
      )}

      {mensajeAccion && (
        <div className="publicaciones-mensaje-exito">
          <span>✓</span>
          {mensajeAccion}
        </div>
      )}

      {errorAccion && (
        <div className="publicaciones-mensaje-error">
          <span>!</span>
          {errorAccion}
        </div>
      )}

      {/* =====================================
          FEED DE PUBLICACIONES
      ===================================== */}

      <section className="publicaciones-feed">

        {cargando && (
          <div className="publicaciones-estado">
            <span className="publicaciones-spinner" />
            <p>CARGANDO JUGADAS...</p>
          </div>
        )}

        {!cargando && error && (
          <div className="publicaciones-estado publicaciones-error">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {!cargando && !error && publicaciones.length === 0 && (
          <div className="publicaciones-vacio">

            <div className="publicaciones-vacio-icon">
              🎥
            </div>

            <h2>EL FEED ESTÁ VACÍO</h2>

            <p>
              Todavía no hay jugadas destacadas.
              Cuando los jugadores publiquen sus mejores
              momentos, aparecerán aquí.
            </p>

            <span>PRÓXIMAMENTE · LIGA4VS4</span>

          </div>
        )}

        {!cargando && !error && publicaciones.map((publicacion) => {

          const esPropietario =
            usuario && publicacion.uid === usuario.uid;

          const puedeEliminar =
            Boolean(esPropietario || esAdmin);

          return (
            <TarjetaPublicacion
              key={publicacion.id}
              publicacion={publicacion}
              perfil={perfiles[publicacion.uid]}
              puedeEliminar={puedeEliminar}
              eliminando={eliminandoId === publicacion.id}
              onEliminar={eliminarPublicacion}
            />
          );
        })}

      </section>

      <footer className="publicaciones-footer">
        LIGA4VS4 OFICIAL
        <span>UNA LIGA. UNA COMUNIDAD.</span>
      </footer>

    </main>
  );
}
