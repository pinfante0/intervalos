








import { transportar } from './alturas.js';











export function paraSonar(cancion, { conEntradilla = true } = {}) {
  const entradilla = conEntradilla ? cancion.entradilla : null;
  if (!entradilla) {
    return {
      notas: cancion.notas,
      duraciones: cancion.duraciones,
      silabas: cancion.silabas,
      tempo: cancion.tempo,
      anclaje: 0,
    };
  }
  return {
    notas: [...entradilla.notas, ...cancion.notas],
    duraciones: [...entradilla.duraciones, ...cancion.duraciones],


    silabas: cancion.silabas ? [...entradilla.silabas, ...cancion.silabas] : null,
    tempo: cancion.tempo,
    anclaje: entradilla.notas.length,
  };
}











export function transportada(cancion, notaInicial, opciones) {
  const fragmento = paraSonar(cancion, opciones);
  const notas = transportar(fragmento.notas, notaInicial, { anclaje: fragmento.anclaje });
  return notas ? { ...fragmento, notas } : null;
}
