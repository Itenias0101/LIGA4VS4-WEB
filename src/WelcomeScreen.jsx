
import React, { useEffect, useMemo, useState } from "react";
import "./WelcomeScreen.css";

const CSV_CLASIFICACION =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=2025686865&single=true&output=csv";

const normalizeTeam = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]/g, "");

const parseCSV = (text) => {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let value = "";
  let quotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (char === '"' && quotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quotes = !quotes;
    } else if (char === "," && !quotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quotes) {
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

const numberValue = (value) => {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(number) ? number : 0;
};

const readClassification = (text) => {
  const rows = parseCSV(text);

  return rows
    .slice(1)
    .filter((columns) => columns.length >= 5 && columns[0]?.trim())
    .map((columns) => ({
      equipo: columns[0].trim(),
      pj: numberValue(columns[1]),
      pg: numberValue(columns[2]),
      pp: numberValue(columns[3]),
      pts: numberValue(columns[4])
    }))
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.pg - a.pg ||
        b.pj - a.pj ||
        a.equipo.localeCompare(b.equipo, undefined, {
          sensitivity: "base"
        })
    );
};

const medalColors = {
  1: {
    background: "linear-gradient(145deg, #fff4a8, #d99b16)",
    color: "#583600",
    border: "2px solid #ffe58a",
    shadow: "0 0 12px rgba(255, 196, 35, 0.8)"
  },
  2: {
    background: "linear-gradient(145deg, #ffffff, #929eae)",
    color: "#263343",
    border: "2px solid #e6edf5",
    shadow: "0 0 12px rgba(210, 220, 235, 0.7)"
  },
  3: {
    background: "linear-gradient(145deg, #f6bd86, #a65328)",
    color: "#fff4e8",
    border: "2px solid #e9a36c",
    shadow: "0 0 12px rgba(205, 112, 55, 0.7)"
  }
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
          : "0 0 10px rgba(0, 217, 255, 0.55)"
      }}
    >
      {position}
    </span>
  );
}

export default function WelcomeScreen({
  announcement,
  matchesLoading,
  matchesError,
  currentMatchday,
  isFinishedMatch,
  getTeamShield,
  normalizeText,
  expandedTeams,
  toggleTeamRoster,
  playersLoading,
  players,
  getPlayersForTeam,
  playersError,
  user,
  enterChampionship,
  openMode
}) {
  const [classification, setClassification] = useState([]);

  useEffect(() => {
    let active = true;

    const loadClassification = async () => {
      try {
        const response = await fetch(CSV_CLASIFICACION, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        const result = readClassification(text);

        if (active) {
          setClassification(result);
        }
      } catch (error) {
        console.error("Error cargando posiciones de bienvenida:", error);
      }
    };

    loadClassification();

    const interval = window.setInterval(loadClassification, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const teamPositions = useMemo(() => {
    const positions = {};

    classification.forEach((team, index) => {
      positions[normalizeTeam(team.equipo)] = index + 1;
    });

    return positions;
  }, [classification]);

  const getPosition = (team) => {
    return teamPositions[normalizeTeam(team)] || null;
  };

  const renderTeam = (team, shield) => {
    const position = getPosition(team);

    return (
      <div className="match-team">
        <button
          type="button"
          className="match-shield-button"
          onClick={() => toggleTeamRoster(team)}
          aria-label={`Ver jugadores de ${team}`}
          style={{
            position: "relative",
            overflow: "visible",
            flexShrink: 0
          }}
        >
          {shield ? (
            <img
              src={shield}
              alt={`Escudo ${team}`}
              className="match-shield"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="match-shield-fallback">
              {normalizeText(team).slice(0, 2)}
            </span>
          )}

          <TeamPosition position={position} />
        </button>

        <strong>{team}</strong>
      </div>
    );
  };

  return (
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

        {!matchesLoading && !matchesError && currentMatchday && (
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
                    {renderTeam(match.team1, shield1)}

                    <div className="match-center">
                      <span className="match-vs">VS</span>
                      <span className="match-pending">PENDIENTE</span>
                    </div>

                    {renderTeam(match.team2, shield2)}

                    {expandedTeams[match.team1] && (
                      <div className="team-roster">
                        <div className="team-roster-heading">
                          JUGADORES · {match.team1}
                        </div>

                        {playersLoading && players.length === 0 ? (
                          <p>Cargando jugadores...</p>
                        ) : getPlayersForTeam(match.team1).length > 0 ? (
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
                            {playersError ||
                              "No se encontraron jugadores para este equipo."}
                          </p>
                        )}
                      </div>
                    )}

                    {expandedTeams[match.team2] && (
                      <div className="team-roster">
                        <div className="team-roster-heading">
                          JUGADORES · {match.team2}
                        </div>

                        {playersLoading && players.length === 0 ? (
                          <p>Cargando jugadores...</p>
                        ) : getPlayersForTeam(match.team2).length > 0 ? (
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
                            {playersError ||
                              "No se encontraron jugadores para este equipo."}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        )}

        {!matchesLoading && !matchesError && !currentMatchday && (
          <div className="matches-state">
            <p>NO HAY ENFRENTAMIENTOS PENDIENTES.</p>
          </div>
        )}
      </div>

      <button
        className="welcome-enter-button"
        onClick={enterChampionship}
      >
        ENTRAR AL CAMPEONATO <span>›</span>
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
}
