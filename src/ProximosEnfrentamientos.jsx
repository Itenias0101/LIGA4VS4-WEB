
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
   * CLASIFICACIÓN
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

  const getTeamPosition = (team) =>
    teamPositions.get(normalizeTeam(team)) || null;

  const renderRankBadge = (team) => {
    const position = getTeamPosition(team);

    if (!position) return null;

    return (
      <span
        aria-label={`Posición ${position} de ${team}`}
        title={`Posición ${position} en la clasificación`}
        style={{
          position: "absolute",
          top: "-9px",
          right: "-9px",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          fontSize: "12px",
          fontWeight: 1000,
          ...getRankStyle(position)
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

  const displayedMatchday =
    effectiveMatchday === "TODAS"
      ? "TODAS LAS JORNADAS"
      : `JORNADA ${effectiveMatchday}`;

  const getPlayersForTeam = (team) => {
    const normalizedTeam = normalizeTeam(team);

    return players.filter(
      (player) => normalizeTeam(player.team) === normalizedTeam
    );
  };

  const closeRoster = () => {
    setExpandedMatch(null);
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
                onClick={() => {
  closeRoster();

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

  const selectedMatch = visibleMatches.find((match) => {
    const matchId = getMatchId(match, match.originalIndex);
    return matchId === expandedMatch;
  });

  return (
    <section className="upcoming-screen">

      {/* RESUMEN SUPERIOR */}

      <div
        className="upcoming-summary"
        style={{
          marginTop: "4px",
          marginBottom: "12px",
          padding: "10px 14px"
        }}
      >
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

        <span
          className="upcoming-live-indicator"
          style={{
            fontSize: "11px",
            textAlign: "right"
          }}
        >
          <i />
          {displayedMatchday}
        </span>
      </div>

      {/* TARJETAS */}

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
        <div
          className="upcoming-matches-list"
          style={{ gap: "9px" }}
        >
          {visibleMatches.map((match) => {
            const matchId = getMatchId(
              match,
              match.originalIndex
            );

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
                className="upcoming-match-card"
                key={matchId}
              >
                <button
                  type="button"
                  className="upcoming-match-main"
                  style={{
                    padding: "12px 10px"
                  }}
                  onClick={() => toggleMatch(matchId)}
                  aria-expanded={expandedMatch === matchId}
                >
                  <div
                    className="upcoming-versus"
                    style={{
                      gap: "8px",
                      alignItems: "center"
                    }}
                  >
                    {/* EQUIPO 1 */}

                    <div
                      className="upcoming-versus-team"
                      style={{
                        gap: "7px",
                        flex: 1
                      }}
                    >
                      <div
                        className="upcoming-versus-shield"
                        style={{
                          position: "relative",
                          width: "92px",
                          height: "92px",
                          minWidth: "92px"
                        }}
                      >
                        {shield1 ? (
                          <img
                            src={shield1}
                            alt={`Escudo ${match.team1}`}
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain"
                            }}
                          />
                        ) : (
                          <span>
                            {String(match.team1 || "L4").slice(0, 2)}
                          </span>
                        )}

                        {renderRankBadge(match.team1)}
                      </div>

                      <strong
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.2,
                          textAlign: "center"
                        }}
                      >
                        {match.team1}
                      </strong>
                    </div>

                    {/* VS */}

                    <div
                      className="upcoming-versus-center"
                      style={{
                        gap: "3px",
                        flex: "0 0 auto"
                      }}
                    >
                      <span style={{ fontSize: "21px" }}>VS</span>
                      <small style={{ fontSize: "10px" }}>BO5</small>
                    </div>

                    {/* EQUIPO 2 */}

                    <div
                      className="upcoming-versus-team"
                      style={{
                        gap: "7px",
                        flex: 1
                      }}
                    >
                      <div
                        className="upcoming-versus-shield"
                        style={{
                          position: "relative",
                          width: "92px",
                          height: "92px",
                          minWidth: "92px"
                        }}
                      >
                        {shield2 ? (
                          <img
                            src={shield2}
                            alt={`Escudo ${match.team2}`}
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain"
                            }}
                          />
                        ) : (
                          <span>
                            {String(match.team2 || "L4").slice(0, 2)}
                          </span>
                        )}

                        {renderRankBadge(match.team2)}
                      </div>

                      <strong
                        style={{
                          fontSize: "13px",
                          lineHeight: 1.2,
                          textAlign: "center"
                        }}
                      >
                        {match.team2}
                      </strong>
                    </div>
                  </div>

                  <div
                    className="upcoming-match-bottom"
                    style={{
                      marginTop: "8px",
                      paddingTop: "6px"
                    }}
                  >
                    <span>
                      VER PLANTILLAS
                    </span>

                    <span className="upcoming-expand-icon">
                      ⌄
                    </span>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* FILTRO DE JORNADAS */}

      <div
        className="upcoming-filter-panel"
        style={{ marginTop: "16px" }}
      >
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

      {/* INFORMACIÓN INFERIOR */}

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

      <div className="upcoming-footer">
        <span className="upcoming-footer-mark">L4</span>

        <div>
          <strong>LIGA4VS4 OFICIAL</strong>
          <small>UNA LIGA. UNA COMUNIDAD.</small>
        </div>
      </div>

      {/* VENTANA CENTRAL DE PLANTILLAS */}

      {selectedMatch && (
        <div
          role="presentation"
          onClick={closeRoster}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(7px)",
            WebkitBackdropFilter: "blur(7px)"
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Plantillas de ${selectedMatch.team1} y ${selectedMatch.team2}`}
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "85vh",
              overflowY: "auto",
              overscrollBehavior: "contain",
              border: "1px solid rgba(0, 217, 255, 0.55)",
              borderRadius: "16px",
              background: "linear-gradient(160deg, #101d2b, #05090f)",
              boxShadow: "0 0 35px rgba(0, 195, 255, 0.2)",
              padding: "18px 12px 14px"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "16px"
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    color: "#ffffff",
                    fontSize: "15px",
                    letterSpacing: "1px"
                  }}
                >
                  PLANTILLAS DEL ENCUENTRO
                </strong>

                <small
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "#8edff5",
                    fontSize: "10px"
                  }}
                >
                  {selectedMatch.team1} VS {selectedMatch.team2}
                </small>
              </div>

              <button
                type="button"
                onClick={closeRoster}
                aria-label="Cerrar plantillas"
                style={{
                  width: "36px",
                  height: "36px",
                  flex: "0 0 36px",
                  borderRadius: "50%",
                  border: "1px solid rgba(0, 217, 255, 0.5)",
                  background: "#102b3a",
                  color: "#ffffff",
                  fontSize: "22px",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>

            {playersError && players.length === 0 && (
              <p className="upcoming-roster-error">
                {playersError}
              </p>
            )}

            <div className="upcoming-rosters-grid">
              {renderTeam(selectedMatch.team1, "left")}

              <div className="upcoming-rosters-divider">
                <span>VS</span>
              </div>

              {renderTeam(selectedMatch.team2, "right")}
            </div>

            <p className="upcoming-rosters-hint">
              TOCA UN JUGADOR PARA VER SU PERFIL
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
