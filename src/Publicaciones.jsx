
import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./firebase";
import "./Publicaciones.css";

const MAX_PUBLICACIONES = 50;
const MAX_COMENTARIO = 300;
const WORKER_URL = "https://liga4vs4-media-api.itenias01.workers.dev";

const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4"
];

const TIPOS_REACCION = [
  { tipo: "me_gusta", nombre: "Me gusta", emoji: "👍" },
  { tipo: "brutal", nombre: "Brutal", emoji: "🔥" },
  { tipo: "divertido", nombre: "Divertido", emoji: "😂" },
  { tipo: "impresionante", nombre: "Impresionante", emoji: "🤯" }
];

function obtenerIniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "L4";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function formatearFecha(fecha) {
  if (!fecha) return "RECIENTE";

  const date = fecha?.toDate ? fecha.toDate() : new Date(fecha);

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

// =========================================
// CREAR NOTIFICACIÓN INTERNA
// =========================================

async function crearNotificacionActividad({
  publicacion,
  usuario,
  nombreJugador,
  equipoJugador,
  tipo,
  interaccionId,
  textoComentario = "",
  nombreReaccion = ""
}) {
  if (!publicacion?.uid || !usuario?.uid) return;

  // No notificar al autor por sus propias interacciones.
  if (publicacion.uid === usuario.uid) return;

  if (!nombreJugador || !equipoJugador) {
    throw new Error("No se pudo identificar al jugador que interactuó.");
  }

  const esReaccion = tipo === "REACCION_PUBLICACION";

  const titulo = esReaccion
    ? "Nueva reacción en tu publicación"
    : "Nuevo comentario en tu publicación";

  const mensaje = esReaccion
    ? `${nombreJugador} · ${equipoJugador} reaccionó a tu publicación: ${nombreReaccion}.`
    : `${nombreJugador} · ${equipoJugador} comentó: "${textoComentario.slice(0, 180)}"`;

  const notificacionesRef = collection(
    db,
    "jugadores",
    publicacion.uid,
    "notificaciones"
  );

  await addDoc(notificacionesRef, {
    titulo,
    mensaje,
    createdAt: serverTimestamp(),
    leida: false,
    tipo,
    actorUid: usuario.uid,
    actorNick: nombreJugador,
    actorEquipo: equipoJugador,
    publicacionId: publicacion.id,
    interaccionId
  });
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

// =========================================
// REACCIONES Y COMENTARIOS
// =========================================

function PublicacionInteracciones({
  publicacion,
  usuario,
  jugadorAsignado,
  esAdmin,
  nombreJugador,
  equipoJugador
}) {
  const [reacciones, setReacciones] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [textoComentario, setTextoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [reaccionando, setReaccionando] = useState(false);
  const [eliminandoComentarioId, setEliminandoComentarioId] = useState("");
  const [errorInteraccion, setErrorInteraccion] = useState("");
  const [mensajeInteraccion, setMensajeInteraccion] = useState("");
  const [mostrarComentarios, setMostrarComentarios] = useState(false);

  const comentarioRef = useRef(null);

  useEffect(() => {
    if (!usuario || !publicacion?.id) {
      setReacciones([]);
      return;
    }

    const reaccionesRef = collection(
      db,
      "publicaciones",
      publicacion.id,
      "reacciones"
    );

    const unsubscribe = onSnapshot(
      reaccionesRef,
      (snapshot) => {
        setReacciones(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
          }))
        );
      },
      (error) => {
        console.error("Error al escuchar reacciones:", error);
        setErrorInteraccion("No se pudieron cargar las reacciones.");
      }
    );

    return () => unsubscribe();
  }, [usuario, publicacion.id]);

  useEffect(() => {
    if (!usuario || !publicacion?.id) {
      setComentarios([]);
      return;
    }

    const comentariosRef = collection(
      db,
      "publicaciones",
      publicacion.id,
      "comentarios"
    );

    const comentariosQuery = query(
      comentariosRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      comentariosQuery,
      (snapshot) => {
        setComentarios(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
          }))
        );
      },
      (error) => {
        console.error("Error al escuchar comentarios:", error);
        setErrorInteraccion("No se pudieron cargar los comentarios.");
      }
    );

    return () => unsubscribe();
  }, [usuario, publicacion.id]);

  const miReaccion = reacciones.find(
    (reaccion) => reaccion.uid === usuario?.uid
  );

  const puedeInteractuar = Boolean(usuario && jugadorAsignado);

  // =========================================
  // REGISTRAR, CAMBIAR O RETIRAR REACCIÓN
  // =========================================

  const gestionarReaccion = async (tipo) => {
    if (!usuario || !jugadorAsignado || reaccionando) return;

    setErrorInteraccion("");
    setMensajeInteraccion("");
    setReaccionando(true);

    try {
      const reaccionRef = doc(
        db,
        "publicaciones",
        publicacion.id,
        "reacciones",
        usuario.uid
      );

      if (miReaccion?.tipo === tipo) {
        await deleteDoc(reaccionRef);
      } else {
        const eraPrimeraReaccion = !miReaccion;

        const datosReaccion = {
          uid: usuario.uid,
          nombre: nombreJugador || usuario.displayName || "JUGADOR",
          tipo,
          updatedAt: serverTimestamp()
        };

        if (eraPrimeraReaccion) {
          datosReaccion.createdAt = serverTimestamp();
        }

        await setDoc(reaccionRef, datosReaccion, { merge: true });

        // Solo se notifica al crear la primera reacción.
        // Cambiar el tipo de reacción no genera otro aviso.
        if (
          eraPrimeraReaccion &&
          publicacion.uid !== usuario.uid
        ) {
          const reaccionSeleccionada = TIPOS_REACCION.find(
            (item) => item.tipo === tipo
          );

          try {
            await crearNotificacionActividad({
              publicacion,
              usuario,
              nombreJugador,
              equipoJugador,
              tipo: "REACCION_PUBLICACION",
              interaccionId: usuario.uid,
              nombreReaccion: reaccionSeleccionada?.nombre || tipo
            });
          } catch (errorNotificacion) {
            console.error(
              "La reacción se guardó, pero no se pudo crear la notificación:",
              errorNotificacion
            );

            setMensajeInteraccion(
              "Reacción guardada. No se pudo enviar el aviso al buzón."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error al guardar reacción:", error);

      setErrorInteraccion(
        error.code === "permission-denied"
          ? "Firebase no permite registrar esta reacción. Revisa las reglas de Firestore."
          : "No se pudo guardar tu reacción. Inténtalo nuevamente."
      );
    } finally {
      setReaccionando(false);
    }
  };

  // =========================================
  // PUBLICAR COMENTARIO
  // =========================================

  const publicarComentario = async (event) => {
    event.preventDefault();

    if (!usuario || !jugadorAsignado || enviandoComentario) return;

    const texto = textoComentario.trim();

    if (!texto) {
      setErrorInteraccion("Escribe un comentario antes de enviarlo.");
      return;
    }

    if (texto.length > MAX_COMENTARIO) {
      setErrorInteraccion(
        "El comentario no puede superar los 300 caracteres."
      );
      return;
    }

    setErrorInteraccion("");
    setMensajeInteraccion("");
    setEnviandoComentario(true);

    try {
      const comentariosRef = collection(
        db,
        "publicaciones",
        publicacion.id,
        "comentarios"
      );

      const comentarioCreado = await addDoc(comentariosRef, {
        uid: usuario.uid,
        nombre: nombreJugador || usuario.displayName || "JUGADOR",
        texto,
        createdAt: serverTimestamp()
      });

      setTextoComentario("");
      setMostrarComentarios(true);
      setMensajeInteraccion("Comentario publicado.");

      if (publicacion.uid !== usuario.uid) {
        try {
          await crearNotificacionActividad({
            publicacion,
            usuario,
            nombreJugador,
            equipoJugador,
            tipo: "COMENTARIO_PUBLICACION",
            interaccionId: comentarioCreado.id,
            textoComentario: texto
          });
        } catch (errorNotificacion) {
          console.error(
            "El comentario se guardó, pero no se pudo crear la notificación:",
            errorNotificacion
          );

          setMensajeInteraccion(
            "Comentario publicado. No se pudo enviar el aviso al buzón."
          );
        }
      }
    } catch (error) {
      console.error("Error al publicar comentario:", error);

      setErrorInteraccion(
        error.code === "permission-denied"
          ? "Firebase no permite publicar comentarios. Revisa las reglas de Firestore."
          : "No se pudo publicar el comentario. Inténtalo nuevamente."
      );
    } finally {
      setEnviandoComentario(false);
    }
  };

  // =========================================
  // ELIMINAR COMENTARIO
  // =========================================

  const eliminarComentario = async (comentario) => {
    if (!usuario || !comentario?.id) return;

    const esAutor = comentario.uid === usuario.uid;

    if (!esAutor && !esAdmin) return;

    if (!window.confirm("¿Deseas eliminar este comentario?")) return;

    setErrorInteraccion("");
    setMensajeInteraccion("");
    setEliminandoComentarioId(comentario.id);

    try {
      const comentarioRef = doc(
        db,
        "publicaciones",
        publicacion.id,
        "comentarios",
        comentario.id
      );

      await deleteDoc(comentarioRef);
      setMensajeInteraccion("Comentario eliminado.");
    } catch (error) {
      console.error("Error al eliminar comentario:", error);

      setErrorInteraccion(
        error.code === "permission-denied"
          ? "No tienes permiso para eliminar este comentario según las reglas de Firestore."
          : "No se pudo eliminar el comentario."
      );
    } finally {
      setEliminandoComentarioId("");
    }
  };

  const totalReacciones = reacciones.length;

  const resumenReacciones = TIPOS_REACCION.map((tipo) => ({
    ...tipo,
    cantidad: reacciones.filter(
      (reaccion) => reaccion.tipo === tipo.tipo
    ).length
  })).filter((tipo) => tipo.cantidad > 0);

  return (
    <section className="publicacion-interacciones">
      <div className="publicacion-resumen-interacciones">
        <div className="publicacion-resumen-reacciones">
          {resumenReacciones.length > 0 ? (
            <>
              <span className="publicacion-reacciones-emojis">
                {resumenReacciones.map((reaccion) => (
                  <span key={reaccion.tipo}>{reaccion.emoji}</span>
                ))}
              </span>
              <span>
                {totalReacciones}{" "}
                {totalReacciones === 1 ? "reacción" : "reacciones"}
              </span>
            </>
          ) : (
            <span>Sé el primero en reaccionar</span>
          )}
        </div>

        <button
          type="button"
          className="publicacion-comentarios-contador"
          onClick={() => setMostrarComentarios((actual) => !actual)}
        >
          {comentarios.length}{" "}
          {comentarios.length === 1 ? "comentario" : "comentarios"}
        </button>
      </div>

      <div className="publicacion-reacciones">
        {TIPOS_REACCION.map((reaccion) => {
          const activa = miReaccion?.tipo === reaccion.tipo;

          return (
            <button
              key={reaccion.tipo}
              type="button"
              className={`publicacion-reaccion-btn ${activa ? "activa" : ""}`}
              onClick={() => gestionarReaccion(reaccion.tipo)}
              disabled={!puedeInteractuar || reaccionando}
              title={
                puedeInteractuar
                  ? reaccion.nombre
                  : "Necesitas ser un jugador asignado para reaccionar"
              }
              aria-pressed={activa}
            >
              <span>{reaccion.emoji}</span>
              <span>{reaccion.nombre}</span>
            </button>
          );
        })}
      </div>

      {!usuario && (
        <p className="publicacion-interaccion-aviso">
          Inicia sesión para reaccionar y comentar.
        </p>
      )}

      {usuario && !jugadorAsignado && (
        <p className="publicacion-interaccion-aviso">
          Solo los jugadores asignados pueden reaccionar y comentar.
        </p>
      )}

      <button
        type="button"
        className="publicacion-toggle-comentarios"
        onClick={() => setMostrarComentarios((actual) => !actual)}
      >
        <span>💬</span>
        {mostrarComentarios ? "OCULTAR COMENTARIOS" : "VER COMENTARIOS"}
        <span className="publicacion-toggle-flecha">
          {mostrarComentarios ? "▲" : "▼"}
        </span>
      </button>

      {mostrarComentarios && (
        <div className="publicacion-comentarios">
          {comentarios.length === 0 ? (
            <div className="publicacion-comentarios-vacio">
              Todavía no hay comentarios. ¡Inicia la conversación!
            </div>
          ) : (
            <div className="publicacion-lista-comentarios">
              {comentarios.map((comentario) => {
                const esAutor = comentario.uid === usuario?.uid;
                const puedeEliminarComentario = Boolean(esAutor || esAdmin);

                return (
                  <article
                    key={comentario.id}
                    className="publicacion-comentario"
                  >
                    <div className="publicacion-comentario-avatar">
                      {obtenerIniciales(comentario.nombre || "JUGADOR")}
                    </div>

                    <div className="publicacion-comentario-contenido">
                      <div className="publicacion-comentario-cabecera">
                        <strong>{comentario.nombre || "JUGADOR"}</strong>
                        <span>{formatearFecha(comentario.createdAt)}</span>
                      </div>

                      <p>{comentario.texto}</p>

                      {puedeEliminarComentario && (
                        <button
                          type="button"
                          className="publicacion-comentario-eliminar"
                          disabled={eliminandoComentarioId === comentario.id}
                          onClick={() => eliminarComentario(comentario)}
                        >
                          {eliminandoComentarioId === comentario.id
                            ? "ELIMINANDO..."
                            : "ELIMINAR"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {puedeInteractuar && (
            <form
              className="publicacion-comentario-form"
              onSubmit={publicarComentario}
            >
              <textarea
                ref={comentarioRef}
                value={textoComentario}
                onChange={(event) =>
                  setTextoComentario(
                    event.target.value.slice(0, MAX_COMENTARIO)
                  )
                }
                placeholder="Escribe un comentario..."
                maxLength={MAX_COMENTARIO}
                rows={2}
                disabled={enviandoComentario}
              />

              <div className="publicacion-comentario-form-footer">
                <span>
                  {textoComentario.length}/{MAX_COMENTARIO}
                </span>

                <button
                  type="submit"
                  disabled={
                    enviandoComentario || !textoComentario.trim()
                  }
                >
                  {enviandoComentario
                    ? "ENVIANDO..."
                    : "PUBLICAR COMENTARIO"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {mensajeInteraccion && (
        <p className="publicacion-interaccion-exito">
          {mensajeInteraccion}
        </p>
      )}

      {errorInteraccion && (
        <p className="publicacion-interaccion-error">
          {errorInteraccion}
        </p>
      )}
    </section>
  );
}

// =========================================
// TARJETA DE PUBLICACIÓN
// =========================================

function TarjetaPublicacion({
  publicacion,
  perfil,
  puedeEliminar,
  eliminando,
  onEliminar,
  usuario,
  jugadorAsignado,
  esAdmin,
  nombreJugador,
  equipoJugador,
  onAmpliarImagen
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
            onClick={() => onAmpliarImagen({
              url: publicacion.mediaUrl,
              alt: `Jugada destacada de ${nombre}`
            })}
            role="button"
            tabIndex={0}
            title="Toca para ampliar la imagen"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onAmpliarImagen({
                  url: publicacion.mediaUrl,
                  alt: `Jugada destacada de ${nombre}`
                });
              }
            }}
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

      <PublicacionInteracciones
        publicacion={publicacion}
        usuario={usuario}
        jugadorAsignado={jugadorAsignado}
        esAdmin={esAdmin}
        nombreJugador={nombreJugador}
        equipoJugador={equipoJugador}
      />

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

// =========================================
// COMPONENTE PRINCIPAL
// =========================================

export default function Publicaciones() {
  const [usuario, setUsuario] = useState(auth.currentUser);
  const [publicaciones, setPublicaciones] = useState([]);
  const [perfiles, setPerfiles] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [jugadorAsignado, setJugadorAsignado] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);
  const [nombreJugador, setNombreJugador] = useState("");
  const [equipoJugador, setEquipoJugador] = useState("");

  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState("");
  const [mensajeAccion, setMensajeAccion] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const archivoRef = useRef(null);

  // =========================================
  // CERRAR VISOR CON ESCAPE
  // =========================================

  useEffect(() => {
    if (!imagenAmpliada) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const manejarTecla = (event) => {
      if (event.key === "Escape") {
        setImagenAmpliada(null);
      }
    };

    window.addEventListener("keydown", manejarTecla);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", manejarTecla);
    };
  }, [imagenAmpliada]);

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
      setNombreJugador("");
      setEquipoJugador("");
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

          const asignado =
            jugador.estado === "ASIGNADO" &&
            Boolean(jugador.nick?.trim()) &&
            Boolean(jugador.equipo?.trim());

          setJugadorAsignado(asignado);

          if (asignado) {
            setNombreJugador(jugador.nick.trim());
            setEquipoJugador(jugador.equipo.trim());
          }
        }

        if (adminSnapshot.exists()) {
          setEsAdmin(adminSnapshot.data().activo === true);
        }
      } catch (permisoError) {
        console.error("Error al comprobar permisos:", permisoError);

        if (activo) {
          setJugadorAsignado(false);
          setEsAdmin(false);
          setNombreJugador("");
          setEquipoJugador("");
        }
      } finally {
        if (activo) setCargandoPermisos(false);
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
            lista.map((publicacion) => publicacion.uid).filter(Boolean)
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

        if (componenteActivo) setPerfiles(nuevosPerfiles);
      },
      (firebaseError) => {
        console.error("Error al cargar publicaciones:", firebaseError);

        if (!componenteActivo) return;

        setCargando(false);

        setError(
          firebaseError.code === "permission-denied"
            ? "Firebase no permite consultar las publicaciones con esta sesión."
            : "No se pudieron cargar las jugadas destacadas. Comprueba tu conexión."
        );
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
      console.error("Error al publicar jugada:", publicacionError);

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
      console.error("Error al eliminar publicación:", eliminacionError);

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
            <div className="publicaciones-vacio-icon">🎥</div>
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

          const puedeEliminar = Boolean(esPropietario || esAdmin);

          return (
            <TarjetaPublicacion
              key={publicacion.id}
              publicacion={publicacion}
              perfil={perfiles[publicacion.uid]}
              puedeEliminar={puedeEliminar}
              eliminando={eliminandoId === publicacion.id}
              onEliminar={eliminarPublicacion}
              usuario={usuario}
              jugadorAsignado={jugadorAsignado}
              esAdmin={esAdmin}
              nombreJugador={nombreJugador}
              equipoJugador={equipoJugador}
              onAmpliarImagen={setImagenAmpliada}
            />
          );
        })}
      </section>

      <footer className="publicaciones-footer">
        LIGA4VS4 OFICIAL
        <span>UNA LIGA. UNA COMUNIDAD.</span>
      </footer>

      {/* VISOR DE IMAGEN A PANTALLA COMPLETA */}

      {imagenAmpliada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
          onClick={() => setImagenAmpliada(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "52px 12px 18px",
            cursor: "zoom-out"
          }}
        >
          <button
            type="button"
            aria-label="Cerrar imagen ampliada"
            onClick={() => setImagenAmpliada(null)}
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              width: "42px",
              height: "42px",
              border: "1px solid rgba(0,220,255,.65)",
              borderRadius: "50%",
              background: "rgba(8,18,29,.9)",
              color: "#00dcff",
              fontSize: "26px",
              lineHeight: 1,
              cursor: "pointer"
            }}
          >
            ×
          </button>

          <img
            src={imagenAmpliada.url}
            alt={imagenAmpliada.alt}
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              borderRadius: "5px",
              cursor: "default",
              boxShadow: "0 0 35px rgba(0,220,255,.12)"
            }}
          />
        </div>
      )}
    </main>
  );
}
