
import React, { useEffect, useMemo, useState } from "react";

const DETALLES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=237931925&single=true&output=csv";

const CSV_CLASIFICACION_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=2025686865&single=true&output=csv";

const MAPAS = [
  { tipo: "PTO CALIENTE", mapa: "COMBINE" },
  { tipo: "BYD", mapa: "SLUM" },
  { tipo: "CONTROL", mapa: "RAID" },
  { tipo: "PTO CALIENTE", mapa: "TAKEOFF" },
  { tipo: "BYD", mapa: "STANDOFF" },
];

const COLORES = {
  fondo: "#05080F",
  tarjeta: "#0E1C2D",
  filtro: "#09111D",
  cian: "#00D9FF",
  secundario: "#A9BDCC",
  verde: "#00E696",
  dorado: "#FFCD32",
  borde: "#143E55",
};

/* =========================================
   POSICIONES DE CLASIFICACIÓN
========================================= */

const medalColors = {
  1: {
    background: "linear-gradient(145deg, #fff4a8, #d99b16)",
    color: "#583600",
    border: "2px solid #ffe58a",
    shadow: "0 0 12px rgba(255, 196, 35, 0.8)",
  },
  2: {
    background: "linear-gradient(145deg, #ffffff, #929eae)",
    color: "#263343",
    border: "2px solid #e6edf5",
    shadow: "0 0 12px rgba(210, 220, 235, 0.7)",
  },
  3: {
    background: "linear-gradient(145deg, #f6bd86, #a65328)",
    color: "#fff4e8",
    border: "2px solid #e9a36c",
    shadow: "0 0 12px rgba(205, 112, 55, 0.7)",
  },
};

function TeamPosition({ position }) {
  if (!position) return null;

  const medal = medalColors[position];

  return (
    <span
      aria-label={`Posición ${position}`}
      title={`Posición ${position}`}
      style={{
        position: "absolute",
        top: "-5px",
        right: "-5px",
        zIndex: 5,
        width: "31px",
        height: "31px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        fontSize: "14px",
        fontWeight: 1000,
        fontFamily: "Arial, sans-serif",
        background: medal
          ? medal.background
          : "linear-gradient(145deg, #263b50, #071522)",
        color: medal ? medal.color : "#ffffff",
        border: medal ? medal.border : "2px solid #00d9ff",
        boxShadow: medal
          ? medal.shadow
          : "0 0 10px rgba(0, 217, 255, 0.55)",
      }}
    >
      {position}
    </span>
  );
}

/* =========================================
   FUNCIONES GENERALES
========================================= */

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function normalizar(valor) {
  return limpiarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarEquipo(valor) {
  const texto = normalizar(valor);

  const equipos = {
    eternity: "ETERNITY",
    "2d": "2D",
    kings: "KINGS",
    lycoris: "Lycoris",
    "the butchers": "The Butchers",
    "the butcher": "The Butchers",
    nomercy: "NoMercy",
  };

  return equipos[texto] || limpiarTexto(valor);
}

function claveEquipo(valor) {
  return normalizar(normalizarEquipo(valor)).replace(/[\s_-]/g, "");
}

function numero(valor) {
  const texto = limpiarTexto(valor).replace(",", ".");
  if (!texto) return NaN;

  const resultado = Number(texto);
  return Number.isFinite(resultado) ? resultado : NaN;
}

function numeroEntero(valor) {
  const resultado = numero(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function extraerNumero(valor) {
  const coincidencia = String(valor ?? "").match(/\d+/);
  return coincidencia ? Number(coincidencia[0]) : NaN;
}

function leerCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroComillas = false;

  texto = String(texto ?? "").replace(/^\uFEFF/, "");

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    const siguiente = texto[i + 1];

    if (caracter === '"' && dentroComillas && siguiente === '"') {
      campo += '"';
      i++;
    } else if (caracter === '"') {
      dentroComillas = !dentroComillas;
    } else if (caracter === "," && !dentroComillas) {
      fila.push(campo);
      campo = "";
    } else if (
      (caracter === "\n" || caracter === "\r") &&
      !dentroComillas
    ) {
      if (caracter === "\r" && siguiente === "\n") i++;

      fila.push(campo);

      if (fila.some((celda) => limpiarTexto(celda) !== "")) {
        filas.push(fila);
      }

      fila = [];
      campo = "";
    } else {
      campo += caracter;
    }
  }

  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);

    if (fila.some((celda) => limpiarTexto(celda) !== "")) {
      filas.push(fila);
    }
  }

  return filas;
}

/* =========================================
   ESTADÍSTICAS DE MAPAS
========================================= */

function convertirDetalles(texto) {
  const filas = leerCSV(texto);

  if (!filas.length) return [];

  const primeraFila = filas[0].map(normalizar);
  const tieneEncabezado =
    primeraFila.includes("jornada") ||
    primeraFila.includes("jugador") ||
    primeraFila.includes("ganadormapa");

  const datos = tieneEncabezado ? filas.slice(1) : filas;

  return datos
    .filter((fila) => fila.length >= 12)
    .map((fila) => ({
      fecha: limpiarTexto(fila[0]),
      jornada: extraerNumero(fila[1]),
      partido: extraerNumero(fila[2]),
      mapa: limpiarTexto(fila[3]),
      jugador: limpiarTexto(fila[4]),
      equipo: normalizarEquipo(fila[5]),
      bajas: numeroEntero(fila[6]),
      muertes: numeroEntero(fila[7]),
      asistencias: numeroEntero(fila[8]),
      kd: numero(fila[9]),
      resultado: limpiarTexto(fila[10]),
      ganadorMapa: normalizarEquipo(fila[11]),
    }));
}

/* =========================================
   CLASIFICACIÓN OFICIAL
========================================= */

function convertirClasificacion(texto) {
  const filas = leerCSV(texto);

  if (!filas.length) return [];

  return filas
    .slice(1)
    .filter((fila) => fila.length >= 5 && limpiarTexto(fila[0]))
    .map((fila) => ({
      equipo: normalizarEquipo(fila[0]),
      pj: numeroEntero(fila[1]),
      pg: numeroEntero(fila[2]),
      pp: numeroEntero(fila[3]),
      pts: numeroEntero(fila[4]),
    }))
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.pg - a.pg ||
        b.pj - a.pj ||
        a.equipo.localeCompare(b.equipo, undefined, {
          sensitivity: "base",
        })
    );
}

function obtenerJornada(partido) {
  return extraerNumero(partido?.jornada);
}

function obtenerEquipo1(partido) {
  return normalizarEquipo(
    partido?.team1 ??
      partido?.equipo1 ??
      partido?.local ??
      partido?.equipoLocal ??
      ""
  );
}

function obtenerEquipo2(partido) {
  return normalizarEquipo(
    partido?.team2 ??
      partido?.equipo2 ??
      partido?.visitante ??
      partido?.equipoVisitante ??
      ""
  );
}

function obtenerMarcador1(partido) {
  return numero(
    partido?.score1 ??
      partido?.marcador1 ??
      partido?.puntos1 ??
      partido?.resultado1
  );
}

function obtenerMarcador2(partido) {
  return numero(
    partido?.score2 ??
      partido?.marcador2 ??
      partido?.puntos2 ??
      partido?.resultado2
  );
}

function partidoFinalizado(partido) {
  return (
    Number.isFinite(obtenerMarcador1(partido)) &&
    Number.isFinite(obtenerMarcador2(partido))
  );
}

function formatoKD(bajas, muertes) {
  if (muertes === 0) return bajas.toFixed(2);
  return (bajas / muertes).toFixed(2);
}

function calcularEstadisticasJugador(detalles, nombre) {
  const jugadorNormalizado = normalizar(nombre);

  const registros = detalles.filter(
    (dato) => normalizar(dato.jugador) === jugadorNormalizado
  );

  const bajas = registros.reduce((total, dato) => total + dato.bajas, 0);
  const muertes = registros.reduce((total, dato) => total + dato.muertes, 0);
  const asistencias = registros.reduce(
    (total, dato) => total + dato.asistencias,
    0
  );

  const mapasGanados = registros.filter(
    (dato) =>
      dato.ganadorMapa &&
      normalizar(dato.ganadorMapa) === normalizar(dato.equipo)
  ).length;

  const equipos = {};

  registros.forEach((dato) => {
    if (dato.equipo) {
      equipos[dato.equipo] = (equipos[dato.equipo] || 0) + 1;
    }
  });

  const equipoPrincipal =
    Object.entries(equipos).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Sin equipo";

  const mapasJugados = registros.length;

  return {
    bajas,
    muertes,
    asistencias,
    kd: formatoKD(bajas, muertes),
    mapasJugados,
    mapasGanados,
    porcentaje:
      mapasJugados > 0
        ? ((mapasGanados / mapasJugados) * 100).toFixed(1)
        : "0.0",
    equipoPrincipal,
  };
}

/* =========================================
   COMPONENTE PRINCIPAL
========================================= */

export default function UltimosResultados({
  matches = [],
  matchesLoading = false,
  matchesError = null,
  getTeamShield,
  openPlayerMenu,
}) {
  const [detalles, setDetalles] = useState([]);
  const [detallesLoading, setDetallesLoading] = useState(true);
  const [detallesError, setDetallesError] = useState("");

  const [clasificacion, setClasificacion] = useState([]);
  const [clasificacionLoading, setClasificacionLoading] = useState(true);

  const [jornadaSeleccionada, setJornadaSeleccionada] = useState("TODAS");
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);

  /* CARGAR ESTADÍSTICAS */

  useEffect(() => {
    let activo = true;

    const cargarDetalles = async () => {
      try {
        const respuesta = await fetch(DETALLES_CSV_URL, {
          cache: "no-store",
        });

        if (!respuesta.ok) {
          throw new Error("No se pudieron descargar las estadísticas.");
        }

        const texto = await respuesta.text();
        const datos = convertirDetalles(texto);

        if (activo) {
          setDetalles(datos);
          setDetallesError("");
        }
      } catch (error) {
        if (activo) {
          setDetallesError(
            error?.message || "Error al cargar las estadísticas."
          );
        }
      } finally {
        if (activo) setDetallesLoading(false);
      }
    };

    cargarDetalles();

    const intervalo = setInterval(cargarDetalles, 60000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  /* CARGAR CLASIFICACIÓN */

  useEffect(() => {
    let activo = true;

    const cargarClasificacion = async () => {
      try {
        const respuesta = await fetch(CSV_CLASIFICACION_URL, {
          cache: "no-store",
        });

        if (!respuesta.ok) {
          throw new Error("No se pudo cargar la clasificación.");
        }

        const texto = await respuesta.text();
        const datos = convertirClasificacion(texto);

        if (activo) {
          setClasificacion(datos);
        }
      } catch (error) {
        console.error("Error cargando clasificación para resultados:", error);
      } finally {
        if (activo) setClasificacionLoading(false);
      }
    };

    cargarClasificacion();

    const intervalo = setInterval(cargarClasificacion, 60000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  /* POSICIONES */

  const posicionesEquipos = useMemo(() => {
    const posiciones = {};

    clasificacion.forEach((equipo, indice) => {
      posiciones[claveEquipo(equipo.equipo)] = indice + 1;
    });

    return posiciones;
  }, [clasificacion]);

  const obtenerPosicionEquipo = (equipo) => {
    return posicionesEquipos[claveEquipo(equipo)] || null;
  };

  const partidosPreparados = useMemo(() => {
    const contadores = {};

    return (Array.isArray(matches) ? matches : []).map((partido, indice) => {
      const jornada = obtenerJornada(partido);
      const clave = Number.isFinite(jornada) ? jornada : 0;

      contadores[clave] = (contadores[clave] || 0) + 1;

      return {
        ...partido,
        _indiceOriginal: indice,
        _jornada: jornada,
        _numeroPartido: contadores[clave],
        _equipo1: obtenerEquipo1(partido),
        _equipo2: obtenerEquipo2(partido),
        _marcador1: obtenerMarcador1(partido),
        _marcador2: obtenerMarcador2(partido),
        _finalizado: partidoFinalizado(partido),
      };
    });
  }, [matches]);

  const partidosFinalizados = useMemo(
    () => partidosPreparados.filter((partido) => partido._finalizado),
    [partidosPreparados]
  );

  const jornadaInicial = useMemo(() => {
    const jornadas = [
      ...new Set(
        partidosPreparados
          .map((partido) => partido._jornada)
          .filter(Number.isFinite)
      ),
    ].sort((a, b) => b - a);

    const jornadaCompleta = jornadas.find((jornada) => {
      const partidos = partidosPreparados.filter(
        (partido) => partido._jornada === jornada
      );

      return partidos.length === 3 && partidos.every((p) => p._finalizado);
    });

    if (jornadaCompleta) return jornadaCompleta;

    const jornadaConResultado = partidosFinalizados
      .map((partido) => partido._jornada)
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];

    return jornadaConResultado ?? "TODAS";
  }, [partidosPreparados, partidosFinalizados]);

  useEffect(() => {
    setJornadaSeleccionada(jornadaInicial);
  }, [jornadaInicial]);

  const partidosVisibles = useMemo(() => {
    return partidosFinalizados.filter((partido) => {
      return (
        jornadaSeleccionada === "TODAS" ||
        partido._jornada === Number(jornadaSeleccionada)
      );
    });
  }, [partidosFinalizados, jornadaSeleccionada]);

  const jornadasDisponibles = useMemo(
    () => Array.from({ length: 15 }, (_, i) => i + 1),
    []
  );

  /* DETALLES DEL PARTIDO */

  const detallesDelPartido = useMemo(() => {
    if (!partidoSeleccionado) return [];

    const equiposDelEncuentro = [
      normalizarEquipo(partidoSeleccionado._equipo1),
      normalizarEquipo(partidoSeleccionado._equipo2),
    ].filter(Boolean);

    return detalles.filter((dato) => {
      const equipoDetalle = normalizarEquipo(dato.equipo);

      return (
        dato.jornada === partidoSeleccionado._jornada &&
        equiposDelEncuentro.some(
          (equipo) => claveEquipo(equipo) === claveEquipo(equipoDetalle)
        )
      );
    });
  }, [detalles, partidoSeleccionado]);

  const equiposDelMapa = useMemo(() => {
    if (!partidoSeleccionado) return [];

    return [
      partidoSeleccionado._equipo1,
      partidoSeleccionado._equipo2,
    ].filter(Boolean);
  }, [partidoSeleccionado]);

  const estadisticasJugador = useMemo(() => {
    if (!jugadorSeleccionado) return null;

    return calcularEstadisticasJugador(detalles, jugadorSeleccionado);
  }, [detalles, jugadorSeleccionado]);

  const abrirDetalle = (partido) => {
    setPartidoSeleccionado(partido);
    setJugadorSeleccionado(null);
  };

  const volverResultados = () => {
    setPartidoSeleccionado(null);
    setJugadorSeleccionado(null);
  };

  const abrirJugador = (nombre) => {
    setJugadorSeleccionado(nombre);
  };

  const cerrarJugador = () => {
    setJugadorSeleccionado(null);
  };

  const obtenerEscudo = (equipo) => {
    try {
      return getTeamShield?.(equipo) || "";
    } catch {
      return "";
    }
  };

  /* ESCUDOS CON POSICIÓN */

  const renderEquipoConPosicion = (equipo) => {
    const imagen = obtenerEscudo(equipo);
    const posicion = obtenerPosicionEquipo(equipo);

    return (
      <div className="ur-equipo-visual">
        <div className="ur-escudo-posicion">
          {imagen ? (
            <img
              src={imagen}
              alt={`Escudo ${equipo}`}
              className="ur-escudo-imagen"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="ur-escudo-fallback">
              {limpiarTexto(equipo).slice(0, 2).toUpperCase()}
            </span>
          )}

          <TeamPosition position={posicion} />
        </div>
      </div>
    );
  };

  const estilos = `
    .ur-contenedor {
      width: 100%;
      min-height: 300px;
      color: #ffffff;
      background: ${COLORES.fondo};
      padding: 20px 12px 35px;
      box-sizing: border-box;
      font-family: inherit;
      overflow: visible;
    }

    .ur-contenedor * {
      box-sizing: border-box;
    }

    .ur-filtro {
      background: ${COLORES.filtro};
      border: 1px solid ${COLORES.borde};
      border-radius: 14px;
      padding: 17px;
      margin-top: 20px;
      margin-bottom: 20px;
    }

    .ur-filtro-superior {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 13px;
    }

    .ur-filtro-titulo {
      color: #ffffff;
      font-size: 15px;
      font-weight: 1000;
      letter-spacing: .8px;
    }

    .ur-filtro-cantidad {
      color: ${COLORES.cian};
      font-size: 13px;
      font-weight: 900;
      letter-spacing: .5px;
    }

    .ur-select {
      width: 100%;
      min-height: 50px;
      background: #0E1C2D;
      color: white;
      border: 1px solid ${COLORES.borde};
      border-radius: 9px;
      padding: 0 13px;
      outline: none;
      font-size: 15px;
      font-weight: 900;
    }

    .ur-lista {
      display: flex;
      flex-direction: column;
      gap: 17px;
    }

    .ur-partido {
      width: 100%;
      text-align: left;
      border: 1px solid #17364B;
      border-radius: 15px;
      padding: 18px 12px;
      background: linear-gradient(145deg, #102238, #0A1523);
      color: white;
      cursor: pointer;
      transition: border-color .2s, transform .2s;
    }

    .ur-partido:active {
      transform: scale(.985);
      border-color: ${COLORES.cian};
    }

    .ur-partido-jornada {
      color: ${COLORES.cian};
      font-size: 14px;
      font-weight: 1000;
      letter-spacing: 1px;
      margin-bottom: 18px;
    }

    .ur-enfrentamiento {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
      align-items: center;
      gap: 5px;
    }

    .ur-equipo {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-width: 0;
    }

    .ur-equipo-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-width: 0;
    }

    .ur-escudo-posicion {
      position: relative;
      overflow: visible;
      flex-shrink: 0;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ur-escudo-imagen {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .ur-escudo-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${COLORES.cian};
      font-size: 23px;
      font-weight: 1000;
      text-align: center;
    }

    .ur-equipo-nombre {
      font-size: 15px;
      line-height: 1.35;
      font-weight: 1000;
      text-align: center;
      overflow-wrap: anywhere;
      max-width: 100%;
    }

    .ur-ganador {
      color: ${COLORES.cian};
    }

    .ur-marcador {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: white;
      font-size: 34px;
      font-weight: 1000;
      white-space: nowrap;
    }

    .ur-separador {
      color: ${COLORES.secundario};
      font-size: 23px;
    }

    .ur-etiqueta-resultado {
      text-align: center;
      color: ${COLORES.secundario};
      font-size: 12px;
      font-weight: 1000;
      letter-spacing: 1.3px;
      margin-top: 8px;
    }

    .ur-pie-partido {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      border-top: 1px solid rgba(140,165,185,.18);
      margin-top: 17px;
      padding-top: 13px;
    }

    .ur-estado {
      color: ${COLORES.verde};
      font-size: 12px;
      font-weight: 1000;
      letter-spacing: .5px;
    }

    .ur-detalle-link {
      color: ${COLORES.cian};
      font-size: 12px;
      font-weight: 1000;
      text-align: right;
    }

    .ur-victoria {
      color: ${COLORES.dorado};
      font-size: 12px;
      font-weight: 1000;
      margin-top: 5px;
    }

    .ur-vacio {
      background: ${COLORES.tarjeta};
      border: 1px solid ${COLORES.borde};
      border-radius: 13px;
      color: ${COLORES.secundario};
      padding: 30px 15px;
      text-align: center;
      font-size: 15px;
      font-weight: 900;
      line-height: 1.7;
    }

    .ur-cargando {
      color: ${COLORES.cian};
      text-align: center;
      padding: 28px 10px;
      font-size: 15px;
      font-weight: 900;
    }

    .ur-error {
      color: #FF7777;
      text-align: center;
      padding: 17px;
      font-size: 14px;
      font-weight: 800;
    }

    /* DESPLAZAMIENTO HORIZONTAL ENTRE LOS CINCO MAPAS */

    .ur-mapas-scroll {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      display: flex;
      align-items: stretch;
      gap: 14px;
      padding: 4px 2px 18px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: ${COLORES.cian} #102238;
      overscroll-behavior-x: contain;
    }

    .ur-mapa-card {
      flex: 0 0 88%;
      width: 88%;
      min-width: 88%;
      max-width: 500px;
      background: ${COLORES.tarjeta};
      border: 1px solid ${COLORES.borde};
      border-radius: 14px;
      padding: 14px 10px 20px;
      scroll-snap-align: start;
      align-self: flex-start;
      min-height: 100px;
    }

    .ur-mapa-encabezado {
      text-align: center;
      margin-bottom: 12px;
    }

    .ur-mapa-tipo {
      color: ${COLORES.cian};
      font-size: 12px;
      font-weight: 1000;
      letter-spacing: 1.4px;
    }

    .ur-mapa-nombre {
      color: white;
      font-size: 23px;
      font-weight: 1000;
      margin-top: 4px;
    }

    .ur-mapa-indicador {
      color: ${COLORES.secundario};
      font-size: 11px;
      font-weight: 900;
      margin-top: 4px;
    }

    .ur-ganador-mapa {
      color: ${COLORES.verde};
      text-align: center;
      font-size: 13px;
      font-weight: 1000;
      margin: 10px 0 14px;
    }

    .ur-equipo-tabla {
      margin-top: 13px;
    }

    .ur-equipo-tabla-titulo {
      color: ${COLORES.cian};
      font-size: 14px;
      font-weight: 1000;
      padding: 10px 2px;
      border-bottom: 1px solid ${COLORES.borde};
    }

    .ur-tabla-scroll {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .ur-tabla {
      width: 100%;
      min-width: 330px;
      border-collapse: collapse;
      font-size: 12px;
    }

    .ur-tabla th {
      color: ${COLORES.secundario};
      font-size: 11px;
      font-weight: 1000;
      padding: 11px 5px;
      text-align: center;
      white-space: nowrap;
    }

    .ur-tabla th:first-child,
    .ur-tabla td:first-child {
      text-align: left;
    }

    .ur-tabla td {
      border-top: 1px solid rgba(140,165,185,.15);
      color: white;
      padding: 12px 5px;
      text-align: center;
      font-weight: 900;
      white-space: nowrap;
    }

    .ur-jugador-boton {
      background: transparent;
      border: 0;
      color: ${COLORES.cian};
      font: inherit;
      font-size: 12px;
      font-weight: 1000;
      padding: 0;
      text-align: left;
      cursor: pointer;
      white-space: normal;
      max-width: 125px;
      overflow-wrap: anywhere;
    }

    .ur-sin-stats {
      color: ${COLORES.secundario};
      text-align: center;
      font-size: 13px;
      line-height: 1.7;
      padding: 25px 8px;
      font-weight: 900;
    }

    .ur-modal-fondo {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(0,0,0,.82);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
    }

    .ur-modal {
      width: 100%;
      max-width: 410px;
      max-height: 85vh;
      overflow-y: auto;
      background: #0B1725;
      border: 1px solid ${COLORES.borde};
      border-radius: 16px;
      padding: 21px;
      box-shadow: 0 15px 55px rgba(0,0,0,.5);
    }

    .ur-modal-titulo {
      color: ${COLORES.cian};
      text-align: center;
      font-size: 21px;
      font-weight: 1000;
      overflow-wrap: anywhere;
      margin: 0 0 6px;
    }

    .ur-modal-equipo {
      text-align: center;
      color: ${COLORES.secundario};
      font-size: 13px;
      font-weight: 900;
      margin-bottom: 18px;
    }

    .ur-estadisticas-grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 10px;
    }

    .ur-estadistica {
      background: #102238;
      border: 1px solid #19374D;
      border-radius: 10px;
      padding: 14px 8px;
      text-align: center;
    }

    .ur-estadistica-valor {
      color: ${COLORES.cian};
      font-size: 23px;
      font-weight: 1000;
    }

    .ur-estadistica-label {
      color: ${COLORES.secundario};
      font-size: 12px;
      font-weight: 1000;
      margin-top: 5px;
    }

    .ur-modal-cerrar {
      width: 100%;
      margin-top: 18px;
      padding: 14px;
      background: #0A3145;
      border: 1px solid ${COLORES.cian};
      color: ${COLORES.cian};
      border-radius: 9px;
      font-size: 14px;
      font-weight: 1000;
      cursor: pointer;
    }

    .ur-modal-perfil {
      width: 100%;
      margin-top: 10px;
      padding: 13px;
      background: transparent;
      border: 1px solid ${COLORES.borde};
      color: white;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 1000;
      cursor: pointer;
    }

    @media (max-width: 380px) {
      .ur-escudo-posicion {
        width: 88px;
        height: 88px;
      }

      .ur-equipo-nombre {
        font-size: 13px;
      }

      .ur-marcador {
        font-size: 29px;
      }

      .ur-mapa-card {
        flex-basis: 94%;
        min-width: 94%;
      }
    }

    @media (min-width: 700px) {
      .ur-contenedor {
        max-width: 1000px;
        margin: 0 auto;
        padding: 25px;
      }

      .ur-lista {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
        gap: 18px;
      }

      .ur-escudo-posicion {
        width: 115px;
        height: 115px;
      }

      .ur-mapa-card {
        flex-basis: 460px;
        min-width: 460px;
      }
    }
  `;

  /* =========================================
     VISTA DETALLE: CINCO MAPAS DESLIZABLES
  ========================================= */

  if (partidoSeleccionado) {
    return (
      <div className="ur-contenedor">
        <style>{estilos}</style>

        {detallesLoading ? (
          <div className="ur-cargando">
            CARGANDO ESTADÍSTICAS...
          </div>
        ) : detallesError ? (
          <div className="ur-error">{detallesError}</div>
        ) : detallesDelPartido.length === 0 ? (
          <div className="ur-sin-stats">
            NO SE ENCONTRARON ESTADÍSTICAS PARA ESTE ENCUENTRO.
          </div>
        ) : (
          <div className="ur-mapas-scroll">
            {MAPAS.map((mapa, indice) => {
              const detallesDelMapa = detallesDelPartido.filter(
                (dato) => dato.partido === indice + 1
              );

              const ganador = detallesDelMapa.find(
                (dato) => dato.ganadorMapa
              )?.ganadorMapa || "";

              return (
                <section className="ur-mapa-card" key={mapa.mapa}>
                  <div className="ur-mapa-encabezado">
                    <div className="ur-mapa-tipo">
                      {mapa.tipo}
                    </div>

                    <div className="ur-mapa-nombre">
                      {mapa.mapa}
                    </div>

                    <div className="ur-mapa-indicador">
                      MAPA {indice + 1} DE 5
                    </div>
                  </div>

                  {detallesDelMapa.length === 0 ? (
                    <div className="ur-sin-stats">
                      NO HAY ESTADÍSTICAS REGISTRADAS PARA ESTE MAPA.
                    </div>
                  ) : (
                    <>
                      {ganador && (
                        <div className="ur-ganador-mapa">
                          🏆 GANADOR: {ganador}
                        </div>
                      )}

                      {equiposDelMapa.map((equipo) => {
                        const jugadores = detallesDelMapa.filter(
                          (dato) =>
                            claveEquipo(dato.equipo) === claveEquipo(equipo)
                        );

                        if (!jugadores.length) return null;

                        return (
                          <div className="ur-equipo-tabla" key={equipo}>
                            <div className="ur-equipo-tabla-titulo">
                              {equipo}
                            </div>

                            <div className="ur-tabla-scroll">
                              <table className="ur-tabla">
                                <thead>
                                  <tr>
                                    <th>JUGADOR</th>
                                    <th>BAJAS</th>
                                    <th>MUERTES</th>
                                    <th>ASIST.</th>
                                    <th>K/D</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {jugadores.map((dato, jugadorIndice) => (
                                    <tr
                                      key={`${dato.jugador}-${jugadorIndice}`}
                                    >
                                      <td>
                                        <button
                                          className="ur-jugador-boton"
                                          onClick={() =>
                                            abrirJugador(dato.jugador)
                                          }
                                        >
                                          {dato.jugador}
                                        </button>
                                      </td>

                                      <td>{dato.bajas}</td>
                                      <td>{dato.muertes}</td>
                                      <td>{dato.asistencias}</td>
                                      <td>
                                        {Number.isFinite(dato.kd)
                                          ? dato.kd.toFixed(2)
                                          : formatoKD(
                                              dato.bajas,
                                              dato.muertes
                                            )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {jugadorSeleccionado && (
          <div
            className="ur-modal-fondo"
            onClick={cerrarJugador}
          >
            <div
              className="ur-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="ur-modal-titulo">
                {jugadorSeleccionado}
              </h3>

              <div className="ur-modal-equipo">
                ESTADÍSTICAS GENERALES
              </div>

              {estadisticasJugador && (
                <div className="ur-estadisticas-grid">
                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.bajas}
                    </div>
                    <div className="ur-estadistica-label">BAJAS</div>
                  </div>

                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.muertes}
                    </div>
                    <div className="ur-estadistica-label">MUERTES</div>
                  </div>

                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.asistencias}
                    </div>
                    <div className="ur-estadistica-label">ASISTENCIAS</div>
                  </div>

                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.kd}
                    </div>
                    <div className="ur-estadistica-label">K/D GLOBAL</div>
                  </div>

                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.mapasJugados}
                    </div>
                    <div className="ur-estadistica-label">MAPAS JUGADOS</div>
                  </div>

                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.mapasGanados}
                    </div>
                    <div className="ur-estadistica-label">MAPAS GANADOS</div>
                  </div>

                  <div className="ur-estadistica">
                    <div className="ur-estadistica-valor">
                      {estadisticasJugador.porcentaje}%
                    </div>
                    <div className="ur-estadistica-label">
                      VICTORIAS
                    </div>
                  </div>

                  <div className="ur-estadistica">
                    <div
                      className="ur-estadistica-valor"
                      style={{ fontSize: 15, paddingTop: 4 }}
                    >
                      {estadisticasJugador.equipoPrincipal}
                    </div>
                    <div className="ur-estadistica-label">
                      EQUIPO PRINCIPAL
                    </div>
                  </div>
                </div>
              )}

              <button
                className="ur-modal-cerrar"
                onClick={cerrarJugador}
              >
                CERRAR
              </button>

              {typeof openPlayerMenu === "function" && (
                <button
                  className="ur-modal-perfil"
                  onClick={() => {
                    const nombre = jugadorSeleccionado;
                    cerrarJugador();
                    volverResultados();
                    openPlayerMenu(nombre);
                  }}
                >
                  VER PERFIL DEL JUGADOR
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================
     VISTA PRINCIPAL: ENCUENTROS
  ========================================= */

  return (
    <div className="ur-contenedor">
      <style>{estilos}</style>

      {matchesLoading ? (
        <div className="ur-cargando">
          CARGANDO RESULTADOS...
        </div>
      ) : matchesError ? (
        <div className="ur-error">
          NO SE PUDIERON CARGAR LOS PARTIDOS.
        </div>
      ) : partidosPreparados.length === 0 ? (
        <div className="ur-vacio">
          NO HAY RESULTADOS DISPONIBLES.
        </div>
      ) : partidosVisibles.length === 0 ? (
        <div className="ur-vacio">
          NO HAY RESULTADOS FINALIZADOS EN ESTA JORNADA.
        </div>
      ) : (
        <div className="ur-lista">
          {partidosVisibles.map((partido) => {
            const ganaEquipo1 =
              partido._marcador1 > partido._marcador2;
            const ganaEquipo2 =
              partido._marcador2 > partido._marcador1;

            return (
              <button
                className="ur-partido"
                key={`${partido._jornada}-${partido._numeroPartido}-${partido._indiceOriginal}`}
                onClick={() => abrirDetalle(partido)}
              >
                <div className="ur-partido-jornada">
                  JORNADA {partido._jornada} · PARTIDO{" "}
                  {partido._numeroPartido}
                </div>

                <div className="ur-enfrentamiento">
                  <div className="ur-equipo">
                    {renderEquipoConPosicion(partido._equipo1)}

                    <div
                      className={`ur-equipo-nombre ${
                        ganaEquipo1 ? "ur-ganador" : ""
                      }`}
                    >
                      {partido._equipo1}

                      {ganaEquipo1 && (
                        <div className="ur-victoria">
                          🏆 VICTORIA
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="ur-marcador">
                      <span>{partido._marcador1}</span>
                      <span className="ur-separador">-</span>
                      <span>{partido._marcador2}</span>
                    </div>

                    <div className="ur-etiqueta-resultado">
                      RESULTADO
                    </div>
                  </div>

                  <div className="ur-equipo">
                    {renderEquipoConPosicion(partido._equipo2)}

                    <div
                      className={`ur-equipo-nombre ${
                        ganaEquipo2 ? "ur-ganador" : ""
                      }`}
                    >
                      {partido._equipo2}

                      {ganaEquipo2 && (
                        <div className="ur-victoria">
                          🏆 VICTORIA
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ur-pie-partido">
                  <span className="ur-estado">
                    ● FINALIZADO
                  </span>

                  <span className="ur-detalle-link">
                    TOCA PARA VER EL DETALLE ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FILTRO DE JORNADA DEBAJO DE LOS ENCUENTROS */}

      <div className="ur-filtro">
        <div className="ur-filtro-superior">
          <span className="ur-filtro-titulo">
            FILTRAR JORNADA
          </span>

          <span className="ur-filtro-cantidad">
            15 JORNADAS
          </span>
        </div>

        <select
          className="ur-select"
          value={jornadaSeleccionada}
          onChange={(event) =>
            setJornadaSeleccionada(event.target.value)
          }
        >
          <option value="TODAS">TODAS LAS JORNADAS</option>

          {jornadasDisponibles.map((jornada) => (
            <option key={jornada} value={String(jornada)}>
              JORNADA {jornada}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
