import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ClipboardCheck, RotateCcw, Timer, X } from 'lucide-react';
import './estilos.css';
import { TEXTOS, type Pregunta, type TextoPrueba } from '@/data/fuentes';
import { contarPalabras } from '@/lib/texto';
import { ppmDesde, ppmEfectivo, formatoPorcentaje } from '@/lib/ppm';
import { formatoDuracion, ahoraLocalISO } from '@/lib/tiempo';
import { useCronometro } from '@/hooks/useCronometro';
import { registrarRespuestas, registrarSesion, resumenTexto } from '@/db/repo';
import { Aviso, Boton, Chip, Kpi, Tarjeta, Vacio } from '@/components/ui';
import { t } from '@/i18n/es';

type Fase = 'seleccion' | 'leyendo' | 'cuestionario' | 'resultado';

interface Resultado {
  ppm: number;
  comprension: number;
  efectivo: number;
  aciertos: number;
}

export function TestPage() {
  const navegar = useNavigate();
  const [textoId, setTextoId] = useState(TEXTOS[0]?.id ?? '');
  const [fase, setFase] = useState<Fase>('seleccion');
  const [elecciones, setElecciones] = useState<(number | null)[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mejor, setMejor] = useState<{ mejorPpm: number | null; mejorEfectivo: number | null }>({
    mejorPpm: null,
    mejorEfectivo: null,
  });
  const cron = useCronometro();
  const msLecturaRef = useRef(0);
  const guardadoRef = useRef(false);

  const texto: TextoPrueba | undefined = useMemo(
    () => TEXTOS.find((x) => x.id === textoId) ?? TEXTOS[0],
    [textoId],
  );
  const totalPalabras = useMemo(() => (texto ? contarPalabras(texto.texto) : 0), [texto]);

  useEffect(() => {
    guardadoRef.current = false;
    setResultado(null);
    setElecciones([]);
    setFase('seleccion');
    cron.reiniciar();
  }, [textoId]);

  useEffect(() => {
    let vivo = true;
    void resumenTexto(textoId).then((r) => {
      if (vivo)
        setMejor({ mejorPpm: r.mejorPpm, mejorEfectivo: r.mejorEfectivo });
    });
    return () => {
      vivo = false;
    };
  }, [textoId]);

  if (!texto) {
    return (
      <div className="pagina">
        <Vacio titulo={t.comunes.sinDatos} />
      </div>
    );
  }

  const empezar = () => {
    cron.reiniciar();
    cron.iniciar();
    setFase('leyendo');
  };

  const terminar = () => {
    msLecturaRef.current = cron.parar();
    setElecciones(texto.preguntas.map(() => null));
    setFase('cuestionario');
  };

  const comprobar = () => {
    if (elecciones.some((e) => e === null)) return;
    const aciertos = texto.preguntas.reduce(
      (n, p, i) => n + (elecciones[i] === p.correcta ? 1 : 0),
      0,
    );
    const comprension = aciertos / texto.preguntas.length;
    const ppm = ppmDesde(totalPalabras, msLecturaRef.current);
    const efectivo = ppmEfectivo(ppm, comprension) ?? 0;
    const res: Resultado = { ppm, comprension, efectivo, aciertos };
    setResultado(res);
    setFase('resultado');

    if (guardadoRef.current) return;
    guardadoRef.current = true;

    void (async () => {
      const id = await registrarSesion({
        fecha: ahoraLocalISO(),
        tipo_ejercicio: 'test',
        ppm_base: ppm,
        comprension,
        ppm_efectivo: efectivo,
        palabras: totalPalabras,
        duracion_ms: msLecturaRef.current,
        agrupacion: null,
        extras: { textoId, titulo: texto.titulo, aciertos },
      });
      await registrarRespuestas(
        id,
        texto.preguntas.map((p, i) => ({
          pregunta: p.enunciado,
          elegida: p.opciones[elecciones[i] ?? 0] ?? '',
          correcta: p.opciones[p.correcta] ?? '',
          acierta: elecciones[i] === p.correcta,
        })),
      );
    })();
  };

  const reiniciar = () => {
    guardadoRef.current = false;
    setResultado(null);
    setElecciones([]);
    setFase('seleccion');
    cron.reiniciar();
  };

  return (
    <div className="pagina">
      <header className="encabezado-pagina">
        <div>
          <h1>{t.test.titulo}</h1>
          <p>{t.test.subtitulo}</p>
        </div>
        <Chip tono="acento">
          <ClipboardCheck size={13} /> {t.test.palabrasTotales}: {totalPalabras}
        </Chip>
      </header>

      <div className="rejilla" style={{ gap: 'var(--s4)', marginBottom: 'var(--s5)' }}>
        <div className="seleccion-test">
          <label htmlFor="select-texto">{t.test.eligeTexto}</label>
          <select
            id="select-texto"
            value={textoId}
            disabled={fase !== 'seleccion'}
            onChange={(e) => setTextoId(e.target.value)}
          >
            {TEXTOS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.titulo} · {contarPalabras(x.texto)} palabras
              </option>
            ))}
          </select>
        </div>
        <div className="rejilla rejilla--4">
          <Kpi
            etiqueta={t.test.palabrasTotales}
            valor={totalPalabras}
            icono={<ClipboardCheck size={13} />}
          />
          <Kpi
            etiqueta={t.test.mejorIntento}
            valor={mejor.mejorPpm ?? '—'}
            unidad={mejor.mejorPpm ? t.rsvp.ppmUnidad : undefined}
            icono={<Timer size={13} />}
          />
        </div>
      </div>

      {/* ---------------------------- SELECCIÓN ---------------------------- */}
      {fase === 'seleccion' && (
        <div className="rejilla" style={{ gap: 'var(--s4)' }}>
          <Tarjeta titulo={texto.titulo} icono={<ClipboardCheck size={16} />}>
            <p className="texto-extracto">{texto.texto.slice(0, 460)}…</p>
            <div className="test-acciones">
              <Boton variante="primario" tamano="grande" onClick={empezar}>
                {t.test.empezarLeer}
              </Boton>
            </div>
          </Tarjeta>
        </div>
      )}

      {/* ----------------------------- LECTURA ----------------------------- */}
      {fase === 'leyendo' && (
        <div className="rejilla" style={{ gap: 'var(--s4)' }}>
          <Tarjeta
            titulo={texto.titulo}
            acciones={
              <span className="cronometro" aria-live="off">
                {formatoDuracion(cron.ms)}
              </span>
            }
          >
            <article className="texto-lectura">{texto.texto}</article>
            <div className="test-acciones">
              <Boton variante="primario" tamano="grande" onClick={terminar}>
                {t.test.terminado}
              </Boton>
            </div>
            <Aviso>
              <Timer size={15} />
              <span>{t.test.consejoLectura}</span>
            </Aviso>
          </Tarjeta>
        </div>
      )}

      {/* --------------------------- CUESTIONARIO -------------------------- */}
      {fase === 'cuestionario' && (
        <Tarjeta
          titulo={t.test.cuestionario}
          icono={<ClipboardCheck size={16} />}
          acciones={<Chip>{formatoDuracion(msLecturaRef.current)}</Chip>}
        >
          <div className="cuestionario">
            {texto.preguntas.map((p, i) => (
              <Pregunta
                key={p.id}
                pregunta={p}
                indice={i}
                total={texto.preguntas.length}
                elegida={elecciones[i] ?? null}
                onElegir={(v) =>
                  setElecciones((prev) => prev.map((x, j) => (j === i ? v : x)))
                }
              />
            ))}
          </div>
          <div className="test-acciones">
            <Boton
              variante="primario"
              tamano="grande"
              onClick={comprobar}
              disabled={elecciones.some((e) => e === null)}
            >
              {t.test.comprobar}
            </Boton>
            {elecciones.some((e) => e === null) && (
              <span className="test-aviso">{t.test.revisaRespuestas}</span>
            )}
          </div>
        </Tarjeta>
      )}

      {/* ----------------------------- RESULTADO --------------------------- */}
      {fase === 'resultado' && resultado && (
        <div className="rejilla" style={{ gap: 'var(--s4)' }}>
          <Tarjeta
            titulo={t.comunes.resultado}
            icono={<Check size={16} />}
            acciones={<Chip tono="exito">{t.test.aciertos(resultado.aciertos, texto.preguntas.length)}</Chip>}
          >
            <div className="rejilla rejilla--4">
              <Kpi etiqueta={t.test.tuPpm} valor={resultado.ppm} unidad={t.rsvp.ppmUnidad} />
              <Kpi
                etiqueta={t.test.comprension}
                valor={formatoPorcentaje(resultado.comprension)}
              />
              <Kpi
                etiqueta={t.test.ppmEfectivo}
                valor={resultado.efectivo}
                unidad={t.rsvp.ppmUnidad}
                detalle={t.test.formula}
              />
              <Kpi etiqueta={t.comunes.duracion} valor={formatoDuracion(msLecturaRef.current)} />
            </div>
          </Tarjeta>

          <Tarjeta titulo={t.test.cuestionario} icono={<ClipboardCheck size={16} />}>
            <div className="cuestionario">
              {texto.preguntas.map((p, i) => (
                <Pregunta
                  key={p.id}
                  pregunta={p}
                  indice={i}
                  total={texto.preguntas.length}
                  elegida={elecciones[i] ?? null}
                  correcta={p.correcta}
                  soloLectura
                  onElegir={() => undefined}
                />
              ))}
            </div>
            <div className="test-acciones">
              <Boton onClick={reiniciar} icono={<RotateCcw size={16} />}>
                {t.test.repetir}
              </Boton>
              <Boton
                variante="primario"
                onClick={() => navegar('/progreso')}
                icono={<Timer size={16} />}
              >
                {t.test.registrar}
              </Boton>
            </div>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}

interface PropsPregunta {
  pregunta: Pregunta;
  indice: number;
  total: number;
  elegida: number | null;
  correcta?: number;
  soloLectura?: boolean;
  onElegir: (v: number) => void;
}

function Pregunta({
  pregunta,
  indice,
  total,
  elegida,
  correcta,
  soloLectura,
  onElegir,
}: PropsPregunta) {
  const nombre = `preg-${pregunta.id}`;
  return (
    <fieldset className="pregunta">
      <legend>
        <span className="pregunta__numero">{t.test.preguntaDe(indice + 1, total)}</span>
        <span className="pregunta__texto">{pregunta.enunciado}</span>
      </legend>

      <div className="pregunta__opciones">
        {pregunta.opciones.map((op, i) => {
          const esCorrecta = correcta !== undefined && i === correcta;
          const esElegida = elegida === i;
          const estado = soloLectura
            ? esCorrecta
              ? 'correcta'
              : esElegida
                ? 'incorrecta'
                : ''
            : '';
          return (
            <label
              key={op}
              className={`opcion ${estado}`}
              aria-disabled={soloLectura}
            >
              <input
                type="radio"
                name={nombre}
                value={i}
                checked={esElegida}
                disabled={soloLectura}
                onChange={() => onElegir(i)}
              />
              <span className="opcion__texto">{op}</span>
              {estado === 'correcta' && <Check size={16} className="opcion__icono ok" />}
              {estado === 'incorrecta' && <X size={16} className="opcion__icono mal" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
