import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { multiplicadorPuntuacion } from '@/lib/ppm';

export type EstadoRsvp = 'inactivo' | 'reproduciendo' | 'pausado' | 'finalizado';

export interface OpcionesRsvp {
  palabras: string[];
  ppm: number;
  agrupacion: number;
  pausas: boolean;
}

export interface ControlRsvp {
  estado: EstadoRsvp;
  indice: number;
  chunk: string[];
  progreso: number;
  restantes: number;
  reproducir: () => void;
  pausar: () => void;
  alternar: () => void;
  detener: () => void;
  irA: (i: number) => void;
  siguiente: () => void;
  anterior: () => void;
  duracionMs: () => number;
}

/**
 * Motor RSVP.
 *
 * El temporizador es recursivo y corregido por deriva: cada disparo se agenda
 * respecto de un objetivo acumulado (`objetivo + base`), no de `ahora + base`.
 * A 1000 PPM el intervalo base son 60 ms y un `setInterval` pierde varios
 * milisegundos por segundo, algo perceptible en sesiones largas.
 */
export function useRsvp({ palabras, ppm, agrupacion, pausas }: OpcionesRsvp): ControlRsvp {
  const [estado, setEstado] = useState<EstadoRsvp>('inactivo');
  const [indice, setIndice] = useState(0);

  const idxRef = useRef(0);
  const idRef = useRef<number | null>(null);
  const objetivoRef = useRef(0);
  const palabrasRef = useRef<string[]>(palabras);
  const inicioRef = useRef(0);
  const pausaAcumRef = useRef(0);
  const pausandoEnRef = useRef<number | null>(null);

  useEffect(() => {
    palabrasRef.current = palabras;
    if (idxRef.current >= palabras.length) {
      idxRef.current = Math.max(0, palabras.length - 1);
      setIndice(idxRef.current);
    }
  }, [palabras]);

  const cancelar = useCallback(() => {
    if (idRef.current !== null) {
      clearTimeout(idRef.current);
      idRef.current = null;
    }
  }, []);

  const ultimoInicioValido = useCallback(() => {
    const total = palabrasRef.current.length;
    const salto = Math.max(1, agrupacion);
    if (total === 0) return 0;
    return Math.min(total - 1, Math.floor((total - 1) / salto) * salto);
  }, [agrupacion]);

  const finalizar = useCallback(() => {
    cancelar();
    const i = ultimoInicioValido();
    idxRef.current = i;
    setIndice(i);
    setEstado('finalizado');
  }, [cancelar, ultimoInicioValido]);

  const programar = useCallback(() => {
    const lista = palabrasRef.current;
    if (lista.length === 0) return;
    if (idxRef.current >= lista.length) {
      finalizar();
      return;
    }

    const salto = Math.max(1, agrupacion);
    const grupo = lista.slice(idxRef.current, idxRef.current + salto);
    const ultima = grupo[grupo.length - 1] ?? '';
    const base = (60000 / Math.max(50, ppm)) * salto * multiplicadorPuntuacion(ultima, pausas);

    const ahora = performance.now();
    let cuando = objetivoRef.current + base;
    if (cuando < ahora) cuando = ahora;
    objetivoRef.current = cuando;

    idRef.current = window.setTimeout(() => {
      idRef.current = null;
      const sig = idxRef.current + salto;
      if (sig >= lista.length) {
        finalizar();
        return;
      }
      idxRef.current = sig;
      setIndice(sig);
      programar();
    }, Math.max(0, cuando - performance.now()));
  }, [ppm, agrupacion, pausas, finalizar]);

  const reanudarProgramacion = useCallback(() => {
    cancelar();
    objetivoRef.current = performance.now();
    programar();
  }, [cancelar, programar]);

  useEffect(() => {
    if (estado !== 'reproduciendo') return;
    if (palabrasRef.current.length === 0) return;
    objetivoRef.current = performance.now();
    programar();
    return cancelar;
  }, [estado, programar, cancelar, palabras]);

  const reproducir = useCallback(() => {
    if (estado === 'reproduciendo') return;
    if (estado === 'finalizado') {
      idxRef.current = 0;
      setIndice(0);
    }
    if (estado === 'inactivo' || estado === 'finalizado') {
      inicioRef.current = Date.now();
      pausaAcumRef.current = 0;
      pausandoEnRef.current = null;
    } else if (estado === 'pausado' && pausandoEnRef.current !== null) {
      pausaAcumRef.current += Date.now() - pausandoEnRef.current;
      pausandoEnRef.current = null;
    }
    setEstado('reproduciendo');
  }, [estado]);

  const pausar = useCallback(() => {
    if (estado !== 'reproduciendo') return;
    pausandoEnRef.current = Date.now();
    cancelar();
    setEstado('pausado');
  }, [estado, cancelar]);

  const detener = useCallback(() => {
    cancelar();
    idxRef.current = 0;
    setIndice(0);
    inicioRef.current = 0;
    pausaAcumRef.current = 0;
    pausandoEnRef.current = null;
    setEstado('inactivo');
  }, [cancelar]);

  const alternar = useCallback(() => {
    if (estado === 'reproduciendo') pausar();
    else reproducir();
  }, [estado, pausar, reproducir]);

  const desplazar = useCallback(
    (delta: number) => {
      const total = palabrasRef.current.length;
      if (total === 0) return;
      const saltoPalabras = Math.max(1, agrupacion);
      const bruto = idxRef.current + delta * saltoPalabras;
      const idxFinal = Math.min(Math.max(0, bruto), ultimoInicioValido());
      idxRef.current = idxFinal;
      setIndice(idxFinal);
      if (estado === 'reproduciendo') reanudarProgramacion();
      else if (estado === 'finalizado' && idxFinal < ultimoInicioValido()) setEstado('pausado');
    },
    [agrupacion, estado, reanudarProgramacion, ultimoInicioValido],
  );

  const irA = useCallback(
    (i: number) => {
      const total = palabrasRef.current.length;
      if (total === 0) return;
      const idxFinal = Math.min(Math.max(0, i), ultimoInicioValido());
      idxRef.current = idxFinal;
      setIndice(idxFinal);
      if (estado === 'reproduciendo') reanudarProgramacion();
      if (estado === 'finalizado') setEstado('pausado');
    },
    [estado, reanudarProgramacion, ultimoInicioValido],
  );

  const duracionMs = useCallback(() => {
    if (!inicioRef.current) return 0;
    const fin = pausandoEnRef.current ?? Date.now();
    return Math.max(0, fin - inicioRef.current - pausaAcumRef.current);
  }, []);

  const saltoPalabras = Math.max(1, agrupacion);
  const chunk = useMemo(
    () => palabras.slice(indice, indice + saltoPalabras),
    [palabras, indice, saltoPalabras],
  );

  const total = palabras.length;
  const visibles = Math.min(chunk.length, Math.max(0, total - indice));
  const progreso = estado === 'finalizado' ? 1 : total > 0 ? indice / total : 0;
  const restantes = Math.max(0, total - indice - visibles);

  return {
    estado,
    indice,
    chunk,
    progreso,
    restantes,
    reproducir,
    pausar,
    alternar,
    detener,
    irA,
    siguiente: () => desplazar(1),
    anterior: () => desplazar(-1),
    duracionMs,
  };
}
