
import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";

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
import Clasificacion from "./Clasificacion.jsx";
import InicioSesion from "./InicioSesion.jsx";
import WelcomeScreen from "./WelcomeScreen.jsx";
import useActividadPerfil from "./Actividadperfil.jsx";

// =========================================
// FUENTES DE DATOS
// =========================================

const SHEETS_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?";

const MATCHES_CSV_URL = `${SHEETS_BASE}gid=0&single=true&output=csv`;
const PLAYERS_CSV_URL = `${SHEETS_BASE}gid=59010702&single=true&output=csv`;
const STATS_CSV_URL = `${SHEETS_BASE}gid=1093177355&single=true&output=csv`;

const REFRESH_INTERVAL = 60_000;

const TEAMS = [
  "ETERNITY",
  "2D",
  "KINGS",
  "Lycoris",
  "THE BUTCHERS",
  "NoMercy"
];

const TEAM_SHIELDS = {
  ETERNITY:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhYl6TgvLcJM9b2_xWsgA4t9s8VuC5aWOSErtviQ8wEvhmttljdUlNwp7qCexlHqL7Sng_gzskKwJy8eCxLvKrVeUKEARd71h11TJwINVO1UwOOGTih1KTgGXC1DyQpjxOVdsp3pH98XoSYirIAXiDXYPNz7uRbF_QWWCXbl1XnYazwYlh2vA7HUy3iY-A/s1600/1000112929.png",
  "2D":
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgAoVpdILdUTIb7rlQbu-jmPpZN572bjvR8JcPaLzhgTuh95IggZZXrdheg2El1Cn_0h5soqHk47deBHVEfKuxlNxs04KdFpkMLCYMuiDr9HGl7WU2Ruhv3uUJqxbLVec_dy34nMHqLwJggGw8R0F2xwX7fFy6dGSBiswLIDmUV3wmyDlKdmHX3XkOVWRM/s1600/1000112780.png",
  KINGS:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi9_Js8cNIVeuf_7SJEav59OvTKG1IQ_IXETMNG34i3TeRUfnwl1SL9tif0aqeDrUuMyV3vedMzMYbDWsofYU1xZQoSCAd04hmyFavJWbQl0i1m1iiuV3-y0YxC86iuwuRz1is6ayV2xTnq8h1S3V_4xEPbRq0amTN-vMA8rU5IF0nlkkcA7hD8fWFc6jI/s1341/1000112984.png",
  LYCORIS:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgNFsU2keWU_HRggeS0rrLDN6LEtBCv66kskDClCREshy_DQ9afWBbBGY4PVlOmaDYb18bMj7gJMv0zvJ50gCS4WojOLUKN8WvwM5mpkfxFULCuBWRew1NJowEsYsyP-7NxXBRt-LzxZ5Jnid01yvcnhczJT3qAW-VbhB4aywBnlr5odppit-f9P5GW_y8/s896/1000112788.png",
  THEBUTCHERS:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEifCUkuhD1Rotz7ryg2x5csfz6tdYpBMzJjbHTxS-6q-UlccYFeG6Dn5SLVOlG9FAAY1d8oGURG5QpaDMSyeG6nN87bEbbAtjr14gQn4CKj36yhUBpTcMjLyj6C8LC9Lsrzme520bSRVvvQXYV7DAMs2zA5lN-SwfmN5EMeHp1QL8XxcaX9SafZBBCI89k/s1341/1000138092.png",
  NOMERCY:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjcBDOqw3eSzt2_VLN1SyblE3rXVWh5Yw9-fvuw4ctVeA9zAt3KGub2nMn8z0wAHyTN7Zy14Q8JS1F8ZIxDJwfJfRNNKtt9iz0LeM2qG7A_yJCQ_2Op4qOu13A7gufB-3sHjdkNmZhEX4az8Urq-JRM6fkNzMAShQI1cplKe8IHKubVzAB-cVobGOuY-s1600/1000113547.png"
};

// =========================================
// UTILIDADES
// =========================================

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[_\-\s]/g, "");

const normalizeNick = (value) =>
  String(value || "")
    .replace(/[\uFEFF\u200B-\u200D\u00A0]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeTeam = (name) => {
  const normalized = normalizeText(name);

  switch (normalized) {
    case "ETERNITY": return "ETERNITY";
    case "2D": return "2D";
    case "KINGS": return "KINGS";
    case "LYCORIS":
    case "LYCORYS": return "Lycoris";
    case "THEBUTCHERS": return "THE BUTCHERS";
    case "NOMERCY": return "NoMercy";
    default: return String(name || "").trim();
  }
};

const getTeamShield = (teamName) =>
  TEAM_SHIELDS[normalizeText(normalizeTeam(teamName))] || "";

const normalizeHeader = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\u00A0]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const parseNumber = (value) => {
  const clean = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!clean) return 0;
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value, decimals = 0) =>
  Number(value || 0).toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

const formatNotificationDate = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

const formatPostDate = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
};

// =========================================
// LECTOR CSV
// =========================================

const detectCSVSeparator = (text) => {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  const separators = [",", ";", "\t"];
  let bestSeparator = ",";
  let bestScore = -1;

  separators.forEach((separator) => {
    const counts = lines.map((line) => {
      let count = 0;
      let insideQuotes = false;

      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
          i += 1;
        } else if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === separator && !insideQuotes) {
          count += 1;
        }
      }

      return count;
    }).filter((count) => count > 0);

    if (counts.length === 0) return;

    const frequency = new Map();
    counts.forEach((count) => {
      frequency.set(count, (frequency.get(count) || 0) + 1);
    });

    const mostCommonCount = Math.max(...frequency.keys());
    const consistency = frequency.get(mostCommonCount) / counts.length;
    const score = mostCommonCount * consistency;

    if (score > bestScore) {
      bestScore = score;
      bestSeparator = separator;
    }
  });

  return bestSeparator;
};

const parseCSV = (text, separator = null) => {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;
  const delimiter = separator || detectCSVSeparator(source);

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value.trim());

      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }

      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
};

const findHeaderIndex = (headers, candidates) =>
  headers.findIndex((header) =>
    candidates.includes(normalizeHeader(header))
  );

const parseScore = (value) => {
  const clean = String(value ?? "").trim();
  if (clean === "") return null;
  const number = Number(clean);
  return Number.isInteger(number) ? number : null;
};

const isFinishedMatch = (match) => {
  const score1 = parseScore(match.score1);
  const score2 = parseScore(match.score2);

  return (
    score1 !== null &&
    score2 !== null &&
    score1 >= 0 &&
    score1 <= 5 &&
    score2 >= 0 &&
    score2 <= 5 &&
    score1 + score2 === 5
  );
};

// =========================================
// PARTIDOS
// =========================================

const parseMatchesCSV = (csvText) => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];

  const jornadaIndex = findHeaderIndex(headers, ["JORNADA", "FECHA", "MATCHDAY"]);
  const team1Index = findHeaderIndex(headers, ["EQUIPO1", "EQUIPOA", "LOCAL", "TEAM1"]);
  const score1Index = findHeaderIndex(headers, ["PUNTOS1", "PUNTAJE1", "MARCADOR1", "SCORE1"]);
  const team2Index = findHeaderIndex(headers, ["EQUIPO2", "EQUIPOB", "VISITANTE", "TEAM2"]);
  const score2Index = findHeaderIndex(headers, ["PUNTOS2", "PUNTAJE2", "MARCADOR2", "SCORE2"]);

  const recognized = jornadaIndex >= 0 && team1Index >= 0 && team2Index >= 0;

  const indexes = recognized
    ? {
        jornada: jornadaIndex,
        team1: team1Index,
        score1: score1Index,
        team2: team2Index,
        score2: score2Index
      }
    : { jornada: 0, team1: 1, score1: 2, team2: 3, score2: 4 };

  return rows.slice(1)
    .map((row) => ({
      jornada: row[indexes.jornada] || "",
      team1: normalizeTeam(row[indexes.team1]),
      score1: indexes.score1 >= 0 ? row[indexes.score1] || "" : "",
      team2: normalizeTeam(row[indexes.team2]),
      score2: indexes.score2 >= 0 ? row[indexes.score2] || "" : ""
    }))
    .filter((match) => match.jornada && match.team1 && match.team2);
};

const getCurrentMatchday = (matches) => {
  const groups = [];

  matches.forEach((match) => {
    let group = groups.find((item) => item.jornada === match.jornada);

    if (!group) {
      group = { jornada: match.jornada, matches: [] };
      groups.push(group);
    }

    group.matches.push(match);
  });

  return groups.find((group) =>
    group.matches.some((match) => !isFinishedMatch(match))
  ) || null;
};

// =========================================
// JUGADORES
// =========================================

const parsePlayersCSV = (csvText) => {
  const separator = detectCSVSeparator(csvText);
  const rows = parseCSV(csvText, separator);

  if (rows.length === 0) {
    console.warn("[LIGA4VS4] El CSV de jugadores llegó vacío.");
    return [];
  }

  const playerHeaders = [
    "JUGADOR",
    "NICK",
    "NOMBRE",
    "PLAYER",
    "USUARIO"
  ];
  const teamHeaders = ["EQUIPO", "TEAM", "CLUB"];

  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return (
      headers.some((header) => playerHeaders.includes(header)) &&
      headers.some((header) => teamHeaders.includes(header))
    );
  });

  let playerIndex = 0;
  let teamIndex = 1;
  let dataStartIndex = 0;
  let headerFound = false;

  if (headerIndex >= 0) {
    const headers = rows[headerIndex].map(normalizeHeader);
    playerIndex = headers.findIndex((header) => playerHeaders.includes(header));
    teamIndex = headers.findIndex((header) => teamHeaders.includes(header));
    dataStartIndex = headerIndex + 1;
    headerFound = true;
  }

  const parsedPlayers = rows.slice(dataStartIndex)
    .map((row) => {
      const rawPlayer = String(row[playerIndex] || "").trim();
      const rawTeam = String(row[teamIndex] || "").trim();

      return {
        team: normalizeTeam(rawTeam),
        player: rawPlayer
      };
    })
    .filter((item) => {
      const normalizedPlayer = normalizeHeader(item.player);
      const normalizedTeam = normalizeHeader(item.team);

      return (
        item.player.length > 0 &&
        item.team.length > 0 &&
        !["VACANTE", "PORDEFINIR", "JUGADOR", "NICK", "NOMBRE", "PLAYER", "USUARIO"].includes(normalizedPlayer) &&
        !["EQUIPO", "TEAM", "CLUB"].includes(normalizedTeam)
      );
    });

  console.info("[LIGA4VS4] Diagnóstico CSV de jugadores:", {
    separador: separator === "\t" ? "TAB" : separator,
    filasDetectadas: rows.length,
    encabezadoEncontrado: headerFound,
    filaEncabezado: headerFound ? headerIndex + 1 : "No encontrado, usando columnas 1 y 2",
    columnaJugador: playerIndex + 1,
    columnaEquipo: teamIndex + 1,
    jugadoresDetectados: parsedPlayers.length,
    equiposDetectados: [...new Set(parsedPlayers.map((item) => item.team))]
  });

  return parsedPlayers;
};

// =========================================
// ESTADÍSTICAS INDIVIDUALES
// =========================================

const parsePlayerStatsCSV = (csvText) => {
  const rows = parseCSV(csvText);
  if (!rows.length) return [];

  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return normalized.includes("JUGADOR") && normalized.includes("EQUIPO");
  });

  if (headerIndex < 0) {
    throw new Error("No se encontraron las columnas JUGADOR y EQUIPO en el CSV.");
  }

  const headers = rows[headerIndex].map(normalizeHeader);

  const indexes = {
    player: findHeaderIndex(headers, ["JUGADOR"]),
    team: findHeaderIndex(headers, ["EQUIPO"]),
    maps: findHeaderIndex(headers, ["MAPAS", "MAPASJUGADOS", "PARTIDOS"]),
    kills: findHeaderIndex(headers, ["BAJAS", "KILLS"]),
    deaths: findHeaderIndex(headers, ["MUERTES", "DEATHS"]),
    assists: findHeaderIndex(headers, ["ASISTENCIAS", "ASSISTS"]),
    kd: findHeaderIndex(headers, ["KDGLOBAL", "KD", "KDR"]),
    wins: findHeaderIndex(headers, ["MAPASGANADOS", "GANADOS"]),
    losses: findHeaderIndex(headers, ["MAPASPERDIDOS", "PERDIDOS"])
  };

  return rows.slice(headerIndex + 1)
    .map((row) => {
      const player = String(row[indexes.player] || "").trim();
      const team = String(row[indexes.team] || "").trim();
      const kills = parseNumber(indexes.kills >= 0 ? row[indexes.kills] : 0);
      const deaths = parseNumber(indexes.deaths >= 0 ? row[indexes.deaths] : 0);
      const assists = parseNumber(indexes.assists >= 0 ? row[indexes.assists] : 0);
      const kdValue = indexes.kd >= 0 ? row[indexes.kd] : "";
      const maps = indexes.maps >= 0 ? parseNumber(row[indexes.maps]) : 0;
      const wins = indexes.wins >= 0 ? parseNumber(row[indexes.wins]) : 0;
      const losses = indexes.losses >= 0 ? parseNumber(row[indexes.losses]) : 0;

      return {
        player,
        normalizedPlayer: normalizeNick(player),
        team: normalizeTeam(team),
        kills,
        deaths,
        assists,
        kd: String(kdValue || "").trim() !== ""
          ? parseNumber(kdValue)
          : deaths > 0 ? kills / deaths : kills,
        maps,
        wins,
        losses,
        hasMaps: indexes.maps >= 0,
        hasWins: indexes.wins >= 0,
        hasLosses: indexes.losses >= 0
      };
    })
    .filter((item) => item.player);
};

const getPlayerStats = (allStats, nick) => {
  const normalizedNick = normalizeNick(nick);
  const ranking = [...allStats].sort((a, b) =>
    b.kills - a.kills ||
    b.kd - a.kd ||
    a.normalizedPlayer.localeCompare(b.normalizedPlayer)
  );

  const index = ranking.findIndex(
    (item) => item.normalizedPlayer === normalizedNick
  );

  if (index < 0) return null;

  return {
    ...ranking[index],
    ranking: index + 1,
    totalPlayers: ranking.length,
    winRate: ranking[index].maps > 0
      ? (ranking[index].wins * 100) / ranking[index].maps
      : 0
  };
};

// =========================================
// MENÚ
// =========================================

const menuItems = [
  { id: "clasificacion", number: "01", title: "CLASIFICACIÓN", icon: "🏆" },
  { id: "proximos", number: "02", title: "PRÓXIMOS ENFRENTAMIENTOS", icon: "⚔️" },
  { id: "resultados", number: "03", title: "ÚLTIMOS RESULTADOS", icon: "📊" },
  { id: "equipos", number: "04", title: "EQUIPOS", icon: "🛡️" },
  { id: "jornadas", number: "05", title: "JORNADAS", icon: "📅" },
  { id: "publicaciones", number: "06", title: "JUGADAS DESTACADAS", icon: "🎥" }
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

// =========================================
// COMPONENTE PRINCIPAL
// =========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] = useState("inicio");
  const [showCompetitionMenu, setShowCompetitionMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [announcement, setAnnouncement] = useState({ active: false, message: "" });
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState("");

  const [expandedTeams, setExpandedTeams] = useState({});
  const [expandedTeam, setExpandedTeam] = useState(null);

  // =========================================
  // BARRA DE AVISOS FIRESTORE
  // =========================================

  useEffect(() => {
    const announcementRef = doc(db, "configuracion", "barra_avisos");

    const unsubscribe = onSnapshot(
      announcementRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setAnnouncement({ active: false, message: "" });
          return;
        }

        const data = snapshot.data();
        const text = String(data.mensaje || "").trim();

        setAnnouncement({
          active: data.activo === true && text.length > 0,
          message: text
        });
      },
      (firebaseError) => {
        console.error("Error al escuchar la barra de avisos:", firebaseError);
        setAnnouncement({ active: false, message: "" });
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================
  // CARGAR PARTIDOS Y JUGADORES
  // =========================================

  useEffect(() => {
    let mounted = true;

    const loadMatches = async () => {
      try {
        const response = await fetch(MATCHES_CSV_URL, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Google Sheets respondió ${response.status} al cargar enfrentamientos.`);
        }

        const csvText = await response.text();
        const parsedMatches = parseMatchesCSV(csvText);

        if (!mounted) return;

        setMatches(parsedMatches);
        setMatchesError("");
        console.info("[LIGA4VS4] Enfrentamientos cargados:", parsedMatches.length);
      } catch (err) {
        console.error("[LIGA4VS4] Error cargando enfrentamientos:", err);

        if (!mounted) return;

        setMatchesError(
          err.message || "No se pudieron cargar los enfrentamientos desde Google Sheets."
        );
      } finally {
        if (mounted) setMatchesLoading(false);
      }
    };

    const loadPlayers = async () => {
      try {
        const response = await fetch(PLAYERS_CSV_URL, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Google Sheets respondió ${response.status} al cargar jugadores.`);
        }

        const csvText = await response.text();

        if (!csvText.trim()) {
          throw new Error("Google Sheets entregó un CSV de jugadores vacío.");
        }

        const parsedPlayers = parsePlayersCSV(csvText);

        if (!mounted) return;

        setPlayers(parsedPlayers);
        setPlayersError(
          parsedPlayers.length === 0
            ? "El CSV se descargó, pero no se reconocieron jugadores. Revisa que las columnas sean JUGADOR y EQUIPO o que los datos estén en las columnas 1 y 2."
            : ""
        );

        console.info("[LIGA4VS4] Plantilla de jugadores cargada:", parsedPlayers.length);
      } catch (err) {
        console.error("[LIGA4VS4] Error cargando jugadores:", err);

        if (!mounted) return;

        setPlayersError(
          err.message || "No se pudieron cargar los jugadores desde Google Sheets."
        );
      } finally {
        if (mounted) setPlayersLoading(false);
      }
    };

    const loadAll = () => {
      loadMatches();
      loadPlayers();
    };

    loadAll();
    const interval = window.setInterval(loadAll, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const currentMatchday = getCurrentMatchday(matches);

  const toggleTeamRoster = (team) => {
    setExpandedTeams((previous) => ({
      ...previous,
      [team]: !previous[team]
    }));
  };

  const getPlayersForTeam = (team) =>
    players.filter(
      (player) => normalizeText(player.team) === normalizeText(team)
    );

  const toggleCompetitionTeam = (team) => {
    setExpandedTeam((previous) => previous === team ? null : team);
  };

  // =========================================
  // NOTIFICACIONES
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

    const notificationsRef = collection(db, "jugadores", user.uid, "notificaciones");
    const notificationsQuery = query(notificationsRef, orderBy("createdAt", "desc"));

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
        console.error("Error al cargar las notificaciones:", firebaseError);
        setNotificationsLoading(false);
        setNotificationError("No se pudieron cargar las notificaciones.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const markNotificationAsRead = async (notification) => {
    if (notification.leida === true || notificationAction || !user) return;

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
      setNotificationError("No se pudo marcar la notificación como leída.");
    }
  };

  const deleteNotification = async (notificationId) => {
    if (notificationAction || !user) return;
    if (!window.confirm("¿Deseas eliminar esta notificación?")) return;

    setNotificationAction(true);
    setNotificationError("");

    try {
      await deleteDoc(doc(
        db,
        "jugadores",
        user.uid,
        "notificaciones",
        notificationId
      ));
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
      setNotificationError("No se pudo eliminar la notificación.");
    } finally {
      setNotificationAction(false);
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0 || notificationAction || !user) return;

    if (!window.confirm(
      "¿Deseas eliminar todas tus notificaciones? Esta acción no se puede deshacer."
    )) return;

    setNotificationAction(true);
    setNotificationError("");

    try {
      const notificationsRef = collection(db, "jugadores", user.uid, "notificaciones");
      const chunks = [];

      for (let i = 0; i < notifications.length; i += 450) {
        chunks.push(notifications.slice(i, i + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((notification) => {
          batch.delete(doc(notificationsRef, notification.id));
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Error al eliminar todas las notificaciones:", err);
      setNotificationError("No se pudieron eliminar todas las notificaciones.");
    } finally {
      setNotificationAction(false);
    }
  };

  // =========================================
  // CONTROL DE AUTENTICACIÓN
  // =========================================

  const openMode = (newMode) => {
    setMode(newMode);
    setMessage("");
    setError("");
  };

  const handleAuthUserChange = React.useCallback((currentUser) => {
    setUser(currentUser);
    setLoading(false);
  }, []);

  // =========================================
  // PERFILES Y ACTIVIDAD
  // =========================================

  const perfil = useActividadPerfil({
    user,
    db,
    setError,
    openMode,
    showCompetitionMenu,
    formatNumber,
    formatPostDate,
    STATS_CSV_URL,
    parsePlayerStatsCSV,
    getPlayerStats
  });

  const {
    ownProfile, ownProfileLoading, ownProfileOpen, ownProfileError, ownProfileMessage,
    ownBiographyDraft, ownBiographyEditing, ownProfileSaving, ownPhotoUploading,
    ownGradientSaving, ownAvatarPosition, ownAvatarDragStart, ownAvatarWasDragged,
    selectedPlayer, selectedPlayerPhoto, playerPhotoLoading, playerPhotoStatus,
    selectedPlayerProfile, biographyLikes, biographyLiked, biographyLikeBusy,
    expandedProfilePhoto, playerView, playerStats, statsLoading, statsError,
    playerPosts, postsLoading, postsError,
    resetOwnProfile, closePlayerMenu, openPlayerMenu, openPlayerStats,
    openPlayerPosts, closePlayerView, toggleBiographyLike,
    renderExpandedProfilePhoto, renderOwnProfile, renderOwnFloatingAvatar,
    renderPlayerMenu, renderPlayerProfile, renderPlayerStats, renderPlayerPosts
  } = perfil;

  // =========================================
  // CERRAR SESIÓN
  // =========================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setMode(null);
      setActiveSection("inicio");
      setShowCompetitionMenu(false);
      setNotificationsOpen(false);
      setNotifications([]);
      setMessage("Has cerrado sesión correctamente.");
      setError("");

      resetOwnProfile();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      setError("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    }
  };

  const enterChampionship = () => {
    if (!user) {
      openMode("login");
      return;
    }

    setShowCompetitionMenu(true);
    setActiveSection("inicio");
    setNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateTo = (section) => {
    setActiveSection(section);
    setShowCompetitionMenu(true);
    setNotificationsOpen(false);
    setExpandedTeam(null);
    closePlayerView();

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToWelcome = () => {
    setShowCompetitionMenu(false);
    setActiveSection("inicio");
    setNotificationsOpen(false);
    setExpandedTeam(null);
    closePlayerView();

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================================
  // PANEL NOTIFICACIONES
  // =========================================

  const renderNotifications = () => (
    <div className="menu-notifications-panel">
      <div className="notifications-heading">
        <div>
          <h3>NOTIFICACIONES</h3>
          <p>CENTRO DE AVISOS</p>
        </div>

        <button onClick={() => setNotificationsOpen(false)} aria-label="Cerrar notificaciones">
          ✕
        </button>
      </div>

      <div style={{
        height: "2px",
        background: "linear-gradient(90deg, #00D9FF, transparent)",
        margin: "10px 0"
      }} />

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
        gap: "8px"
      }}>
        <span style={{ color: "#8EA6BA", fontSize: "11px", fontWeight: "700" }}>
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

      <div className="notifications-list">
        {notificationsLoading && (
          <div className="notifications-empty">CARGANDO NOTIFICACIONES...</div>
        )}

        {!notificationsLoading && !notificationError && notifications.length === 0 && (
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
              className={`notification-item ${unread ? "unread" : ""}`}
            >
              <div className="notification-item-content">
                <div className="notification-item-title">
                  {unread && <span className="notification-unread-dot" />}
                  <strong>{notification.titulo || "AVISO DE LIGA4VS4"}</strong>
                </div>

                <p>{notification.mensaje || ""}</p>
                <small>{formatNotificationDate(notification.createdAt)}</small>

                {unread && (
                  <div className="notification-read-hint">
                    TOCA PARA MARCAR COMO LEÍDA
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label="Eliminar notificación"
                disabled={notificationAction}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="notification-delete"
              >
                ×
              </button>
            </article>
          );
        })}
      </div>

      {notificationError && (
        <p className="notification-error">{notificationError}</p>
      )}

      <div className="notifications-footer">
        LIGA 4VS4 • SISTEMA DE AVISOS
      </div>
    </div>
  );

  // =========================================
  // TARJETA DE EQUIPO
  // =========================================

  const renderTeamRoster = (team) => {
    const teamPlayers = getPlayersForTeam(team);
    const shield = getTeamShield(team);
    const isExpanded = expandedTeam === team;

    return (
      <article
        className={`teams-card ${isExpanded ? "expanded" : ""}`}
        key={team}
        onClick={() => toggleCompetitionTeam(team)}
        aria-expanded={isExpanded}
      >
        <div className="teams-card-top">
          <div className="teams-shield-wrap">
            {shield ? (
              <img
                src={shield}
                alt={`Escudo ${team}`}
                className="teams-shield"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="teams-shield-fallback">
                {normalizeText(team).slice(0, 2)}
              </span>
            )}
          </div>

          <h3 className="teams-name">{team}</h3>

          <button
            type="button"
            className="teams-toggle-button"
            onClick={(event) => {
              event.stopPropagation();
              toggleCompetitionTeam(team);
            }}
            aria-expanded={isExpanded}
          >
            VER PLANTILLA <strong>{isExpanded ? "−" : "+"}</strong>
          </button>
        </div>

        {isExpanded && (
          <div className="teams-roster" onClick={(event) => event.stopPropagation()}>
            {teamPlayers.length === 0 ? (
              <>
                <div className="teams-player-row">
                  <span className="teams-player-number">01</span>
                  <span className="teams-player-name">POR DEFINIR</span>
                </div>
                <p className="teams-empty-roster">SIN MÁS JUGADORES ASIGNADOS</p>
              </>
            ) : (
              <>
                {teamPlayers.map((player, index) => (
                  <button
                    type="button"
                    className={`teams-player-row ${index === 0 ? "team-captain" : ""}`}
                    key={`${team}-${player.player}-${index}`}
                    onClick={() => openPlayerMenu(player.player)}
                  >
                    <span className="teams-player-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="teams-player-name">{player.player}</span>

                    {index === 0 && (
                      <span className="teams-captain-label">(CAPITÁN)</span>
                    )}
                  </button>
                ))}

                {teamPlayers.length === 1 && (
                  <p className="teams-empty-roster">SIN MÁS JUGADORES ASIGNADOS</p>
                )}
              </>
            )}
          </div>
        )}
      </article>
    );
  };

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
            <span className="notification-counter">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {notificationsOpen && renderNotifications()}

      <div className="menu-section-heading">CENTRO DE COMPETICIÓN</div>

      <div className="competition-grid">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="competition-card"
            onClick={() => navigateTo(item.id)}
          >
            <span className="competition-card-number">{item.number}</span>
            <span className="competition-card-icon">{item.icon}</span>
            <span className="competition-card-title">{item.title}</span>
          </button>
        ))}
      </div>

      <div className="championship-status">
        <span className="championship-status-dot" />
        <span>CAMPEONATO EN CURSO</span>
      </div>

      <div className="menu-footer">LIGA 4VS4 - 2026</div>

      <button type="button" className="return-welcome-button" onClick={returnToWelcome}>
        VOLVER A LA PANTALLA PRINCIPAL
      </button>
    </section>
  );

  // =========================================
  // PANTALLA EQUIPOS
  // =========================================

  const renderTeams = () => (
    <section className="teams-screen">
      {playersLoading && players.length === 0 ? (
        <div className="teams-loading">
          <span className="matches-spinner" />
          <p>CARGANDO PLANTILLAS...</p>
        </div>
      ) : (
        <>
          {playersError && (
            <div className="matches-state matches-error" style={{ marginBottom: "14px" }}>
              <p>{playersError}</p>
              <small style={{ display: "block", marginTop: "8px", color: "#AABBCB" }}>
                Revisa la consola del navegador para ver el diagnóstico del CSV.
              </small>
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: "12px" }}
                onClick={() => window.location.reload()}
              >
                REINTENTAR CARGA
              </button>
            </div>
          )}

          {!playersError && players.length > 0 && (
            <p style={{
              color: "#8EA6BA",
              fontSize: "11px",
              textAlign: "center",
              margin: "0 0 12px"
            }}>
              {players.length} JUGADORES REGISTRADOS
            </p>
          )}

          <div className="teams-grid">
            {TEAMS.map((team) => renderTeamRoster(team))}
          </div>
        </>
      )}
    </section>
  );

  // =========================================
  // APARTADOS PROVISIONALES
  // =========================================

  const renderSectionPlaceholder = () => (
    <section className="web-section-placeholder">
      <span className="placeholder-label">CENTRO DE COMPETICIÓN</span>
      <h2>{sectionNames[activeSection]}</h2>
      <p>
        Este apartado se está preparando para conectarlo con los mismos datos
        de la aplicación Android.
      </p>
      <button className="primary-button" onClick={() => navigateTo("inicio")}>
        VOLVER AL MENÚ
      </button>
    </section>
  );

  // =========================================
  // INTERFAZ
  // =========================================

  return (
    <main className="app">

      <InicioSesion
        mode={mode}
        onModeChange={setMode}
        onUserChange={handleAuthUserChange}
      />

      {loading ? (
        <div className="loading-screen">
          <span className="brand-icon">L4</span>
          <p>CARGANDO LIGA4VS4...</p>
        </div>
      ) : (
        <>
          {!showCompetitionMenu && (
            <header className="welcome-header">
              <div className="brand">
                <span className="brand-icon">L4</span>
                <div>
                  <h1>LIGA4VS4</h1>
                  <p>COMPETICIÓN OFICIAL</p>
                </div>
              </div>

              <div className="header-actions">
                {user ? (
                  <button className="login-button" onClick={handleLogout}>
                    CERRAR SESIÓN
                  </button>
                ) : (
                  <button className="login-button" onClick={() => openMode("login")}>
                    INICIAR SESIÓN
                  </button>
                )}
              </div>
            </header>
          )}

          {showCompetitionMenu && user && (
            <header className="logged-header">
              <div className="brand">
                <span className="brand-icon">L4</span>
                <div>
                  <h1>LIGA4VS4</h1>
                  <p>COMPETICIÓN OFICIAL</p>
                </div>
              </div>

              <button className="login-button" onClick={handleLogout}>
                CERRAR SESIÓN
              </button>
            </header>
          )}

          {!showCompetitionMenu ? (
            <>
              <WelcomeScreen
                announcement={announcement}
                matchesLoading={matchesLoading}
                matchesError={matchesError}
                currentMatchday={currentMatchday}
                isFinishedMatch={isFinishedMatch}
                getTeamShield={getTeamShield}
                normalizeText={normalizeText}
                expandedTeams={expandedTeams}
                toggleTeamRoster={toggleTeamRoster}
                playersLoading={playersLoading}
                players={players}
                getPlayersForTeam={getPlayersForTeam}
                playersError={playersError}
                user={user}
                enterChampionship={enterChampionship}
                openMode={openMode}
              />

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

              <footer>
                LIGA4VS4 OFICIAL © 2026
                <p>UNA LIGA. UNA COMUNIDAD.</p>
              </footer>
            </>
          ) : (
            <>
              {playerView === "profile"
                ? renderPlayerProfile()
                : playerView === "stats"
                  ? renderPlayerStats()
                  : playerView === "posts"
                    ? renderPlayerPosts()
                    : activeSection === "inicio"
                    ? renderMenu()
                    : activeSection === "equipos"
                      ? renderTeams()
                      : activeSection === "clasificacion"
                        ? (
                          <Clasificacion
                            teams={TEAMS}
                            matches={matches}
                            loading={matchesLoading}
                            error={matchesError}
                            getTeamShield={getTeamShield}
                          />
                        )
                        : renderSectionPlaceholder()}

              <nav className="web-bottom-navigation">
                {bottomItems.map((item) => (
                  <button
                    key={item.id}
                    className={activeSection === item.id && !playerView ? "active" : ""}
                    onClick={() => navigateTo(item.id)}
                  >
                    <span>{item.icon}</span>
                    <small>{item.label}</small>
                  </button>
                ))}
              </nav>
            </>
          )}
        </>
      )}

      {renderPlayerMenu()}
      {renderExpandedProfilePhoto()}
      {renderOwnFloatingAvatar()}
      {renderOwnProfile()}

    </main>
  );
}
