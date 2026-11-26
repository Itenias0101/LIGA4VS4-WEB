
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
  setDoc,
  writeBatch,
  getDocs,
  getDoc,
  where,
  limit
} from "firebase/firestore";

import { auth, db } from "./firebase";
import Clasificacion from "./clasificacion/Clasificacion";

// =========================================
// FUENTES DE DATOS
// =========================================

const SHEETS_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?";

const MATCHES_CSV_URL = `${SHEETS_BASE}gid=0&single=true&output=csv`;
const PLAYERS_CSV_URL = `${SHEETS_BASE}gid=59010702&single=true&output=csv`;
const STATS_CSV_URL = `${SHEETS_BASE}gid=1093177355&single=true&output=csv`;

const REFRESH_INTERVAL = 60_000;
const MEDIA_WORKER_URL = "https://liga4vs4-media-api.itenias01.workers.dev";
const MAX_PROFILE_PHOTO_SIZE = 15 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgNFsU2keWU_HRggeS0rrLDN6LEtBCv66ksbDClCREshy_DQ9afWBbBGY4PVlOmaDYb18bMj7gJMv0zvJ50gCS4WojOLUKN8WvwM5mpkfxFULCuBWRew1NJowEsYsyP-7NxXBRt-LzxZ5Jnid01yvcnhczJT3qAW-VbhB4aywBnlr5odppit-f9P5GW_y8/s896/1000112788.png",
  THEBUTCHERS:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEifCUkuhD1Rotz7ryg2x5csfz6tdYpBMzJjbHTxS-6q-UlccYFeG6Dn5SLVOlG9FAAY1d8oGURG5QpaDMSyeG6nN87bEbbAtjr14gQn4CKj36yhUBpTcMjLyj6C8LC9Lsrzme520bSRVvvQXYV7DAMs2zA5lN-SwfmN5EMeHp1QL8XxcaX9SafZBBCI89k/s1341/1000138092.png",
  NOMERCY:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjcBDOqw3eSzt2_VLN1SyblE3rXVWh5Yw9-fvuw4ctVeA9zAt3KGub2nMn8z0wAHyTN7Zy14Q8JS1F8ZIxDJwfJfRNNKtt9iz0LeM2qG7A_yJCQ_2Op4qOu13A7gufB-3sHjdkNmZhEX4az8Urq-JRM6fkNzMAShQI1cplKe8IHKubVzAB-cVobGOoUYYQ/s1600/1000113547.png"
};

const GRADIENTS = {
  oceano: ["#06152E", "#087CA7"],
  obsidiana: ["#090909", "#414141"],
  carmesi: ["#310B24", "#B21F45"],
  galaxia: ["#160B35", "#7139B8"],
  esmeralda: ["#062C26", "#16866A"],
  fenix: ["#421B08", "#D87819"],
  neon: ["#07313D", "#11B9C9"],
  aurora: ["#28102D", "#A04487"]
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

  // Igual que Android: localizar la fila real de encabezados en cualquier posición.
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

  // Android busca la fila real de encabezados, no presupone que sea la primera.
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
    kd: findHeaderIndex(headers, ["KDGLOBAL", "KDGLOBAL", "KD", "KDR"]),
    wins: findHeaderIndex(headers, ["MAPASGANADOS", "GANADOS"]),
    losses: findHeaderIndex(headers, ["MAPASPERDIDOS", "PERDIDOS"])
  };

  return rows.slice(headerIndex + 1)
    .map((row) => {
      const player = String(row[indexes.player] || "").trim();
      const team = String(row[indexes.team] || "").trim();
      const kills = parseNumber(row[indexes.kills] >= 0 ? row[indexes.kills] : 0);
      const deaths = parseNumber(row[indexes.deaths] >= 0 ? row[indexes.deaths] : 0);
      const assists = parseNumber(row[indexes.assists] >= 0 ? row[indexes.assists] : 0);
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

  // Perfil propio, replicado desde PerfilActivity de Android.
  const [ownProfile, setOwnProfile] = useState(null);
  const [ownProfileLoading, setOwnProfileLoading] = useState(false);
  const [ownProfileOpen, setOwnProfileOpen] = useState(false);
  const [ownProfileError, setOwnProfileError] = useState("");
  const [ownProfileMessage, setOwnProfileMessage] = useState("");
  const [ownBiographyDraft, setOwnBiographyDraft] = useState("");
  const [ownBiographyEditing, setOwnBiographyEditing] = useState(false);
  const [ownProfileSaving, setOwnProfileSaving] = useState(false);
  const [ownPhotoUploading, setOwnPhotoUploading] = useState(false);
  const [ownGradientSaving, setOwnGradientSaving] = useState(false);
  const [ownAvatarPosition, setOwnAvatarPosition] = useState(null);
  const [ownAvatarDragStart, setOwnAvatarDragStart] = useState(null);
  const [ownAvatarWasDragged, setOwnAvatarWasDragged] = useState(false);
  const [mode, setMode] = useState("home");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

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

  // Perfil público
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedPlayerPhoto, setSelectedPlayerPhoto] = useState("");
  const [playerPhotoLoading, setPlayerPhotoLoading] = useState(false);
  const [playerPhotoStatus, setPlayerPhotoStatus] = useState("");
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState(null);
  const [biographyLikes, setBiographyLikes] = useState(0);
  const [biographyLiked, setBiographyLiked] = useState(false);
  const [biographyLikeBusy, setBiographyLikeBusy] = useState(false);
  const [expandedProfilePhoto, setExpandedProfilePhoto] = useState(false);

  // Vistas individuales
  const [playerView, setPlayerView] = useState("");
  const [playerStats, setPlayerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [playerPosts, setPlayerPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");

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
  // CARGAR PARTIDOS Y JUGADORES POR SEPARADO
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
  // PERFIL PÚBLICO DEL JUGADOR
  // =========================================

  const closePlayerMenu = () => {
    setSelectedPlayer("");
    setSelectedPlayerPhoto("");
    setPlayerPhotoLoading(false);
    setPlayerPhotoStatus("");
    setSelectedPlayerProfile(null);
    setExpandedProfilePhoto(false);
  };

  const openPlayerMenu = async (playerName) => {
    setSelectedPlayer(playerName);
    setSelectedPlayerPhoto("");
    setSelectedPlayerProfile(null);
    setPlayerPhotoLoading(true);
    setPlayerPhotoStatus("BUSCANDO PERFIL...");

    try {
      const profilesRef = collection(db, "perfiles_publicos");
      let foundDoc = null;

      // Primero se intenta la búsqueda exacta usada por Android.
      const exactQuery = query(
        profilesRef,
        where("nick", "==", playerName),
        limit(2)
      );

      const exactSnapshot = await getDocs(exactQuery);

      if (exactSnapshot.size === 1) {
        foundDoc = exactSnapshot.docs[0];
      } else if (exactSnapshot.size > 1) {
        setPlayerPhotoStatus("NO SE PUDO IDENTIFICAR EL PERFIL");
        return;
      } else {
        // Respaldo: comparación normalizada para diferencias de espacios,
        // acentos y caracteres invisibles.
        const allProfiles = await getDocs(profilesRef);
        const matchesFound = allProfiles.docs.filter((profileDoc) => {
          const data = profileDoc.data();
          return normalizeNick(data.nick) === normalizeNick(playerName);
        });

        if (matchesFound.length === 1) {
          foundDoc = matchesFound[0];
        } else if (matchesFound.length > 1) {
          setPlayerPhotoStatus("NO SE PUDO IDENTIFICAR EL PERFIL");
          return;
        }
      }

      if (!foundDoc) {
        setPlayerPhotoStatus("PERFIL NO ENCONTRADO");
        return;
      }

      const profile = foundDoc.data();
      const photo = String(profile.fotoPerfil || "").trim();

      const profileData = {
        uid: foundDoc.id,
        nick: String(profile.nick || playerName),
        equipo: String(profile.equipo || ""),
        biografia: String(profile.biografia || ""),
        fotoPerfil: photo.startsWith("https://") ? photo : "",
        gradientePerfil: String(profile.gradientePerfil || "")
      };

      setSelectedPlayerProfile(profileData);
      setSelectedPlayerPhoto(profileData.fotoPerfil);

      if (!photo) {
        setPlayerPhotoStatus("SIN FOTO REGISTRADA");
      } else if (!photo.startsWith("https://")) {
        setPlayerPhotoStatus("URL DE FOTO INVÁLIDA");
      } else {
        setPlayerPhotoStatus("");
      }
    } catch (err) {
      console.error("Error buscando perfil público:", err);
      setPlayerPhotoStatus("ERROR AL BUSCAR PERFIL");
    } finally {
      setPlayerPhotoLoading(false);
    }
  };

  const openPlayerProfile = () => {
    if (!selectedPlayerProfile) {
      setPlayerPhotoStatus("NO SE ENCONTRÓ EL PERFIL DEL JUGADOR");
      return;
    }

    setPlayerView("profile");
    setSelectedPlayer("");
  };

  // =========================================
  // ABRIR ESTADÍSTICAS DEL JUGADOR
  // =========================================

  const openPlayerStats = async () => {
    const nick = selectedPlayer || selectedPlayerProfile?.nick || "";
    if (!nick) return;
    setPlayerView("stats");
    setSelectedPlayer("");
    setStatsLoading(true);
    setStatsError("");
    setPlayerStats(null);

    try {
      const response = await fetch(STATS_CSV_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`No se pudo descargar el CSV (${response.status}).`);
      }

      const csvText = await response.text();
      const allStats = parsePlayerStatsCSV(csvText);
      const stats = getPlayerStats(allStats, nick);

      if (!stats) {
        setStatsError(
          `Todavía no aparecen estadísticas para el nick oficial "${nick}".`
        );
      } else {
        setPlayerStats(stats);
      }
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
      setStatsError(
        err.message || "No se pudieron cargar las estadísticas del jugador."
      );
    } finally {
      setStatsLoading(false);
    }
  };

  // =========================================
  // ME GUSTA DE LA BIOGRAFÍA DEL JUGADOR
  // =========================================

  useEffect(() => {
    const profileUid = selectedPlayerProfile?.uid;
    if (!profileUid) {
      setBiographyLikes(0);
      setBiographyLiked(false);
      return;
    }

    const likesRef = collection(db, "perfiles_publicos", profileUid, "likes_biografia");
    const unsubscribe = onSnapshot(
      likesRef,
      (snapshot) => {
        setBiographyLikes(snapshot.size);
        setBiographyLiked(Boolean(user?.uid) && snapshot.docs.some((likeDoc) => likeDoc.id === user.uid));
      },
      (firebaseError) => {
        console.error("Error cargando los me gusta de la biografía:", firebaseError);
        setBiographyLikes(0);
        setBiographyLiked(false);
      }
    );

    return () => unsubscribe();
  }, [selectedPlayerProfile?.uid, user?.uid]);

  const toggleBiographyLike = async () => {
    const profileUid = selectedPlayerProfile?.uid;
    if (!profileUid || biographyLikeBusy) return;

    if (!user?.uid) {
      openMode("login");
      return;
    }

    setBiographyLikeBusy(true);
    try {
      const likeRef = doc(db, "perfiles_publicos", profileUid, "likes_biografia", user.uid);
      if (biographyLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          uid: user.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (firebaseError) {
      console.error("Error actualizando el me gusta de la biografía:", firebaseError);
      setError("NO SE PUDO REGISTRAR TU ME GUSTA. COMPRUEBA LOS PERMISOS DE FIRESTORE.");
    } finally {
      setBiographyLikeBusy(false);
    }
  };

  // =========================================
  // PUBLICACIONES DEL JUGADOR
  // =========================================

  useEffect(() => {
    if (playerView !== "posts" || !selectedPlayerProfile) {
      setPlayerPosts([]);
      setPostsLoading(false);
      setPostsError("");
      return;
    }

    setPostsLoading(true);
    setPostsError("");

    const postsRef = collection(db, "publicaciones");
    const postsQuery = query(postsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const profileUid = selectedPlayerProfile.uid;
        const profileNick = normalizeNick(selectedPlayerProfile.nick || selectedPlayer);

        const filtered = snapshot.docs
          .map((postDoc) => ({
            id: postDoc.id,
            ...postDoc.data()
          }))
          .filter((post) => {
            // Se prioriza el UID. Se conserva el filtro por nombre
            // como respaldo compatible con el comportamiento Android.
            if (post.uid && profileUid && post.uid === profileUid) return true;

            return normalizeNick(post.nombre) === profileNick;
          });

        setPlayerPosts(filtered);
        setPostsLoading(false);
        setPostsError("");
      },
      (firebaseError) => {
        console.error("Error cargando publicaciones:", firebaseError);
        setPostsLoading(false);
        setPostsError(
          "No se pudieron cargar las publicaciones. Comprueba los permisos de Firestore."
        );
      }
    );

    return () => unsubscribe();
  }, [playerView, selectedPlayerProfile, selectedPlayer]);

  const openPlayerPosts = () => {
    if (!selectedPlayerProfile) {
      setPlayerPhotoStatus("NO SE ENCONTRÓ EL PERFIL DEL JUGADOR");
      return;
    }

    setPlayerView("posts");
    setSelectedPlayer("");
  };

  const closePlayerView = () => {
    setPlayerView("");
    setPlayerStats(null);
    setStatsError("");
    setPlayerPosts([]);
    setPostsError("");
    closePlayerMenu();
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
  // AUTENTICACIÓN
  // =========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setOwnProfile(null);
        setOwnProfileOpen(false);
        setOwnAvatarPosition(null);
      }
    });

    return unsubscribe;
  }, []);

  const refreshOwnProfile = async (showLoader = true) => {
    if (!user?.uid) return null;

    if (showLoader) setOwnProfileLoading(true);
    setOwnProfileError("");

    try {
      const playerRef = doc(db, "jugadores", user.uid);
      const playerSnapshot = await getDoc(playerRef);

      if (!playerSnapshot.exists()) {
        setOwnProfile(null);
        setOwnProfileError("TU CUENTA TODAVÍA NO TIENE UN PERFIL DE JUGADOR ASIGNADO.");
        return null;
      }

      const data = playerSnapshot.data();
      const profile = {
        uid: user.uid,
        nick: String(data.nick || ""),
        equipo: String(data.equipo || ""),
        estado: String(data.estado || ""),
        biografia: String(data.biografia || ""),
        fotoPerfil: String(data.fotoPerfil || "").startsWith("https://") ? String(data.fotoPerfil) : "",
        gradientePerfil: String(data.gradientePerfil || "")
      };

      setOwnProfile(profile);
      setOwnBiographyDraft(profile.biografia);

      // Android mantiene el perfil público sincronizado con el documento privado.
      if (profile.estado === "ASIGNADO" && profile.nick && profile.equipo) {
        try {
          await setDoc(doc(db, "perfiles_publicos", user.uid), {
            uid: user.uid,
            nick: profile.nick,
            equipo: profile.equipo,
            ...(Object.prototype.hasOwnProperty.call(data, "fotoPerfil") ? { fotoPerfil: profile.fotoPerfil } : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "biografia") ? { biografia: profile.biografia } : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "gradientePerfil") ? { gradientePerfil: profile.gradientePerfil } : {})
          }, { merge: true });
        } catch (syncError) {
          console.warn("No se pudo sincronizar el perfil público:", syncError);
        }
      }

      return profile;
    } catch (profileError) {
      console.error("Error cargando el perfil propio:", profileError);
      setOwnProfileError("NO SE PUDO CARGAR TU PERFIL. COMPRUEBA TU CONEXIÓN Y LOS PERMISOS DE FIRESTORE.");
      return null;
    } finally {
      if (showLoader) setOwnProfileLoading(false);
    }
  };

  const openOwnProfile = async () => {
    if (!user) {
      openMode("login");
      return;
    }

    setOwnProfileOpen(true);
    setOwnProfileMessage("");
    setOwnProfileError("");
    await refreshOwnProfile(true);
  };

  // Carga la foto y los datos propios al entrar al menú del campeonato,
  // para que el avatar flotante aparezca con la imagen real sin esperar un toque.
  useEffect(() => {
    if (user?.uid && showCompetitionMenu) {
      refreshOwnProfile(false);
    }
  }, [user?.uid, showCompetitionMenu]);

  const closeOwnProfile = () => {
    setOwnProfileOpen(false);
    setOwnBiographyEditing(false);
    setOwnProfileError("");
    setOwnProfileMessage("");
  };

  const saveOwnBiography = async () => {
    if (!user?.uid || !ownProfile) return;

    const biography = String(ownBiographyDraft || "").slice(0, 250).trim();
    setOwnProfileSaving(true);
    setOwnProfileError("");
    setOwnProfileMessage("");

    try {
      await updateDoc(doc(db, "jugadores", user.uid), { biografia: biography });
      const updated = { ...ownProfile, biografia: biography };
      setOwnProfile(updated);

      if (updated.estado === "ASIGNADO" && updated.nick && updated.equipo) {
        await setDoc(doc(db, "perfiles_publicos", user.uid), {
          uid: user.uid,
          nick: updated.nick,
          equipo: updated.equipo,
          biografia
        }, { merge: true });
      }

      setOwnBiographyDraft(biography);
      setOwnBiographyEditing(false);
      setOwnProfileMessage("BIOGRAFÍA ACTUALIZADA CORRECTAMENTE.");
    } catch (saveError) {
      console.error("Error guardando la biografía:", saveError);
      setOwnProfileError("NO SE PUDO GUARDAR LA BIOGRAFÍA. REVISA LOS PERMISOS DE FIRESTORE.");
    } finally {
      setOwnProfileSaving(false);
    }
  };

  const saveOwnGradient = async (gradientName) => {
    if (!user?.uid || !ownProfile || !GRADIENTS[gradientName] || ownGradientSaving) return;

    setOwnGradientSaving(true);
    setOwnProfileError("");
    setOwnProfileMessage("");

    try {
      await updateDoc(doc(db, "jugadores", user.uid), { gradientePerfil: gradientName });
      const updated = { ...ownProfile, gradientePerfil: gradientName };
      setOwnProfile(updated);

      if (updated.estado === "ASIGNADO" && updated.nick && updated.equipo) {
        await setDoc(doc(db, "perfiles_publicos", user.uid), {
          uid: user.uid,
          nick: updated.nick,
          equipo: updated.equipo,
          gradientePerfil: gradientName
        }, { merge: true });
      }

      setOwnProfileMessage("DISEÑO DE PERFIL ACTUALIZADO.");
    } catch (saveError) {
      console.error("Error guardando el diseño del perfil:", saveError);
      setOwnProfileError("NO SE PUDO GUARDAR EL DISEÑO. REVISA LOS PERMISOS DE FIRESTORE.");
    } finally {
      setOwnGradientSaving(false);
    }
  };

  const uploadOwnProfilePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    if (!PROFILE_PHOTO_TYPES.includes(file.type)) {
      setOwnProfileError("FORMATO NO VÁLIDO. USA JPG, PNG O WEBP.");
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setOwnProfileError("LA FOTO SUPERA EL LÍMITE DE 15 MB.");
      return;
    }

    setOwnPhotoUploading(true);
    setOwnProfileError("");
    setOwnProfileMessage("");

    try {
      const token = await user.getIdToken(true);
      if (!token) throw new Error("Firebase no devolvió un token de sesión.");

      const response = await fetch(MEDIA_WORKER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
          Accept: "application/json"
        },
        body: file
      });

      const responseText = await response.text();
      let result = {};
      try { result = JSON.parse(responseText); } catch { /* respuesta no JSON */ }

      if (!response.ok || result.success !== true || !String(result.url || "").startsWith("https://")) {
        throw new Error(result.error || result.message || `El servicio de imágenes respondió ${response.status}.`);
      }

      await updateDoc(doc(db, "jugadores", user.uid), { fotoPerfil: result.url });
      const updated = { ...ownProfile, fotoPerfil: result.url };
      setOwnProfile(updated);

      if (updated.estado === "ASIGNADO" && updated.nick && updated.equipo) {
        await setDoc(doc(db, "perfiles_publicos", user.uid), {
          uid: user.uid,
          nick: updated.nick,
          equipo: updated.equipo,
          fotoPerfil: result.url
        }, { merge: true });
      }

      setOwnProfileMessage("FOTO DE PERFIL ACTUALIZADA.");
    } catch (uploadError) {
      console.error("Error subiendo la foto de perfil:", uploadError);
      setOwnProfileError(uploadError.message || "NO SE PUDO SUBIR LA FOTO DE PERFIL.");
    } finally {
      setOwnPhotoUploading(false);
    }
  };

  const handleOwnAvatarPointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setOwnAvatarDragStart({ x: event.clientX, y: event.clientY, left: rect.left, top: rect.top });
    setOwnAvatarWasDragged(false);
  };

  const handleOwnAvatarPointerMove = (event) => {
    if (!ownAvatarDragStart) return;
    const dx = event.clientX - ownAvatarDragStart.x;
    const dy = event.clientY - ownAvatarDragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) setOwnAvatarWasDragged(true);

    const left = Math.max(8, Math.min(window.innerWidth - 68, ownAvatarDragStart.left + dx));
    const top = Math.max(8, Math.min(window.innerHeight - 68, ownAvatarDragStart.top + dy));
    setOwnAvatarPosition({ left, top });
  };

  const handleOwnAvatarPointerUp = () => setOwnAvatarDragStart(null);

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
      setShowCompetitionMenu(false);
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
      setShowCompetitionMenu(false);
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
      setShowCompetitionMenu(false);
      setNotificationsOpen(false);
      setNotifications([]);
      setMessage("Has cerrado sesión correctamente.");
      setError("");
    } catch {
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
  // FOTO DE PERFIL AMPLIADA
  // =========================================

  const renderExpandedProfilePhoto = () => {
    if (!expandedProfilePhoto || !selectedPlayerProfile?.fotoPerfil) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Foto de ${selectedPlayerProfile.nick || selectedPlayer}`}
        onClick={() => setExpandedProfilePhoto(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10050,
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "rgba(0,0,0,.94)",
          cursor: "zoom-out"
        }}
      >
        <button
          type="button"
          onClick={() => setExpandedProfilePhoto(false)}
          aria-label="Cerrar foto ampliada"
          style={{
            position: "absolute",
            top: "max(18px, env(safe-area-inset-top))",
            right: "18px",
            width: "42px",
            height: "42px",
            border: "1px solid rgba(0,217,255,.45)",
            borderRadius: "50%",
            background: "rgba(5,20,35,.9)",
            color: "#fff",
            fontSize: "27px",
            cursor: "pointer"
          }}
        >×</button>
        <img
          src={selectedPlayerProfile.fotoPerfil}
          alt={selectedPlayerProfile.nick || selectedPlayer}
          onClick={(event) => event.stopPropagation()}
          style={{
            display: "block",
            maxWidth: "min(92vw, 720px)",
            maxHeight: "82vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius: "14px",
            border: "1px solid rgba(0,217,255,.45)",
            boxShadow: "0 0 35px rgba(0,217,255,.18)"
          }}
        />
        <p style={{
          position: "absolute",
          bottom: "max(18px, env(safe-area-inset-bottom))",
          left: "16px",
          right: "16px",
          margin: 0,
          color: "#D5E0EA",
          textAlign: "center",
          fontWeight: 800,
          letterSpacing: "1px"
        }}>{selectedPlayerProfile.nick || selectedPlayer}</p>
      </div>
    );
  };

  // =========================================
  // AVATAR FLOTANTE Y PERFIL PROPIO
  // =========================================

  const renderOwnProfile = () => {
    if (!ownProfileOpen) return null;

    const gradient = GRADIENTS[ownProfile?.gradientePerfil] || GRADIENTS.oceano;
    const displayName = ownProfile?.nick || user?.displayName || user?.email?.split("@")[0] || "JUGADOR";

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mi perfil"
        onClick={closeOwnProfile}
        style={{ position: "fixed", inset: 0, zIndex: 10040, display: "grid", placeItems: "center", padding: "14px", background: "rgba(0,0,0,.82)", backdropFilter: "blur(7px)" }}
      >
        <section
          onClick={(event) => event.stopPropagation()}
          style={{ width: "min(100%, 560px)", maxHeight: "92vh", overflowY: "auto", boxSizing: "border-box", padding: "22px 18px 26px", borderRadius: "18px", border: "1px solid rgba(0,217,255,.42)", background: `linear-gradient(145deg, ${gradient[0]}, #050B13 72%, ${gradient[1]})`, boxShadow: "0 0 36px rgba(0,217,255,.16)", color: "#fff" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
            <div>
              <small style={{ color: "#00D9FF", fontWeight: 900, letterSpacing: "1.4px" }}>LIGA4VS4 · CUENTA</small>
              <h2 style={{ margin: "5px 0 0", fontSize: "22px" }}>MI PERFIL</h2>
            </div>
            <button type="button" onClick={closeOwnProfile} aria-label="Cerrar perfil" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid rgba(0,217,255,.35)", background: "rgba(0,0,0,.35)", color: "#fff", fontSize: "24px", cursor: "pointer" }}>×</button>
          </div>

          {ownProfileLoading && <div className="matches-state"><span className="matches-spinner" /><p>CARGANDO TU PERFIL...</p></div>}

          {!ownProfileLoading && ownProfile && (
            <>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 12px", borderRadius: "15px", background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ width: "132px", height: "132px", borderRadius: "50%", padding: "4px", background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, border: "2px solid #00D9FF", boxShadow: "0 0 26px rgba(0,217,255,.3)" }}>
                  {ownProfile.fotoPerfil ? <img src={ownProfile.fotoPerfil} alt="Mi foto de perfil" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center", background: "#102B42", fontSize: "48px", fontWeight: 900 }}>{displayName.slice(0, 1).toUpperCase()}</div>}
                </div>
                <h3 style={{ margin: "14px 0 4px", fontSize: "23px", textAlign: "center" }}>{displayName}</h3>
                <strong style={{ color: "#00D9FF", fontSize: "12px", letterSpacing: ".7px" }}>{ownProfile.equipo || "EQUIPO PENDIENTE"}</strong>
                <small style={{ color: "#AABBCB", marginTop: "7px" }}>{ownProfile.estado === "ASIGNADO" ? "JUGADOR ASIGNADO" : "CUENTA REGISTRADA"}</small>
              </div>

              <div style={{ marginTop: "18px", padding: "16px", borderRadius: "13px", background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
                  <strong style={{ color: "#00D9FF", letterSpacing: "1px", fontSize: "13px" }}>FOTO DE PERFIL</strong>
                  <small style={{ color: "#8EA6BA" }}>JPG · PNG · WEBP</small>
                </div>
                <label htmlFor="own-profile-photo" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "9px", border: "1px solid rgba(0,217,255,.5)", background: "rgba(0,217,255,.1)", color: "#DDF9FF", fontWeight: 900, fontSize: "12px", cursor: ownPhotoUploading ? "wait" : "pointer" }}>
                  {ownPhotoUploading ? "SUBIENDO FOTO..." : "📷 CAMBIAR FOTO DE PERFIL"}
                </label>
                <input id="own-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadOwnProfilePhoto} disabled={ownPhotoUploading} style={{ display: "none" }} />
                <small style={{ display: "block", color: "#8298AA", textAlign: "center", marginTop: "8px" }}>Tamaño máximo: 15 MB</small>
              </div>

              <div style={{ marginTop: "14px", padding: "16px", borderRadius: "13px", background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                  <strong style={{ color: "#00D9FF", letterSpacing: "1px", fontSize: "13px" }}>BIOGRAFÍA</strong>
                  {!ownBiographyEditing && <button type="button" onClick={() => { setOwnBiographyDraft(ownProfile.biografia || ""); setOwnBiographyEditing(true); }} style={{ border: "1px solid rgba(0,217,255,.4)", borderRadius: "7px", background: "rgba(0,217,255,.1)", color: "#00D9FF", padding: "7px 10px", fontSize: "11px", fontWeight: 900 }}>EDITAR</button>}
                </div>
                {ownBiographyEditing ? (
                  <>
                    <textarea value={ownBiographyDraft} onChange={(event) => setOwnBiographyDraft(event.target.value.slice(0, 250))} maxLength={250} rows={4} placeholder="Escribe algo sobre ti..." style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: "9px", border: "1px solid rgba(0,217,255,.35)", background: "rgba(2,8,15,.85)", color: "#fff", padding: "12px", font: "inherit", fontSize: "14px", outline: "none" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginTop: "9px" }}>
                      <small style={{ color: "#8298AA" }}>{ownBiographyDraft.length}/250</small>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button type="button" onClick={() => { setOwnBiographyDraft(ownProfile.biografia || ""); setOwnBiographyEditing(false); }} style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "#B8C7D5", fontWeight: 800 }}>CANCELAR</button>
                        <button type="button" onClick={saveOwnBiography} disabled={ownProfileSaving} style={{ padding: "9px 13px", borderRadius: "8px", border: 0, background: "#00AFCB", color: "#001018", fontWeight: 900 }}>{ownProfileSaving ? "GUARDANDO..." : "GUARDAR"}</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: ownProfile.biografia ? "#DCE7F0" : "#8197AA", fontSize: "14px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{ownProfile.biografia || "Todavía no has escrito una biografía."}</p>
                )}
              </div>

              <div style={{ marginTop: "14px", padding: "16px", borderRadius: "13px", background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.1)" }}>
                <strong style={{ color: "#00D9FF", letterSpacing: "1px", fontSize: "13px" }}>DISEÑO DE FONDO</strong>
                <p style={{ color: "#8298AA", fontSize: "12px", margin: "6px 0 13px" }}>Elige uno de los ocho diseños disponibles en Android.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "9px" }}>
                  {Object.entries(GRADIENTS).map(([name, colors]) => (
                    <button key={name} type="button" onClick={() => saveOwnGradient(name)} disabled={ownGradientSaving} style={{ minHeight: "58px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "10px", borderRadius: "9px", border: ownProfile.gradientePerfil === name ? "2px solid #00D9FF" : "1px solid rgba(255,255,255,.18)", background: `linear-gradient(110deg, ${colors[0]}, ${colors[1]})`, color: "#fff", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", cursor: "pointer" }}>
                      {name}{ownProfile.gradientePerfil === name ? <span>✓</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!ownProfileLoading && !ownProfile && (
            <div className="matches-state matches-error"><p>{ownProfileError || "NO SE ENCONTRÓ TU DOCUMENTO DE JUGADOR."}</p><button type="button" className="primary-button" onClick={() => refreshOwnProfile(true)}>REINTENTAR</button></div>
          )}

          {ownProfileError && ownProfile && <p style={{ color: "#FF8290", fontSize: "12px", textAlign: "center" }}>{ownProfileError}</p>}
          {ownProfileMessage && <p style={{ color: "#67E6A5", fontSize: "12px", textAlign: "center", fontWeight: 800 }}>{ownProfileMessage}</p>}
          <button type="button" onClick={closeOwnProfile} style={{ width: "100%", marginTop: "18px", padding: "13px", borderRadius: "9px", border: "1px solid rgba(0,217,255,.35)", background: "rgba(0,217,255,.1)", color: "#DDF9FF", fontWeight: 900, letterSpacing: "1px" }}>CERRAR PERFIL</button>
        </section>
      </div>
    );
  };

  const renderOwnFloatingAvatar = () => {
    if (!user || !showCompetitionMenu) return null;

    const style = ownAvatarPosition
      ? { left: `${ownAvatarPosition.left}px`, top: `${ownAvatarPosition.top}px`, right: "auto", bottom: "auto" }
      : { right: "16px", bottom: "82px" };

    return (
      <button
        type="button"
        aria-label="Abrir mi perfil"
        title="Mi perfil"
        onPointerDown={handleOwnAvatarPointerDown}
        onPointerMove={handleOwnAvatarPointerMove}
        onPointerUp={handleOwnAvatarPointerUp}
        onPointerCancel={handleOwnAvatarPointerUp}
        onClick={() => {
          if (ownAvatarWasDragged) {
            setOwnAvatarWasDragged(false);
            return;
          }
          openOwnProfile();
        }}
        style={{ position: "fixed", ...style, zIndex: 10020, width: "60px", height: "60px", padding: "3px", borderRadius: "50%", border: "2px solid #00D9FF", background: "#082335", boxShadow: "0 0 22px rgba(0,217,255,.35), 0 8px 22px rgba(0,0,0,.55)", display: "grid", placeItems: "center", cursor: ownAvatarDragStart ? "grabbing" : "grab", touchAction: "none", userSelect: "none", animation: "ownProfileAvatarIn .45s ease-out" }}
      >
        {ownProfile?.fotoPerfil ? (
          <img src={ownProfile.fotoPerfil} alt="" draggable="false" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", pointerEvents: "none" }} />
        ) : (
          <span style={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", fontSize: "24px", fontWeight: 900, background: "linear-gradient(145deg,#0C4261,#071827)" }}>{String(ownProfile?.nick || user.displayName || user.email || "U").slice(0, 1).toUpperCase()}</span>
        )}
        <style>{`@keyframes ownProfileAvatarIn { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: scale(1); } }`}</style>
      </button>
    );
  };

  // =========================================
  // VENTANA PERFIL DEL JUGADOR
  // =========================================

  const renderPlayerMenu = () => {
    if (!selectedPlayer) return null;

    const gradientName = selectedPlayerProfile?.gradientePerfil || "";
    const gradient = GRADIENTS[gradientName] || ["#071827", "#123D59"];

    return (
      <div className="player-profile-overlay" onClick={closePlayerMenu}>
        <section
          className="player-profile-modal"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(94vw, 520px)",
            maxWidth: "520px",
            maxHeight: "92vh",
            overflowY: "auto",
            boxSizing: "border-box",
            padding: "24px 22px"
          }}
        >
          <div className="player-profile-heading">PERFIL DEL JUGADOR</div>

          <button
            type="button"
            className="player-profile-avatar"
            onClick={() => selectedPlayerPhoto && setExpandedProfilePhoto(true)}
            aria-label="Ampliar foto de perfil"
            style={{
              background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
              cursor: selectedPlayerPhoto ? "zoom-in" : "default",
              width: "clamp(116px, 31vw, 142px)",
              height: "clamp(116px, 31vw, 142px)",
              minWidth: "116px",
              minHeight: "116px",
              padding: 0,
              border: "2px solid rgba(0,217,255,.85)",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 0 26px rgba(0,217,255,.2)"
            }}
          >
            {selectedPlayerPhoto ? (
              <img src={selectedPlayerPhoto} alt={selectedPlayer} />
            ) : (
              <span>{selectedPlayer.slice(0, 1).toUpperCase()}</span>
            )}
          </button>

          {playerPhotoLoading ? (
            <p className="player-profile-photo-status">BUSCANDO JUGADOR...</p>
          ) : playerPhotoStatus ? (
            <p className="player-profile-photo-status">{playerPhotoStatus}</p>
          ) : null}

          <h3 className="player-profile-name">
            {selectedPlayerProfile?.nick || selectedPlayer}
          </h3>

          {selectedPlayerProfile?.equipo && (
            <p style={{
              color: "#00D9FF",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "700",
              margin: "5px 0"
            }}>
              {selectedPlayerProfile.equipo}
            </p>
          )}

          {selectedPlayerProfile?.biografia && (
            <p style={{
              color: "#AABBCB",
              textAlign: "center",
              fontSize: "12px",
              margin: "8px 12px"
            }}>
              {selectedPlayerProfile.biografia}
            </p>
          )}

          <div className="player-profile-divider" />

          <button
            type="button"
            className="player-profile-option"
            onClick={openPlayerProfile}
          >
            <span className="player-profile-option-icon" style={{ fontSize: "29px", width: "42px", minWidth: "42px", textAlign: "center" }}>◉</span>
            <span>
              <strong>VER PERFIL</strong>
              <small>Información y biografía del jugador</small>
            </span>
            <b>›</b>
          </button>

          <button
            type="button"
            className="player-profile-option"
            onClick={openPlayerStats}
          >
            <span className="player-profile-option-icon" style={{ fontSize: "29px", width: "42px", minWidth: "42px", textAlign: "center" }}>◈</span>
            <span>
              <strong>VER STATS</strong>
              <small>Estadísticas individuales del jugador</small>
            </span>
            <b>›</b>
          </button>

          <button
            type="button"
            className="player-profile-option"
            onClick={openPlayerPosts}
          >
            <span className="player-profile-option-icon" style={{ fontSize: "29px", width: "42px", minWidth: "42px", textAlign: "center" }}>▣</span>
            <span>
              <strong>VER PUBLICACIONES</strong>
              <small>Jugadas destacadas de este jugador</small>
            </span>
            <b>›</b>
          </button>

          <button
            type="button"
            className="player-profile-close"
            onClick={closePlayerMenu}
          >
            CERRAR
          </button>
        </section>
      </div>
    );
  };

  // =========================================
  // PESTAÑAS DEL PERFIL PÚBLICO
  // =========================================

  const renderPlayerTabs = () => (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "9px",
      width: "100%",
      margin: "20px 0 24px",
      padding: "5px",
      borderRadius: "12px",
      background: "rgba(3,12,22,.9)",
      border: "1px solid rgba(0,217,255,.18)"
    }}>
      {[
        ["profile", "PERFIL"],
        ["stats", "ESTADÍSTICAS"],
        ["posts", "ACTIVIDAD"]
      ].map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          onClick={() => {
            if (tab === "stats") {
              if (playerView !== "stats" || !playerStats) openPlayerStats();
            } else if (tab === "posts") {
              openPlayerPosts();
            } else {
              setPlayerView("profile");
            }
          }}
          style={{
            minWidth: 0,
            padding: "15px 5px",
            border: playerView === tab ? "1px solid rgba(0,217,255,.7)" : "1px solid transparent",
            borderRadius: "8px",
            background: playerView === tab ? "linear-gradient(135deg,rgba(0,217,255,.2),rgba(0,91,140,.18))" : "transparent",
            color: playerView === tab ? "#00D9FF" : "#8197AA",
            fontSize: "clamp(11px, 2.8vw, 13px)",
            fontWeight: 900,
            letterSpacing: ".35px",
            cursor: "pointer"
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderPlayerIdentity = () => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      margin: "18px 0 12px",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {selectedPlayerProfile?.fotoPerfil ? (
        <button
          type="button"
          onClick={() => setExpandedProfilePhoto(true)}
          aria-label="Ampliar foto de perfil"
          title="Ampliar foto"
          style={{
            width: "clamp(82px, 22vw, 104px)",
            height: "clamp(82px, 22vw, 104px)",
            padding: 0,
            border: "2px solid #00D9FF",
            borderRadius: "50%",
            overflow: "hidden",
            background: "transparent",
            cursor: "zoom-in",
            flex: "0 0 auto"
          }}
        >
          <img
            src={selectedPlayerProfile.fotoPerfil}
            alt={selectedPlayerProfile.nick || selectedPlayer}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </button>
      ) : (
        <div style={{
          width: "clamp(82px, 22vw, 104px)",
          height: "clamp(82px, 22vw, 104px)",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "#123D59",
          color: "#fff",
          fontSize: "34px",
          fontWeight: "800"
        }}>
          {(selectedPlayerProfile?.nick || selectedPlayer || "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ textAlign: "left" }}>
        <strong style={{ color: "#fff", display: "block", fontSize: "clamp(19px, 4vw, 23px)" }}>
          {selectedPlayerProfile?.nick || selectedPlayer}
        </strong>
        <small style={{ color: "#00D9FF", fontWeight: 700 }}>
          {selectedPlayerProfile?.equipo || ""}
        </small>
      </div>
    </div>
  );

  const renderPlayerProfile = () => (
    <section className="web-section-placeholder" style={{
      width: "100%",
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "22px 16px 110px",
      boxSizing: "border-box"
    }}>
      <span className="placeholder-label">JUGADOR</span>
      <h2>PERFIL</h2>
      {renderPlayerIdentity()}
      {renderPlayerTabs()}

      <div style={{
        padding: "20px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(0,217,255,.22)",
        background: "linear-gradient(145deg,rgba(5,25,43,.95),rgba(3,10,19,.95))",
        textAlign: "left"
      }}>
        <small style={{ color: "#00D9FF", fontWeight: 800, letterSpacing: "1px" }}>BIOGRAFÍA</small>
        <p style={{
          color: selectedPlayerProfile?.biografia ? "#D5E0EA" : "#71899D",
          fontSize: "15px",
          lineHeight: 1.75,
          margin: "12px 0 0",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere"
        }}>
          {selectedPlayerProfile?.biografia || "Este jugador todavía no ha añadido una biografía."}
        </p>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "18px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(0,217,255,.13)"
        }}>
          <span style={{ color: "#91A8BA", fontSize: "12px", fontWeight: 700 }}>
            {biographyLikes} {biographyLikes === 1 ? "ME GUSTA" : "ME GUSTA"}
          </span>
          <button
            type="button"
            onClick={toggleBiographyLike}
            disabled={biographyLikeBusy}
            aria-pressed={biographyLiked}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: biographyLiked ? "1px solid rgba(255,75,112,.75)" : "1px solid rgba(0,217,255,.4)",
              background: biographyLiked ? "rgba(255,55,100,.14)" : "rgba(0,217,255,.08)",
              color: biographyLiked ? "#FF6B91" : "#00D9FF",
              fontSize: "14px",
              fontWeight: 900,
              cursor: biographyLikeBusy ? "wait" : "pointer",
              opacity: biographyLikeBusy ? .65 : 1
            }}
          >
            <span style={{ fontSize: "21px", lineHeight: 1 }}>{biographyLiked ? "♥" : "♡"}</span>
            {biographyLikeBusy ? "GUARDANDO..." : biographyLiked ? "TE GUSTA" : "ME GUSTA"}
          </button>
        </div>
      </div>

      <button className="primary-button" onClick={closePlayerView} style={{ marginTop: "20px" }}>
        VOLVER A EQUIPOS
      </button>
    </section>
  );

  // =========================================
  // VISTA DE ESTADÍSTICAS
  // =========================================

  const renderPlayerStats = () => (
    <section className="web-section-placeholder" style={{
      width: "100%",
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "22px 16px 110px",
      boxSizing: "border-box"
    }}>
      <span className="placeholder-label">PERFIL DEL JUGADOR</span>
      <h2>ESTADÍSTICAS</h2>

      {renderPlayerIdentity()}
      {renderPlayerTabs()}

      {statsLoading && (
        <div className="matches-state">
          <span className="matches-spinner" />
          <p>CARGANDO ESTADÍSTICAS...</p>
        </div>
      )}

      {!statsLoading && statsError && (
        <div className="matches-state matches-error">
          <p>{statsError}</p>
        </div>
      )}

      {!statsLoading && playerStats && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "13px",
            margin: "18px 0"
          }}>
            {[
              ["🏆", "RANKING", `#${playerStats.ranking}`],
              ["🎯", "BAJAS", formatNumber(playerStats.kills)],
              ["💀", "MUERTES", formatNumber(playerStats.deaths)],
              ["🤝", "ASISTENCIAS", formatNumber(playerStats.assists)],
              ["⚔️", "K/D GLOBAL", formatNumber(playerStats.kd, 2)],
              ["🗺️", "MAPAS JUGADOS", formatNumber(playerStats.maps)]
            ].map(([icon, label, value]) => (
              <div
                key={label}
                style={{
                  padding: "22px 13px",
                  minHeight: "112px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  border: "1px solid rgba(0,217,255,.3)",
                  borderRadius: "12px",
                  background: "rgba(5,20,35,.75)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  <span aria-hidden="true" style={{ fontSize: "25px", lineHeight: 1 }}>{icon}</span>
                  <small style={{
                    display: "block",
                    color: "#8EA6BA",
                    fontSize: "12px",
                    fontWeight: "800",
                    letterSpacing: ".45px"
                  }}>
                    {label}
                  </small>
                </div>
                <strong style={{
                  display: "block",
                  color: "#00D9FF",
                  fontSize: "clamp(27px, 5vw, 34px)",
                  marginTop: "9px",
                  lineHeight: 1.1
                }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
            gap: "10px",
            margin: "15px 0"
          }}>
            {[
              ["🟢", "GANADOS", playerStats.hasWins ? formatNumber(playerStats.wins) : "—"],
              ["🔴", "PERDIDOS", playerStats.hasLosses ? formatNumber(playerStats.losses) : "—"],
              ["📈", "VICTORIAS", playerStats.hasMaps
                ? `${formatNumber(playerStats.winRate, 1)}%`
                : "—"]
            ].map(([icon, label, value]) => (
              <div
                key={label}
                style={{
                  padding: "17px 8px",
                  minHeight: "78px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.1)"
                }}
              >
                <small style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#8EA6BA", fontSize: "11px", fontWeight: 800 }}>
                  <span aria-hidden="true" style={{ fontSize: "18px" }}>{icon}</span>
                  {label}
                </small>
                <strong style={{ color: "#fff", fontSize: "clamp(19px, 3.8vw, 23px)", display: "block", marginTop: "5px" }}>{value}</strong>
              </div>
            ))}
          </div>

          <p style={{
            color: "#71899D",
            fontSize: "12px",
            textAlign: "center",
            marginTop: "15px"
          }}>
            POSICIÓN CALCULADA POR BAJAS ACUMULADAS
          </p>
        </>
      )}

      <button className="primary-button" onClick={closePlayerView}>
        VOLVER
      </button>
    </section>
  );

  // =========================================
  // VISTA DE PUBLICACIONES
  // =========================================

  const renderPlayerPosts = () => (
    <section className="web-section-placeholder" style={{
      width: "100%",
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "22px 16px 110px",
      boxSizing: "border-box"
    }}>
      <span className="placeholder-label">PERFIL DEL JUGADOR</span>
      <h2>JUGADAS DESTACADAS</h2>

      {renderPlayerIdentity()}
      {renderPlayerTabs()}

      {postsLoading && (
        <div className="matches-state">
          <span className="matches-spinner" />
          <p>CARGANDO PUBLICACIONES...</p>
        </div>
      )}

      {!postsLoading && postsError && (
        <div className="matches-state matches-error">
          <p>{postsError}</p>
        </div>
      )}

      {!postsLoading && !postsError && playerPosts.length === 0 && (
        <div className="matches-state">
          <p>ESTE JUGADOR TODAVÍA NO TIENE PUBLICACIONES.</p>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "18px",
        marginTop: "15px"
      }}>
        {playerPosts.map((post) => {
          const isVideo = String(post.mediaType || "").startsWith("video/");

          return (
            <article
              key={post.id}
              style={{
                overflow: "hidden",
                borderRadius: "12px",
                background: "rgba(5,15,27,.9)",
                border: "1px solid rgba(0,217,255,.2)",
                textAlign: "left"
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px"
              }}>
                {selectedPlayerProfile?.fotoPerfil ? (
                  <img
                    src={selectedPlayerProfile.fotoPerfil}
                    alt=""
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      objectFit: "cover"
                    }}
                  />
                ) : (
                  <span style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "#123D59",
                    color: "#fff"
                  }}>
                    {(post.nick || post.nombre || "?").slice(0, 1)}
                  </span>
                )}

                <div>
                  <strong style={{ color: "#fff", display: "block" }}>
                    {post.nick || post.nombre || selectedPlayer}
                  </strong>
                  <small style={{ color: "#00D9FF" }}>
                    {post.equipo || selectedPlayerProfile?.equipo || ""}
                  </small>
                </div>
              </div>

              {post.mediaUrl && (
                isVideo ? (
                  <video
                    src={post.mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "440px",
                      background: "#000"
                    }}
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt="Publicación del jugador"
                    loading="lazy"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "440px",
                      objectFit: "contain",
                      background: "#000"
                    }}
                  />
                )
              )}

              {post.descripcion && (
                <p style={{
                  color: "#E5EDF5",
                  padding: "12px",
                  margin: 0,
                  fontSize: "13px",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere"
                }}>
                  {post.descripcion}
                </p>
              )}

              <div style={{
                padding: "0 12px 12px",
                color: "#7890A5",
                fontSize: "10px"
              }}>
                {formatPostDate(post.createdAt)}
              </div>
            </article>
          );
        })}
      </div>

      <button className="primary-button" onClick={closePlayerView}>
        VOLVER
      </button>
    </section>
  );

  // =========================================
  // PANTALLA PRINCIPAL
  // =========================================

  const renderWelcome = () => (
    <section className="android-welcome">
      <div className="welcome-logo-panel">
        <div className="welcome-logo-mark">
          <span>LIGA</span>
          <strong>4VS4</strong>
        </div>

        <div className="welcome-logo-caption">COMPETICIÓN OFICIAL</div>
      </div>

      <div className="welcome-matches-heading">
        <h2>PRÓXIMOS ENFRENTAMIENTOS</h2>
        <span className="welcome-live"><i /> EN VIVO</span>
      </div>

      <div className="welcome-matches-panel">
        {announcement.active && (
          <div className="announcement-bar">
            <span className="announcement-icon">⚡</span>
            <div className="announcement-marquee">
              <span>{announcement.message}</span>
            </div>
          </div>
        )}

        {matchesLoading && (
          <div className="matches-state">
            <span className="matches-spinner" />
            <p>CARGANDO ENFRENTAMIENTOS...</p>
          </div>
        )}

        {!matchesLoading && matchesError && (
          <div className="matches-state matches-error"><p>{matchesError}</p></div>
        )}

        {!matchesLoading && !matchesError && currentMatchday && (
          <>
            <div className="matchday-label">
              <span>JORNADA</span>
              <strong>{currentMatchday.jornada}</strong>
            </div>

            <div className="matches-list">
              {currentMatchday.matches
                .filter((match) => !isFinishedMatch(match))
                .map((match, index) => {
                  const shield1 = getTeamShield(match.team1);
                  const shield2 = getTeamShield(match.team2);

                  return (
                    <article
                      className="welcome-match-card"
                      key={`${match.jornada}-${match.team1}-${match.team2}-${index}`}
                    >
                      <div className="match-team">
                        <button
                          type="button"
                          className="match-shield-button"
                          onClick={() => toggleTeamRoster(match.team1)}
                          aria-label={`Ver jugadores de ${match.team1}`}
                        >
                          {shield1 ? (
                            <img
                              src={shield1}
                              alt={`Escudo ${match.team1}`}
                              className="match-shield"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="match-shield-fallback">
                              {normalizeText(match.team1).slice(0, 2)}
                            </span>
                          )}
                        </button>
                        <strong>{match.team1}</strong>
                      </div>

                      <div className="match-center">
                        <span className="match-vs">VS</span>
                        <span className="match-pending">PENDIENTE</span>
                      </div>

                      <div className="match-team">
                        <button
                          type="button"
                          className="match-shield-button"
                          onClick={() => toggleTeamRoster(match.team2)}
                          aria-label={`Ver jugadores de ${match.team2}`}
                        >
                          {shield2 ? (
                            <img
                              src={shield2}
                              alt={`Escudo ${match.team2}`}
                              className="match-shield"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="match-shield-fallback">
                              {normalizeText(match.team2).slice(0, 2)}
                            </span>
                          )}
                        </button>
                        <strong>{match.team2}</strong>
                      </div>

                      {expandedTeams[match.team1] && (
                        <div className="team-roster">
                          <div className="team-roster-heading">
                            JUGADORES · {match.team1}
                          </div>

                          {playersLoading && players.length === 0
                            ? <p>Cargando jugadores...</p>
                            : getPlayersForTeam(match.team1).length > 0
                            ? getPlayersForTeam(match.team1).map((player, playerIndex) => (
                                <div className="team-roster-player" key={`${player.player}-${playerIndex}`}>
                                  <span>{playerIndex + 1}</span>{player.player}
                                </div>
                              ))
                            : <p>{playersError || "No se encontraron jugadores para este equipo."}</p>}
                        </div>
                      )}

                      {expandedTeams[match.team2] && (
                        <div className="team-roster">
                          <div className="team-roster-heading">
                            JUGADORES · {match.team2}
                          </div>

                          {playersLoading && players.length === 0
                            ? <p>Cargando jugadores...</p>
                            : getPlayersForTeam(match.team2).length > 0
                            ? getPlayersForTeam(match.team2).map((player, playerIndex) => (
                                <div className="team-roster-player" key={`${player.player}-${playerIndex}`}>
                                  <span>{playerIndex + 1}</span>{player.player}
                                </div>
                              ))
                            : <p>{playersError || "No se encontraron jugadores para este equipo."}</p>}
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          </>
        )}

        {!matchesLoading && !matchesError && !currentMatchday && (
          <div className="matches-state">
            <p>NO HAY ENFRENTAMIENTOS PENDIENTES.</p>
          </div>
        )}
      </div>

      <div className="welcome-competition-active">
        <span className="championship-status-dot" />
        SISTEMA DE COMPETICIÓN ACTIVO
      </div>

      <div className="welcome-footer">LIGA 4VS4 OFICIAL | 2026</div>

      <button className="welcome-enter-button" onClick={enterChampionship}>
        ENTRAR AL CAMPEONATO <span>›</span>
      </button>

      {!user && (
        <button className="welcome-register-link" onClick={() => openMode("register")}>
          ¿NO TIENES CUENTA? <strong>REGÍSTRATE</strong>
        </button>
      )}
    </section>
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
              {renderWelcome()}

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
                        ? <Clasificacion />
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

      {mode !== "home" && !user && (
        <div className="auth-overlay" onClick={() => openMode("home")}>
          <section className="auth-card" onClick={(event) => event.stopPropagation()}>
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
              {mode === "forgot" && "Te enviaremos instrucciones a tu correo."}
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
              <label htmlFor="auth-email">CORREO ELECTRÓNICO</label>

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
                  <label htmlFor="auth-password">CONTRASEÑA</label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                  />
                </>
              )}

              {mode === "register" && (
                <>
                  <label htmlFor="auth-confirm">CONFIRMAR CONTRASEÑA</label>
                  <input
                    id="auth-confirm"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </>
              )}

              {error && <div className="auth-message error-message">{error}</div>}
              {message && <div className="auth-message success-message">{message}</div>}

              <button className="auth-submit" type="submit" disabled={processing}>
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
                    <button onClick={() => openMode("register")}>Regístrate</button>
                  </p>
                </>
              )}

              {mode === "register" && (
                <p>
                  ¿Ya tienes cuenta?{" "}
                  <button onClick={() => openMode("login")}>Inicia sesión</button>
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
