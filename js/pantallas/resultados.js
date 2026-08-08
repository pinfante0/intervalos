// La pantalla de resultados de una partida.
//
// Vive en memoria, no en la dirección: recargar aquí devuelve al mapa de
// niveles. Un resultado es de la partida que se acaba de jugar y no de una
// dirección que se pueda volver a abrir mañana.
//
// Lo que se cuenta está elegido: el desglose es **por par intervalo/dirección**,
// que es la unidad de medida de todo el juego, y no un porcentaje global. Saber
// que has acertado el 70 % no dice qué practicar; saber que las sextas
// descendentes van a la mitad, sí.

import { el, segundos } from '../nucleo/dom.js';
import { nombreModo } from '../nucleo/modos.js';

export function pantallaResultados(consola, { params, ir }) {
  const { datos, progreso } = consola;
  const resumen = consola.ultimoResumen;
  if (!resumen || resumen.juego !== params.juego) {
    ir(`/${params.juego}/modos`, { reemplazar: true });
    return null;
  }

  const { cierre } = resumen;
  const total = resumen.aciertos + resumen.fallos;
  const medio = total ? resumen.ms_total / total : 0;

  // ¿Se acaba de cerrar la escalera entera? Se pregunta al progreso y no al
  // cierre de esta partida: `desbloqueado` viene vacío tanto al superar el
  // séptimo —no hay octavo que abrir— como al repetir uno ya superado, así que
  // por sí solo no distingue el final del juego de un repaso cualquiera.
  const escaleraCompleta = progreso.deJuego(params.juego)
    .niveles_superados.length >= datos.ultimoNivel;

  // El Concurso se marca aquí por lo mismo que se marca su pantalla de preparar
  // y su partida: **es la única que se proyecta**, y a lo alto no cabe en el
  // portátil del aula porque lleva la clasificación de hasta diez equipos debajo
  // del marcador. En una pantalla apaisada esa tabla se pone al lado. Ver
  // `.resultados-aula` en consola.css.
  return el('section.resultados', { clase: resumen.equipos ? 'resultados-aula' : '' },
    el('header.cabecera', {},
      el('a.atras', { href: `#/${params.juego}/modos` }, '‹ Modos'),
      // El modo, dicho por su nombre: es la mitad de la explicación de por qué
      // esta partida ha abierto o no ha abierto el nivel siguiente. Y el nivel
      // solo donde hay nivel, que desde el 03/08/2026 es únicamente el Reto.
      el('h2', {}, resumen.nivel_nombre
        ? `${resumen.nivel_nombre} · ${nombreModo(resumen.modo)}`
        : nombreModo(resumen.modo))),

    el('div.tarjeta.resultado', {},
      el('p.marca', {}, `${resumen.aciertos} / ${total}`),
      // En el aula el tiempo no se mide —responden a la vez y en papel— y la
      // racha la sustituye la clasificación, así que ahí no se enseña ninguna
      // de las dos: un cero grande parecería un dato y sería un hueco.
      resumen.modo === 'aula'
        ? el('p.nota', {}, `respuestas acertadas entre los ${resumen.equipos.length} equipos, `
          + `en ${resumen.items} intervalos`)
        : el('p.nota', {},
          `Racha máxima ${resumen.racha_max} · ${segundos(medio)} de media por respuesta`),
      veredicto(resumen, cierre, escaleraCompleta)),

    resumen.equipos && clasificacion(resumen.equipos),

    acciones(params.juego, resumen, cierre));
}

/**
 * El desglose por intervalo, en su propia pantalla.
 *
 * **Estaba aquí abajo y no cabía.** Medido el 07/08/2026 tras publicar en
 * PLATEA: la tabla sola pedía entre 288 y 604 px según el ancho del teléfono, y
 * con ella dentro la pantalla de resultados se salía en todos menos en el más
 * grande —214 px de más en un iPhone SE y 451 en un Android de 360—. Y crecía
 * **al estrechar**, porque la columna «Se contestó» se parte en más renglones.
 *
 * Sacarla no es esconderla: lo que se lee al acabar es cómo ha ido y qué hacer
 * ahora, y el análisis intervalo por intervalo es una segunda lectura que se
 * pide. Se llega desde el botón «Cómo lo has hecho».
 *
 * Vive en memoria, como los resultados de los que sale: recargar aquí devuelve a
 * los modos, porque una partida terminada no es una dirección que se pueda
 * volver a abrir mañana.
 */
export function pantallaDetalle(consola, { params, ir }) {
  const { datos } = consola;
  const resumen = consola.ultimoResumen;
  if (!resumen || resumen.juego !== params.juego) {
    ir(`/${params.juego}/modos`, { reemplazar: true });
    return null;
  }

  return el('section', {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${params.juego}/resultados` }, '‹ Resultados'),
      el('h2', {}, 'Cómo lo has hecho')),

    desglose(datos, resumen));
}

/**
 * Qué se ofrece al terminar. **Lo primero es seguir jugando, no volver.**
 *
 * Ponía «Otra vez» pasara lo que pasara, también cuando la partida acababa de
 * abrir el nivel siguiente: si estás en mitad de la escalera y superas el 3, lo
 * natural es entrar al 4, y lo que había te ofrecía repetir el que ya has
 * superado o irte al menú. El dato para saberlo ya estaba —`cierre.desbloqueado`
 * dice qué nivel se ha abierto—, solo que nadie lo miraba aquí.
 *
 * Son siempre tres controles, uno principal y dos secundarios, para que el alto
 * de esta pantalla no dependa de cómo haya ido la partida.
 *
 * **Y los tres son botones. Corregido el 07/08/2026, jugándolo en PLATEA.** Dos
 * de los tres eran `a.enlace`: frases grises subrayadas, con la tipografía del
 * texto, apiladas debajo del único botón de verdad. En una interfaz hecha de
 * pegatinas con trazo y sombra, un hipervínculo de página web no se lee como una
 * salida sino como una nota al pie —y una de las dos es justo la segunda lectura
 * de la partida, que es lo que más se va a querer pulsar después de seguir. La
 * jerarquía la sigue poniendo el relleno: verde el que continúa, papel los dos
 * que se van. Ver `.acciones` en consola.css, que es donde se colocan.
 */
function acciones(juego, resumen, cierre) {
  const seguir = cierre.desbloqueado
    ? el('a.principal', {
      href: `#/${juego}/jugar?nivel=${cierre.desbloqueado}&modo=individual`,
    }, 'Siguiente nivel')
    : el('a.principal', { href: `#${resumen.enlace_repetir}` }, 'Otra vez');

  return el('div.acciones', {},
    seguir,
    // La segunda lectura, la que antes ocupaba media pantalla debajo. Dice «Cómo
    // lo has hecho» y no «Detalle» porque lo que hay dentro es una respuesta a
    // esa pregunta, intervalo por intervalo.
    el('a.secundario', { href: `#/${juego}/detalle` }, 'Cómo lo has hecho'),
    el('a.secundario', { href: `#/${juego}/modos` }, 'Volver a los modos'));
}

/**
 * Qué ha pasado con la progresión. Se dice siempre, también cuando no se mueve:
 * que el contrarreloj no abra niveles tiene que verse, o parecerá un fallo.
 */
function veredicto(resumen, cierre, escaleraCompleta) {
  // El final del juego se dice, y se dice antes que nada. Superar el séptimo no
  // abre ningún nivel, así que sin esto el único aviso de haber terminado la
  // escalera era «Nivel superado otra vez», que es lo mismo que sale al repasar
  // el segundo.
  if (escaleraCompleta && cierre.superado) {
    return el('p.veredicto.bien', {},
      '¡Los siete niveles superados! Ya distingues los doce intervalos en las '
      + 'dos direcciones.');
  }
  if (cierre.desbloqueado) {
    return el('p.veredicto.bien', {}, `Nivel superado. Se abre el nivel ${cierre.desbloqueado}.`);
  }
  if (cierre.progresa) {
    return el('p.veredicto.bien', {}, 'Nivel superado otra vez.');
  }
  if (resumen.modo === 'individual' && resumen.aciertos_para_superar !== null) {
    return el('p.veredicto', {},
      `Hacen falta ${resumen.aciertos_para_superar} aciertos para superar el nivel.`);
  }
  const porque = {
    contrarreloj: 'El Contrarreloj cuenta para las estadísticas, pero no abre niveles: '
      + 'eso solo lo hace el Reto.',
    aula: 'En el Concurso quien responde es la clase, así que no mueve el progreso de '
      + 'este aparato más allá de las estadísticas.',
    libre: 'La Práctica suma a las estadísticas y no mueve el nivel: eso solo lo hace el Reto.',
  }[resumen.modo];
  return porque ? el('p.veredicto', {}, porque) : null;
}

function clasificacion(equipos) {
  const orden = [...equipos].sort((a, b) => b.aciertos - a.aciertos || a.fallos - b.fallos);
  return el('div.tarjeta.equipos', {},
    el('h3', {}, 'Equipos'),
    el('table.tabla', {},
      el('tbody', {}, orden.map((equipo, i) => el('tr', { clase: i === 0 ? 'primero' : '' },
        el('td', {}, `${i + 1}.`),
        el('td', {}, equipo.nombre),
        el('td', {}, `${equipo.aciertos} de ${equipo.aciertos + equipo.fallos}`))))));
}

/** Aciertos por par intervalo/dirección, y qué se contestó cuando se falló. */
function desglose(datos, resumen) {
  const pares = new Map();
  for (const r of resumen.respuestas) {
    const clave = `${r.intervalo}|${r.direccion}`;
    const fila = pares.get(clave)
      ?? { intervalo: r.intervalo, direccion: r.direccion, aciertos: 0, total: 0, confundidos: [] };
    fila.total++;
    if (r.acierto) fila.aciertos++;
    // Un fallo sin `respuesta` es del modo de aula, donde se registra si el
    // equipo acertó pero no qué puso: es una decisión cerrada, no un hueco. Sin
    // este filtro ese `null` acababa en `datos.intervalo(null)`, que lanza, y la
    // clasificación del Concurso se convertía en «Algo se ha roto».
    else if (r.respuesta) fila.confundidos.push(r.respuesta);
    pares.set(clave, fila);
  }
  if (!pares.size) return null;

  const filas = [...pares.values()].sort(
    (a, b) => a.aciertos / a.total - b.aciertos / b.total);

  return el('div.tarjeta', {},
    el('h3', {}, 'Por intervalo'),
    el('table.tabla', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Intervalo'), el('th', {}, 'Aciertos'), el('th', {}, 'Se contestó'))),
      el('tbody', {}, filas.map((fila) => el('tr', {},
        el('td', {},
          el('span.pastilla', {
            estilo: { '--color': datos.color(fila.intervalo) },
          }, datos.intervalo(fila.intervalo).etiqueta),
          fila.direccion === 'asc' ? ' ascendente' : ' descendente'),
        el('td', {}, `${fila.aciertos} de ${fila.total}`),
        // Lo de esta columna son **respuestas**, no ids de intervalo: el
        // tritono se puede contestar «5d», que no es el id de nada.
        el('td', {}, fila.confundidos.length
          ? [...new Set(fila.confundidos)]
            .map((r) => datos.intervaloDeRespuesta(r).etiqueta).join(', ')
          : '—'))))));
}
