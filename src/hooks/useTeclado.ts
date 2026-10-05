import { useEffect, useRef } from 'react';

/** Registra un manejador de teclado mientras `activo` sea verdadero. */
export function useTeclado(
  manejador: (e: KeyboardEvent) => void,
  activo = true,
  dependencias: unknown[] = [],
): void {
  const ref = useRef(manejador);
  ref.current = manejador;

  useEffect(() => {
    if (!activo) return;
    const alPulsar = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      const enCampo =
        destino?.tagName === 'INPUT' ||
        destino?.tagName === 'TEXTAREA' ||
        destino?.tagName === 'BUTTON' ||
        destino?.isContentEditable;
      if (enCampo) return;
      ref.current(e);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [activo, ...dependencias]);
}
