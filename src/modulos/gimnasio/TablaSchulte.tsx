import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Target, Timer, TriangleAlert } from 'lucide-react';
import './estilos.css';
import { useCronometro } from '@/hooks/useCronometro';
import { ahoraLocalISO, formatoDuracion } from '@/lib/tiempo';
import { mejorSchulte, registrarSesion } from '@/db/repo';
import { Boton, Chip, Kpi, Tarjeta } from '@/components/ui';
import { t } from '@/i18n/es';

const TAMANO = 5;
const TOTAL = TAMANO * TAMANO;
const CENTRO = Math.floor(TOTAL / 2);

type Fase = 'espera' | 'activo' | 'completado';

function barajar(): number[] {
  const v = Array.from({ length: TOTAL }, (_, i) => i + 1);
  for (let i = v.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}

interface Estado {
  fase: Fase;
  cuadricula: number[];
  siguiente: number;
  errores: number;
  encontrados: Set<number>;
  tiempoMs: number;
}

const ESTADO_INICIAL: Estado = {
  fase: 'espera',
  cuadricula: [],
  siguiente: 1,
  errores: 0,
  encontrados: new Set(),
  tiempoMs: 0,
};

export function TablaSchulte() {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [mejor, setMejor] = useState<number | null>(null);
  const [fallo, setFallo] = useState<number | null>(null);
  const cron = useCronometro();
  const arrancadoRef = useRef(false);

  useEffect(() => {
    void mejorSchulte().then(setMejor);
  }, []);

  const empezar = useCallback(() => {
    cron.reiniciar();
    arrancadoRef.current = false;
    setFallo(null);
    setEstado({
      fase: 'activo',
      cuadricula: barajar(),
      siguiente: 1,
      errores: 0,
      encontrados: new Set(),
      tiempoMs: 0,
    });
  }, [cron]);

  const alPulsar = useCallback(
    (valor: number) => {
      if (estado.fase !== 'activo') return;

      if (valor !== estado.siguiente) {
        setFallo(valor);
        window.setTimeout(() => setFallo((f) => (f === valor ? null : f)), 320);
        setEstado({ ...estado, errores: estado.errores + 1 });
        return;
      }

      if (!arrancadoRef.current) {
        arrancadoRef.current = true;
        cron.iniciar();
      }

      const encontrados = new Set(estado.encontrados).add(valor);
      const siguiente = estado.siguiente + 1;

      if (siguiente > TOTAL) {
        const ms = cron.parar();
        setEstado({
          ...estado,
          encontrados,
          siguiente: TOTAL + 1,
          fase: 'completado',
          tiempoMs: ms,
        });
        setMejor((m) => (m === null ? ms : Math.min(m, ms)));
        void registrarSesion({
          fecha: ahoraLocalISO(),
          tipo_ejercicio: 'schulte',
          ppm_base: null,
          comprension: null,
          ppm_efectivo: null,
          palabras: null,
          duracion_ms: ms,
          agrupacion: null,
          extras: {
            tamano: TAMANO,
            tiempo_ms: ms,
            errores: estado.errores,
            numeros_por_minuto: Math.round(TOTAL / (ms / 60000)),
          },
        });
        return;
      }

      setEstado({ ...estado, encontrados, siguiente });
    },
    [estado, cron],
  );

  const transcurrido = estado.fase === 'completado' ? estado.tiempoMs : cron.ms;

  return (
    <div className="schulte">
      <div className="schulte__columna">
        <Tarjeta
          titulo={t.gimnasio.schulte.rejilla}
          icono={<Target size={16} />}
          acciones={
            <div className="fila-botones">
              <Chip tono="acento">
                <Timer size={13} /> {formatoDuracion(transcurrido)}
              </Chip>
              <Chip tono={estado.errores > 0 ? 'peligro' : 'neutro'}>
                <TriangleAlert size={13} /> {estado.errores}
              </Chip>
            </div>
          }
        >
          <div className="schulte-rejilla" role="grid" aria-label={t.gimnasio.schulte.rejilla}>
            {estado.fase === 'espera' ? (
              Array.from({ length: TOTAL }, (_, i) => (
                <div key={i} className="schulte-celda schulte-celda--vacia" />
              ))
            ) : (
              estado.cuadricula.map((valor, i) => {
                const hecho = estado.encontrados.has(valor);
                const esCentro = i === CENTRO;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="gridcell"
                    disabled={hecho || estado.fase !== 'activo'}
                    className={[
                      'schulte-celda',
                      hecho ? 'schulte-celda--hecha' : '',
                      fallo === valor ? 'schulte-celda--fallo' : '',
                      esCentro ? 'schulte-celda--centro' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => alPulsar(valor)}
                  >
                    {hecho ? <Check size={18} /> : valor}
                    {esCentro && !hecho && <span className="schulte-punto" aria-hidden />}
                  </button>
                );
              })
            )}
          </div>

          <div className="schulte-estado">
            {estado.fase === 'espera' && <span>{t.gimnasio.schulte.espera}</span>}
            {estado.fase === 'activo' && (
              <span>
                {t.gimnasio.schulte.aciertos}: <strong>{estado.siguiente}</strong> / {TOTAL}
              </span>
            )}
            {estado.fase === 'completado' && (
              <span className="schulte-ok">
                {t.gimnasio.schulte.completado} · {formatoDuracion(estado.tiempoMs)}
              </span>
            )}
          </div>

          <div className="schulte-acciones">
            <Boton
              variante={estado.fase === 'espera' ? 'primario' : 'secundario'}
              onClick={empezar}
              icono={<RotateCcw size={16} />}
            >
              {estado.fase === 'espera'
                ? t.gimnasio.schulte.empezar
                : t.comunes.reiniciar}
            </Boton>
          </div>
        </Tarjeta>
      </div>

      <div className="schulte__columna schulte__columna--lateral">
        <Tarjeta apretada>
          <div className="rejilla rejilla--2">
            <Kpi
              etiqueta={t.gimnasio.schulte.tiempo}
              valor={formatoDuracion(transcurrido)}
              icono={<Timer size={13} />}
            />
            <Kpi
              etiqueta={t.gimnasio.schulte.mejor}
              valor={mejor === null ? '—' : formatoDuracion(mejor)}
              icono={<Check size={13} />}
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo={t.gimnasio.schulte.comoFunciona} icono={<Target size={16} />} apretada>
          <ol className="pasos">
            <li>{t.gimnasio.schulte.paso1}</li>
            <li>{t.gimnasio.schulte.paso2}</li>
            <li>{t.gimnasio.schulte.paso3}</li>
          </ol>
        </Tarjeta>
      </div>
    </div>
  );
}
