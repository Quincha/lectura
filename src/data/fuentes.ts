import crudo from './textos.json';

export interface Pregunta {
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
}

export interface TextoPrueba {
  id: string;
  titulo: string;
  etiqueta: string;
  texto: string;
  preguntas: Pregunta[];
}

export const TEXTOS: TextoPrueba[] = crudo.textos;

export function obtenerTexto(id: string): TextoPrueba | undefined {
  return TEXTOS.find((x) => x.id === id);
}
