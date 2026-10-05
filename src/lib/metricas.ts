export type Medidor = (texto: string) => number;

const medidorNulo: Medidor = () => 0;

/**
 * Crea un medidor de anchura de texto con el mismo estilo tipográfico que el
 * elemento recibido. Se usa para calcular el desplazamiento óptico de la
 * palabra ancla sin forzar reflujo de layout en cada fotograma.
 */
export function crearMedidor(el: HTMLElement | null): Medidor {
  if (!el) return medidorNulo;
  const cs = getComputedStyle(el);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return medidorNulo;

  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

  const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  try {
    if (typeof cs.letterSpacing === 'string') ctxAny.letterSpacing = cs.letterSpacing;
  } catch {
    /* navegadores sin soporte: se ignora la tracking */
  }

  return (texto: string) => (texto ? ctx.measureText(texto).width : 0);
}

/** Desplazamiento horizontal que centra la letra ancla en el contenedor. */
export function desplazamientoAncla(medir: Medidor, izq: string, der: string): number {
  if (!izq && !der) return 0;
  return (medir(der) - medir(izq)) / 2;
}
