import React, { useEffect, useMemo, useState } from "react";
import "./Clasificacion.css";

const CSV_CLASIFICACION =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=2025686865&single=true&output=csv";

const CSV_ESTADISTICAS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1zC_U8J5oginUCot85-agY4wdTicdpyC6VESPsndHlv30yW8-EUPwxq_rOL7jReG4EQowROX3fSHo/pub?gid=1093177355&single=true&output=csv";

const EQUIPOS_FILTRO = [
  "TODOS LOS EQUIPOS",
  "ETERNITY",
  "2D",
  "KINGS",
  "Lycoris",
  "THE BUTCHERS",
  "NoMercy"
];

const ESCUDOS = {
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

const normalizeTeam = (value) => {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]/g, "");

  if (key === "ETERNITY") return "ETERNITY";
  if (key === "2D") return "2D";
  if (key === "KINGS") return "KINGS";
  if (key === "LYCORIS" || key === "LYCORYS") return "Lycoris";
  if (key === "THEBUTCHERS" || key === "THEBUTCHER") return "THE BUTCHERS";
  if (key === "NOMERCY") return "NoMercy";
  return String(value || "").trim();
};

const teamKey = (value) => {
  const team = normalizeTeam(value);
  const key = team
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]/g, "");

  if (key === "THEBUTCHERS") return "THE BUTCHERS";
  if (key === "NOMERCY") return "NOMERCY";
  if (key === "LYCORIS") return "LYCORIS";
  return key;
};

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
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
};

const numberValue = (value) => {
  const clean = String(value ?? "").trim().replace(",", ".");
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
};

const kdValue = (value) => numberValue(value);

const readClassification = (text) => {
  const rows = parseCSV(text);
  const teams = [];

  rows.slice(1).forEach((columns) => {
    if (columns.length < 5) return;
    const equipo = columns[0]?.trim();
    if (!equipo) return;

    teams.push({
      equipo,
      pj: numberValue(columns[1]),
      pg: numberValue(columns[2]),
      pp: numberValue(columns[3]),
      pts: numberValue(columns[4])
    });
  });

  return teams.sort((a, b) =>
    b.pts - a.pts ||
    b.pg - a.pg ||
    b.pj - a.pj ||
    a.equipo.localeCompare(b.equipo, undefined, { sensitivity: "base" })
  );
};

const normalizeHeader = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const findHeader = (headers, names) =>
  headers.findIndex((header) => names.includes(normalizeHeader(header)));

const readStatistics = (text) => {
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes("JUGADOR") && headers.includes("EQUIPO");
  });

  if (headerIndex < 0) return [];

  const headers = rows[headerIndex];
  const indexes = {
    jugador: findHeader(headers, ["JUGADOR"]),
    equipo: findHeader(headers, ["EQUIPO"]),
    bajas: findHeader(headers, ["BAJAS", "KILLS"]),
    muertes: findHeader(headers, ["MUERTES", "DEATHS"]),
    asistencias: findHeader(headers, ["ASISTENCIAS", "ASSISTS"]),
    kd: findHeader(headers, ["KDGLOBAL", "KD", "KDR"])
  };

  return rows.slice(headerIndex + 1)
    .map((columns) => {
      const nombre = String(columns[indexes.jugador] || "").trim();
      const equipo = String(columns[indexes.equipo] || "").trim();
      if (!nombre || !equipo) return null;

      const bajas = numberValue(columns[indexes.bajas]);
      const muertes = numberValue(columns[indexes.muertes]);
      const asistencias = numberValue(columns[indexes.asistencias]);
      const kdRaw = indexes.kd >= 0 ? String(columns[indexes.kd] || "").trim() : "";

      return {
        nombre,
        equipo: normalizeTeam(equipo),
        bajas,
        muertes,
        asistencias,
        kd: kdRaw ? kdValue(kdRaw) : (muertes > 0 ? bajas / muertes : bajas),
        kdTexto: kdRaw || (muertes > 0 ? (bajas / muertes).toFixed(2) : bajas.toFixed(2))
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      b.bajas - a.bajas ||
      a.nombre.localeCompare(b.nombre, undefined, { sensitivity: "base" })
    );
};

const positionText = (position) => {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return String(position).padStart(2, "0");
};

const shieldFor = (team) => ESCUDOS[teamKey(team)] || "";

function Shield({ team, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = shieldFor(team);

  if (!src || failed) {
    return (
      <span className={`lc-shield-fallback ${className}`}>
        {String(team || "").slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className={`lc-shield ${className}`}
      src={src}
      alt={`Escudo ${team}`}
      onError={() => setFailed(true)}
    />
  );
}

function RankingCard({ icon, title, subtitle, players, accent, value }) {
  return (
    <section className="lc-ranking-card" style={{ "--lc-accent": accent }}>
      <div className="lc-ranking-heading">
        <span className="lc-ranking-icon">{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="lc-divider" />

      {players.map((player, index) => (
        <React.Fragment key={`${title}-${player.nombre}-${index}`}>
          <div className="lc-ranking-row">
            <span className={`lc-ranking-position ${index < 3 ? "podium" : ""}`}>
              {positionText(index + 1)}
            </span>
            <Shield team={player.equipo} className="lc-ranking-shield" />
            <div className="lc-ranking-player-name">{player.nombre}</div>
            <strong className="lc-ranking-value">
              {value(player)}
            </strong>
          </div>
          {index < players.length - 1 && <div className="lc-ranking-separator" />}
        </React.Fragment>
      ))}
    </section>
  );
}

export default function Clasificacion() {
  const [classification, setClassification] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loadingClassification, setLoadingClassification] = useState(true);
  const [loadingStatistics, setLoadingStatistics] = useState(true);
  const [classificationError, setClassificationError] = useState("");
  const [statisticsError, setStatisticsError] = useState("");
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [filterTeam, setFilterTeam] = useState("TODOS LOS EQUIPOS");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(CSV_CLASIFICACION, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (active) {
          setClassification(readClassification(text));
          setClassificationError("");
        }
      } catch (error) {
        console.error("Error cargando clasificación:", error);
        if (active) setClassificationError("NO SE PUDO CARGAR LA CLASIFICACIÓN");
      } finally {
        if (active) setLoadingClassification(false);
      }
    };

    load();
    const interval = window.setInterval(load, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(CSV_ESTADISTICAS, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (active) {
          setPlayers(readStatistics(text));
          setStatisticsError("");
        }
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
        if (active) setStatisticsError("NO SE PUDIERON CARGAR LAS ESTADÍSTICAS");
      } finally {
        if (active) setLoadingStatistics(false);
      }
    };

    load();
    const interval = window.setInterval(load, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const filteredPlayers = useMemo(() => {
    if (filterTeam === "TODOS LOS EQUIPOS") return players;
    return players.filter(
      (player) => normalizeTeam(player.equipo).toUpperCase() === normalizeTeam(filterTeam).toUpperCase()
    );
  }, [players, filterTeam]);

  const topKills = useMemo(
    () => [...filteredPlayers].sort((a, b) => b.bajas - a.bajas || a.nombre.localeCompare(b.nombre)).slice(0, 5),
    [filteredPlayers]
  );

  const topKD = useMemo(
    () => [...filteredPlayers].sort((a, b) => b.kd - a.kd || a.nombre.localeCompare(b.nombre)).slice(0, 5),
    [filteredPlayers]
  );

  const topAssists = useMemo(
    () => [...filteredPlayers].sort((a, b) => b.asistencias - a.asistencias || a.nombre.localeCompare(b.nombre)).slice(0, 5),
    [filteredPlayers]
  );

  const visiblePlayers = showAllPlayers ? players : players.slice(0, 5);

  return (
    <section className="clasificacion-screen">
      <div className="lc-title cyan-title">CLASIFICACIÓN GENERAL</div>

      <div className="lc-classification-table">
        <div className="lc-classification-row lc-header-row">
          <div>POS.</div>
          <div>EQUIPO</div>
          <div>PJ</div>
          <div>PG</div>
          <div>PP</div>
          <div>PTS</div>
        </div>

        {loadingClassification && (
          <div className="lc-state">CARGANDO CLASIFICACIÓN...</div>
        )}

        {!loadingClassification && classificationError && (
          <div className="lc-state">{classificationError}</div>
        )}

        {!loadingClassification && !classificationError && classification.length === 0 && (
          <div className="lc-state">NO HAY DATOS DE CLASIFICACIÓN</div>
        )}

        {!loadingClassification && !classificationError && classification.map((team, index) => (
          <div className="lc-classification-row" key={`${team.equipo}-${index}`}>
            <div className={`lc-position ${index < 3 ? "medal" : ""}`}>
              {positionText(index + 1)}
            </div>
            <div className="lc-team-cell">{normalizeTeam(team.equipo)}</div>
            <div>{team.pj}</div>
            <div>{team.pg}</div>
            <div>{team.pp}</div>
            <div className="lc-points">{team.pts}</div>
          </div>
        ))}
      </div>

      <div className="lc-title green-title">ESTADÍSTICAS DE JUGADORES</div>

      <div className="lc-statistics-table">
        <div className="lc-statistics-row lc-statistics-header">
          <div>JUGADOR</div>
          <div>BAJAS</div>
          <div>MUERTES</div>
          <div>ASIST.</div>
          <div>K/D</div>
        </div>

        {loadingStatistics && <div className="lc-state">CARGANDO ESTADÍSTICAS...</div>}

        {!loadingStatistics && statisticsError && (
          <div className="lc-state">{statisticsError}</div>
        )}

        {!loadingStatistics && !statisticsError && players.length === 0 && (
          <div className="lc-state">NO HAY ESTADÍSTICAS DISPONIBLES</div>
        )}

        {!loadingStatistics && !statisticsError && visiblePlayers.map((player, index) => (
          <div className="lc-statistics-row" key={`${player.nombre}-${index}`}>
            <div className="lc-player-cell">
              <span className={`lc-player-position ${index < 3 ? "podium" : ""}`}>
                {positionText(index + 1)}
              </span>
              <Shield team={player.equipo} className="lc-player-shield" />
              <span className="lc-player-name">{player.nombre}</span>
            </div>
            <div className="lc-kills">{player.bajas}</div>
            <div>{player.muertes}</div>
            <div>{player.asistencias}</div>
            <div className="lc-kd">{player.kdTexto}</div>
          </div>
        ))}

        {!loadingStatistics && !statisticsError && players.length > 5 && (
          <>
            {showAllPlayers && <div className="lc-statistics-hidden-space" />}
            <button
              type="button"
              className="lc-expand-button"
              onClick={() => setShowAllPlayers((value) => !value)}
            >
              {showAllPlayers
                ? "▲  OCULTAR JUGADORES"
                : `▼  VER TODOS LOS JUGADORES (${players.length - 5})`}
            </button>
          </>
        )}
      </div>

      <div className="lc-ranking-title-block">
        <div className="lc-title cyan-title">RANKING INDIVIDUAL</div>
        <label>FILTRAR RANKING POR EQUIPO</label>
        <select value={filterTeam} onChange={(event) => setFilterTeam(event.target.value)}>
          {EQUIPOS_FILTRO.map((team) => <option key={team} value={team}>{team}</option>)}
        </select>
      </div>

      <div className="lc-rankings">
        {!loadingStatistics && filteredPlayers.length === 0 ? (
          <div className="lc-empty-ranking">NO HAY JUGADORES PARA ESTE EQUIPO</div>
        ) : (
          <>
            <RankingCard
              icon="🔥"
              title="TOP 5 BAJAS"
              subtitle="ELIMINACIONES"
              players={topKills}
              accent="#FF7337"
              value={(player) => player.bajas}
            />

            <RankingCard
              icon="🎯"
              title="TOP 5 K/D"
              subtitle="RELACIÓN BAJAS / MUERTES"
              players={topKD}
              accent="#00D9FF"
              value={(player) => player.kdTexto}
            />

            <RankingCard
              icon="🤝"
              title="TOP 5 ASISTENCIAS"
              subtitle="APOYO AL EQUIPO"
              players={topAssists}
              accent="#39FF14"
              value={(player) => player.asistencias}
            />
          </>
        )}
      </div>
    </section>
  );
}
