/**
 * Anclaje óptico: sitúa la letra de fijación en el centro exacto del contenedor
 * mediante un grid de tres columnas (1fr · auto · 1fr). Así la palabra no
 * «baila» entre pantallazos y se eliminan las microsacádidas de reajuste.
 */
export interface Anclaje {
  izq: string;
  ancla: string;
  der: string;
}

export function anclar(palabra: string): Anclaje {
  if (palabra.length <= 1) return { izq: '', ancla: palabra, der: '' };
  const posicion = Math.min(Math.max(Math.round(palabra.length * 0.4), 1), palabra.length - 1);
  return {
    izq: palabra.slice(0, posicion),
    ancla: palabra.charAt(posicion),
    der: palabra.slice(posicion + 1),
  };
}
