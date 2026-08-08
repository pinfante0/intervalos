// La pantalla de error del juego de intervalos. Fase 4.
//
// Es **el momento didáctico del juego**, y por eso desde la Fase 3 un fallo para
// la partida en vez de pasarse solo: es el único rato en que el alumno tiene
// delante el salto que ha sonado y el que ha dicho, sin reloj por detrás. Aquel
// hueco se dejó hecho a propósito; esto es lo que va dentro.
//
// Hace tres cosas, en el orden que fijó docs/fases.md: deja oír el intervalo
// correcto, después el contestado, después los dos seguidos. La canción de
// referencia la pone la pantalla de la partida al lado del botón de seguir,
// porque cuándo se puede pedir depende del modo y eso es cosa del armazón.
//
// **Los dos saltos suenan desde la misma nota**, y ahí está toda la idea. Si el
// contestado sonara desde otro sitio del teclado, comparar los dos mediría la
// altura en vez de la distancia, que es justo la confusión que el juego intenta
// deshacer. Empezar donde empezó el ítem deja una sola diferencia audible: el
// salto.
//
// No toca el piano. Recibe un `tocar(notas)` de quien la monta, igual que el
// reproductor recibe notas MIDI en vez de intervalos: quien sabe si todavía hay
// alguien mirando esta pantalla es la partida, no esta pieza.

import { el, esperar } from '../../nucleo/dom.js';
import { MIDI_MIN, MIDI_MAX, nombreEs } from '../../nucleo/alturas.js';

/**
 * Silencio entre los dos saltos al oírlos seguidos.
 *
 * `tocar` no vuelve hasta que la segunda nota ha terminado de apagarse, así que
 * esto es silencio de verdad sobre silencio. Corto a propósito: lo que se
 * compara hay que tenerlo en el oído todavía, y una pausa larga convierte la
 * comparación en dos escuchas sueltas —el mismo motivo por el que `SEPARACION`
 * tiene techo en el reproductor.
 */
const PAUSA_ENTRE = 600;

/**
 * Los dos saltos que hay que comparar, los dos desde la misma nota.
 *
 * Devuelve `null` si no caben ni desplazándolos por octavas, que no debería
 * pasar nunca con los registros de niveles.json —el más ancho son 42 semitonos
 * y el salto mayor son 12— pero la práctica libre la configura el alumno y esto
 * es una pantalla, no un sitio donde reventar.
 *
 * `octavas` es lo que ha habido que desplazar el par entero para que los dos
 * quepan en el material muestreado. Casi siempre es 0 y entonces el salto
 * correcto suena exactamente donde acaba de sonar; en los extremos del registro
 * —una 2m descendente desde abajo del todo, contestada con una 8J— hay que mover
 * los dos a la vez, porque lo que no se puede romper es que empiecen igual.
 */
export function comparados(datos, item, respuesta) {
  const salto = item.notas[1] - item.notas[0];
  const signo = item.direccion === 'asc' ? 1 : -1;
  // Lo que llega es una **respuesta**, y una respuesta no siempre es el id de un
  // intervalo: el tritono admite «5d», que no es el id de nada. Se resuelve aquí
  // una sola vez y de aquí abajo ya viaja el id de verdad.
  const contestado = datos.intervaloDeRespuesta(respuesta);
  const dicho = signo * contestado.semitonos;

  // Por cercanía, como en el transporte de las canciones: se abandona lo justo
  // la altura a la que sonó el ítem.
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

/**
 * Monta la pantalla de error y devuelve su nodo, o `null` si no hay nada que
 * comparar.
 *
 * @param {object} opciones
 * @param {Datos}  opciones.datos
 * @param {object} opciones.item        el ítem que se acaba de fallar
 * @param {string} opciones.respuesta   el intervalo que se ha contestado
 * @param {number} opciones.veces       cuántas veces se ha cometido esta misma
 *                                      confusión, contando esta. Sale de
 *                                      `confusiones` del progreso, que se guarda
 *                                      desde la Fase 1 justo para esto
 * @param {function} opciones.tocar     `(notas) => Promise<boolean>`. Falso
 *                                      cuando ya no hay a quién enseñárselo
 */
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

  /**
   * Una de las dos tarjetas. Lleva la abreviatura con el color de su cualidad
   * —la misma pieza que la cuadrícula y la corrección, porque leerla aquí y
   * buscarla allí tiene que ser el mismo gesto— y debajo, en pequeño, qué notas
   * son. Los nombres de nota son el detalle: quien no los necesite no los mira,
   * y quien esté delante de un teclado los agradece.
   */
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

  /**
   * «Es la 3.ª vez que dices 4J cuando suena 5J».
   *
   * Es la frase que el contrato de datos prometía en la Fase 1 al guardar **qué
   * se contestó en vez de qué**, y el primer sitio donde ese dato se usa. Sale
   * solo cuando ya ha pasado antes: decírselo la primera vez no informa de nada
   * y suena a reproche.
   */
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

  /**
   * Toca uno de los dos saltos, o los dos seguidos, encendiendo la tarjeta de lo
   * que suena en cada momento. Sin eso, «los dos seguidos» son cuatro notas y
   * hay que acordarse de cuál era cuál.
   *
   * Mientras suena no se pulsa nada más: el piano ya calla lo anterior al
   * empezar algo nuevo, así que lo que se rompería no es el sonido, es saber qué
   * se está oyendo.
   */
  async function oir(...cuales) {
    for (const boton of botones) boton.disabled = true;
    try {
      for (const [i, cual] of cuales.entries()) {
        if (i) await esperar(PAUSA_ENTRE);
        fichas[cual].classList.add('sonando');
        try {
          // Falso es que se ha salido de la partida. Entonces la comparación se
          // corta aquí en vez de soltar el segundo salto en una pantalla que ya
          // no existe.
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
