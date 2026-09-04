





















import { el, esperar } from '../../nucleo/dom.js';
import { MIDI_MIN, MIDI_MAX, nombreEs } from '../../nucleo/alturas.js';










const PAUSA_ENTRE = 600;















export function comparados(datos, item, respuesta) {
  const salto = item.notas[1] - item.notas[0];
  const signo = item.direccion === 'asc' ? 1 : -1;



  const contestado = datos.intervaloDeRespuesta(respuesta);
  const dicho = signo * contestado.semitonos;



  for (const octavas of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const raiz = item.nota_inicial + 12 * octavas;
    const era = [raiz, raiz + salto];
    const dijo = [raiz, raiz + dicho];
    if ([...era, ...dijo].every((n) => n >= MIDI_MIN && n <= MIDI_MAX)) {
      return {
        era: { intervalo: item.intervalo, notas: era },
        dijo: { intervalo: contestado.id, notas: dijo },
        direccion: item.direccion,
        octavas,
      };
    }
  }
  return null;
}
















export function montarError({ datos, item, respuesta, veces = 0, tocar }) {
  const par = comparados(datos, item, respuesta);
  if (!par) return null;

  const fichas = {
    era: tarjeta('era', 'Sonaba', par.era),
    dijo: tarjeta('dijo', 'Dijiste', par.dijo),
  };
  const seguidos = el('button.comparar.seguidos', {
    type: 'button', 'aria-label': 'Escuchar los dos saltos seguidos',
  }, el('span.icono', {}, '▶'), 'Los dos seguidos');

  const botones = [fichas.era, fichas.dijo, seguidos];
  fichas.era.addEventListener('click', () => oir('era'));
  fichas.dijo.addEventListener('click', () => oir('dijo'));
  seguidos.addEventListener('click', () => oir('era', 'dijo'));

  return el('div.error', { role: 'group', 'aria-label': 'Compara los dos intervalos' },
    el('p.titulo', {}, 'Escucha la diferencia'),
    el('div.comparados', {}, fichas.era, fichas.dijo),
    seguidos,
    el('p.nota', {}, par.octavas === 0
      ? 'Los dos arrancan en la misma nota: lo único que cambia es el salto.'
      : `Los dos arrancan en la misma nota, una octava más ${par.octavas > 0 ? 'aguda' : 'grave'} `
        + 'para que quepan los dos en el piano.'),
    lineaRepetida());








  function tarjeta(clase, rotulo, { intervalo, notas }) {
    const info = datos.intervalo(intervalo);
    const boton = el(`button.comparar.${clase}`, {
      type: 'button',
      'aria-label': `Escuchar lo que ${clase === 'era' ? 'sonaba' : 'has dicho'}: ${info.nombre}`,
    },
    el('span.rotulo', {}, rotulo),
    el('span.salto', {},
       el('strong.abrev', {}, info.etiqueta),
       el('span.flecha', {}, par.direccion === 'asc' ? '↑' : '↓')),
    el('span.alturas', {}, notas.map(nombreEs).join(' → ')));
    boton.style.setProperty('--color', datos.color(intervalo));
    return boton;
  }









  function lineaRepetida() {
    if (veces < 2) return null;
    return el('p.repetida', {}, `Es la ${veces}.ª vez que dices `,
              abrev(par.dijo.intervalo), ' cuando suena ', abrev(item.intervalo), '.');
  }

  function abrev(id) {
    const nodo = el('strong.abrev', { title: datos.intervalo(id).nombre },
                    datos.intervalo(id).etiqueta);
    nodo.style.setProperty('--color', datos.color(id));
    return nodo;
  }










  async function oir(...cuales) {
    for (const boton of botones) boton.disabled = true;
    try {
      for (const [i, cual] of cuales.entries()) {
        if (i) await esperar(PAUSA_ENTRE);
        fichas[cual].classList.add('sonando');
        try {



          if (!await tocar(par[cual].notas)) return;
        } finally {
          fichas[cual].classList.remove('sonando');
        }
      }
    } finally {
      for (const boton of botones) boton.disabled = false;
    }
  }
}
