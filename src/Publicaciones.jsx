
import React, { useEffect, useState } from "react";
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
import Publicaciones from "./Publicaciones.jsx";

const MAX_PUBLICACIONES = 50;

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

function TarjetaPublicacion({ publicacion, perfil }) {
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
    </article>
  );
}

export default function Publicaciones() {
  const [usuario, setUsuario] = useState(auth.currentUser);
  const [publicaciones, setPublicaciones] = useState([]);
  const [perfiles, setPerfiles] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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

        setPublicaciones(lista);
        setCargando(false);
        setError("");

        // =====================================
        // CARGAR PERFILES PÚBLICOS DE AUTORES
        // =====================================

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

        setPerfiles(nuevosPerfiles);
      },
      (firebaseError) => {
        console.error(
          "Error al cargar publicaciones:",
          firebaseError
        );

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

    return () => unsubscribe();
  }, [usuario]);

  // =========================================
  // PANTALLA
  // =========================================

  return (
    <main className="publicaciones-page">

      <section className="publicaciones-heading">
        <div className="publicaciones-heading-label">
          <span className="publicaciones-heading-dot" />
          COMUNIDAD OFICIAL
        </div>

        <h1>
          JUGADAS <span>DESTACADAS</span>
        </h1>

        <p>
          LOS MEJORES MOMENTOS DE NUESTRA COMPETICIÓN.
        </p>
      </section>

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

        {!cargando && !error && publicaciones.map((publicacion) => (
          <TarjetaPublicacion
            key={publicacion.id}
            publicacion={publicacion}
            perfil={perfiles[publicacion.uid]}
          />
        ))}

      </section>

      <footer className="publicaciones-footer">
        LIGA4VS4 OFICIAL
        <span>UNA LIGA. UNA COMUNIDAD.</span>
      </footer>

    </main>
  );
}
