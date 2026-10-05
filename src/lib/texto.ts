/** Limpia un texto bruto: normaliza espacios, comillas tipográficas y saltos. */
export function limpiarTexto(bruto: string): string {
  return bruto
    .replace(/\r\n?/g, '\n')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '—')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Divide un texto limpio en un array de palabras. */
export function tokenizar(texto: string): string[] {
  const limpio = limpiarTexto(texto);
  return limpio ? limpio.split(/\s+/).filter(Boolean) : [];
}

export function contarPalabras(texto: string): number {
  return tokenizar(texto).length;
}

/** Agrupa palabras en líneas de `porLinea` elementos (última línea menor). */
export function partirEnLineas(palabras: string[], porLinea: number): string[][] {
  const n = Math.max(1, Math.floor(porLinea));
  const lineas: string[][] = [];
  for (let i = 0; i < palabras.length; i += n) {
    lineas.push(palabras.slice(i, i + n));
  }
  return lineas;
}

/** Tiempo total estimado de lectura RSVP en ms para un array de palabras. */
export function duracionEstimada(
  palabras: string[],
  ppm: number,
  agrupacion: number,
  conPausas: boolean,
): number {
  if (palabras.length === 0) return 0;
  const base = (60000 / Math.max(50, ppm)) * Math.max(1, agrupacion);
  let total = 0;
  for (let i = 0; i < palabras.length; i += Math.max(1, agrupacion)) {
    const grupo = palabras.slice(i, i + Math.max(1, agrupacion));
    const ultima = grupo[grupo.length - 1] ?? '';
    total += base * multiplicadorLocal(ultima, conPausas);
  }
  return total;
}

function multiplicadorLocal(palabra: string, activo: boolean): number {
  if (!activo) return 1;
  const limpia = palabra.replace(/[),\]"'»”]+$/g, '');
  if (/[.!?…]+$/.test(limpia)) return 1.65;
  if (/[,:;]$/.test(limpia)) return 1.3;
  return 1;
}

export const TEXTO_EJEMPLO =
  'La lectura rápida no consiste en correr por encima de las palabras, sino en reducir el tiempo que el ojo permanece detenido sobre cada fragmento de texto. Cuando el cerebro recibe la imagen completa de un grupo de palabras, deja de reconstruir la frase letra a letra y empieza a anticiparla. Por eso el primer ejercicio consiste en ampliar el campo visual: fija la mirada en el centro y deja que la periferia capte lo que ocurre a los lados. Con constancia, la velocidad sube sin que la comprensión baje.';
