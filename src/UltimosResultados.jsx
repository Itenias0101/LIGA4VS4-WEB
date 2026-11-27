
import React, { useEffect, useMemo, useState } from "react";

const DETALLES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=237931925&single=true&output=csv";

const MAPAS = [
  { tipo: "PTO CALIENTE", mapa: "COMBINE" },
  { tipo: "BYD", mapa: "SLUM" },
  { tipo: "CONTROL", mapa: "RAID" },
  { tipo: "PTO CALIENTE", mapa: "TAKEOFF" },
  { tipo: "BYD", mapa: "STANDOFF" },
];

const EQUIPOS_OFICIALES = [
  "ETERNITY",
  "2D",
  "KINGS",
  "Lycoris",
  "The Butchers",
  "NoMercy",
];

const COLORES = {
  fondo: "#05080F",
  tarjeta: "#0E1C2D",
  filtro: "#09111D",
  cian: "#00D9FF",
  secundario: "#8CA5B9",
  verde: "#00E696",
  dorado: "#FFCD32",
  borde: "#143E55",
};

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
    nomercy: "NoMercy",
  };

  return equipos[texto] || limpiarTexto(valor);
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

  fila.push(campo);

  if (fila.some((celda) => limpiarTexto(celda) !== "")) {
    filas.push(fila);
  }

  return filas;
}

function convertirDetalles(texto) {
  const filas = leerCSV(texto);

  if (!filas.length) return [];

  const primeraFila = filas[0].map(normalizar);
  const tieneEncabezado =
    primeraFila.includes("jornada") ||
    primeraFila.includes("jugador") ||
    primeraFila.includes("ganadormapa");

  const datos = tieneEncabezado ? filas.slice(1) : filas;

  return datos.map((fila) => ({
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

function indiceMapa(nombre) {
  const mapa = normalizar(nombre);

  if (mapa.includes("combine")) return 0;
  if (mapa.includes("slum")) return 1;
  if (mapa.includes("raid")) return 2;
  if (mapa.includes("takeoff")) return 3;
  if (mapa.includes("standoff")) return 4;

  return -1;
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
    Object.entries(equipos).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sin equipo";

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
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState("TODAS");
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [mapaActivo, setMapaActivo] = useState(0);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);

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
    const jornadas = [...new Set(
      partidosPreparados
        .map((partido) => partido._jornada)
        .filter(Number.isFinite)
    )].sort((a, b) => b - a);

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

  const jornadasDisponibles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => i + 1);
  }, []);

  const detallesDelPartido = useMemo(() => {
    if (!partidoSeleccionado) return [];

    return detalles.filter(
      (dato) =>
        dato.jornada === partidoSeleccionado._jornada &&
        dato.partido === partidoSeleccionado._numeroPartido
    );
  }, [detalles, partidoSeleccionado]);

  const detallesDelMapa = useMemo(() => {
    return detallesDelPartido.filter(
      (dato) => indiceMapa(dato.mapa) === mapaActivo
    );
  }, [detallesDelPartido, mapaActivo]);

  const equiposDelMapa = useMemo(() => {
    if (!partidoSeleccionado) return [];

    const equipos = [
      partidoSeleccionado._equipo1,
      partidoSeleccionado._equipo2,
    ];

    return equipos.filter(Boolean);
  }, [partidoSeleccionado]);

  const ganadorDelMapa = useMemo(() => {
    const ganador = detallesDelMapa.find((dato) => dato.ganadorMapa);
    return ganador?.ganadorMapa || "";
  }, [detallesDelMapa]);

  const estadisticasJugador = useMemo(() => {
    if (!jugadorSeleccionado) return null;

    return calcularEstadisticasJugador(detalles, jugadorSeleccionado);
  }, [detalles, jugadorSeleccionado]);

  const abrirDetalle = (partido) => {
    setPartidoSeleccionado(partido);
    setMapaActivo(0);
    setJugadorSeleccionado(null);
  };

  const volverResultados = () => {
    setPartidoSeleccionado(null);
    setMapaActivo(0);
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

  const estiloEscudo = {
    width: 58,
    height: 58,
    objectFit: "contain",
    flexShrink: 0,
  };

  const renderEscudo = (equipo) => {
    const imagen = obtenerEscudo(equipo);

    if (imagen) {
      return (
        <img
          src={imagen}
          alt={equipo}
          style={estiloEscudo}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return (
      <div className="ur-escudo-fallback">
        {limpiarTexto(equipo).slice(0, 3).toUpperCase()}
      </div>
    );
  };

  const estilos = `
    .ur-contenedor {
      width: 100%;
      min-height: 300px;
      color: #ffffff;
      background: ${COLORES.fondo};
      padding: 18px 12px 30px;
      box-sizing: border-box;
      font-family: inherit;
    }

    .ur-contenedor * {
      box-sizing: border-box;
    }

    .ur-titulo {
      color: ${COLORES.cian};
      font-size: 22px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 1.5px;
      margin: 5px 0 22px;
      text-shadow: 0 0 14px rgba(0,217,255,.25);
    }

    .ur-filtro {
      background: ${COLORES.filtro};
      border: 1px solid ${COLORES.borde};
      border-radius: 13px;
      padding: 14px;
      margin-bottom: 18px;
    }

    .ur-filtro-superior {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .ur-filtro-titulo {
      color: #ffffff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .8px;
    }

    .ur-filtro-cantidad {
      color: ${COLORES.cian};
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .5px;
    }

    .ur-select {
      width: 100%;
      min-height: 43px;
      background: #0E1C2D;
      color: white;
      border: 1px solid ${COLORES.borde};
      border-radius: 8px;
      padding: 0 12px;
      outline: none;
      font-size: 12px;
      font-weight: 800;
    }

    .ur-lista {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .ur-partido {
      width: 100%;
      text-align: left;
      border: 1px solid #17364B;
      border-radius: 13px;
      padding: 15px 13px;
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
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }

    .ur-enfrentamiento {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
      align-items: center;
      gap: 8px;
    }

    .ur-equipo {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-width: 0;
    }

    .ur-equipo-nombre {
      font-size: 11px;
      line-height: 1.3;
      font-weight: 900;
      text-align: center;
      overflow-wrap: anywhere;
    }

    .ur-ganador {
      color: ${COLORES.cian};
    }

    .ur-marcador {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      color: white;
      font-size: 27px;
      font-weight: 1000;
      white-space: nowrap;
    }

    .ur-separador {
      color: ${COLORES.secundario};
      font-size: 18px;
    }

    .ur-etiqueta-resultado {
      text-align: center;
      color: ${COLORES.secundario};
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-top: 7px;
    }

    .ur-pie-partido {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      border-top: 1px solid rgba(140,165,185,.13);
      margin-top: 14px;
      padding-top: 11px;
    }

    .ur-estado {
      color: ${COLORES.verde};
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .5px;
    }

    .ur-detalle-link {
      color: ${COLORES.cian};
      font-size: 9px;
      font-weight: 900;
      text-align: right;
    }

    .ur-victoria {
      color: ${COLORES.dorado};
      font-size: 9px;
      font-weight: 900;
      margin-top: 3px;
    }

    .ur-vacio {
      background: ${COLORES.tarjeta};
      border: 1px solid ${COLORES.borde};
      border-radius: 12px;
      color: ${COLORES.secundario};
      padding: 27px 15px;
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.6;
    }

    .ur-cargando {
      color: ${COLORES.cian};
      text-align: center;
      padding: 25px 10px;
      font-size: 12px;
      font-weight: 800;
    }

    .ur-error {
      color: #FF7777;
      text-align: center;
      padding: 15px;
      font-size: 12px;
    }

    .ur-detalle-cabecera {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }

    .ur-volver {
      flex-shrink: 0;
      border: 1px solid ${COLORES.borde};
      border-radius: 9px;
      background: #0D1B2A;
      color: ${COLORES.cian};
      padding: 10px 13px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .ur-detalle-titulo {
      color: ${COLORES.cian};
      font-size: 16px;
      font-weight: 1000;
      letter-spacing: .7px;
      margin: 0;
    }

    .ur-detalle-subtitulo {
      color: ${COLORES.secundario};
      font-size: 10px;
      font-weight: 800;
      margin-top: 4px;
    }

    .ur-resumen-detalle {
      background: ${COLORES.tarjeta};
      border: 1px solid ${COLORES.borde};
      border-radius: 13px;
      padding: 14px 10px;
      margin-bottom: 17px;
    }

    .ur-resumen-equipos {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
      align-items: center;
      gap: 6px;
    }

    .ur-resumen-equipos .ur-equipo img {
      width: 43px;
      height: 43px;
    }

    .ur-resumen-equipos .ur-equipo-nombre {
      font-size: 10px;
    }

    .ur-resumen-marcador {
      color: white;
      font-size: 22px;
      font-weight: 1000;
      white-space: nowrap;
    }

    .ur-mapas-titulo {
      color: white;
      font-size: 14px;
      font-weight: 1000;
      letter-spacing: 1px;
      margin: 0 0 5px;
    }

    .ur-deslizar {
      color: ${COLORES.secundario};
      font-size: 10px;
      margin-bottom: 12px;
    }

    .ur-mapas-navegacion {
      display: flex;
      gap: 7px;
      overflow-x: auto;
      padding-bottom: 10px;
      scrollbar-width: thin;
      scrollbar-color: ${COLORES.cian} #102238;
    }

    .ur-mapa-boton {
      flex: 0 0 auto;
      min-width: 62px;
      border: 1px solid ${COLORES.borde};
      border-radius: 8px;
      background: #0A1523;
      color: ${COLORES.secundario};
      padding: 9px 10px;
      font-size: 10px;
      font-weight: 900;
      cursor: pointer;
    }

    .ur-mapa-boton.activo {
      background: #0A3145;
      color: ${COLORES.cian};
      border-color: ${COLORES.cian};
      box-shadow: 0 0 12px rgba(0,217,255,.12);
    }

    .ur-panel-mapa {
      background: ${COLORES.tarjeta};
      border: 1px solid ${COLORES.borde};
      border-radius: 13px;
      padding: 14px 10px;
      animation: urEntrada .25s ease;
    }

    @keyframes urEntrada {
      from { opacity: .35; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ur-mapa-tipo {
      color: ${COLORES.cian};
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-align: center;
    }

    .ur-mapa-nombre {
      color: white;
      font-size: 20px;
      font-weight: 1000;
      text-align: center;
      margin: 4px 0 8px;
    }

    .ur-mapa-indicador {
      color: ${COLORES.secundario};
      font-size: 9px;
      font-weight: 800;
      text-align: center;
      margin-bottom: 14px;
    }

    .ur-ganador-mapa {
      color: ${COLORES.verde};
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      margin: 8px 0 15px;
    }

    .ur-equipo-tabla {
      margin-top: 14px;
    }

    .ur-equipo-tabla-titulo {
      color: ${COLORES.cian};
      font-size: 11px;
      font-weight: 1000;
      padding: 8px 2px;
      border-bottom: 1px solid ${COLORES.borde};
    }

    .ur-tabla-scroll {
      width: 100%;
      overflow-x: auto;
    }

    .ur-tabla {
      width: 100%;
      min-width: 310px;
      border-collapse: collapse;
      font-size: 10px;
    }

    .ur-tabla th {
      color: ${COLORES.secundario};
      font-size: 9px;
      font-weight: 900;
      padding: 10px 5px;
      text-align: center;
      white-space: nowrap;
    }

    .ur-tabla th:first-child,
    .ur-tabla td:first-child {
      text-align: left;
    }

    .ur-tabla td {
      border-top: 1px solid rgba(140,165,185,.12);
      color: white;
      padding: 10px 5px;
      text-align: center;
      font-weight: 800;
    }

    .ur-jugador-boton {
      background: transparent;
      border: 0;
      color: ${COLORES.cian};
      font: inherit;
      font-size: 10px;
      font-weight: 900;
      padding: 0;
      text-align: left;
      cursor: pointer;
      max-width: 115px;
      overflow-wrap: anywhere;
    }

    .ur-sin-stats {
      color: ${COLORES.secundario};
      text-align: center;
      font-size: 11px;
      line-height: 1.6;
      padding: 25px 8px;
      font-weight: 800;
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
      max-width: 390px;
      max-height: 85vh;
      overflow-y: auto;
      background: #0B1725;
      border: 1px solid ${COLORES.borde};
      border-radius: 15px;
      padding: 19px;
      box-shadow: 0 15px 55px rgba(0,0,0,.5);
    }

    .ur-modal-titulo {
      color: ${COLORES.cian};
      text-align: center;
      font-size: 17px;
      font-weight: 1000;
      overflow-wrap: anywhere;
      margin: 0 0 5px;
    }

    .ur-modal-equipo {
      text-align: center;
      color: ${COLORES.secundario};
      font-size: 10px;
      font-weight: 800;
      margin-bottom: 17px;
    }

    .ur-estadisticas-grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 9px;
    }

    .ur-estadistica {
      background: #102238;
      border: 1px solid #19374D;
      border-radius: 9px;
      padding: 12px 8px;
      text-align: center;
    }

    .ur-estadistica-valor {
      color: ${COLORES.cian};
      font-size: 20px;
      font-weight: 1000;
    }

    .ur-estadistica-label {
      color: ${COLORES.secundario};
      font-size: 9px;
      font-weight: 900;
      margin-top: 4px;
    }

    .ur-modal-cerrar {
      width: 100%;
      margin-top: 17px;
      padding: 12px;
      background: #0A3145;
      border: 1px solid ${COLORES.cian};
      color: ${COLORES.cian};
      border-radius: 8px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
    }

    .ur-modal-perfil {
      width: 100%;
      margin-top: 9px;
      padding: 11px;
      background: transparent;
      border: 1px solid ${COLORES.borde};
      color: white;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 900;
      cursor: pointer;
    }

    @media (min-width: 700px) {
      .ur-contenedor {
        max-width: 850px;
        margin: 0 auto;
        padding: 22px;
      }

      .ur-lista {
        display: grid;
        grid-template-columns: repeat(2,minmax(0,1fr));
      }
    }
  `;

  if (partidoSeleccionado) {
    const partido = partidoSeleccionado;
    const equipo1 = partido._equipo1;
    const equipo2 = partido._equipo2;

    return (
      <div className="ur-contenedor">
        <style>{estilos}</style>

        <div className="ur-detalle-cabecera">
          <button className="ur-volver" onClick={volverResultados}>
            ‹ VOLVER
          </button>

          <div>
            <h2 className="ur-detalle-titulo">DETALLE DEL ENCUENTRO</h2>
            <div className="ur-detalle-subtitulo">
              JORNADA {partido._jornada} · PARTIDO {partido._numeroPartido}
            </div>
          </div>
        </div>

        <div className="ur-resumen-detalle">
          <div className="ur-resumen-equipos">
            <div className="ur-equipo">
              {renderEscudo(equipo1)}
              <div className="ur-equipo-nombre">{equipo1}</div>
            </div>

            <div className="ur-resumen-marcador">
              {partido._marcador1} - {partido._marcador2}
            </div>

            <div className="ur-equipo">
              {renderEscudo(equipo2)}
              <div className="ur-equipo-nombre">{equipo2}</div>
            </div>
          </div>
        </div>

        <h3 className="ur-mapas-titulo">5 MAPAS</h3>
        <div className="ur-deslizar">
          Selecciona un mapa para consultar sus estadísticas.
        </div>

        <div className="ur-mapas-navegacion">
          {MAPAS.map((mapa, indice) => (
            <button
              key={mapa.mapa}
              className={`ur-mapa-boton ${
                mapaActivo === indice ? "activo" : ""
              }`}
              onClick={() => setMapaActivo(indice)}
            >
              MAPA {indice + 1}
            </button>
          ))}
        </div>

        <div className="ur-panel-mapa" key={mapaActivo}>
          <div className="ur-mapa-tipo">
            {MAPAS[mapaActivo].tipo}
          </div>

          <div className="ur-mapa-nombre">
            {MAPAS[mapaActivo].mapa}
          </div>

          <div className="ur-mapa-indicador">
            {MAPAS[mapaActivo].tipo} • {MAPAS[mapaActivo].mapa} •{" "}
            {mapaActivo + 1} DE 5
          </div>

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
          ) : detallesDelMapa.length === 0 ? (
            <div className="ur-sin-stats">
              NO HAY ESTADÍSTICAS REGISTRADAS PARA ESTE MAPA.
            </div>
          ) : (
            <>
              {ganadorDelMapa && (
                <div className="ur-ganador-mapa">
                  🏆 GANADOR DEL MAPA: {ganadorDelMapa}
                </div>
              )}

              {equiposDelMapa.map((equipo) => {
                const jugadores = detallesDelMapa.filter(
                  (dato) =>
                    normalizar(dato.equipo) === normalizar(equipo)
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
                          {jugadores.map((dato, indice) => (
                            <tr
                              key={`${dato.jugador}-${indice}`}
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
                                  : formatoKD(dato.bajas, dato.muertes)}
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
        </div>

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
                      style={{ fontSize: 13, paddingTop: 4 }}
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

  return (
    <div className="ur-contenedor">
      <style>{estilos}</style>

      <h2 className="ur-titulo">ÚLTIMOS RESULTADOS</h2>

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
                    {renderEscudo(partido._equipo1)}

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
                    {renderEscudo(partido._equipo2)}

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
    </div>
  );
}
