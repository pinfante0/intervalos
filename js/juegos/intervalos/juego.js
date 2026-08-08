// Juego 1 — Intervalia. El módulo que la consola enchufa en su motor de rondas.
//
// La consola pone el armazón: modos, niveles, bucle de la partida, marcador,
// resultados y progreso. Un juego pone cinco cosas y solo cinco:
//
//   · cómo se configura una ronda a partir de un nivel,
//   · cómo se genera un ítem y qué suena,
//   · la pantalla de respuesta,
//   · su pista,
//   · y su pantalla de error.
//
// Y una sexta **opcional**: su portada. Es opcional porque el Juego 2 tiene que
// poder existir sin dibujar nada; sin ella la consola pone el rótulo de siempre.
//
// Ese reparto es toda la apuesta del proyecto: el Juego 2 y el Juego 3 se
// escriben rellenando estas cinco cosas y heredan el resto. Ver docs/consola.md
// y docs/pantalla_error.md.
//
// La cuadrícula 3×4 de esta pantalla es la de material/intervalos/
// pantalla_principal.png.

import { el } from '../../nucleo/dom.js';
import { transportada } from '../../nucleo/canciones.js';
import { generadorDeItems } from './items.js';
import { montarError } from './error.js';
import { montarPortada } from './portada.js';

/** Cuántos intervalos hay que elegir como mínimo en la práctica libre. */
export const MINIMO_LIBRE = 2;

// La escalera —dibujar la altura en el eje vertical como andamiaje de los
// niveles 1 y 2— se probó aquí el 01/08/2026 y se retiró. Venía de un juego
// descartado y no le quedaba trabajo: dibujar el ítem da la respuesta en el modo
// que abre niveles, y dibujar los saltos del nivel repite el orden por tamaño
// que la cuadrícula ya tiene, a cambio de sitio en la pantalla más llena del
// juego. El porqué entero está en docs/fases.md, Fase 4.

export const juego = {
  // El `id` y el `nombre` no dicen lo mismo y no se cambian juntos. El id es el
  // que viaja en las rutas —`#/intervalos/jugar?...`, o sea los QR de aula y los
  // marcadores— y en la dirección pública, así que **está congelado**. El nombre
  // es la cara y se cambió el 08/08/2026: ver CLAUDE.md.
  id: 'intervalos',
  nombre: 'Intervalia',
  tema: 'Tema 4',
  resumen: 'Suena un intervalo melódico y hay que nombrarlo con su abreviatura. '
    + 'Es la tarea del examen, con el mismo timbre y la misma nomenclatura.',
  disponible: true,

  /**
   * Cuántos intervalos hay que marcar como mínimo en las pantallas donde elige
   * quien juega. Lo pone el juego porque es una regla **suya**: con uno solo, su
   * cuadrícula deja un único botón pulsable y se acierta sin escuchar.
   *
   * Vive aquí y no en `pantallas/niveles.js` desde el 03/08/2026. Aquella
   * importaba esta constante del módulo del Juego 1, o sea que una pantalla
   * compartida dependía de un juego concreto: una compilación sin Intervalia
   * dentro no habría llegado ni a cargar.
   */
  minimoElegidos: MINIMO_LIBRE,

  /** El estímulo: dos notas seguidas. El reproductor las recibe ya resueltas. */
  async presentar(item, piano) {
    await piano.tocarIntervalo(item.notas);
  },

  /** Una ronda de la progresión. */
  configDeNivel(datos, nivel) {
    return {
      intervalos: nivel.intervalos,
      direcciones: nivel.direcciones,
      registro: nivel.registro,
      items: nivel.items,
    };
  },

  /**
   * Una ronda de práctica libre.
   *
   * Va aparte de los niveles a propósito. Todo el diseño mide por par
   * intervalo/dirección porque la 6ª ascendente y la descendente son dos
   * habilidades distintas; si se pudiera elegir la dirección dentro de un nivel,
   * se superaría practicando solo la fácil. Dentro de la progresión manda el
   * nivel; fuera de ella, el alumno.
   *
   * El registro es el más ancho de la progresión, derivado de los niveles: si
   * algún día el nivel 7 se ensancha, la práctica libre se ensancha con él.
   */
  configLibre(datos, { intervalos, direccion = 'azar', items = 10 }) {
    if (intervalos.length < MINIMO_LIBRE) {
      throw new Error(`Hay que elegir al menos ${MINIMO_LIBRE} intervalos: con uno solo, `
        + 'la cuadrícula deja un único botón pulsable y no hay nada que decidir.');
    }
    return {
      intervalos,
      direcciones: direccion === 'azar' ? ['asc', 'desc'] : [direccion],
      registro: datos.registroMasAncho,
      items,
    };
  },

  generador(datos, config, opciones) {
    return generadorDeItems(datos, { ...config, ...opciones });
  },

  /**
   * La pista: la canción de referencia de este intervalo, transportada para que
   * su salto arranque en la misma nota que el ítem.
   *
   * Devuelve `null` cuando no hay ninguna que valga, y entonces la pantalla
   * apaga el botón. Eso pasa por dos motivos distintos: porque el par
   * intervalo/dirección no tiene anclaje popular —el tritono descendente y las
   * dos séptimas descendentes no lo tienen, y se resuelven con técnica—, o
   * porque el banco todavía está a medias y se llena en la Fase 5. Según se
   * llene, el botón se va encendiendo solo.
   *
   * Suena **con entradilla**, que es lo que hace falta para reconocerla:
   * «Cumpleaños feliz» que empieza en «ple» no se reconoce, y reconocerla es
   * exactamente para lo que está.
   */
  pista(datos, item) {
    for (const cancion of datos.cancionesDe(item.intervalo, item.direccion)) {
      const sonando = transportada(cancion, item.nota_inicial);
      // `transportada` devuelve null si el fragmento no cabe en el material
      // muestreado ni saltando octavas. Entonces toca probar la siguiente, que
      // es lo que el contrato manda hacer a quien llama.
      if (sonando) return { cancion, sonando };
    }
    return null;
  },

  /**
   * La pantalla de error, que es el momento didáctico del juego: los dos saltos
   * —el que sonaba y el que se ha dicho— desde la misma nota, para poder oír la
   * diferencia. Vive en error.js, con el porqué de cada decisión.
   *
   * Es cosa del juego y no del armazón porque comparar dos intervalos solo sabe
   * hacerlo quien sabe qué es un intervalo. El armazón decide **cuándo** aparece
   * —al fallar, en los modos que paran la partida— y le presta el piano; qué se
   * enseña dentro lo pone cada juego. En el Juego 2 será oír el oboe y después
   * el clarinete que se ha contestado, y el armazón no tendrá que enterarse.
   */
  montarError,

  /**
   * La portada, que es la sexta cosa y la única opcional. Vive en portada.js.
   *
   * Está en el juego por el mismo argumento que la pantalla de error: dibujar
   * la cara de un juego solo sabe hacerlo quien sabe de qué va. Los doce
   * colores de su cinta son las cualidades de intervalos.json, o sea la misma
   * pieza que la cuadrícula de aquí abajo.
   */
  portada: montarPortada,

  /**
   * La cuadrícula de respuesta.
   *
   * Están **siempre los doce botones**, en el mismo sitio, y se apagan los que
   * no pueden sonar en esta ronda. Así la posición de cada intervalo se memoriza
   * desde el nivel 1 y en el nivel 7 la mano ya sabe dónde está el 6M, sin
   * ofrecer nunca respuestas imposibles.
   *
   * Devuelve el nodo y los tres mandos que necesita el bucle de la partida.
   */
  montarRespuesta({ datos, config, responder, interactiva = true }) {
    const enJuego = new Set(config.intervalos);
    const botones = new Map();

    const cuadricula = el('div.cuadricula', { role: 'group', 'aria-label': 'Respuestas' });
    for (const intervalo of datos.intervalos) {
      const activo = enJuego.has(intervalo.id);
      const boton = el('button.respuesta', {
        type: 'button',
        disabled: true,
        'aria-label': intervalo.nombre,
        title: activo ? intervalo.nombre : `${intervalo.nombre} — no entra en esta ronda`,
        datos: { cualidad: intervalo.cualidad, activo: String(activo) },
        onclick: interactiva ? () => responder(intervalo.id) : null,
      }, intervalo.etiqueta);
      // El color de la cualidad vive en intervalos.json, no en el CSS: así la
      // cuadrícula, la pantalla de error y la de resultados no pueden discrepar.
      boton.style.setProperty('--color', datos.color(intervalo.id));
      botones.set(intervalo.id, boton);
      cuadricula.append(boton);
    }

    const nodo = el('div.respuestas', {},
      el('p.pregunta', {}, '¿Qué intervalo es?'),
      cuadricula);

    const limpiar = () => {
      for (const boton of botones.values()) {
        boton.classList.remove('acierto', 'fallo', 'correcta');
      }
    };

    return {
      nodo,

      /**
       * Deja la cuadrícula lista para un ítem nuevo.
       *
       * En el modo de aula la cuadrícula no se pulsa —responden los equipos en
       * su pizarra, no el profesor en la pantalla— pero sigue viéndose entera,
       * porque proyectada es la chuleta de qué respuestas caben.
       */
      preparar() {
        limpiar();
        if (!interactiva) return;
        for (const [id, boton] of botones) boton.disabled = !enJuego.has(id);
      },

      /** Ni un clic más mientras se resuelve el ítem. */
      bloquear() {
        for (const boton of botones.values()) boton.disabled = true;
      },

      /**
       * Marca lo que ha pasado. Al fallar se señala además cuál era la buena,
       * en su sitio de la cuadrícula: la pantalla de error deja oír los dos
       * saltos, pero dónde estaba el botón bueno se aprende mirando aquí.
       */
      marcar(item, respuesta, acierto) {
        botones.get(respuesta)?.classList.add(acierto ? 'acierto' : 'fallo');
        if (!acierto) botones.get(item.intervalo)?.classList.add('correcta');
      },

      /** Enseña cuál era la buena sin que nadie haya contestado en la pantalla. */
      resolver(item) {
        botones.get(item.intervalo)?.classList.add('correcta');
      },
    };
  },
};
