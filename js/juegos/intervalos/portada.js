// La portada del Juego 1: la pantalla con la que se abre Intervalos.
//
// Es **la sexta cosa que un juego aporta, y la única opcional**. Las otras
// cinco —configurar una ronda, generar el ítem, la pantalla de respuesta, la
// pista y la pantalla de error— hacen falta para que el juego exista; esta no.
// El Juego 2 puede nacer sin dibujar nada, y entonces `#/:juego` lleva directo a
// los cuatro modos, que es lo que hacía hasta hoy.
//
// Está aquí y no en el armazón por el mismo argumento que la pantalla de error:
// **dibujar la cara de un juego solo sabe hacerlo quien sabe de qué va**. Los
// doce colores de la cinta no son decoración elegida a ojo, son las cualidades
// de intervalos.json, o sea la misma pieza que la cuadrícula de respuesta.
//
// Dos cosas que **no** lleva, y ninguna por olvido:
//
//   · **Por dónde vas.** Eso vive en la tarjeta del Reto, que es el único modo
//     donde un nivel significa algo. Una portada es para entrar, no para rendir
//     cuentas — el mismo motivo por el que la tarjeta del menú de la consola
//     dejó de llevar la cuenta el 03/08/2026.
//   · **La asignatura.** Ni el tema, ni el curso, ni el grado. Esto lo va a
//     abrir gente que no está matriculada en nada, y una portada que arranca
//     nombrando una asignatura ajena le dice al que llega que el juego no es
//     para él. La procedencia no desaparece: baja al sello y a los créditos,
//     que es donde se busca y donde no estorba.

import { el } from '../../nucleo/dom.js';

/**
 * De qué va el juego, para quien no sabe nada de esto.
 *
 * No es el `resumen` del módulo y no es repetir lo mismo dos veces: aquel dice
 * «es la tarea del examen, con el mismo timbre y la misma nomenclatura», que es
 * exactamente lo que hay que saber en el menú de **esta** asignatura y
 * exactamente lo que no significa nada fuera de ella. Dos audiencias, dos
 * frases; el día que solo hubiera una, sobraría una de las dos.
 */
const DE_QUE_VA = 'Un juego para trabajar el reconocimiento auditivo de intervalos musicales.';

/**
 * @param juego   el propio juego: de aquí sale el nombre, y nada más
 * @param datos   para la cinta de los doce intervalos y su color
 * @param entrar  a dónde lleva «Comenzar»: la pantalla de los cuatro modos
 * @param accesos los dos accesos de siempre —ajustes y créditos— ya montados.
 *                **Los pone el armazón y esta portada solo los coloca**: un
 *                juego no va a buscar piezas a `pantallas/`, se las dan. Es la
 *                misma regla que sacó `MINIMO_LIBRE` de la pantalla de niveles,
 *                mirada desde el otro lado.
 */
export function montarPortada({ juego, datos, entrar, accesos = null }) {
  // Los doce, en el orden de siempre y con el color de su cualidad. No hay que
  // leerla: hay que reconocerla, y es la misma imagen que se tiene delante
  // durante toda la partida. Cada uno lleva su turno de entrada en una variable
  // para que aparezcan en cascada de grave a agudo, que es el orden en que se
  // aprenden; con `prefers-reduced-motion` no se mueve nada, de eso ya se ocupa
  // la hoja de estilo.
  const cinta = el('div.cinta', { 'aria-hidden': 'true' },
    datos.intervalos.map((intervalo, turno) => {
      const grano = el('span.grano', {}, intervalo.etiqueta);
      grano.style.setProperty('--color', datos.color(intervalo.id));
      grano.style.setProperty('--turno', String(turno));
      return grano;
    }));

  // La fila de arriba: los dos accesos de siempre, a la derecha. Estaban debajo
  // de «Comenzar», que es el único sitio de esta pantalla donde no tenían que
  // estar: la portada existe para que se pulse ese botón, y dos enlaces justo
  // debajo son dos salidas ofrecidas antes de la entrada.
  //
  // A la izquierda hubo un «‹ Consola» hasta el 07/08/2026. Esta pantalla es la
  // primera de la compilación y no hay nada detrás de ella.
  return el('section.portada-llena', {},
    el('div.chrome', {}, accesos),

    el('div.centro', {},
      el('h1', {}, juego.nombre),
      el('p.pitch', {}, DE_QUE_VA),
      cinta,
      el('a.principal.grande.comenzar', { href: entrar }, 'Comenzar')),

    // El sello. Va abajo y pequeño, con el escudo de la universidad delante del
    // nombre. Aquí decía que iba en texto y sin logotipo «porque no hay ninguno
    // en el repositorio y no se dibuja uno parecido», y añadía que el día que
    // llegara el archivo oficial se cambiaría esta línea por una imagen. Llegó.
    //
    // El escudo **es decoración y el texto es el dato**: la imagen la pone el
    // CSS de fondo y este `span` va vacío y con `aria-hidden`, así que a un
    // lector de pantalla le llega «Universidad de Jaén» una sola vez.
    el('footer.sello', {},
      el('span.institucion', {},
        el('span.escudo', { 'aria-hidden': 'true' }),
        'Universidad de Jaén'),
      el('span.autor', {}, 'Pablo Infante Amate')));
}
