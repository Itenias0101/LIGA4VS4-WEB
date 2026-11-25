import React from "react";

export default function App() {
  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">L4</span>
          <div>
            <h1>LIGA4VS4</h1>
            <p>COMPETICIÓN OFICIAL</p>
          </div>
        </div>

        <button className="login-button">
          INICIAR SESIÓN
        </button>
      </header>

      <section className="hero">
        <div className="hero-label">
          <span className="live-dot"></span>
          PLATAFORMA OFICIAL
        </div>

        <h2>
          LA COMPETICIÓN
          <span> COMIENZA AQUÍ</span>
        </h2>

        <p>
          Sigue las jornadas, consulta los equipos
          y vive cada enfrentamiento de LIGA4VS4.
        </p>

        <div className="hero-actions">
          <button className="primary-button">
            VER CLASIFICACIÓN
          </button>

          <button className="secondary-button">
            CREAR CUENTA
          </button>
        </div>
      </section>

      <section className="sections">
        <h3>EXPLORA LA LIGA</h3>

        <div className="section-grid">
          <article className="section-card">
            <span>01</span>
            <h4>CLASIFICACIÓN</h4>
            <p>Consulta las posiciones de los equipos.</p>
          </article>

          <article className="section-card">
            <span>02</span>
            <h4>ENFRENTAMIENTOS</h4>
            <p>Descubre los próximos partidos.</p>
          </article>

          <article className="section-card">
            <span>03</span>
            <h4>EQUIPOS</h4>
            <p>Conoce a los participantes.</p>
          </article>
        </div>
      </section>

      <footer>
        LIGA4VS4 OFICIAL © 2026
        <p>UNA LIGA. UNA COMUNIDAD.</p>
      </footer>
    </main>
  );
}
