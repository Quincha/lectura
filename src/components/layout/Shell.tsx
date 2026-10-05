import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ClipboardCheck,
  Eye,
  Gauge,
  LineChart,
  Moon,
  Sun,
  Zap,
} from 'lucide-react';
import { t } from '@/i18n/es';

const ENLACES = [
  { grupo: t.nav.grupoAprendizaje, ruta: '/', texto: t.nav.inicio, icono: Gauge, inicio: true },
  { grupo: null, ruta: '/rsvp', texto: t.nav.rsvp, icono: Zap },
  { grupo: t.nav.grupoEvaluacion, ruta: '/test', texto: t.nav.test, icono: ClipboardCheck },
  { grupo: t.nav.grupoPractica, ruta: '/gimnasio', texto: t.nav.gimnasio, icono: Eye },
  { grupo: null, ruta: '/progreso', texto: t.nav.progreso, icono: LineChart },
];

interface ShellProps {
  tema: 'oscuro' | 'claro';
  onCambiarTema: (t: 'oscuro' | 'claro') => void;
  conectado: 'sqljs' | 'tauri-sql' | null;
  children: ReactNode;
}

export function Shell({ tema, onCambiarTema, conectado, children }: ShellProps) {
  let grupoPrevio: string | null | undefined;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <span className="marca__logo" aria-hidden>
            <Zap size={19} />
          </span>
          <span className="marca__texto">
            <strong>{t.app.nombre}</strong>
            <span>{t.app.lema}</span>
          </span>
        </div>

        <nav className="nav">
          {ENLACES.map((e) => {
            const cabecera = e.grupo && e.grupo !== grupoPrevio ? e.grupo : null;
            grupoPrevio = e.grupo;
            const Icono = e.icono;
            return (
              <div key={e.ruta}>
                {cabecera && <div className="nav__grupo">{cabecera}</div>}
                <NavLink
                  to={e.ruta}
                  end={e.inicio}
                  className={({ isActive }) => `nav__enlace ${isActive ? 'activo' : ''}`}
                >
                  <Icono size={17} />
                  {e.texto}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="sidebar__pie">
          <button
            type="button"
            className="boton boton--fantasma"
            onClick={() => onCambiarTema(tema === 'oscuro' ? 'claro' : 'oscuro')}
            aria-pressed={tema === 'claro'}
          >
            {tema === 'oscuro' ? <Moon size={16} /> : <Sun size={16} />}
            {tema === 'oscuro' ? t.nav.oscuro : t.nav.claro}
          </button>
          <p className="pie__nota">
            {t.app.local}
            {conectado && (
              <>
                <br />
                {conectado === 'tauri-sql' ? 'SQLite nativo' : 'SQLite · WASM'} · {conectado}
              </>
            )}
          </p>
        </div>
      </aside>

      <main className="contenido">{children}</main>
    </div>
  );
}
