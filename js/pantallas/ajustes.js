// Los ajustes y los créditos: las dos pantallas que no son de ningún juego.
//
// **Este archivo se llamaba `menu.js` y tenía dentro el menú de la consola.** Se
// fue el 07/08/2026 con la consola entera: cada juego se reparte por su cuenta,
// con su enlace y su portada, así que una lista de juegos no la ve nadie nunca.
// Lo que queda son el volumen, el tema, el botón de empezar de cero y los
// créditos, que son de la aplicación y no del juego, y por eso siguen viviendo
// fuera de `js/juegos/`.

import { el } from '../nucleo/dom.js';

/**
 * El enlace de atrás de los ajustes y los créditos.
 *
 * Lleva a `#/`, que es la entrada, y la nombra: la portada del juego. Antes
 * decidía entre «‹ Consola» y el nombre del juego según cuántos llevara la
 * compilación; ahora solo hay un caso, y por eso pregunta el nombre en vez de
 * escribirlo.
 */
const atrasALaPuerta = (consola) => el('a.atras', { href: '#/' },
  `‹ ${consola.juego().nombre}`);

/**
 * Los dos accesos que están siempre: ajustes y créditos.
 *
 * Son **chrome, no contenido**. Estaban de enlaces subrayados al final de la
 * columna —en la portada, justo debajo de «Comenzar»—, o sea compitiendo con el
 * único botón que esa pantalla quiere que pulses y en un renglón donde nadie
 * busca unos ajustes. Van arriba a la derecha, que es donde se busca la rueda
 * dentada, y con la forma de todo lo que aquí se pulsa.
 *
 * Quien los coloca es cada pantalla; esta función solo dice qué son.
 */
export const accesos = () => el('nav.acciones-chrome', {},
  el('a.chip', { href: '#/ajustes' }, 'Ajustes'),
  el('a.chip', { href: '#/creditos' }, 'Créditos'));

// --- Ajustes ----------------------------------------------------------------

export function pantallaAjustes(consola) {
  const { progreso, piano } = consola;
  const ajustes = progreso.ajustes;

  const temas = [['auto', 'Como el sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
  const botonesTema = temas.map(([id, texto]) => el('button.chip', {
    type: 'button',
    clase: id === ajustes.tema ? 'elegido' : '',
    onclick: (evento) => {
      consola.aplicarTema(id);
      progreso.ajustar({ tema: id });
      for (const hermano of evento.target.parentElement.children) {
        hermano.classList.remove('elegido');
      }
      evento.target.classList.add('elegido');
    },
  }, texto));

  const valor = el('span.cifra', {}, `${Math.round(ajustes.volumen * 100)} %`);
  const deslizador = el('input', {
    type: 'range', min: 0, max: 100, value: Math.round(ajustes.volumen * 100),
    'aria-label': 'Volumen',
    oninput: (evento) => {
      const v = Number(evento.target.value) / 100;
      piano.volumen = v;
      valor.textContent = `${evento.target.value} %`;
      progreso.ajustar({ volumen: v });
    },
  });

  // Probar el volumen exige que el audio esté abierto, y abrirlo exige un gesto
  // del usuario. Este botón es ese gesto.
  const probar = el('button', {
    type: 'button',
    onclick: async () => {
      await piano.despertar();
      await piano.tocarIntervalo([60, 67]);
    },
  }, 'Probar');

  const borrar = el('button.peligro', {
    type: 'button',
    onclick: (evento) => {
      if (evento.target.dataset.seguro !== 'si') {
        evento.target.dataset.seguro = 'si';
        evento.target.textContent = '¿Seguro? Pulsa otra vez';
        return;
      }
      progreso.borrar();
      evento.target.textContent = 'Borrado';
      evento.target.disabled = true;
    },
  }, 'Borrar todo el progreso');

  return el('section', {},
    el('header.cabecera', {},
      atrasALaPuerta(consola),
      el('h2', {}, 'Ajustes')),

    el('div.tarjeta', {},
      el('h3', {}, 'Tema'),
      el('div.fila', {}, botonesTema)),

    el('div.tarjeta', {},
      el('h3', {}, 'Volumen'),
      el('div.fila', {}, deslizador, valor, probar)),

    el('div.tarjeta', {},
      el('h3', {}, 'Progreso'),
      el('p.nota', {}, progreso.persiste
        ? 'El progreso se guarda en este aparato, sin nombre ni identificador de ningún '
          + 'tipo. No sale de aquí y no se puede saber de quién es.'
        : 'Este navegador no deja guardar nada —modo privado, seguramente—, así que el '
          + 'progreso durará lo que dure la pestaña abierta. Se puede jugar igual.'),
      borrar));
}

// --- Créditos ---------------------------------------------------------------

export function pantallaCreditos(consola) {
  return el('section', {},
    el('header.cabecera', {},
      atrasALaPuerta(consola),
      el('h2', {}, 'Créditos')),

    // La autoría, arriba del todo y con su nombre en grande. Estaba metida en el
    // último renglón de una tarjeta llamada «El juego», después de la atribución
    // del piano: el que más pone era el que peor se leía. Un crédito que hay que
    // buscar no es un crédito.
    //
    // Debajo del nombre iba un tercer renglón, `p.cargo`, con «Universidad de
    // Jaén». Se fue el 07/08/2026 al alargarse la frase de «De dónde sale», que
    // ahora nombra la universidad: **el mismo hecho dos veces en la misma
    // pantalla**, y aquí lo que se puede derivar no se almacena. Pagó además los
    // 26 px que hacían falta para que la frase larga entrara en un iPhone SE, y
    // esa es la única razón por la que se pudo alargar. La regla en general:
    // cuando una pantalla no cabe, el primer sitio donde mirar es lo que ya
    // estaba dicho en otro renglón.
    el('div.tarjeta.autoria', {},
      el('p.antefirma', {}, 'Juego desarrollado por'),
      el('p.firma', {}, 'Pablo Infante Amate')),

    // Lo demás va en **una sola tarjeta con tres apartados**, y no en tres
    // tarjetas. Fueron tres hasta el 07/08/2026, y esta pantalla se salía del
    // teléfono: 917 px contra los 553 de un iPhone SE. Recortar la copia sola
    // no llegaba —bajaba a 673— porque el problema no era el texto sino la
    // caja: cada tarjeta cuesta unos 50 px de relleno, sombra y margen antes de
    // escribir una letra, y cuatro tarjetas son 200 px de papel.
    //
    // Juntarlas no es solo ahorrar: **una tarjeta es una cosa que se toca y
    // esto no se toca, se lee**. Cuatro pegatinas seguidas prometen cuatro
    // sitios donde ir; una hoja con tres apartados es lo que de verdad hay. La
    // firma se queda fuera y con su sombra verde porque sí es otra cosa: es
    // quién responde de esto, y es a lo que se viene.
    //
    // Cada apartado es `h3` de epígrafe y `p` de cuerpo, los tres iguales.
    // Hasta hoy «Cómo funciona» iba en `p.nota` —más pequeña y más gris—, así
    // que se leía en otra letra que los de arriba; se vio en PLATEA. `.nota` se
    // guarda para lo que de verdad es una nota al pie: la línea de la licencia.
    el('div.tarjeta', {},
      // Aquí es donde vive la asignatura, y no en la portada, que la abre gente
      // que no está matriculada en nada. La segunda mitad es la que impide que
      // nombrarla cierre la puerta: dice que el juego es de una asignatura, no
      // que sea *solo* para ella.
      //
      // **Y es el renglón más caro de la pantalla.** Decía «Creado para la
      // asignatura Educación Musical y su Didáctica. Sirve igual fuera de ella»
      // —86 caracteres— y se quedaba corto: nombraba la asignatura sin decir de
      // dónde es, y «fuera de ella» no dice para qué sirve. Alargarla costó los
      // 26 px del renglón «Universidad de Jaén» de la firma, que es lo único
      // que había disponible. **El techo medido son 150 caracteres**, y estos
      // son 150: en un iPhone SE sobran 2 px. No cabe el grado —«del Grado en
      // Educación Primaria» son 27 caracteres, o sea un renglón, o sea 25 px—,
      // y de los cinco datos posibles se dejó fuera ese porque los otros cuatro
      // hacen más trabajo: la universidad sitúa el juego y la apertura es la
      // que evita que la asignatura eche a quien no la cursa. Si algún día hay
      // que meter algo más aquí, el número lo da `pruebas/caber.html`.
      el('h3', {}, 'De dónde sale'),
      el('p', {}, 'Creado para la asignatura Educación Musical y su Didáctica de la '
        + 'Universidad de Jaén, pero sirve en otros contextos educativos o como '
        + 'entretenimiento.'),

      // La licencia CC BY 3.0 solo exige citar la autoría, pero la exige, y este
      // es el sitio donde se cita: es el único crédito de esta pantalla que está
      // aquí por obligación y no por gusto. Ver web/audio/piano/CREDITOS.md.
      //
      // La tipografía tuvo su apartado un día y se quitó: la OFL **no** pide
      // citarla en pantalla, solo que la licencia viaje con la fuente, y la
      // fuente viaja empotrada en `css/consola.css` con la licencia entera al
      // lado. A quien juega, «Fraunces, de Undercase Type» no le dice nada.
      el('h3', {}, 'El sonido'),
      el('p', {}, 'Las 48 notas de piano proceden de ',
        el('a', { href: 'https://github.com/gleitz/midi-js-soundfonts', target: '_blank',
                  rel: 'noopener' }, 'midi-js-soundfonts'),
        ' (CC BY 3.0).'),

      // Lo único de esto que le importa a quien juega: que no se le recoge nada
      // y que el progreso es de este aparato. Se fueron dos frases el
      // 03/08/2026 —los números MIDI, que son documentación y viven en
      // `docs/contrato_datos.md`, y «Edición “publicable”, 8 canciones fuera por
      // licencia», que en la copia pública contaba de más—. Lo de «web
      // estática» se fue hoy por lo mismo: describe la cocina.
      el('h3', {}, 'Cómo funciona'),
      el('p', {}, 'No se recoge ningún dato. El progreso vive en este navegador.')));
}
