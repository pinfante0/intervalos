// Canciones de referencia: de lo que hay en canciones.json a lo que suena.
//
// El contrato guarda cada canción empezando en el salto, porque así `notas[0]` y
// `notas[1]` son el intervalo y el validador puede cazar un error de
// transcripción. Lo que queda fuera por delante —«Cum» en «Cum-ple-a-ños»— vive
// aparte, en `entradilla`.
//
// Aquí se vuelven a juntar. Ver docs/contrato_datos.md, apartado 4.

import { transportar } from './alturas.js';

/**
 * La canción tal como hay que tocarla, con o sin lo que va antes del salto.
 *
 * Devuelve también `anclaje`: qué posición de la lista es la primera nota del
 * salto, que es la que tiene que caer en la nota del ítem al transportar.
 *
 * `conEntradilla` decide qué se está haciendo. Para **reconocer** la canción se
 * toca entera, que para eso está la entradilla. Para **compararla con el ítem**
 * se toca desde el salto, porque lo que se compara es el salto.
 */
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
    // El contrato obliga a que las dos partes coincidan en llevar letra o no,
    // así que basta mirar una.
    silabas: cancion.silabas ? [...entradilla.silabas, ...cancion.silabas] : null,
    tempo: cancion.tempo,
    anclaje: entradilla.notas.length,
  };
}

/**
 * La canción lista para el reproductor, transportada a la nota del ítem.
 *
 * Devuelve `null` si el fragmento no cabe en el registro muestreado ni saltando
 * octavas. Quien llama tiene que buscar entonces otra canción del mismo
 * intervalo y dirección: el material manda sobre el repertorio.
 *
 *     const c = transportada(cancion, item.nota_inicial);
 *     if (c) await piano.tocarMelodia(c.notas, c.duraciones, c.tempo);
 */
export function transportada(cancion, notaInicial, opciones) {
  const fragmento = paraSonar(cancion, opciones);
  const notas = transportar(fragmento.notas, notaInicial, { anclaje: fragmento.anclaje });
  return notas ? { ...fragmento, notas } : null;
}
