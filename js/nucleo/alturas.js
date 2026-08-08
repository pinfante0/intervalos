// Alturas: el número MIDI es el contrato interno; los nombres españoles solo se
// pintan en pantalla. Do central = 60 = Do3. La nomenclatura española y la
// científica se llevan dos octavas y esa confusión ya ha costado tiempo aquí,
// así que la conversión vive en un único sitio.
//
// Ver docs/contrato_datos.md, apartado «Alturas».

/** Límite del material muestreado. Fuera de aquí no hay archivo y no suena nada. */
export const MIDI_MIN = 43;
export const MIDI_MAX = 90;

const NOMBRES = ['Do', 'Do♯', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'Si♭', 'Si'];

/** ¿Hay muestra para esta nota? */
export function enRegistro(midi) {
  return Number.isInteger(midi) && midi >= MIDI_MIN && midi <= MIDI_MAX;
}

/** 60 → "Do3". Solo para mostrar: nunca para almacenar ni comparar. */
export function nombreEs(midi) {
  return NOMBRES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 2);
}

/** Todas las notas de un registro, para precargar. */
export function notasDe({ min, max }) {
  const notas = [];
  for (let m = Math.max(min, MIDI_MIN); m <= Math.min(max, MIDI_MAX); m++) notas.push(m);
  return notas;
}

/**
 * Transporta una canción de referencia para que su salto arranque en la nota
 * del ítem.
 *
 * Las canciones se guardan en MIDI absoluto empezando en el salto, así que
 * transportar es una resta. Si al aplicarla alguna nota se sale del material,
 * se desplaza el fragmento entero por octavas hasta que quepa —lo más cerca
 * posible de donde se pretendía—. Devuelve `null` si no cabe en ningún sitio,
 * que es la señal de buscar otra canción del mismo intervalo y dirección.
 *
 * `anclaje` es qué nota de la lista tiene que caer en `notaInicial`. Es 0 salvo
 * cuando delante va una entradilla: entonces el salto no es la primera nota que
 * suena, pero sigue siendo la que manda el transporte.
 */
export function transportar(notas, notaInicial, { anclaje = 0 } = {}) {
  const desplazamiento = notaInicial - notas[anclaje];
  const base = notas.map((n) => n + desplazamiento);
  const min = Math.min(...base);
  const max = Math.max(...base);
  if (max - min > MIDI_MAX - MIDI_MIN) return null;

  // Octavas por cercanía: 0, +1, -1, +2… El transporte pedido es el que
  // conserva la relación con el ítem, y solo se abandona lo justo.
  for (let k = 0; k <= 4; k++) {
    for (const octavas of k === 0 ? [0] : [k, -k]) {
      const salto = 12 * octavas;
      if (min + salto >= MIDI_MIN && max + salto <= MIDI_MAX) {
        return base.map((n) => n + salto);
      }
    }
  }
  return null;
}
