import { useCallback, useEffect, useRef, useState } from 'react';

interface EstadoInterno {
  corriendo: boolean;
  inicio: number;
  acumulado: number;
  id: number | null;
}

export interface Cronometro {
  corriendo: boolean;
  ms: number;
  iniciar: () => void;
  parar: () => number;
  reiniciar: () => void;
  /** Devuelve los ms transcurridos sin alterar el estado visible. */
  obtener: () => number;
}

/**
 * Cronómetro basado en `performance.now()` (no en `Date`), con refresco visual
 * cada 100 ms. `parar()` devuelve el tiempo exacto aunque el refresco visual
 * hubiera quedado desfasado.
 */
export function useCronometro(): Cronometro {
  const [corriendo, setCorriendo] = useState(false);
  const [ms, setMs] = useState(0);
  const ref = useRef<EstadoInterno>({ corriendo: false, inicio: 0, acumulado: 0, id: null });

  const pararRefresco = useCallback(() => {
    if (ref.current.id !== null) {
      clearInterval(ref.current.id);
      ref.current.id = null;
    }
  }, []);

  useEffect(() => pararRefresco, [pararRefresco]);

  const iniciar = useCallback(() => {
    const e = ref.current;
    if (e.corriendo) return;
    e.corriendo = true;
    e.inicio = performance.now();
    setCorriendo(true);
    e.id = window.setInterval(() => {
      setMs(e.acumulado + (performance.now() - e.inicio));
    }, 100);
  }, []);

  const parar = useCallback(() => {
    const e = ref.current;
    pararRefresco();
    if (e.corriendo) {
      e.acumulado += performance.now() - e.inicio;
      e.corriendo = false;
    }
    setCorriendo(false);
    setMs(e.acumulado);
    return Math.round(e.acumulado);
  }, [pararRefresco]);

  const reiniciar = useCallback(() => {
    const e = ref.current;
    pararRefresco();
    e.corriendo = false;
    e.acumulado = 0;
    e.inicio = 0;
    setCorriendo(false);
    setMs(0);
  }, [pararRefresco]);

  const obtener = useCallback(() => {
    const e = ref.current;
    if (e.corriendo) return Math.round(e.acumulado + (performance.now() - e.inicio));
    return Math.round(e.acumulado);
  }, []);

  return { corriendo, ms, iniciar, parar, reiniciar, obtener };
}
