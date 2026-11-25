
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
  writeBatch
} from "firebase/firestore";

import { auth, db } from "./firebase";

// =========================================
// FUENTES DE DATOS
// =========================================

const MATCHES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=0&single=true&output=csv";

const PLAYERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=59010702&single=true&output=csv";

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
  "THE BUTCHERS":
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEifCUkuhD1Rotz7ryg2x5csfz6tdYpBMzJjbHTxS-6q-UlccYFeG6Dn5SLVOlG9FAAY1d8oGURG5QpaDMSyeG6nN87bEbbAtjr14gQn4CKj36yhUBpTcMjLyj6C8LC9Lsrzme520bSRVvvQXYV7DAMs2zA5lN-SwfmN5EMeHp1QL8XxcaX9SafZBBCI89k/s1341/1000138092.png",
  NOMERCY:
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjcBDOqw3eSzt2_VLN1SyblE3rXVWh5Yw9-fvuw4ctVeA9zAt3KGub2nMn8z0wAHyTN7Zy14Q8JS1F8ZIxDJwfJfRNNKtt9iz0LeM2qG7A_yJCQ_2Op4qOu13A7gufB-3sHjdkNmZhEX4az8Urq-JRM6fkNzMAShQI1cplKe8IHKubVzAB-cVobGOoUYYQ/s1600/1000113547.png"
};

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
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

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

// =========================================
// UTILIDADES CSV
// =========================================

const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
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

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[_\-\s]/g, "");

const normalizeTeam = (name) => {
  const normalized = normalizeText(name);

  switch (normalized) {
    case "ETERNITY":
      return "ETERNITY";
    case "2D":
      return "2D";
    case "KINGS":
      return "KINGS";
    case "LYCORIS":
    case "LYCORYS":
      return "Lycoris";
    case "THEBUTCHERS":
      return "THE BUTCHERS";
    case "NOMERCY":
      return "NoMercy";
    default:
      return String(name || "").trim();
  }
};

const findHeaderIndex = (headers, candidates) =>
  headers.findIndex((header) =>
    candidates.includes(normalizeText(header))
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

const parseMatchesCSV = (csvText) => {
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const headers = rows[0];

  const jornadaIndex = findHeaderIndex(headers, [
    "JORNADA",
    "FECHA",
    "MATCHDAY"
  ]);

  const team1Index = findHeaderIndex(headers, [
    "EQUIPO1",
    "EQUIPOA",
    "LOCAL",
    "TEAM1"
  ]);

  const score1Index = findHeaderIndex(headers, [
    "PUNTOS1",
    "PUNTAJE1",
    "MARCADOR1",
    "SCORE1"
  ]);

  const team2Index = findHeaderIndex(headers, [
    "EQUIPO2",
    "EQUIPOB",
    "VISITANTE",
    "TEAM2"
  ]);

  const score2Index = findHeaderIndex(headers, [
    "PUNTOS2",
    "PUNTAJE2",
    "MARCADOR2",
    "SCORE2"
  ]);

  const hasRecognizedHeaders =
    jornadaIndex >= 0 &&
    team1Index >= 0 &&
    team2Index >= 0;

  const indexes = hasRecognizedHeaders
    ? {
        jornada: jornadaIndex,
        team1: team1Index,
        score1: score1Index,
        team2: team2Index,
        score2: score2Index
      }
    : {
        jornada: 0,
        team1: 1,
        score1: 2,
        team2: 3,
        score2: 4
      };

  return rows.slice(1).map((row) => ({
    jornada: row[indexes.jornada] || "",
    team1: normalizeTeam(row[indexes.team1]),
    score1:
      indexes.score1 >= 0 ? row[indexes.score1] || "" : "",
    team2: normalizeTeam(row[indexes.team2]),
    score2:
      indexes.score2 >= 0 ? row[indexes.score2] || "" : ""
  })).filter(
    (match) => match.jornada && match.team1 && match.team2
  );
};

const getCurrentMatchday = (matches) => {
  const groups = [];

  matches.forEach((match) => {
    let group = groups.find(
      (item) => item.jornada === match.jornada
    );

    if (!group) {
      group = {
        jornada: match.jornada,
        matches: []
      };

      groups.push(group);
    }

    group.matches.push(match);
  });

  return (
    groups.find((group) =>
      group.matches.some((match) => !isFinishedMatch(match))
    ) || null
  );
};

const parsePlayersCSV = (csvText) => {
  const rows = parseCSV(csvText);

  if (rows.length < 2) return [];

  const headers = rows[0];

  const teamIndex = findHeaderIndex(headers, [
    "EQUIPO",
    "TEAM",
    "CLUB"
  ]);

  const playerIndex = findHeaderIndex(headers, [
    "JUGADOR",
    "NICK",
    "NOMBRE",
    "PLAYER",
    "USUARIO"
  ]);

  if (teamIndex < 0 || playerIndex < 0) {
    return [];
  }

  return rows.slice(1)
    .map((row) => ({
      team: normalizeTeam(row[teamIndex]),
      player: String(row[playerIndex] || "").trim()
    }))
    .filter((player) => player.team && player.player)
    .sort((a, b) =>
      a.player.localeCompare(b.player, "es", {
        sensitivity: "base"
      })
    );
};

// =========================================
// MENÚ Y NAVEGACIÓN
// =========================================

const menuItems = [
  {
    id: "clasificacion",
    number: "01",
    title: "CLASIFICACIÓN",
    icon: "🏆"
  },
  {
    id: "proximos",
    number: "02",
    title: "PRÓXIMOS ENFRENTAMIENTOS",
    icon: "⚔️"
  },
  {
    id: "resultados",
    number: "03",
    title: "ÚLTIMOS RESULTADOS",
    icon: "📊"
  },
  {
    id: "equipos",
    number: "04",
    title: "EQUIPOS",
    icon: "🛡️"
  },
  {
    id: "jornadas",
    number: "05",
    title: "JORNADAS",
    icon: "📅"
  },
  {
    id: "publicaciones",
    number: "06",
    title: "JUGADAS DESTACADAS",
    icon: "🎥"
  }
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

  // =========================================
  // DATOS DE LA PANTALLA PRINCIPAL
  // =========================================

  const [announcement, setAnnouncement] = useState({
    active: false,
    message: ""
  });

  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    const announcementRef = doc(
      db,
      "configuracion",
      "barra_avisos"
    );

    const unsubscribe = onSnapshot(
      announcementRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setAnnouncement({
            active: false,
            message: ""
          });
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
        console.error(
          "Error al escuchar la barra de avisos:",
          firebaseError
        );

        setAnnouncement({
          active: false,
          message: ""
        });
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCompetitionData = async () => {
      try {
        const [matchesResponse, playersResponse] = await Promise.all([
          fetch(MATCHES_CSV_URL, { cache: "no-store" }),
          fetch(PLAYERS_CSV_URL, { cache: "no-store" })
        ]);

        if (!matchesResponse.ok) {
          throw new Error(
            `No se pudo descargar el CSV de enfrentamientos (${matchesResponse.status}).`
          );
        }

        if (!playersResponse.ok) {
          throw new Error(
            `No se pudo descargar el CSV de jugadores (${playersResponse.status}).`
          );
        }

        const [matchesText, playersText] = await Promise.all([
          matchesResponse.text(),
          playersResponse.text()
        ]);

        const parsedMatches = parseMatchesCSV(matchesText);
        const parsedPlayers = parsePlayersCSV(playersText);

        if (!mounted) return;

        setMatches(parsedMatches);
        setPlayers(parsedPlayers);
        setMatchesError("");
        setMatchesLoading(false);
      } catch (err) {
        console.error("Error cargando datos de competición:", err);

        if (!mounted) return;

        setMatchesError(
          "No se pudieron cargar los enfrentamientos. Comprueba la conexión con Google Sheets."
        );
        setMatchesLoading(false);
      }
    };

    loadCompetitionData();

    const interval = window.setInterval(
      loadCompetitionData,
      REFRESH_INTERVAL
    );

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
      (player) =>
        normalizeText(player.team) === normalizeText(team)
    );

  // =========================================
  // NOTIFICACIONES FIRESTORE
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

    const notificationsRef = collection(
      db,
      "jugadores",
      user.uid,
      "notificaciones"
    );

    const notificationsQuery = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

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
        console.error(
          "Error al cargar las notificaciones:",
          firebaseError
        );

        setNotificationsLoading(false);
        setNotificationError(
          "No se pudieron cargar las notificaciones."
        );
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
      setNotificationError(
        "No se pudo marcar la notificación como leída."
      );
    }
  };

  const deleteNotification = async (notificationId) => {
    if (notificationAction || !user) return;

    const confirmed = window.confirm(
      "¿Deseas eliminar esta notificación?"
    );

    if (!confirmed) return;

    setNotificationAction(true);
    setNotificationError("");

    try {
      const notificationRef = doc(
        db,
        "jugadores",
        user.uid,
        "notificaciones",
        notificationId
      );

      await deleteDoc(notificationRef);
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
      setNotificationError(
        "No se pudo eliminar la notificación."
      );
    } finally {
      setNotificationAction(false);
    }
  };

  const deleteAllNotifications = async () => {
    if (
      notifications.length === 0 ||
      notificationAction ||
      !user
    ) {
      return;
    }

    const confirmed = window.confirm(
      "¿Deseas eliminar todas tus notificaciones? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    setNotificationAction(true);
    setNotificationError("");

    try {
      const notificationsRef = collection(
        db,
        "jugadores",
        user.uid,
        "notificaciones"
      );

      const chunks = [];

      for (let i = 0; i < notifications.length; i += 450) {
        chunks.push(notifications.slice(i, i + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);

        chunk.forEach((notification) => {
          const notificationRef = doc(
            notificationsRef,
            notification.id
          );

          batch.delete(notificationRef);
        });

        await batch.commit();
      }
    } catch (err) {
      console.error(
        "Error al eliminar todas las notificaciones:",
        err
      );

      setNotificationError(
        "No se pudieron eliminar todas las notificaciones."
      );
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
    });

    return unsubscribe;
  }, []);

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
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

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
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

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
      setError(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      );
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToWelcome = () => {
    setShowCompetitionMenu(false);
    setActiveSection("inicio");
    setNotificationsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================================
  // PANEL DE NOTIFICACIONES
  // =========================================

  const renderNotifications = () => (
    <div className="menu-notifications-panel">
      <div className="notifications-heading">
        <div>
          <h3>NOTIFICACIONES</h3>
          <p>CENTRO DE AVISOS</p>
        </div>

        <button
          onClick={() => setNotificationsOpen(false)}
          aria-label="Cerrar notificaciones"
        >
          ✕
        </button>
      </div>

      <div
        style={{
          height: "2px",
          background: "linear-gradient(90deg, #00D9FF, transparent)",
          margin: "10px 0"
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          gap: "8px"
        }}
      >
        <span
          style={{
            color: "#8EA6BA",
            fontSize: "11px",
            fontWeight: "700"
          }}
        >
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
          <div className="notifications-empty">
            CARGANDO NOTIFICACIONES...
          </div>
        )}

        {!notificationsLoading &&
          !notificationError &&
          notifications.length === 0 && (
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
              className={`notification-item ${
                unread ? "unread" : ""
              }`}
            >
              <div className="notification-item-content">
                <div className="notification-item-title">
                  {unread && <span className="notification-unread-dot" />}

                  <strong>
                    {notification.titulo || "AVISO DE LIGA4VS4"}
                  </strong>
                </div>

                <p>{notification.mensaje || ""}</p>

                <small>
                  {formatNotificationDate(notification.createdAt)}
                </small>

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
        <p className="notification-error">
          {notificationError}
        </p>
      )}

      <div className="notifications-footer">
        LIGA 4VS4 • SISTEMA DE AVISOS
      </div>
    </div>
  );

  // =========================================
  // PANTALLA DE BIENVENIDA ANDROID
  // =========================================

  const renderWelcome = () => (
    <section className="android-welcome">
      <div className="welcome-logo-panel">
        <div className="welcome-logo-mark">
          <span>LIGA</span>
          <strong>4VS4</strong>
        </div>
        <div className="welcome-logo-caption">
          COMPETICIÓN OFICIAL
        </div>
      </div>

      <div className="welcome-matches-heading">
        <h2>PRÓXIMOS ENFRENTAMIENTOS</h2>
        <span className="welcome-live">
          <i />
          EN VIVO
        </span>
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
          <div className="matches-state matches-error">
            <p>{matchesError}</p>
          </div>
        )}

        {!matchesLoading &&
          !matchesError &&
          currentMatchday && (
            <>
              <div className="matchday-label">
                <span>JORNADA</span>
                <strong>{currentMatchday.jornada}</strong>
              </div>

              <div className="matches-list">
                {currentMatchday.matches
                  .filter((match) => !isFinishedMatch(match))
                  .map((match, index) => (
                    <article
                      className="welcome-match-card"
                      key={`${match.jornada}-${match.team1}-${match.team2}-${index}`}
                    >
                      <div className="match-team">
                        <button
                          type="button"
                          className="match-shield-button"
                          onClick={() =>
                            toggleTeamRoster(match.team1)
                          }
                          aria-label={`Ver jugadores de ${match.team1}`}
                        >
                          <img
                            src={
                              TEAM_SHIELDS[
                                normalizeText(match.team1)
                              ] || ""
                            }
                            alt={`Escudo ${match.team1}`}
                            className="match-shield"
                            onError={(event) => {
                              event.currentTarget.style.visibility =
                                "hidden";
                            }}
                          />
                        </button>

                        <strong>{match.team1}</strong>
                      </div>

                      <div className="match-center">
                        <span className="match-vs">VS</span>
                        <span className="match-pending">
                          PENDIENTE
                        </span>
                      </div>

                      <div className="match-team">
                        <button
                          type="button"
                          className="match-shield-button"
                          onClick={() =>
                            toggleTeamRoster(match.team2)
                          }
                          aria-label={`Ver jugadores de ${match.team2}`}
                        >
                          <img
                            src={
                              TEAM_SHIELDS[
                                normalizeText(match.team2)
                              ] || ""
                            }
                            alt={`Escudo ${match.team2}`}
                            className="match-shield"
                            onError={(event) => {
                              event.currentTarget.style.visibility =
                                "hidden";
                            }}
                          />
                        </button>

                        <strong>{match.team2}</strong>
                      </div>

                      {expandedTeams[match.team1] && (
                        <div className="team-roster">
                          <div className="team-roster-heading">
                            JUGADORES · {match.team1}
                          </div>

                          {getPlayersForTeam(match.team1).length > 0 ? (
                            getPlayersForTeam(match.team1).map(
                              (player, playerIndex) => (
                                <div
                                  className="team-roster-player"
                                  key={`${player.player}-${playerIndex}`}
                                >
                                  <span>{playerIndex + 1}</span>
                                  {player.player}
                                </div>
                              )
                            )
                          ) : (
                            <p>
                              No se encontraron jugadores para este equipo.
                            </p>
                          )}
                        </div>
                      )}

                      {expandedTeams[match.team2] && (
                        <div className="team-roster">
                          <div className="team-roster-heading">
                            JUGADORES · {match.team2}
                          </div>

                          {getPlayersForTeam(match.team2).length > 0 ? (
                            getPlayersForTeam(match.team2).map(
                              (player, playerIndex) => (
                                <div
                                  className="team-roster-player"
                                  key={`${player.player}-${playerIndex}`}
                                >
                                  <span>{playerIndex + 1}</span>
                                  {player.player}
                                </div>
                              )
                            )
                          ) : (
                            <p>
                              No se encontraron jugadores para este equipo.
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
              </div>
            </>
          )}

        {!matchesLoading &&
          !matchesError &&
          !currentMatchday && (
            <div className="matches-state">
              <p>NO HAY ENFRENTAMIENTOS PENDIENTES.</p>
            </div>
          )}
      </div>

      <div className="welcome-competition-active">
        <span className="championship-status-dot" />
        SISTEMA DE COMPETICIÓN ACTIVO
      </div>

      <div className="welcome-footer">
        LIGA 4VS4 OFICIAL | 2026
      </div>

      <button
        className="welcome-enter-button"
        onClick={enterChampionship}
      >
        ENTRAR AL CAMPEONATO
        <span>›</span>
      </button>

      {!user && (
        <button
          className="welcome-register-link"
          onClick={() => openMode("register")}
        >
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
          onClick={() =>
            setNotificationsOpen((previous) => !previous)
          }
          aria-label="Abrir notificaciones"
          style={{ position: "relative" }}
        >
          🔔

          {unreadNotifications > 0 && (
            <span className="notification-counter">
              {unreadNotifications > 99
                ? "99+"
                : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {notificationsOpen && renderNotifications()}

      <div className="menu-section-heading">
        CENTRO DE COMPETICIÓN
      </div>

      <div className="competition-grid">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="competition-card"
            onClick={() => navigateTo(item.id)}
          >
            <span className="competition-card-number">
              {item.number}
            </span>

            <span className="competition-card-icon">
              {item.icon}
            </span>

            <span className="competition-card-title">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      <div className="championship-status">
        <span className="championship-status-dot" />
        <span>CAMPEONATO EN CURSO</span>
      </div>

      <div className="menu-footer">
        LIGA 4VS4 - 2026
      </div>

      <button
        type="button"
        className="return-welcome-button"
        onClick={returnToWelcome}
      >
        VOLVER A LA PANTALLA PRINCIPAL
      </button>
    </section>
  );

  // =========================================
  // APARTADOS PROVISIONALES
  // =========================================

  const renderSectionPlaceholder = () => (
    <section className="web-section-placeholder">
      <span className="placeholder-label">
        CENTRO DE COMPETICIÓN
      </span>

      <h2>{sectionNames[activeSection]}</h2>

      <p>
        Este apartado se está preparando para conectarlo
        con los mismos datos de la aplicación Android.
      </p>

      <button
        className="primary-button"
        onClick={() => navigateTo("inicio")}
      >
        VOLVER AL MENÚ
      </button>
    </section>
  );

  // =========================================
  // INTERFAZ PRINCIPAL
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
                  <button
                    className="login-button"
                    onClick={handleLogout}
                  >
                    CERRAR SESIÓN
                  </button>
                ) : (
                  <>
                    <button
                      className="login-button"
                      onClick={() => openMode("login")}
                    >
                      INICIAR SESIÓN
                    </button>
                  </>
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

              <button
                className="login-button"
                onClick={handleLogout}
              >
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
              {activeSection === "inicio"
                ? renderMenu()
                : renderSectionPlaceholder()}

              <nav className="web-bottom-navigation">
                {bottomItems.map((item) => (
                  <button
                    key={item.id}
                    className={
                      activeSection === item.id ? "active" : ""
                    }
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

      {mode !== "home" && !user && (
        <div
          className="auth-overlay"
          onClick={() => openMode("home")}
        >
          <section
            className="auth-card"
            onClick={(event) => event.stopPropagation()}
          >
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
              {mode === "login" &&
                "Accede a tu cuenta de LIGA4VS4."}
              {mode === "register" &&
                "Únete a la comunidad oficial."}
              {mode === "forgot" &&
                "Te enviaremos instrucciones a tu correo."}
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
              <label htmlFor="auth-email">
                CORREO ELECTRÓNICO
              </label>

              <input
                id="auth-email"
                type="email"
                placeholder="tu correo electrónico"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />

              {mode !== "forgot" && (
                <>
                  <label htmlFor="auth-password">
                    CONTRASEÑA
                  </label>

                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    required
                  />
                </>
              )}

              {mode === "register" && (
                <>
                  <label htmlFor="auth-confirm">
                    CONFIRMAR CONTRASEÑA
                  </label>

                  <input
                    id="auth-confirm"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />
                </>
              )}

              {error && (
                <div className="auth-message error-message">
                  {error}
                </div>
              )}

              {message && (
                <div className="auth-message success-message">
                  {message}
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={processing}
              >
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
                  <button
                    onClick={() => openMode("forgot")}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>

                  <p>
                    ¿No tienes cuenta?{" "}
                    <button
                      onClick={() => openMode("register")}
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
                    onClick={() => openMode("login")}
                  >
                    Inicia sesión
                  </button>
                </p>
              )}

              {mode === "forgot" && (
                <p>
                  <button
                    onClick={() => openMode("login")}
                  >
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
