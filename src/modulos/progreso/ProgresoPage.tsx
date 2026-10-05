import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Eye,
  Flame,
  Gauge,
  LineChart as LineChartIcon,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';
import './estilos.css';
import type { ConteoTipo, PuntoDiario, Sesion } from '@/db/types';
import { conteoPorTipo, historial, reiniciarHistorial, resumen, serieDiaria } from '@/db/repo';
import { formatoDuracionLargo, formatoFecha, formatoDiaCorto } from '@/lib/tiempo';
import { formatoPorcentaje, formatoPpm } from '@/lib/ppm';
import { Aviso, Boton, Chip, Kpi, Tarjeta, Vacio } from '@/components/ui';
import { t } from '@/i18n/es';

const COLORES: Record<string, string> = {
  rsvp: 'var(--acento)',
  test: 'var(--exito)',
  schulte: 'var(--alerta)',
  sangria: '#8b5cf6',
};

export function ProgresoPage() {
  const navegar = useNavigate();
  const [sesiones, setSesiones] = useState<Sesion[] | null>(null);
  const [serie, setSerie] = useState<PuntoDiario[]>([]);
  const [tipos, setTipos] = useState<ConteoTipo[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  const cargar = useCallback(async () => {
    const [h, s, c] = await Promise.all([historial(30), serieDiaria(30), conteoPorTipo(30)]);
    setSesiones(h);
    setSerie(s);
    setTipos(c);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const kpi = useMemo(() => resumen(sesiones ?? []), [sesiones]);

  const datosGrafica = useMemo(
    () =>
      serie.map((p) => ({
        dia: formatoDiaCorto(p.dia),
        ppm: p.ppm,
        comprension: p.comprension === null ? null : Math.round(p.comprension * 100),
        sesiones: p.sesiones,
      })),
    [serie],
  );

  const conActividad = serie.some((p) => p.sesiones > 0);
  const maxSesiones = Math.max(1, ...serie.map((p) => p.sesiones));

  const borrar = async () => {
    await reiniciarHistorial();
    setConfirmando(false);
    await cargar();
  };

  if (sesiones === null) {
    return (
      <div className="pagina">
        <Vacio titulo={t.comunes.cargando} />
      </div>
    );
  }

  return (
    <div className="pagina">
      <header className="encabezado-pagina">
        <div>
          <h1>{t.progreso.titulo}</h1>
          <p>{t.progreso.subtitulo}</p>
        </div>
        <div className="fila-botones">
          <Boton variante="primario" onClick={() => navegar('/rsvp')}>
            {t.inicio.empezarRsvp}
          </Boton>
        </div>
      </header>

      {sesiones.length === 0 ? (
        <Tarjeta>
          <Vacio
            titulo={t.comunes.sinDatos}
            texto={t.comunes.sinDatosAyuda}
            icono={<LineChartIcon size={28} />}
          />
        </Tarjeta>
      ) : (
        <>
          <div className="rejilla rejilla--4" style={{ marginBottom: 'var(--s4)' }}>
            <Kpi
              etiqueta={t.progreso.ppmMedio}
              valor={formatoPpm(kpi.ppmMedio)}
              unidad={t.rsvp.ppmUnidad}
              icono={<Gauge size={13} />}
              detalle={`${kpi.sesiones} ${t.progreso.sesiones.toLowerCase()}`}
            />
            <Kpi
              etiqueta={t.progreso.mejorSesion}
              valor={formatoPpm(kpi.mejorPpm)}
              unidad={t.rsvp.ppmUnidad}
              icono={<Target size={13} />}
            />
            <Kpi
              etiqueta={t.progreso.comprension}
              valor={formatoPorcentaje(kpi.comprensionMedia)}
              icono={<Eye size={13} />}
              detalle={kpi.comprensionMedia === null ? '—' : t.test.formula}
            />
            <Kpi
              etiqueta={t.progreso.sesiones}
              valor={kpi.sesiones}
              icono={<Activity size={13} />}
              detalle={
                kpi.ultimaSesion ? formatoFecha(kpi.ultimaSesion.fecha) : '—'
              }
            />
          </div>

          <div className="rejilla" style={{ gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
            <Tarjeta
              titulo={t.progreso.graficaTitulo}
              icono={<LineChartIcon size={16} />}
              acciones={<Chip>{t.progreso.graficaSubtitulo}</Chip>}
            >
              {conActividad ? (
                <div className="grafica">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={datosGrafica} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
                      <XAxis
                        dataKey="dia"
                        tick={{ fill: 'var(--texto-tenue)', fontSize: 11 }}
                        axisLine={{ stroke: 'var(--borde)' }}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        yAxisId="ppm"
                        tick={{ fill: 'var(--texto-tenue)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={54}
                      />
                      <YAxis
                        yAxisId="comp"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fill: 'var(--texto-tenue)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-elevado)',
                          border: '1px solid var(--borde-fuerte)',
                          borderRadius: 10,
                          fontSize: 12,
                          color: 'var(--texto)',
                        }}
                        labelStyle={{ color: 'var(--texto-suave)' }}
                        formatter={(valor, nombre) => [
                          String(nombre) === 'comprension' ? `${valor}%` : valor,
                          String(nombre) === 'comprension'
                            ? t.progreso.ejeComprension
                            : t.progreso.ejePpm,
                        ]}
                      />
                      <Line
                        yAxisId="ppm"
                        type="monotone"
                        dataKey="ppm"
                        name="ppm"
                        stroke="var(--acento)"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, strokeWidth: 0, fill: 'var(--acento)' }}
                        connectNulls
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="comp"
                        type="monotone"
                        dataKey="comprension"
                        name="comprension"
                        stroke="var(--exito)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={{ r: 3, strokeWidth: 0, fill: 'var(--exito)' }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Vacio titulo={t.progreso.sinSerie} />
              )}
            </Tarjeta>
          </div>

          <div className="rejilla rejilla--2" style={{ marginBottom: 'var(--s4)' }}>
            <Tarjeta titulo={t.progreso.porTipo} icono={<Activity size={16} />} apretada>
              {tipos.length > 0 ? (
                <div className="grafica">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={tipos.map((x) => ({ ...x, nombre: t.progreso.tipos[x.tipo] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
                      <XAxis
                        dataKey="nombre"
                        tick={{ fill: 'var(--texto-tenue)', fontSize: 11 }}
                        axisLine={{ stroke: 'var(--borde)' }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: 'var(--texto-tenue)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={34}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--acento-sutil)' }}
                        contentStyle={{
                          background: 'var(--bg-elevado)',
                          border: '1px solid var(--borde-fuerte)',
                          borderRadius: 10,
                          fontSize: 12,
                          color: 'var(--texto)',
                        }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {tipos.map((x) => (
                          <Cell key={x.tipo} fill={COLORES[x.tipo] ?? 'var(--acento)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Vacio titulo={t.progreso.sinSerie} />
              )}
            </Tarjeta>

            <Tarjeta
              titulo={t.progreso.mapaTitulo}
              icono={<Flame size={16} />}
              acciones={<Chip>{t.progreso.mapaSubtitulo}</Chip>}
            >
              <div className="mapa">
                {serie.map((p) => {
                  const nivel = p.sesiones === 0 ? 0 : Math.ceil((p.sesiones / maxSesiones) * 3);
                  return (
                    <span
                      key={p.dia}
                      className={`mapa__celda nivel-${nivel}`}
                      title={`${formatoDiaCorto(p.dia)} · ${p.sesiones} ${t.progreso.sesiones.toLowerCase()}`}
                    />
                  );
                })}
              </div>
              <div className="mapa__leyenda">
                <span>menos</span>
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className={`mapa__celda nivel-${n}`} />
                ))}
                <span>más</span>
              </div>
            </Tarjeta>
          </div>

          <Tarjeta
            titulo={t.progreso.historial}
            icono={<Timer size={16} />}
            acciones={
              confirmando ? (
                <div className="fila-botones">
                  <Boton variante="peligro" onClick={borrar}>
                    {t.progreso.confirmar}
                  </Boton>
                  <Boton variante="fantasma" onClick={() => setConfirmando(false)}>
                    {t.comunes.cancelar}
                  </Boton>
                </div>
              ) : (
                <Boton
                  variante="fantasma"
                  icono={<Trash2 size={15} />}
                  onClick={() => setConfirmando(true)}
                >
                  {t.progreso.reiniciarHistorial}
                </Boton>
              )
            }
          >
            {confirmando && <Aviso>{t.comunes.confirmarReinicio}</Aviso>}
            <div className="tabla-envoltorio">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>{t.comunes.fecha}</th>
                    <th>{t.progreso.tipo}</th>
                    <th className="num">{t.progreso.ppmBase}</th>
                    <th className="num">{t.progreso.comprensionCol}</th>
                    <th className="num">{t.progreso.ppmEfectivo}</th>
                    <th className="num">{t.comunes.duracion}</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.slice(0, 40).map((s) => (
                    <tr key={s.id}>
                      <td>{formatoFecha(s.fecha)}</td>
                      <td>
                        <Chip tono="neutro">{t.progreso.tipos[s.tipo_ejercicio]}</Chip>
                      </td>
                      <td className="num">{formatoPpm(s.ppm_base)}</td>
                      <td className="num">{formatoPorcentaje(s.comprension)}</td>
                      <td className="num">{formatoPpm(s.ppm_efectivo)}</td>
                      <td className="num">{formatoDuracionLargo(s.duracion_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </>
      )}
    </div>
  );
}
