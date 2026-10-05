import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* ------------------------------- Botón --------------------------------- */

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma';
type TamanoBoton = 'normal' | 'grande' | 'icono';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  icono?: ReactNode;
}

export function Boton({
  variante = 'secundario',
  tamano = 'normal',
  icono,
  children,
  className = '',
  ...props
}: BotonProps) {
  const clases = [
    'boton',
    variante === 'primario' ? 'boton--primario' : '',
    variante === 'peligro' ? 'boton--peligro' : '',
    variante === 'fantasma' ? 'boton--fantasma' : '',
    tamano === 'grande' ? 'boton--grande' : '',
    tamano === 'icono' ? 'boton--icono' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={clases} {...props}>
      {icono}
      {children}
    </button>
  );
}

/* ------------------------------ Tarjeta -------------------------------- */

interface TarjetaProps {
  titulo?: ReactNode;
  icono?: ReactNode;
  acciones?: ReactNode;
  apretada?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Tarjeta({
  titulo,
  icono,
  acciones,
  apretada,
  className = '',
  children,
}: TarjetaProps) {
  return (
    <section className={`tarjeta ${apretada ? 'tarjeta--apretada' : ''} ${className}`.trim()}>
      {(titulo || acciones) && (
        <header className="tarjeta__titulo">
          <h3>
            {icono}
            {titulo}
          </h3>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}

/* ----------------------------- Deslizador ------------------------------ */

interface DeslizadorProps {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  unidad?: string;
  ayuda?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso = 1,
  unidad,
  ayuda,
  disabled,
  onChange,
}: DeslizadorProps) {
  return (
    <div className="control">
      <div className="control__cabecera">
        <span>{ayuda ? <abbr title={ayuda}>{etiqueta}</abbr> : etiqueta}</span>
        <span className="control__valor">
          {valor}
          {unidad ? ` ${unidad}` : ''}
        </span>
      </div>
      <input
        className="deslizador"
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        disabled={disabled}
        aria-label={etiqueta}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/* ----------------------------- Segmentado ------------------------------ */

export interface OpcionSegmento {
  valor: string | number;
  etiqueta: ReactNode;
}

interface SegmentadoProps {
  etiqueta?: string;
  opciones: OpcionSegmento[];
  valor: string | number;
  disabled?: boolean;
  onChange: (v: string | number) => void;
}

export function Segmentado({ etiqueta, opciones, valor, disabled, onChange }: SegmentadoProps) {
  return (
    <div className="control">
      {etiqueta && <div className="control__cabecera">{etiqueta}</div>}
      <div className="segmentado" role="group" aria-label={etiqueta}>
        {opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            className={o.valor === valor ? 'activo' : ''}
            aria-pressed={o.valor === valor}
            disabled={disabled}
            onClick={() => onChange(o.valor)}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- Interruptor ----------------------------- */

interface InterruptorProps {
  etiqueta: string;
  valor: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

export function Interruptor({ etiqueta, valor, disabled, onChange }: InterruptorProps) {
  return (
    <label className="interruptor">
      <input
        type="checkbox"
        checked={valor}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="interruptor__riel" />
      <span>{etiqueta}</span>
    </label>
  );
}

/* -------------------------------- Otros -------------------------------- */

export function Barra({ valor }: { valor: number }) {
  const pct = Math.max(0, Math.min(1, valor)) * 100;
  return (
    <div
      className="progreso"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progreso__relleno" style={{ width: `${pct}%` }} />
    </div>
  );
}

interface KpiProps {
  etiqueta: string;
  valor: ReactNode;
  unidad?: string;
  detalle?: ReactNode;
  icono?: ReactNode;
}

export function Kpi({ etiqueta, valor, unidad, detalle, icono }: KpiProps) {
  return (
    <div className="kpi">
      <span className="kpi__etiqueta">
        {icono}
        {etiqueta}
      </span>
      <span className="kpi__valor">
        {valor}
        {unidad && valor !== '—' && <small>{unidad}</small>}
      </span>
      {detalle && <span className="kpi__detalle">{detalle}</span>}
    </div>
  );
}

export function Vacio({ titulo, texto, icono }: { titulo: string; texto?: string; icono?: ReactNode }) {
  return (
    <div className="vacio">
      {icono}
      <strong>{titulo}</strong>
      {texto && <span>{texto}</span>}
    </div>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return <div className="aviso">{children}</div>;
}

export function Chip({
  tono = 'neutro',
  children,
}: {
  tono?: 'neutro' | 'acento' | 'exito' | 'alerta' | 'peligro';
  children: ReactNode;
}) {
  return <span className={`chip ${tono === 'neutro' ? '' : `chip--${tono}`}`.trim()}>{children}</span>;
}
