import { useEffect, useMemo, useRef, useState } from 'react';
import type { EstadoRsvp } from '@/hooks/useRsvp';
import { anclar } from '@/lib/ancla';
import { crearMedidor, desplazamientoAncla, type Medidor } from '@/lib/metricas';
import { t } from '@/i18n/es';

interface Props {
  chunk: string[];
  estado: EstadoRsvp;
  agrupacion: number;
  anclaje: boolean;
  indice: number;
  total: number;
}

export function EscenarioRsvp({ chunk, estado, agrupacion, anclaje, indice, total }: Props) {
  const escRef = useRef<HTMLDivElement>(null);
  const [medir, setMedir] = useState<Medidor>(() => () => 0);

  useEffect(() => {
    const el = escRef.current;
    if (!el) return;
    const refrescar = () => setMedir(() => crearMedidor(el));
    refrescar();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(refrescar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activo = estado === 'reproduciendo' || estado === 'pausado';
  const mostrarAncla = activo && agrupacion === 1 && anclaje && chunk.length === 1;

  const palabra = chunk[0] ?? '';
  const anclaje3 = useMemo(() => (mostrarAncla ? anclar(palabra) : null), [mostrarAncla, palabra]);
  const dx = anclaje3 ? desplazamientoAncla(medir, anclaje3.izq, anclaje3.der) : 0;

  return (
    <div
      className="escenario"
      ref={escRef}
      data-estado={estado}
      aria-live="polite"
      aria-atomic="true"
    >
      {estado === 'inactivo' && (
        <div className="escenario__aviso">
          <strong>{t.rsvp.inicioListo}</strong>
          <span>{t.rsvp.consejo}</span>
        </div>
      )}

      {estado === 'finalizado' && (
        <div className="escenario__aviso escenario__aviso--fin">
          <strong>{t.rsvp.finReproduccion}</strong>
          <span>{t.rsvp.registrada}</span>
        </div>
      )}

      {activo && chunk.length > 0 && (
        <div className="escenario__capa">
          {agrupacion === 1 ? (
            <div
              className="palabra"
              key={`${indice}-${palabra}`}
              style={anclaje3 ? { transform: `translateX(${dx.toFixed(2)}px)` } : undefined}
            >
              {anclaje3 ? (
                <>
                  <span className="palabra__izq">{anclaje3.izq}</span>
                  <span className="palabra__ancla">{anclaje3.ancla}</span>
                  <span className="palabra__der">{anclaje3.der}</span>
                </>
              ) : (
                <span className="palabra__texto">{palabra}</span>
              )}
            </div>
          ) : (
            <div className="grupo" key={indice}>
              {chunk.map((p, i) => (
                <span
                  key={`${i}-${p}`}
                  className={`grupo__palabra ${i === Math.floor((chunk.length - 1) / 2) ? 'es-ancla' : ''}`}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {estado === 'pausado' && <span className="escenario__badge">PAUSA</span>}

      <div className="escenario__contador">
        <span>
          {Math.min(indice + chunk.length, total)} / {total}
        </span>
        <span>{t.rsvp.palabraActual}</span>
      </div>
    </div>
  );
}
