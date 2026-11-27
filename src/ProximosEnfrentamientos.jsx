
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
  const [selectedMatchday, setSelectedMatchday] = useState("TODAS");
  const [expandedMatch, setExpandedMatch] = useState(null);

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
        const jornadaDifference =
          getMatchdayNumber(a.jornada) - getMatchdayNumber(b.jornada);

        if (jornadaDifference !== 0) return jornadaDifference;

        return a.originalIndex - b.originalIndex;
      });
  }, [matches]);

  const visibleMatches = useMemo(() => {
    if (selectedMatchday === "TODAS") {
      return pendingMatches;
    }

    return pendingMatches.filter(
      (match) =>
        getMatchdayNumber(match.jornada) === Number(selectedMatchday)
    );
  }, [pendingMatches, selectedMatchday]);

  const getPlayersForTeam = (team) => {
    const normalizedTeam = String(team || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
      .replace(/[_\-\s]/g, "")
      .trim()
      .toUpperCase();

    return players.filter((player) => {
      const playerTeam = String(player.team || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
        .replace(/[_\-\s]/g, "")
        .trim()
        .toUpperCase();

      return playerTeam === normalizedTeam;
    });
  };

  const toggleMatch = (matchId) => {
    setExpandedMatch((previous) =>
      previous === matchId ? null : matchId
    );
  };

  const renderTeam = (team, side) => {
    const shield = typeof getTeamShield === "function"
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
                <span className="upcoming-player-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

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
      <div className="upcoming-header">
        <div className="upcoming-eyebrow">
          <span className="upcoming-eyebrow-line" />
          CENTRO DE COMPETICIÓN
        </div>

        <h2>PRÓXIMOS <span>ENFRENTAMIENTOS</span></h2>

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
          value={selectedMatchday}
          onChange={(event) => {
            setSelectedMatchday(event.target.value);
            setExpandedMatch(null);
          }}
          aria-label="Seleccionar jornada"
        >
          <option value="TODAS">TODAS LAS JORNADAS</option>

          {Array.from(
            { length: TOTAL_JORNADAS },
            (_, index) => index + 1
          ).map((jornada) => (
            <option key={jornada} value={String(jornada)}>
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
            {selectedMatchday === "TODAS"
              ? "Todas las jornadas registradas están finalizadas o todavía no hay encuentros cargados."
              : `No hay encuentros pendientes en la jornada ${selectedMatchday}.`}
          </p>
        </div>
      ) : (
        <div className="upcoming-matches-list">
          {visibleMatches.map((match) => {
            const matchId = getMatchId(match, match.originalIndex);
            const isExpanded = expandedMatch === matchId;
            const jornada = getMatchdayNumber(match.jornada);

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
                    <div className="upcoming-versus-team">
                      <div className="upcoming-versus-shield">
                        {getTeamShield && getTeamShield(match.team1) ? (
                          <img
                            src={getTeamShield(match.team1)}
                            alt={`Escudo ${match.team1}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>
                            {String(match.team1 || "L4").slice(0, 2)}
                          </span>
                        )}
                      </div>

                      <strong>{match.team1}</strong>
                    </div>

                    <div className="upcoming-versus-center">
                      <span>VS</span>
                      <small>BO5</small>
                    </div>

                    <div className="upcoming-versus-team">
                      <div className="upcoming-versus-shield">
                        {getTeamShield && getTeamShield(match.team2) ? (
                          <img
                            src={getTeamShield(match.team2)}
                            alt={`Escudo ${match.team2}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>
                            {String(match.team2 || "L4").slice(0, 2)}
                          </span>
                        )}
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
