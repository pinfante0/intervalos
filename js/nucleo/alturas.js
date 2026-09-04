







export const MIDI_MIN = 43;
export const MIDI_MAX = 90;

const NOMBRES = ['Do', 'Do♯', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'Si♭', 'Si'];


export function enRegistro(midi) {
  return Number.isInteger(midi) && midi >= MIDI_MIN && midi <= MIDI_MAX;
}


export function nombreEs(midi) {
  return NOMBRES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 2);
}


export function notasDe({ min, max }) {
  const notas = [];
  for (let m = Math.max(min, MIDI_MIN); m <= Math.min(max, MIDI_MAX); m++) notas.push(m);
  return notas;
}















export function transportar(notas, notaInicial, { anclaje = 0 } = {}) {
  const desplazamiento = notaInicial - notas[anclaje];
  const base = notas.map((n) => n + desplazamiento);
  const min = Math.min(...base);
  const max = Math.max(...base);
  if (max - min > MIDI_MAX - MIDI_MIN) return null;



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
