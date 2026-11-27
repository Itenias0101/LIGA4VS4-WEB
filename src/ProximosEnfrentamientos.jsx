
import React, { useMemo, useState } from "react";
import "./ProximosEnfrentamientos.css";

const TOTAL_JORNADAS = 15;

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

const getMatchdayNumber = (value) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getMatchId = (match, index) =>
  [
    getMatchdayNumber(match.jornada),
    match.team1,
    match.team2,
    index
  ].join("-");

const normalizeTeam = (team) =>
  String(team || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .replace(/[_\-\s]/g, "")
    .trim()
    .toUpperCase();

const getRankStyle = (position) => {
  if (position === 1) {
    return {
      background: "linear-gradient(145deg, #fff0a6, #d69b16)",
      color: "#503500",
      border: "2px solid #ffe28a",
      boxShadow: "0 0 15px rgba(255, 193, 45, 0.65)"
    };
  }

  if (position === 2) {
    return {
      background: "linear-gradient(145deg, #ffffff, #9eabb9)",
      color: "#283441",
      border: "2px solid #e1e8ef",
      boxShadow: "0 0 13px rgba(207, 220, 233, 0.5)"
    };
  }

  if (position === 3) {
    return {
      background: "linear-gradient(145deg, #ffd0a8, #a85a2b)",
      color: "#4d210c",
      border: "2px solid #e9a879",
      boxShadow: "0 0 13px rgba(205, 120, 68, 0.55)"
    };
  }

  return {
    background: "linear-gradient(145deg, #183448, #0b1c2a)",
    color: "#b8eaff",
    border: "2px solid rgba(0, 217, 255, 0.65)",
    boxShadow: "0 0 10px rgba(0, 217, 255, 0.18)"
  };
};

export default function ProximosEnfrentamientos({
  matches = [],
  players = [],
  loading = false,
  error = "",
  playersLoading = false,
  playersError = "",
  getTeamShield,
  openPlayerMenu
}) {
  const [selectedMatchday, setSelectedMatchday] = useState(null);
  const [expandedMatch, setExpandedMatch] = useState(null);

  /*
   * CLASIFICACIÓN CALCULADA CON LOS RESULTADOS
   *
   * Cada ronda ganada equivale a 5 puntos.
   * El orden es:
   * 1. Puntos
   * 2. Victorias
   */

  const teamPositions = useMemo(() => {
    const standings = new Map();

    const registerTeam = (team) => {
      const normalized = normalizeTeam(team);

      if (!normalized) return;

      if (!standings.has(normalized)) {
        standings.set(normalized, {
          team,
          points: 0,
          wins: 0
        });
      }
    };

    matches.forEach((match) => {
      registerTeam(match.team1);
      registerTeam(match.team2);

      if (!isFinishedMatch(match)) return;

      const score1 = parseScore(match.score1);
      const score2 = parseScore(match.score2);

      const team1 = standings.get(normalizeTeam(match.team1));
      const team2 = standings.get(normalizeTeam(match.team2));

      if (!team1 || !team2) return;

      team1.points += score1 * 5;
      team2.points += score2 * 5;

      if (score1 > score2) {
        team1.wins += 1;
      } else if (score2 > score1) {
        team2.wins += 1;
      }
    });

    const orderedTeams = Array.from(standings.entries())
      .sort((a, b) => {
        const teamA = a[1];
        const teamB = b[1];

        if (teamB.points !== teamA.points) {
          return teamB.points - teamA.points;
        }

        if (teamB.wins !== teamA.wins) {
          return teamB.wins - teamA.wins;
        }

        return String(teamA.team).localeCompare(
          String(teamB.team),
          "es"
        );
      });

    const positions = new Map();

    orderedTeams.forEach(([normalizedTeam], index) => {
      positions.set(normalizedTeam, index + 1);
    });

    return positions;
  }, [matches]);

  const getTeamPosition = (team) => {
    return teamPositions.get(normalizeTeam(team)) || null;
  };

  const renderRankBadge = (team) => {
    const position = getTeamPosition(team);

    if (!position) return null;

    const rankStyle = getRankStyle(position);

    return (
      <span
        aria-label={`Posición ${position} de ${team}`}
        title={`Posición ${position} en la clasificación`}
        style={{
          position: "absolute",
          top: "-13px",
          right: "-13px",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          fontSize: "12px",
          fontWeight: 1000,
          letterSpacing: "-0.3px",
          ...rankStyle
        }}
      >
        {position}°
      </span>
    );
  };

  const pendingMatches = useMemo(() => {
    return matches
      .map((match, index) => ({
        ...match,
        originalIndex: index
      }))
      .filter((match) => {
        const jornada = getMatchdayNumber(match.jornada);

        return (
          jornada >= 1 &&
          jornada <= TOTAL_JORNADAS &&
          !isFinishedMatch(match)
        );
      })
      .sort((a, b) => {
        const difference =
          getMatchdayNumber(a.jornada) -
          getMatchdayNumber(b.jornada);

        if (difference !== 0) return difference;

        return a.originalIndex - b.originalIndex;
      });
  }, [matches]);

  const nextMatchday = useMemo(() => {
    if (pendingMatches.length === 0) return null;

    return getMatchdayNumber(pendingMatches[0].jornada);
  }, [pendingMatches]);

  const effectiveMatchday =
    selectedMatchday === null
      ? nextMatchday !== null
        ? String(nextMatchday)
        : "TODAS"
      : selectedMatchday;

  const visibleMatches = useMemo(() => {
    if (effectiveMatchday === "TODAS") {
      return pendingMatches;
    }

    return pendingMatches.filter(
      (match) =>
        getMatchdayNumber(match.jornada) ===
        Number(effectiveMatchday)
    );
  }, [pendingMatches, effectiveMatchday]);

  const getPlayersForTeam = (team) => {
    const normalizedTeam = normalizeTeam(team);

    return players.filter(
      (player) => normalizeTeam(player.team) === normalizedTeam
    );
  };

  const toggleMatch = (matchId) => {
    setExpandedMatch((previous) =>
      previous === matchId ? null : matchId
    );
  };

  const renderTeam = (team, side) => {
    const shield =
      typeof getTeamShield === "function"
        ? getTeamShield(team)
        : "";

    const teamPlayers = getPlayersForTeam(team);

    return (
      <div className={`upcoming-team upcoming-team-${side}`}>
        <div className="upcoming-team-heading">
          <div className="upcoming-shield-wrap">
            {shield ? (
              <img
                src={shield}
                alt={`Escudo ${team}`}
                className="upcoming-team-shield"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="upcoming-shield-fallback">
                {String(team || "L4").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <h3>{team}</h3>
        </div>

        <div className="upcoming-roster">
          {playersLoading && players.length === 0 ? (
            <p className="upcoming-roster-message">
              CARGANDO PLANTILLA...
            </p>
          ) : teamPlayers.length === 0 ? (
            <p className="upcoming-roster-message">
              SIN JUGADORES REGISTRADOS
            </p>
          ) : (
            teamPlayers.map((player, index) => (
              <button
                type="button"
                className={`upcoming-player ${
                  index === 0 ? "upcoming-player-captain" : ""
                }`}
                key={`${team}-${player.player}-${index}`}
                onClick={(event) => {
                  event.stopPropagation();

                  if (typeof openPlayerMenu === "function") {
                    openPlayerMenu(player.player);
                  }
                }}
              >
                <span className="upcoming-player-name">
                  {player.player}
                </span>

                {index === 0 && (
                  <span className="upcoming-captain-label">
                    CAPITÁN
                  </span>
                )}

                <span className="upcoming-player-arrow">›</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="upcoming-screen">

      {/* PRIMERO SE MUESTRAN LOS ENFRENTAMIENTOS */}

      {loading && matches.length === 0 ? (
        <div className="upcoming-state">
          <span className="upcoming-spinner" />
          <p>CARGANDO ENFRENTAMIENTOS...</p>
        </div>
      ) : error && matches.length === 0 ? (
        <div className="upcoming-state upcoming-state-error">
          <span>⚠️</span>
          <h3>NO SE PUDIERON CARGAR LOS ENCUENTROS</h3>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            REINTENTAR
          </button>
        </div>
      ) : visibleMatches.length === 0 ? (
        <div className="upcoming-state upcoming-state-empty">
          <span className="upcoming-empty-icon">🏆</span>

          <h3>NO HAY ENCUENTROS PENDIENTES</h3>

          <p>
            {effectiveMatchday === "TODAS"
              ? "Todas las jornadas registradas están finalizadas o todavía no hay encuentros cargados."
              : `No hay encuentros pendientes en la jornada ${effectiveMatchday}.`}
          </p>
        </div>
      ) : (
        <div className="upcoming-matches-list">
          {visibleMatches.map((match) => {
            const matchId = getMatchId(
              match,
              match.originalIndex
            );

            const isExpanded = expandedMatch === matchId;
            const jornada = getMatchdayNumber(match.jornada);

            const shield1 =
              typeof getTeamShield === "function"
                ? getTeamShield(match.team1)
                : "";

            const shield2 =
              typeof getTeamShield === "function"
                ? getTeamShield(match.team2)
                : "";

            return (
              <article
                className={`upcoming-match-card ${
                  isExpanded ? "upcoming-match-expanded" : ""
                }`}
                key={matchId}
              >
                <button
                  type="button"
                  className="upcoming-match-main"
                  onClick={() => toggleMatch(matchId)}
                  aria-expanded={isExpanded}
                >
                  <div className="upcoming-match-topline">
                    <span className="upcoming-matchday">
                      JORNADA {jornada}
                    </span>

                    <span className="upcoming-pending">
                      <i />
                      PENDIENTE
                    </span>
                  </div>

                  <div className="upcoming-versus">

                    {/* EQUIPO 1 */}

                    <div className="upcoming-versus-team">
                      <div
                        className="upcoming-versus-shield"
                        style={{ position: "relative" }}
                      >
                        {shield1 ? (
                          <img
                            src={shield1}
                            alt={`Escudo ${match.team1}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>
                            {String(match.team1 || "L4").slice(0, 2)}
                          </span>
                        )}

                        {renderRankBadge(match.team1)}
                      </div>

                      <strong>{match.team1}</strong>
                    </div>

                    {/* VS */}

                    <div className="upcoming-versus-center">
                      <span>VS</span>
                      <small>BO5</small>
                    </div>

                    {/* EQUIPO 2 */}

                    <div className="upcoming-versus-team">
                      <div
                        className="upcoming-versus-shield"
                        style={{ position: "relative" }}
                      >
                        {shield2 ? (
                          <img
                            src={shield2}
                            alt={`Escudo ${match.team2}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>
                            {String(match.team2 || "L4").slice(0, 2)}
                          </span>
                        )}

                        {renderRankBadge(match.team2)}
                      </div>

                      <strong>{match.team2}</strong>
                    </div>
                  </div>

                  <div className="upcoming-match-bottom">
                    <span>
                      {isExpanded
                        ? "OCULTAR PLANTILLAS"
                        : "VER PLANTILLAS"}
                    </span>

                    <span
                      className={`upcoming-expand-icon ${
                        isExpanded ? "rotated" : ""
                      }`}
                    >
                      ⌄
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="upcoming-match-rosters">
                    <div className="upcoming-rosters-title">
                      <span />
                      PLANTILLAS DEL ENCUENTRO
                      <span />
                    </div>

                    {playersError && players.length === 0 && (
                      <p className="upcoming-roster-error">
                        {playersError}
                      </p>
                    )}

                    <div className="upcoming-rosters-grid">
                      {renderTeam(match.team1, "left")}

                      <div className="upcoming-rosters-divider">
                        <span>VS</span>
                      </div>

                      {renderTeam(match.team2, "right")}
                    </div>

                    <p className="upcoming-rosters-hint">
                      TOCA UN JUGADOR PARA VER SU PERFIL
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* INFORMACIÓN AL FINAL */}

      <div className="upcoming-header">
        <div className="upcoming-eyebrow">
          <span className="upcoming-eyebrow-line" />
          CENTRO DE COMPETICIÓN
        </div>

        <h2>
          PRÓXIMOS <span>ENFRENTAMIENTOS</span>
        </h2>

        <p>
          TODOS LOS DUELOS PENDIENTES DE LA LIGA
        </p>
      </div>

      <div className="upcoming-filter-panel">
        <div className="upcoming-filter-title">
          <span>📅</span>

          <div>
            <strong>SELECCIONAR JORNADA</strong>
            <small>FILTRA LOS ENCUENTROS</small>
          </div>
        </div>

        <select
          className="upcoming-matchday-select"
          value={effectiveMatchday}
          onChange={(event) => {
            setSelectedMatchday(event.target.value);
            setExpandedMatch(null);
          }}
          aria-label="Seleccionar jornada"
        >
          <option value="TODAS">
            TODAS LAS JORNADAS
          </option>

          {Array.from(
            { length: TOTAL_JORNADAS },
            (_, index) => index + 1
          ).map((jornada) => (
            <option
              key={jornada}
              value={String(jornada)}
            >
              JORNADA {jornada}
            </option>
          ))}
        </select>
      </div>

      <div className="upcoming-summary">
        <div>
          <span className="upcoming-summary-number">
            {visibleMatches.length}
          </span>

          <span className="upcoming-summary-label">
            {visibleMatches.length === 1
              ? "ENCUENTRO PENDIENTE"
              : "ENCUENTROS PENDIENTES"}
          </span>
        </div>

        <span className="upcoming-live-indicator">
          <i />
          CAMPEONATO 2026
        </span>
      </div>

      <div className="upcoming-footer">
        <span className="upcoming-footer-mark">L4</span>

        <div>
          <strong>LIGA4VS4 OFICIAL</strong>
          <small>UNA LIGA. UNA COMUNIDAD.</small>
        </div>
      </div>
    </section>
  );
}
