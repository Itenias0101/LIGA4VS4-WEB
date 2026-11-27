import React from "react";
import "./WelcomeScreen.css";

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
  return (
    <section className="android-welcome">
      <div className="welcome-logo-panel">
        <div className="welcome-logo-mark">
          <span>LIGA</span>
          <strong>4VS4</strong>
        </div>

        <div className="welcome-logo-caption">COMPETICIÓN OFICIAL</div>
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
          <>
            <div className="matchday-label">
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
                                <div
                                  className="team-roster-player"
                                  key={`${player.player}-${playerIndex}`}
                                >
                                  <span>{playerIndex + 1}</span>
                                  {player.player}
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
                                <div
                                  className="team-roster-player"
                                  key={`${player.player}-${playerIndex}`}
                                >
                                  <span>{playerIndex + 1}</span>
                                  {player.player}
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
