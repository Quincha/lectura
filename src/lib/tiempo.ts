/** Fecha y hora en formato ISO local (`YYYY-MM-DDTHH:mm:ss.mmm`).
 *  Sin desfase horario para que la ordenación lexicográfica coincida con el
 *  día calendario del usuario y `substr(fecha,1,10)` agrupe correctamente. */
const p = (n: number, lon = 2) => String(n).padStart(lon, '0');

export function ahoraLocalISO(d: Date = new Date()): string {
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

export function haceDias(dias: number, desde: Date = new Date()): Date {
  const d = new Date(desde);
  d.setDate(d.getDate() - dias);
  return d;
}

export function claveDia(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function diasEntre(inicio: Date, fin: Date): string[] {
  const claves: string[] = [];
  // Se itera en UTC a partir de la fecha local para que un cambio de horario
  // de verano (días sin medianoche local) no introduzca saltos ni huecos.
  const cur = new Date(Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()));
  const finUtc = Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate());
  let guarda = 0;
  while (cur.getTime() <= finUtc && guarda < 400) {
    claves.push(
      `${cur.getUTCFullYear()}-${p(cur.getUTCMonth() + 1)}-${p(cur.getUTCDate())}`,
    );
    cur.setUTCDate(cur.getUTCDate() + 1);
    guarda++;
  }
  return claves;
}

/** Primer instante (00:00 local) del día que cierra la ventana de `dias` días. */
export function inicioRangoDias(dias: number, desde: Date = new Date()): Date {
  return new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() - (dias - 1));
}

export function formatoDuracion(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${p(m)}:${p(s)}`;
}

export function formatoDuracionLargo(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} s`;
  return `${m} min ${p(s)} s`;
}

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatoFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, , mm, dd, hh, mi] = m;
  return `${Number(dd)} ${MESES[Number(mm) - 1]} · ${hh}:${mi}`;
}

export function formatoDiaCorto(clave: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clave);
  if (!m) return clave;
  return `${Number(m[3])}/${Number(m[2])}`;
}
