
import React, { useEffect, useMemo, useState } from "react";

const DETALLES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=237931925&single=true&output=csv";

const MAPAS = [
  { nombre: "PTO CALIENTE", subtitulo: "COMBINE" },
  { nombre: "BYD", subtitulo: "SLUM" },
  { nombre: "CONTROL", subtitulo: "RAID" },
  { nombre: "PTO CALIENTE", subtitulo: "TAKEOFF" },
  { nombre: "BYD", subtitulo: "STANDOFF" },
];

const C = {
  fondo: "#05080F",
  azul: "#0E1C2D",
  panel: "#09111D",
  cian: "#00D9FF",
  secundario: "#8CA5B9",
  borde: "#143E55",
  verde: "#00E6AA",
  rojo: "#FF9182",
  dorado: "#FFCD41",
  blanco: "#FFFFFF",
};

const normalizar = (valor) =>
  String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

const numero = (valor) => {
  const n = Number(String(valor ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const nombreJugador = (jugador) => {
  if (typeof jugador === "string") return jugador.trim();

  return String(
    jugador?.player ??
    jugador?.jugador ??
    jugador?.nombre ??
    jugador?.name ??
    ""
  ).trim();
};

const nombreEquipoJugador = (jugador) => {
  if (typeof jugador === "string") return "";

  return String(
    jugador?.team ??
    jugador?.equipo ??
    jugador?.teamName ??
    ""
  ).trim();
};

const jornadaPartido = (partido) =>
  Number(
    partido?.jornada ??
    partido?.Jornada ??
    partido?.matchday ??
    partido?.fecha ??
    0
  );

const marcadorValido = (valor) => {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return false;
  }

  return Number.isFinite(Number(valor));
};

const estaFinalizado = (partido) =>
  marcadorValido(partido?.score1) &&
  marcadorValido(partido?.score2);

const normalizarEquipoOficial = (nombre) => {
  const clave = normalizar(nombre);

  const equipos = {
    eternity: "ETERNITY",
    "2d": "2D",
    kings: "KINGS",
    lycoris: "Lycoris",
    "the butchers": "The Butchers",
    nomercy: "NoMercy",
  };

  return equipos[clave] || String(nombre ?? "").trim();
};

const parsearCSV = (texto) => {
  const filas = [];
  let fila = [];
  let campo = "";
  let comillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];

    if (
      caracter === '"' &&
      comillas &&
      texto[i + 1] === '"'
    ) {
      campo += '"';
      i++;
    } else if (caracter === '"') {
      comillas = !comillas;
    } else if (caracter === "," && !comillas) {
      fila.push(campo);
      campo = "";
    } else if (
      (caracter === "\n" || caracter === "\r") &&
      !comillas
    ) {
      if (caracter === "\r" && texto[i + 1] === "\n") i++;

      fila.push(campo);

      if (fila.some((valor) => valor.trim() !== "")) {
        filas.push(fila);
      }

      fila = [];
      campo = "";
    } else {
      campo += caracter;
    }
  }

  if (campo.length || fila.length) {
    fila.push(campo);

    if (fila.some((valor) => valor.trim() !== "")) {
      filas.push(fila);
    }
  }

  return filas;
};

const convertirDetalles = (contenido) => {
  const filas = parsearCSV(contenido.replace(/^\uFEFF/, ""));

  return filas.slice(1).filter((fila) => fila.length >= 12).map((fila) => ({
    fecha: fila[0]?.trim() ?? "",
    jornada: fila[1]?.trim() ?? "",
    partido: fila[2]?.trim() ?? "",
    mapa: fila[3]?.trim() ?? "",
    jugador: fila[4]?.trim() ?? "",
    equipo: normalizarEquipoOficial(fila[5]),
    bajas: fila[6]?.trim() ?? "",
    muertes: fila[7]?.trim() ?? "",
    asistencias: fila[8]?.trim() ?? "",
    kd: fila[9]?.trim() ?? "",
    resultado: fila[10]?.trim() ?? "",
    ganadorMapa: normalizarEquipoOficial(fila[11]),
  }));
};

const extraerNumero = (valor) => {
  const encontrado = String(valor ?? "").match(/\d+/);
  return encontrado ? Number(encontrado[0]) : 0;
};

const estilos = `
  .ur-contenedor {
    width: 100%;
    min-height: 200px;
    padding: 18px 14px 28px;
    box-sizing: border-box;
    color: ${C.blanco};
    background: ${C.fondo};
    font-family: Arial, Helvetica, sans-serif;
  }

  .ur-titulo {
    margin: 12px 0 22px;
    color: ${C.cian};
    text-align: center;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 1px;
    text-shadow: 0 0 12px rgba(0,217,255,.3);
  }

  .ur-filtro {
    padding: 15px;
    margin-bottom: 22px;
    background: ${C.panel};
    border: 1px solid ${C.borde};
    border-radius: 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,.25);
  }

  .ur-filtro-encabezado {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 14px;
  }

  .ur-linea-cian {
    width: 4px;
    height: 19px;
    flex-shrink: 0;
    border-radius: 5px;
    background: ${C.cian};
  }

  .ur-etiqueta {
    flex: 1;
    color: ${C.cian};
    font-size: 13px;
    font-weight: 900;
    letter-spacing: .7px;
  }

  .ur-cantidad {
    color: ${C.secundario};
    font-size: 10px;
    font-weight: 800;
  }

  .ur-selector {
    width: 100%;
    min-height: 53px;
    padding: 0 14px;
    color: white;
    background: #081320;
    border: 1px solid #00AAD7;
    border-radius: 11px;
    outline: none;
    font-size: 13px;
    font-weight: 900;
  }

  .ur-selector option {
    color: white;
    background: #070F1A;
  }

  .ur-tarjeta {
    padding: 16px 12px;
    margin-bottom: 16px;
    overflow: hidden;
    background: linear-gradient(145deg, #0E1C2D, #091522);
    border: 1px solid #008CB4;
    border-radius: 16px;
    box-shadow: 0 5px 16px rgba(0,0,0,.35);
    transition: border-color .2s, transform .2s;
  }

  .ur-tarjeta:active {
    transform: scale(.995);
    border-color: ${C.cian};
  }

  .ur-jornada {
    color: ${C.cian};
    text-align: center;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: .8px;
  }

  .ur-enfrentamiento {
    display: grid;
    grid-template-columns: minmax(0,1fr) 100px minmax(0,1fr);
    align-items: center;
    gap: 3px;
    padding: 17px 0;
  }

  .ur-equipo {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .ur-escudo {
    width: 85px;
    height: 85px;
    object-fit: contain;
    filter: drop-shadow(0 0 7px rgba(0,217,255,.15));
  }

  .ur-nombre-equipo {
    margin-top: 7px;
    font-size: 12px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ur-victoria {
    color: ${C.cian};
  }

  .ur-marcador {
    text-align: center;
    font-size: 25px;
    font-weight: 1000;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .ur-marcador-etiqueta {
    margin-top: 5px;
    color: ${C.cian};
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .ur-estado {
    margin-top: 4px;
    color: ${C.verde};
    text-align: center;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .8px;
  }

  .ur-instruccion {
    margin-top: 12px;
    color: ${C.secundario};
    text-align: center;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .6px;
  }

  .ur-boton-volver {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 8px;
    margin-bottom: 15px;
    color: ${C.cian};
    background: transparent;
    border: none;
    font-size: 14px;
    font-weight: 900;
    text-align: left;
    cursor: pointer;
  }

  .ur-boton-volver span {
    font-size: 34px;
    line-height: 20px;
  }

  .ur-detalle-titulo {
    margin: 7px 0 15px;
    color: ${C.cian};
    text-align: center;
    font-size: 16px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ur-ayuda-deslizar {
    margin: 0 0 13px;
    color: ${C.secundario};
    text-align: center;
    font-size: 10px;
    font-weight: 800;
  }

  .ur-indicador-mapa {
    margin-bottom: 12px;
    color: ${C.cian};
    text-align: center;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .5px;
  }

  .ur-scroll-mapas {
    display: flex;
    gap: 10px;
    width: 100%;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: thin;
    scrollbar-color: ${C.cian} #0A1826;
    padding-bottom: 8px;
  }

  .ur-scroll-mapas::-webkit-scrollbar {
    height: 4px;
  }

  .ur-scroll-mapas::-webkit-scrollbar-thumb {
    background: ${C.cian};
    border-radius: 5px;
  }

  .ur-pagina-mapa {
    flex: 0 0 100%;
    min-width: 0;
    min-height: 450px;
    padding: 15px 10px;
    box-sizing: border-box;
    background: #091320;
    border: 1px solid #008CB4;
    border-radius: 15px;
    scroll-snap-align: start;
  }

  .ur-mapa-nombre {
    margin: 3px 0;
    color: ${C.cian};
    text-align: center;
    font-size: 22px;
    font-weight: 1000;
  }

  .ur-mapa-subtitulo {
    margin-bottom: 16px;
    color: ${C.secundario};
    text-align: center;
    font-size: 13px;
    font-weight: 900;
  }

  .ur-ganador {
    padding: 11px 8px;
    margin-bottom: 14px;
    text-align: center;
    background: #0C2B30;
    border: 1px solid #00B496;
    border-radius: 10px;
  }

  .ur-ganador-etiqueta {
    color: ${C.secundario};
    font-size: 10px;
    font-weight: 900;
  }

  .ur-ganador-nombre {
    margin-top: 5px;
    color: ${C.verde};
    font-size: 17px;
    font-weight: 900;
  }

  .ur-tabla {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 5px;
    table-layout: fixed;
  }

  .ur-tabla th {
    padding: 10px 2px;
    color: ${C.cian};
    background: #10283A;
    font-size: 9px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ur-tabla th:first-child {
    border-radius: 7px 0 0 7px;
    width: 34%;
  }

  .ur-tabla th:last-child {
    border-radius: 0 7px 7px 0;
  }

  .ur-tabla td {
    padding: 12px 2px;
    color: white;
    background: #0C1927;
    text-align: center;
    font-size: 10px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .ur-tabla td:first-child {
    text-align: left;
    padding-left: 5px;
    color: ${C.cian};
  }

  .ur-tabla tr td:first-child {
    border-radius: 6px 0 0 6px;
  }

  .ur-tabla tr td:last-child {
    border-radius: 0 6px 6px 0;
  }

  .ur-jugador-boton {
    padding: 0;
    color: ${C.cian};
    background: transparent;
    border: none;
    text-align: left;
    font-size: 10px;
    font-weight: 900;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .ur-jugador-boton:hover {
    text-decoration: underline;
  }

  .ur-equipo-detalle {
    margin: 17px 0 8px;
    color: ${C.cian};
    font-size: 13px;
    font-weight: 900;
  }

  .ur-mensaje {
    padding: 28px 15px;
    color: ${C.secundario};
    background: ${C.panel};
    border: 1px solid ${C.borde};
    border-radius: 12px;
    text-align: center;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.7;
  }

  .ur-modal-fondo {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    background: rgba(0,0,0,.82);
    backdrop-filter: blur(5px);
  }

  .ur-modal {
    width: 100%;
    max-width: 440px;
    max-height: 88vh;
    overflow-y: auto;
    padding: 18px;
    box-sizing: border-box;
    background: #070F1A;
    border: 1px solid #008CB4;
    border-radius: 17px;
    box-shadow: 0 0 25px rgba(0,217,255,.12);
    animation: urEntrada .2s ease;
  }

  @keyframes urEntrada {
    from { opacity: 0; transform: translateY(12px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ur-modal-cabecera {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 16px;
  }

  .ur-modal-titulo {
    color: ${C.cian};
    font-size: 16px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ur-cerrar {
    width: 35px;
    height: 35px;
    color: white;
    background: #10283A;
    border: 1px solid ${C.borde};
    border-radius: 9px;
    font-size: 20px;
    cursor: pointer;
  }

  .ur-perfil-cabecera {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 0 18px;
  }

  .ur-iniciales {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    color: ${C.cian};
    background: #0D1D2C;
    border: 2px solid ${C.cian};
    border-radius: 50%;
    font-size: 22px;
    font-weight: 900;
  }

  .ur-perfil-nombre {
    color: white;
    font-size: 17px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .ur-perfil-equipo {
    margin-top: 6px;
    color: ${C.secundario};
    font-size: 11px;
    font-weight: 900;
  }

  .ur-estadisticas-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 9px;
  }

  .ur-estadistica {
    padding: 14px 5px;
    background: #0D1D2C;
    border: 1px solid #184258;
    border-radius: 10px;
    text-align: center;
  }

  .ur-estadistica-etiqueta {
    color: ${C.secundario};
    font-size: 9px;
    font-weight: 900;
  }

  .ur-estadistica-valor {
    margin-top: 7px;
    color: ${C.cian};
    font-size: 21px;
    font-weight: 1000;
    overflow-wrap: anywhere;
  }

  .ur-modal-nota {
    margin-top: 15px;
    color: ${C.secundario};
    text-align: center;
    font-size: 10px;
    line-height: 1.5;
  }

  @media(max-width: 380px) {
    .ur-escudo {
      width: 68px;
      height: 68px;
    }

    .ur-enfrentamiento {
      grid-template-columns: minmax(0,1fr) 86px minmax(0,1fr);
    }

    .ur-marcador {
      font-size: 21px;
    }

    .ur-nombre-equipo {
      font-size: 10px;
    }

    .ur-tabla th,
    .ur-tabla td {
      font-size: 8px;
    }
  }
`;

export default function UltimosResultados({
  matches = [],
  matchesLoading = false,
  matchesError = null,
  getTeamShield,
  normalizeText,
}) {
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState("AUTO");
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [detallesLoading, setDetallesLoading] = useState(true);
  const [detallesError, setDetallesError] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);

  const normalizarTexto = (valor) => {
    if (typeof normalizeText === "function") {
      return normalizeText(String(valor ?? ""));
    }

    return normalizar(valor);
  };

  const comparar = (a, b) =>
    normalizarTexto(a) === normalizarTexto(b);

  // ==================================
  // CARGAR CSV DE DETALLES
  // ==================================

  useEffect(() => {
    let activo = true;
    const controlador = new AbortController();

    const cargar = async () => {
      try {
        setDetallesLoading(true);
        setDetallesError(false);

        const respuesta = await fetch(DETALLES_URL, {
          signal: controlador.signal,
          cache: "no-store",
        });

        if (!respuesta.ok) {
          throw new Error("No se pudieron descargar los detalles");
        }

        const contenido = await respuesta.text();
        const datos = convertirDetalles(contenido);

        if (activo) {
          setDetalles(datos);
          setDetallesLoading(false);
        }
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Error cargando detalles de resultados:", error);

        if (activo) {
          setDetallesError(true);
          setDetallesLoading(false);
        }
      }
    };

    cargar();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, []);

  const partidos = useMemo(
    () => (Array.isArray(matches) ? matches : []),
    [matches]
  );

  // ==================================
  // RESULTADOS FINALIZADOS
  // ==================================

  const resultados = useMemo(() => {
    const contador = {};

    return partidos
      .map((partido, indiceOriginal) => {
        const jornada = jornadaPartido(partido);

        contador[jornada] = (contador[jornada] || 0) + 1;

        return {
          ...partido,
          jornadaNumero: jornada,
          numeroPartido: contador[jornada],
          indiceOriginal,
          equipo1: normalizarEquipoOficial(partido?.team1),
          equipo2: normalizarEquipoOficial(partido?.team2),
          score1: String(partido?.score1 ?? "").trim(),
          score2: String(partido?.score2 ?? "").trim(),
          finalizado: estaFinalizado(partido),
        };
      })
      .filter((partido) =>
        partido.finalizado &&
        partido.jornadaNumero >= 1 &&
        partido.jornadaNumero <= 15
      );
  }, [partidos]);

  // ==================================
  // JORNADA AUTOMÁTICA
  // ==================================

  const ultimaJornadaCompleta = useMemo(() => {
    const control = {};

    partidos.forEach((partido) => {
      const jornada = jornadaPartido(partido);

      if (!jornada || jornada < 1 || jornada > 15) return;

      if (!control[jornada]) {
        control[jornada] = {
          total: 0,
          finalizados: 0,
        };
      }

      control[jornada].total++;

      if (estaFinalizado(partido)) {
        control[jornada].finalizados++;
      }
    });

    const completas = Object.entries(control)
      .filter(([, datos]) =>
        datos.total === 3 &&
        datos.finalizados === 3
      )
      .map(([jornada]) => Number(jornada));

    if (completas.length) {
      return Math.max(...completas);
    }

    const jornadasConResultados = resultados.map(
      (partido) => partido.jornadaNumero
    );

    return jornadasConResultados.length
      ? Math.max(...jornadasConResultados)
      : null;
  }, [partidos, resultados]);

  const jornadaActiva =
    jornadaSeleccionada === "AUTO"
      ? ultimaJornadaCompleta
      : Number(jornadaSeleccionada);

  const resultadosVisibles = useMemo(() => {
    if (jornadaActiva === null) return [];

    return resultados
      .filter((partido) => partido.jornadaNumero === jornadaActiva)
      .sort((a, b) => a.numeroPartido - b.numeroPartido);
  }, [resultados, jornadaActiva]);

  // ==================================
  // DETALLES DEL ENFRENTAMIENTO
  // ==================================

  const detallesDelPartido = useMemo(() => {
    if (!partidoSeleccionado) return [];

    return detalles.filter((detalle) => {
      const jornada = extraerNumero(detalle.jornada);
      const numeroPartido = extraerNumero(detalle.partido);

      return (
        jornada === partidoSeleccionado.jornadaNumero &&
        numeroPartido === partidoSeleccionado.numeroPartido &&
        (
          comparar(detalle.equipo, partidoSeleccionado.equipo1) ||
          comparar(detalle.equipo, partidoSeleccionado.equipo2)
        )
      );
    });
  }, [detalles, partidoSeleccionado]);

  const jugadoresDelMapa = (numeroMapa) =>
    detallesDelPartido.filter(
      (detalle) => extraerNumero(detalle.partido) === numeroMapa
    );

  const obtenerGanadorMapa = (jugadores) =>
    jugadores.find((jugador) => jugador.ganadorMapa?.trim())?.ganadorMapa ?? "";

  // ==================================
  // ESTADÍSTICAS GLOBALES
  // ==================================

  const estadisticasGlobales = useMemo(() => {
    if (!jugadorSeleccionado) return null;

    const registros = detalles.filter((detalle) =>
      comparar(detalle.jugador, jugadorSeleccionado.jugador)
    );

    const bajas = registros.reduce(
      (total, item) => total + numero(item.bajas),
      0
    );

    const muertes = registros.reduce(
      (total, item) => total + numero(item.muertes),
      0
    );

    const asistencias = registros.reduce(
      (total, item) => total + numero(item.asistencias),
      0
    );

    const mapasGanados = registros.filter((registro) =>
      registro.ganadorMapa &&
      comparar(registro.equipo, registro.ganadorMapa)
    ).length;

    const mapasJugados = registros.length;

    const kd = muertes > 0 ? bajas / muertes : bajas;

    const porcentaje = mapasJugados > 0
      ? (mapasGanados / mapasJugados) * 100
      : 0;

    const equipos = {};

    registros.forEach((registro) => {
      equipos[registro.equipo] = (equipos[registro.equipo] || 0) + 1;
    });

    const equipoPrincipal =
      Object.entries(equipos).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      jugadorSeleccionado.equipo ??
      "SIN EQUIPO";

    return {
      bajas,
      muertes,
      asistencias,
      kd,
      mapasJugados,
      mapasGanados,
      porcentaje,
      equipoPrincipal,
    };
  }, [detalles, jugadorSeleccionado, normalizeText]);

  // ==================================
  // FORMATO DE NÚMEROS
  // ==================================

  const formatear = (valor) =>
    Number.isInteger(valor)
      ? String(valor)
      : valor.toFixed(1);

  const iniciales = (nombre) => {
    const partes = String(nombre ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!partes.length) return "?";

    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }

    return (
      partes[0].slice(0, 1) +
      partes[partes.length - 1].slice(0, 1)
    ).toUpperCase();
  };

  // ==================================
  // ESCUDOS
  // ==================================

  const escudo = (equipo) => {
    if (typeof getTeamShield !== "function") return null;

    try {
      return getTeamShield(equipo);
    } catch {
      return null;
    }
  };

  // ==================================
  // ABRIR Y CERRAR DETALLE
  // ==================================

  const abrirDetalle = (partido) => {
    setPartidoSeleccionado(partido);
    setPaginaActual(0);
  };

  const volver = () => {
    setPartidoSeleccionado(null);
    setPaginaActual(0);
  };

  const abrirEstadisticas = (jugador, equipo) => {
    setJugadorSeleccionado({
      jugador,
      equipo,
    });
  };

  // ==================================
  // TARJETA DE EQUIPO
  // ==================================

  const renderEquipo = (nombre, gana) => {
    const imagen = escudo(nombre);

    return (
      <div className="ur-equipo">
        {imagen ? (
          <img
            className="ur-escudo"
            src={imagen}
            alt={`Escudo ${nombre}`}
            onError={(evento) => {
              evento.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="ur-escudo" />
        )}

        <div className={`ur-nombre-equipo ${gana ? "ur-victoria" : ""}`}>
          {nombre}
        </div>

        {gana && (
          <div style={{
            marginTop: 5,
            color: C.dorado,
            fontSize: 10,
            fontWeight: 900,
          }}>
            🏆 VICTORIA
          </div>
        )}
      </div>
    );
  };

  // ==================================
  // PÁGINA DE MAPA
  // ==================================

  const renderMapa = (mapa, indice) => {
    const jugadores = jugadoresDelMapa(indice + 1);
    const ganador = obtenerGanadorMapa(jugadores);

    const equipo1 = partidoSeleccionado.equipo1;
    const equipo2 = partidoSeleccionado.equipo2;

    const equipos = [equipo1, equipo2];

    return (
      <section className="ur-pagina-mapa" key={`${mapa.nombre}-${indice}`}>
        <div className="ur-mapa-nombre">
          {mapa.nombre}
        </div>

        <div className="ur-mapa-subtitulo">
          {mapa.subtitulo}
        </div>

        {ganador && (
          <div className="ur-ganador">
            <div className="ur-ganador-etiqueta">
              GANADOR DEL MAPA
            </div>
            <div className="ur-ganador-nombre">
              {ganador}
            </div>
          </div>
        )}

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

          {equipos.map((equipo) => {
            const jugadoresEquipo = jugadores.filter((jugador) =>
              comparar(jugador.equipo, equipo)
            );

            if (!jugadoresEquipo.length) return null;

            return (
              <tbody key={equipo}>
                <tr>
                  <td colSpan={5} style={{
                    padding: "15px 5px 5px",
                    color: C.cian,
                    background: "transparent",
                    fontSize: 12,
                  }}>
                    {equipo}
                  </td>
                </tr>

                {jugadoresEquipo.map((jugador, i) => {
                  const kd = numero(jugador.kd);

                  return (
                    <tr key={`${jugador.jugador}-${i}`}>
                      <td>
                        <button
                          className="ur-jugador-boton"
                          type="button"
                          onClick={() =>
                            abrirEstadisticas(
                              jugador.jugador,
                              jugador.equipo
                            )
                          }
                        >
                          {jugador.jugador}
                        </button>
                      </td>

                      <td>{jugador.bajas || "0"}</td>
                      <td>{jugador.muertes || "0"}</td>
                      <td>{jugador.asistencias || "0"}</td>

                      <td style={{
                        color: kd >= 1 ? C.verde : C.rojo,
                      }}>
                        {jugador.kd || "0"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>

        {!jugadores.length && (
          <div className="ur-mensaje" style={{ marginTop: 15 }}>
            NO HAY ESTADÍSTICAS REGISTRADAS PARA ESTE MAPA.
          </div>
        )}
      </section>
    );
  };

  // ==================================
  // DETALLE DEL ENCUENTRO
  // ==================================

  if (partidoSeleccionado) {
    return (
      <div className="ur-contenedor">
        <style>{estilos}</style>

        <button
          type="button"
          className="ur-boton-volver"
          onClick={volver}
        >
          <span>‹</span>
          VOLVER A RESULTADOS
        </button>

        <h2 className="ur-detalle-titulo">
          {partidoSeleccionado.equipo1}
          {" VS "}
          {partidoSeleccionado.equipo2}
        </h2>

        <div className="ur-ayuda-deslizar">
          DESLIZA HORIZONTALMENTE PARA CAMBIAR DE MAPA
        </div>

        <div className="ur-indicador-mapa">
          {MAPAS[paginaActual]?.nombre}
          {" • "}
          {MAPAS[paginaActual]?.subtitulo}
          {" • "}
          {paginaActual + 1} DE 5
        </div>

        {detallesLoading ? (
          <div className="ur-mensaje">
            CARGANDO ESTADÍSTICAS DEL ENCUENTRO...
          </div>
        ) : detallesError ? (
          <div className="ur-mensaje">
            NO SE PUDIERON CARGAR LAS ESTADÍSTICAS.
            <br />
            COMPRUEBA LA CONEXIÓN.
          </div>
        ) : (
          <div
            className="ur-scroll-mapas"
            onScroll={(evento) => {
              const ancho = evento.currentTarget.clientWidth + 10;
              const pagina = Math.round(
                evento.currentTarget.scrollLeft / ancho
              );

              setPaginaActual(
                Math.max(0, Math.min(4, pagina))
              );
            }}
          >
            {MAPAS.map((mapa, indice) =>
              renderMapa(mapa, indice)
            )}
          </div>
        )}

        <button
          type="button"
          className="ur-boton-volver"
          style={{
            justifyContent: "center",
            marginTop: 15,
            padding: 15,
            background: "#081927",
            border: `1px solid ${C.borde}`,
            borderRadius: 11,
          }}
          onClick={volver}
        >
          ‹ VOLVER A RESULTADOS
        </button>

        {jugadorSeleccionado && (
          <ModalEstadisticas
            jugador={jugadorSeleccionado}
            estadisticas={estadisticasGlobales}
            iniciales={iniciales(jugadorSeleccionado.jugador)}
            onCerrar={() => setJugadorSeleccionado(null)}
          />
        )}
      </div>
    );
  }

  // ==================================
  // PANTALLA PRINCIPAL
  // ==================================

  return (
    <div className="ur-contenedor">
      <style>{estilos}</style>

      <h2 className="ur-titulo">
        ÚLTIMOS RESULTADOS
      </h2>

      <div className="ur-filtro">
        <div className="ur-filtro-encabezado">
          <div className="ur-linea-cian" />

          <div className="ur-etiqueta">
            FILTRAR JORNADA
          </div>

          <div className="ur-cantidad">
            15 JORNADAS
          </div>
        </div>

        <select
          className="ur-selector"
          value={jornadaSeleccionada}
          onChange={(evento) =>
            setJornadaSeleccionada(evento.target.value)
          }
        >
          <option value="AUTO">
            ÚLTIMA JORNADA FINALIZADA
          </option>

          {Array.from({ length: 15 }, (_, i) => i + 1).map((jornada) => (
            <option key={jornada} value={String(jornada)}>
              JORNADA {jornada}
            </option>
          ))}
        </select>
      </div>

      {matchesLoading ? (
        <div className="ur-mensaje">
          CARGANDO RESULTADOS...
        </div>
      ) : matchesError ? (
        <div className="ur-mensaje">
          NO SE PUDIERON CARGAR LOS RESULTADOS.
          <br />
          COMPRUEBA LA CONEXIÓN.
        </div>
      ) : !partidos.length ? (
        <div className="ur-mensaje">
          NO HAY RESULTADOS DISPONIBLES.
        </div>
      ) : !resultados.length ? (
        <div className="ur-mensaje">
          TODAVÍA NO HAY ENFRENTAMIENTOS FINALIZADOS.
        </div>
      ) : !resultadosVisibles.length ? (
        <div className="ur-mensaje">
          NO HAY RESULTADOS FINALIZADOS EN ESTA JORNADA.
        </div>
      ) : (
        resultadosVisibles.map((partido) => {
          const marcador1 = numero(partido.score1);
          const marcador2 = numero(partido.score2);

          const gana1 = marcador1 > marcador2;
          const gana2 = marcador2 > marcador1;

          return (
            <article
              key={`${partido.jornadaNumero}-${partido.numeroPartido}-${partido.indiceOriginal}`}
              className="ur-tarjeta"
              onClick={() => abrirDetalle(partido)}
              role="button"
              tabIndex={0}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") abrirDetalle(partido);
              }}
            >
              <div className="ur-jornada">
                JORNADA {partido.jornadaNumero}
              </div>

              <div className="ur-enfrentamiento">
                {renderEquipo(partido.equipo1, gana1)}

                <div>
                  <div className="ur-marcador">
                    {partido.score1} - {partido.score2}
                  </div>

                  <div className="ur-marcador-etiqueta">
                    RESULTADO
                  </div>
                </div>

                {renderEquipo(partido.equipo2, gana2)}
              </div>

              <div className="ur-estado">
                ● FINALIZADO
              </div>

              <div className="ur-instruccion">
                TOCA PARA VER EL DETALLE ›
              </div>
            </article>
          );
        })
      )}

      {jugadorSeleccionado && (
        <ModalEstadisticas
          jugador={jugadorSeleccionado}
          estadisticas={estadisticasGlobales}
          iniciales={iniciales(jugadorSeleccionado.jugador)}
          onCerrar={() => setJugadorSeleccionado(null)}
        />
      )}
    </div>
  );
}

// ==================================
// MODAL DE ESTADÍSTICAS GLOBALES
// ==================================

function ModalEstadisticas({
  jugador,
  estadisticas,
  iniciales,
  onCerrar,
}) {
  return (
    <div
      className="ur-modal-fondo"
      onClick={onCerrar}
    >
      <div
        className="ur-modal"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="ur-modal-cabecera">
          <div className="ur-modal-titulo">
            ESTADÍSTICAS GENERALES
          </div>

          <button
            type="button"
            className="ur-cerrar"
            onClick={onCerrar}
          >
            ×
          </button>
        </div>

        <div className="ur-perfil-cabecera">
          <div className="ur-iniciales">
            {iniciales}
          </div>

          <div>
            <div className="ur-perfil-nombre">
              {jugador.jugador}
            </div>

            <div className="ur-perfil-equipo">
              {estadisticas?.equipoPrincipal ?? jugador.equipo}
            </div>

            <div style={{
              marginTop: 5,
              color: C.cian,
              fontSize: 9,
              fontWeight: 900,
            }}>
              JUGADOR DE LIGA 4VS4
            </div>
          </div>
        </div>

        {!estadisticas ? (
          <div className="ur-mensaje">
            NO HAY ESTADÍSTICAS DISPONIBLES.
          </div>
        ) : (
          <>
            <div className="ur-estadisticas-grid">
              <TarjetaEstadistica
                etiqueta="BAJAS"
                valor={formatoGlobal(estadisticas.bajas)}
                color={C.verde}
              />

              <TarjetaEstadistica
                etiqueta="MUERTES"
                valor={formatoGlobal(estadisticas.muertes)}
                color={C.rojo}
              />

              <TarjetaEstadistica
                etiqueta="ASISTENCIAS"
                valor={formatoGlobal(estadisticas.asistencias)}
                color={C.cian}
              />

              <TarjetaEstadistica
                etiqueta="K/D GLOBAL"
                valor={estadisticas.kd.toFixed(2)}
                color={C.dorado}
              />

              <TarjetaEstadistica
                etiqueta="MAPAS JUGADOS"
                valor={String(estadisticas.mapasJugados)}
                color={C.blanco}
              />

              <TarjetaEstadistica
                etiqueta="MAPAS GANADOS"
                valor={`${estadisticas.mapasGanados} (${estadisticas.porcentaje.toFixed(1)}%)`}
                color={C.verde}
              />
            </div>

            <div className="ur-modal-nota">
              Datos acumulados de todos los registros disponibles.
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onCerrar}
          style={{
            width: "100%",
            padding: 13,
            marginTop: 17,
            color: C.cian,
            background: "#10283A",
            border: `1px solid ${C.borde}`,
            borderRadius: 10,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          CERRAR
        </button>
      </div>
    </div>
  );
}

function formatoGlobal(valor) {
  return Number.isInteger(valor)
    ? String(valor)
    : valor.toFixed(1);
}

function TarjetaEstadistica({ etiqueta, valor, color }) {
  return (
    <div className="ur-estadistica">
      <div className="ur-estadistica-etiqueta">
        {etiqueta}
      </div>

      <div
        className="ur-estadistica-valor"
        style={{ color }}
      >
        {valor}
      </div>
    </div>
  );
}
