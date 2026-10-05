import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Info,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Timer,
} from 'lucide-react';
import { EscenarioRsvp } from './EscenarioRsvp';
import './estilos.css';
import { useRsvp } from '@/hooks/useRsvp';
import { useTeclado } from '@/hooks/useTeclado';
import { TEXTOS, obtenerTexto } from '@/data/fuentes';
import { TEXTO_EJEMPLO, duracionEstimada, tokenizar } from '@/lib/texto';
import { PPM_MAX, PPM_MIN, PPM_PASO, limitarPpm } from '@/lib/ppm';
import { formatoDuracion, ahoraLocalISO } from '@/lib/tiempo';
import { guardarConfig, leerConfig, registrarSesion } from '@/db/repo';
import { Aviso, Barra, Boton, Chip, Deslizador, Interruptor, Segmentado, Tarjeta } from '@/components/ui';
import { t } from '@/i18n/es';

type Origen = 'ejemplo' | 'propio' | string;

export function RsvpPage() {
  const [origen, setOrigen] = useState<Origen>('ejemplo');
  const [propio, setPropio] = useState('');
  const [ppm, setPpm] = useState(300);
  const [agrupacion, setAgrupacion] = useState(1);
  const [pausas, setPausas] = useState(true);
  const [anclaje, setAnclaje] = useState(true);
  const [guardado, setGuardado] = useState(false);

  const registradoRef = useRef(false);

  useEffect(() => {
    let vivo = true;
    void leerConfig('ppmInicial').then((v) => {
      if (vivo && v) setPpm(limitarPpm(Number(v) || 300));
    });
    void leerConfig('agrupacionInicial').then((v) => {
      if (vivo && v) {
        const n = Number(v);
        if (n >= 1 && n <= 4) setAgrupacion(n);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  const fuente = useMemo(() => {
    if (origen === 'propio') return propio;
    if (origen === 'ejemplo') return TEXTO_EJEMPLO;
    return obtenerTexto(origen)?.texto ?? '';
  }, [origen, propio]);

  const palabras = useMemo(() => tokenizar(fuente), [fuente]);
  const control = useRsvp({ palabras, ppm, agrupacion, pausas });

  const { estado, indice, chunk } = control;

  useTeclado(
    (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        control.alternar();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        control.siguiente();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        control.anterior();
      } else if (e.code === 'Escape') {
        control.detener();
      }
    },
    true,
    [control.alternar, control.siguiente, control.anterior, control.detener],
  );

  /* Registro automático al terminar la reproducción. */
  useEffect(() => {
    if (estado !== 'finalizado') {
      registradoRef.current = false;
      if (estado === 'inactivo') setGuardado(false);
      return;
    }
    if (registradoRef.current) return;
    registradoRef.current = true;
    const duracion = control.duracionMs();
    if (duracion < 1500) return;
    void registrarSesion({
      fecha: ahoraLocalISO(),
      tipo_ejercicio: 'rsvp',
      ppm_base: ppm,
      comprension: null,
      ppm_efectivo: null,
      palabras: palabras.length,
      duracion_ms: duracion,
      agrupacion,
      extras: { pausas, anclaje, origen },
    }).then(() => setGuardado(true));
  }, [estado]);

  useEffect(() => {
    void guardarConfig('ppmInicial', String(ppm));
    void guardarConfig('agrupacionInicial', String(agrupacion));
  }, [ppm, agrupacion]);

  const restanteMs = useMemo(
    () => duracionEstimada(palabras.slice(indice), ppm, agrupacion, pausas),
    [palabras, indice, ppm, agrupacion, pausas],
  );

  const opcionesOrigen: { valor: string; etiqueta: string }[] = [
    { valor: 'ejemplo', etiqueta: t.rsvp.fuenteEjemplo },
    ...TEXTOS.map((x) => ({ valor: x.id, etiqueta: x.titulo })),
    { valor: 'propio', etiqueta: t.rsvp.fuentePropio },
  ];

  return (
    <div className="pagina">
      <header className="encabezado-pagina">
        <div>
          <h1>{t.rsvp.titulo}</h1>
          <p>{t.rsvp.subtitulo}</p>
        </div>
        <Chip tono="acento">
          <Timer size={13} /> {palabras.length} {t.comunes.palabras}
        </Chip>
      </header>

      <div className="rsvp-rejilla">
        <div className="rejilla" style={{ gap: 'var(--s4)' }}>
          <Tarjeta>
            <EscenarioRsvp
              chunk={chunk}
              estado={estado}
              agrupacion={agrupacion}
              anclaje={anclaje}
              indice={indice}
              total={palabras.length}
            />

            <div style={{ marginTop: 'var(--s4)', display: 'grid', gap: 'var(--s3)' }}>
              <Barra valor={control.progreso} />
              <div className="rsvp-datos">
                <span>
                  {t.rsvp.restante}: {control.restantes} {t.comunes.palabras}
                </span>
                <span>
                  {t.rsvp.tiempoEstimado}: {formatoDuracion(restanteMs)}
                </span>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta
            titulo={t.rsvp.fuente}
            icono={<Info size={16} />}
            acciones={
              <div className="seleccion">
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  aria-label={t.rsvp.fuente}
                >
                  {opcionesOrigen.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {origen === 'propio' ? (
              <textarea
                className="rsvp-texto"
                value={propio}
                spellCheck={false}
                placeholder={t.rsvp.phEscribe}
                onChange={(e) => setPropio(e.target.value)}
              />
            ) : (
              <p style={{ color: 'var(--texto-suave)', fontSize: '0.88rem' }}>
                {fuente.slice(0, 220)}…
              </p>
            )}
          </Tarjeta>
        </div>

        <aside className="rsvp-panel">
          <Tarjeta titulo={t.rsvp.ppm} icono={<Timer size={16} />} apretada>
            <div className="rsvp-panel__bloque">
              <Deslizador
                etiqueta={t.rsvp.ppm}
                ayuda={t.rsvp.ppmAyuda}
                valor={ppm}
                min={PPM_MIN}
                max={PPM_MAX}
                paso={PPM_PASO}
                unidad={t.rsvp.ppmUnidad}
                onChange={setPpm}
              />
            </div>
          </Tarjeta>

          <Tarjeta titulo={t.rsvp.agrupacion} icono={<Eye size={16} />} apretada>
            <div className="rsvp-panel__bloque">
              <Segmentado
                opciones={[1, 2, 3, 4].map((n) => ({
                  valor: n,
                  etiqueta: n === 1 ? '1' : String(n),
                }))}
                valor={agrupacion}
                onChange={(v) => setAgrupacion(Number(v))}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--texto-tenue)' }}>
                {agrupacion === 1 ? t.rsvp.agrupacionAyuda : t.rsvp.avisoAgrupacion(agrupacion)}
              </p>
              <Interruptor
                etiqueta={t.rsvp.pausas}
                valor={pausas}
                onChange={setPausas}
              />
              <Interruptor
                etiqueta={t.rsvp.anclaje}
                valor={anclaje}
                disabled={agrupacion !== 1}
                onChange={setAnclaje}
              />
            </div>
          </Tarjeta>

          <Tarjeta apretada>
            <div className="rsvp-panel__bloque">
              <div className="rsvp-reproducir">
                <Boton
                  variante="primario"
                  onClick={control.alternar}
                  disabled={palabras.length === 0}
                  icono={estado === 'reproduciendo' ? <Pause size={17} /> : <Play size={17} />}
                >
                  {estado === 'reproduciendo' ? t.comunes.pausar : t.rsvp.reproducir}
                </Boton>
                <Boton
                  tamano="icono"
                  onClick={control.anterior}
                  disabled={palabras.length === 0}
                  title={t.comunes.anterior}
                  aria-label={t.comunes.anterior}
                >
                  <SkipBack size={16} />
                </Boton>
                <Boton
                  tamano="icono"
                  onClick={control.siguiente}
                  disabled={palabras.length === 0}
                  title={t.comunes.siguiente}
                  aria-label={t.comunes.siguiente}
                >
                  <SkipForward size={16} />
                </Boton>
                <Boton
                  tamano="icono"
                  onClick={control.detener}
                  title={t.comunes.detener}
                  aria-label={t.comunes.detener}
                >
                  <Square size={15} />
                </Boton>
              </div>

              {guardado && (
                <Chip tono="exito">{t.rsvp.registrada}</Chip>
              )}

              <p style={{ fontSize: '0.74rem', color: 'var(--texto-tenue)' }}>
                {t.comunes.atajos}
              </p>
            </div>
          </Tarjeta>

          {agrupacion > 1 && (
            <Aviso>
              <Info size={15} />
              <span>{t.rsvp.avisoAgrupacion(agrupacion)}</span>
            </Aviso>
          )}
        </aside>
      </div>
    </div>
  );
}
