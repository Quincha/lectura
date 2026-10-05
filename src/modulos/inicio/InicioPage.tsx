import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardCheck,
  Eye,
  Flame,
  Gauge,
  Target,
  Zap,
} from 'lucide-react';
import './estilos.css';
import type { Sesion } from '@/db/types';
import { historial, resumen } from '@/db/repo';
import { formatoDuracionLargo, formatoFecha } from '@/lib/tiempo';
import { formatoPorcentaje, formatoPpm } from '@/lib/ppm';
import { Boton, Chip, Kpi, Tarjeta, Vacio } from '@/components/ui';
import { t } from '@/i18n/es';

const ACCESOS = [
  { ruta: '/rsvp', icono: Zap, titulo: t.nav.rsvp, texto: t.inicio.atajoRsvp },
  { ruta: '/test', icono: ClipboardCheck, titulo: t.nav.test, texto: t.inicio.atajoTest },
  { ruta: '/gimnasio', icono: Target, titulo: t.gimnasio.schulte.titulo, texto: t.inicio.atajoSchulte },
  { ruta: '/progreso', icono: Flame, titulo: t.nav.progreso, texto: t.inicio.atajoSangria },
];

export function InicioPage() {
  const navegar = useNavigate();
  const [sesiones, setSesiones] = useState<Sesion[] | null>(null);

  useEffect(() => {
    let vivo = true;
    void historial(30, 100).then((h) => {
      if (vivo) setSesiones(h);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const kpi = useMemo(() => resumen(sesiones ?? []), [sesiones]);
  const recientes = sesiones?.slice(0, 6) ?? [];

  return (
    <div className="pagina">
      <header className="inicio-hero">
        <div>
          <span className="inicio-hero__cinta">
            <Gauge size={14} /> {t.app.lema}
          </span>
          <h1>{t.inicio.titulo}</h1>
          <p>{t.inicio.subtitulo}</p>
          <div className="fila-botones" style={{ marginTop: 'var(--s4)' }}>
            <Boton variante="primario" tamano="grande" onClick={() => navegar('/rsvp')}>
              {t.inicio.empezarRsvp} <ArrowRight size={17} />
            </Boton>
            <Boton tamano="grande" onClick={() => navegar('/test')}>
              {t.nav.test}
            </Boton>
          </div>
        </div>
      </header>

      <div className="rejilla rejilla--4" style={{ margin: 'var(--s5) 0' }}>
        <Kpi
          etiqueta={t.inicio.ultimoPpm}
          valor={formatoPpm(kpi.ultimaSesion?.ppm_efectivo ?? kpi.ultimaSesion?.ppm_base)}
          unidad={t.rsvp.ppmUnidad}
          icono={<Gauge size={13} />}
        />
        <Kpi
          etiqueta={t.inicio.mejorPpm}
          valor={formatoPpm(kpi.mejorPpm)}
          unidad={t.rsvp.ppmUnidad}
          icono={<Zap size={13} />}
        />
        <Kpi
          etiqueta={t.inicio.sesiones30}
          valor={kpi.sesiones}
          icono={<Eye size={13} />}
        />
        <Kpi
          etiqueta={t.inicio.comprensionMedia}
          valor={formatoPorcentaje(kpi.comprensionMedia)}
          icono={<ClipboardCheck size={13} />}
        />
      </div>

      <div className="rejilla rejilla--2" style={{ marginBottom: 'var(--s4)' }}>
        {ACCESOS.map((a) => {
          const Icono = a.icono;
          return (
            <button
              key={a.ruta}
              type="button"
              className="acceso"
              onClick={() => navegar(a.ruta)}
            >
              <span className="acceso__icono">
                <Icono size={20} />
              </span>
              <span className="acceso__texto">
                <strong>{a.titulo}</strong>
                <span>{a.texto}</span>
              </span>
              <ArrowRight size={17} className="acceso__flecha" />
            </button>
          );
        })}
      </div>

      <Tarjeta
        titulo={t.inicio.progresoReciente}
        icono={<Flame size={16} />}
        acciones={
          <Boton variante="fantasma" onClick={() => navegar('/progreso')}>
            {t.comunes.verProgreso} <ArrowRight size={15} />
          </Boton>
        }
      >
        {recientes.length === 0 ? (
          <Vacio titulo={t.inicio.sinSesiones} texto={t.comunes.sinDatosAyuda} icono={<Flame size={26} />} />
        ) : (
          <div className="tabla-envoltorio">
            <table className="tabla">
              <thead>
                <tr>
                  <th>{t.comunes.fecha}</th>
                  <th>{t.progreso.tipo}</th>
                  <th className="num">{t.progreso.ppmBase}</th>
                  <th className="num">{t.progreso.comprensionCol}</th>
                  <th className="num">{t.comunes.duracion}</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((s) => (
                  <tr key={s.id}>
                    <td>{formatoFecha(s.fecha)}</td>
                    <td>
                      <Chip>{t.progreso.tipos[s.tipo_ejercicio]}</Chip>
                    </td>
                    <td className="num">{formatoPpm(s.ppm_base)}</td>
                    <td className="num">{formatoPorcentaje(s.comprension)}</td>
                    <td className="num">{formatoDuracionLargo(s.duracion_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <p className="inicio-pie">
        <Target size={13} /> {t.app.local}
      </p>
    </div>
  );
}
