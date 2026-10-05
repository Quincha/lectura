import { useMemo, useState } from 'react';
import { AlignLeft, Check, RotateCcw, Timer } from 'lucide-react';
import './estilos.css';
import { TEXTOS, obtenerTexto } from '@/data/fuentes';
import { TEXTO_EJEMPLO, contarPalabras, partirEnLineas, tokenizar } from '@/lib/texto';
import { ppmDesde } from '@/lib/ppm';
import { ahoraLocalISO, formatoDuracion } from '@/lib/tiempo';
import { useCronometro } from '@/hooks/useCronometro';
import { registrarSesion } from '@/db/repo';
import { Aviso, Boton, Chip, Deslizador, Kpi, Tarjeta } from '@/components/ui';
import { t } from '@/i18n/es';

type Origen = 'ejemplo' | 'propio' | string;
type Fase = 'espera' | 'leyendo' | 'fin';

interface Res {
  ppm: number;
  palabras: number;
  ms: number;
}

export function SangriaVisual() {
  const [origen, setOrigen] = useState<Origen>('ejemplo');
  const [propio, setPropio] = useState('');
  const [porLinea, setPorLinea] = useState(8);
  const [fase, setFase] = useState<Fase>('espera');
  const [resultado, setResultado] = useState<Res | null>(null);
  const cron = useCronometro();

  const fuente = useMemo(() => {
    if (origen === 'propio') return propio;
    if (origen === 'ejemplo') return TEXTO_EJEMPLO;
    return obtenerTexto(origen)?.texto ?? '';
  }, [origen, propio]);

  const palabras = useMemo(() => tokenizar(fuente), [fuente]);
  const lineas = useMemo(() => partirEnLineas(palabras, porLinea), [palabras, porLinea]);

  const empezar = () => {
    setResultado(null);
    cron.reiniciar();
    cron.iniciar();
    setFase('leyendo');
  };

  const terminar = () => {
    const ms = cron.parar();
    const total = palabras.length;
    const ppm = ppmDesde(total, ms);
    setResultado({ ppm, palabras: total, ms });
    setFase('fin');
    if (ms > 1500 && total > 0) {
      void registrarSesion({
        fecha: ahoraLocalISO(),
        tipo_ejercicio: 'sangria',
        ppm_base: ppm,
        comprension: null,
        ppm_efectivo: null,
        palabras: total,
        duracion_ms: ms,
        agrupacion: null,
        extras: { palabras_por_linea: porLinea, origen },
      });
    }
  };

  const reiniciar = () => {
    cron.reiniciar();
    setResultado(null);
    setFase('espera');
  };

  return (
    <div className="sangria">
      <div className="rejilla" style={{ gap: 'var(--s4)' }}>
        <Tarjeta
          titulo={t.gimnasio.sangria.titulo}
          icono={<AlignLeft size={16} />}
          acciones={
            <div className="fila-botones">
              <Chip tono={fase === 'leyendo' ? 'acento' : 'neutro'}>
                <Timer size={13} /> {formatoDuracion(cron.ms)}
              </Chip>
            </div>
          }
        >
          <div className="sangria-texto" data-fase={fase}>
            {lineas.map((linea, i) => {
              const atenuar = linea.length > 2;
              return (
                <div className="linea" key={i}>
                  {linea.map((palabra, j) => {
                    const borde = atenuar && (j === 0 || j === linea.length - 1);
                    return (
                      <span key={`${i}-${j}`} className={borde ? 'linea__borde' : 'linea__centro'}>
                        {palabra}
                      </span>
                    );
                  })}
                </div>
              );
            })}
            {lineas.length === 0 && (
              <p className="sangria-vacio">{t.gimnasio.sangria.sinTexto}</p>
            )}
          </div>

          <div className="test-acciones">
            {fase !== 'leyendo' ? (
              <Boton variante="primario" tamano="grande" onClick={empezar} disabled={!palabras.length}>
                {t.test.empezarLeer}
              </Boton>
            ) : (
              <Boton variante="primario" tamano="grande" onClick={terminar}>
                {t.gimnasio.sangria.finLectura}
              </Boton>
            )}
            <Boton onClick={reiniciar} icono={<RotateCcw size={16} />}>
              {t.gimnasio.sangria.reiniciarLectura}
            </Boton>
          </div>

          <div style={{ marginTop: 'var(--s4)' }}>
            <Aviso>
              <AlignLeft size={15} />
              <span>{t.gimnasio.sangria.consejo}</span>
            </Aviso>
          </div>
        </Tarjeta>

        <div className="rejilla rejilla--4">
          <Kpi
            etiqueta={t.rsvp.ppm}
            valor={resultado ? resultado.ppm : '—'}
            unidad={resultado ? t.rsvp.ppmUnidad : undefined}
            icono={<Timer size={13} />}
          />
          <Kpi
            etiqueta={t.comunes.palabras}
            valor={palabras.length}
            icono={<AlignLeft size={13} />}
          />
          <Kpi etiqueta={t.comunes.duracion} valor={formatoDuracion(cron.ms)} />
          {resultado && (
            <Kpi
              etiqueta={t.comunes.resultado}
              valor={<Check size={18} />}
              detalle={t.rsvp.registrada}
            />
          )}
        </div>
      </div>

      <div className="rejilla rejilla--2" style={{ marginTop: 'var(--s4)' }}>
        <Tarjeta titulo={t.gimnasio.sangria.palabrasPorLinea} icono={<AlignLeft size={16} />} apretada>
          <Deslizador
            etiqueta={t.gimnasio.sangria.palabrasPorLinea}
            valor={porLinea}
            min={4}
            max={16}
            paso={1}
            unidad={t.comunes.palabras}
            disabled={fase === 'leyendo'}
            onChange={setPorLinea}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--texto-tenue)', marginTop: 'var(--s2)' }}>
            {t.gimnasio.sangria.registroNocturno}
          </p>
        </Tarjeta>

        <Tarjeta titulo={t.rsvp.fuente} icono={<AlignLeft size={16} />} apretada>
          <div className="seleccion">
            <select
              value={origen}
              disabled={fase === 'leyendo'}
              onChange={(e) => setOrigen(e.target.value)}
              aria-label={t.rsvp.fuente}
            >
              <option value="ejemplo">{t.rsvp.fuenteEjemplo}</option>
              {TEXTOS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.titulo}
                </option>
              ))}
              <option value="propio">{t.rsvp.fuentePropio}</option>
            </select>
          </div>
          {origen === 'propio' && (
            <textarea
              className="rsvp-texto"
              style={{ marginTop: 'var(--s3)' }}
              value={propio}
              spellCheck={false}
              disabled={fase === 'leyendo'}
              placeholder={t.rsvp.phEscribe}
              onChange={(e) => setPropio(e.target.value)}
            />
          )}
          <p style={{ fontSize: '0.78rem', color: 'var(--texto-tenue)', marginTop: 'var(--s2)' }}>
            {t.comunes.palabras}: {contarPalabras(fuente)}
          </p>
        </Tarjeta>
      </div>
    </div>
  );
}
