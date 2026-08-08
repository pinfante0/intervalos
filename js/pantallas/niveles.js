// La entrada de un juego: los cuatro modos. Y detrás, según el modo, la
// progresión de niveles o la cuadrícula donde se eligen los intervalos.
//
// **Manda el modo, y dentro del modo se elige.** Hasta el 03/08/2026 era al
// revés: primero la escalera de siete niveles y el modo se cambiaba dentro de la
// pantalla de preparación, o sea después de haber elegido uno sin saberlo. Eso
// obligaba a dos parches —subir la Práctica encima de la escalera porque abajo
// no se encontraba, y un cartel explicando que en los otros tres manda el
// nivel—, y cuando hace falta un cartel explicando la navegación, normalmente la
// navegación está al revés.
//
// **Solo el Reto usa niveles**, porque solo el Reto los mueve. Ver `modos.js`.

import { el, segundos } from '../nucleo/dom.js';
import { accesos } from './ajustes.js';
import { MODOS, TODOS, MAX_EQUIPOS, PLAZOS, eligeEn, duracionEn, porEquiposEn }
  from '../nucleo/modos.js';

/** A dónde lleva cada tarjeta: el Reto al mapa de niveles, los demás a elegir. */
const puertaDe = (juego, modo) => (eligeEn(modo) === 'nivel'
  ? `#/${juego}/niveles`
  : `#/${juego}/preparar?modo=${modo}`);

/**
 * La entrada de un juego: su portada si la trae, y si no, los cuatro modos.
 *
 * La portada es **la sexta cosa que un juego aporta y la única opcional**, y
 * desde el 03/08/2026 es una pantalla entera y no una cabecera: se abre a
 * pantalla completa, dice de qué va el juego y tiene un botón para entrar. Esta
 * función es toda la parte del armazón —dónde va y adónde lleva su botón—; qué
 * se dibuja dentro no lo sabe ni tiene por qué.
 *
 * **Ya no hay «volver».** Esta pantalla es la primera de la compilación: detrás
 * de ella estaba el menú de la consola, y el menú se fue el 07/08/2026 porque
 * cada juego se reparte solo. Un juego sin portada entra directo en los modos, y
 * entonces la primera es aquella.
 */
export function pantallaEntrada(consola, ctx) {
  const juego = consola.juego(ctx.params.juego);
  if (!juego.portada) return pantallaModos(consola, ctx);
  return juego.portada({
    juego,
    datos: consola.datos,
    entrar: `#/${juego.id}/modos`,
    // Los ajustes y los créditos se los da el armazón ya montados. Una portada
    // que se los fuera a buscar a `pantallas/ajustes.js` sería un juego
    // dependiendo de una pantalla compartida, que es la regla de
    // `minimoElegidos` al revés.
    accesos: accesos(),
  });
}

export function pantallaModos(consola, { params }) {
  const { datos, progreso } = consola;
  const juego = consola.juego(params.juego);
  const mio = progreso.deJuego(juego.id);

  // De dónde se viene: de la portada, si el juego la trae. Si no, de ningún
  // sitio, porque entonces esta pantalla **es** `#/`. Aquí había un tercer caso
  // —el menú de la consola— que ya no existe.
  const volver = juego.portada ? `#/${juego.id}` : null;

  // Los ajustes y los créditos los ofrece la portada. Cuando no hay portada,
  // esta pantalla es la puerta y le tocan a ella: si no, no se llegaría a ellos
  // desde ningún sitio.
  const sinOtraPuerta = !juego.portada;

  // Las cuatro tarjetas son iguales. Llevaron un rótulo arriba —«La progresión»
  // o «Eliges tú»— hasta el 03/08/2026, y se quitó: lo que distingue a cada modo
  // ya lo dice su nombre y su descripción, y una etiqueta más encima de cuatro
  // tarjetas seguidas se lee como ruido, no como una clasificación.
  const tarjetas = TODOS.map((modo) => el('a.modo-tarjeta', {
    href: puertaDe(juego.id, modo.id),
    datos: { modo: modo.id },
  },
  el('h3', {}, modo.nombre),
  // El resumen de una línea, no el detalle entero: las cuatro tarjetas se
  // reparten el alto de un teléfono, y la explicación larga espera a la
  // pantalla de preparar, que es donde ya se ha elegido este modo.
  el('p', {}, modo.resumen),
  pieDeModo(datos, mio, modo)));

  // Aquí no va el resumen de progreso. Vive en el Reto, que es el único modo
  // donde un nivel significa algo: en una pantalla que solo sirve para elegir
  // cómo jugar, una tabla de aciertos es una parada que nadie ha pedido.
  // El enlace de atrás nombra **adónde se va**, no de dónde se viene, que es lo
  // que hace ya «‹ Modos». Decía «‹ Intervalia» —el nombre del juego— y eso
  // informaba de lo único que el que está aquí ya sabe: en qué juego está.
  // Adónde lleva es a la portada, o sea al inicio. Corregido el 07/08/2026,
  // jugándolo en PLATEA.
  //
  // Y el título dice qué se elige aquí. «Cómo jugar» prometía las reglas y lo
  // que hay debajo son cuatro modos entre los que hay que decidir. Sin portada,
  // esta pantalla **es** la entrada del juego y el título vuelve a ser su nombre.
  return el('section.modos', {},
    el('header.cabecera', {},
      volver ? el('a.atras', { href: volver }, '‹ Inicio') : null,
      el('h2', {}, juego.portada ? 'Modo de juego' : juego.nombre),
      // Y si esta pantalla es la puerta de la compilación, los dos accesos van
      // aquí arriba, en el mismo sitio que en las otras dos puertas. Antes
      // caían al final de la columna, debajo de las cuatro tarjetas.
      sinOtraPuerta ? accesos() : null),

    // Aquí iba una entradilla —«En el Reto manda el nivel y es el único que abre
    // el siguiente; en los otros tres eliges tú qué intervalos suenan»— y se
    // quitó el 03/08/2026. Decía lo que ya dicen las cuatro tarjetas debajo, y
    // costaba lo que valía: **la cuarta tarjeta se quedaba fuera de la
    // pantalla**, o sea que el precio de explicar los cuatro modos era no ver
    // uno de los cuatro.
    el('div.modos-lista', {}, tarjetas));
}

/**
 * La línea de abajo de cada tarjeta. En el Reto lleva **el progreso**, que es lo
 * que se perdía al meter la escalera un clic más adentro: sin esto, el alumno
 * deja de ver de un vistazo por dónde va, y esa escalera es la columna vertebral
 * del juego.
 */
function pieDeModo(datos, mio, modo) {
  if (modo.elige !== 'nivel') {
    return el('span.pie-modo', {}, duracionEn(modo.id) === 'reloj'
      ? 'Un minuto'
      : (porEquiposEn(modo.id) ? 'Hasta diez equipos' : 'Los ítems que elijas'));
  }

  const ultimo = datos.ultimoNivel;
  const puntos = datos.niveles.map((n) => el('span.punto', {
    clase: mio.niveles_superados.includes(n.id) ? 'hecho'
      : (n.id === mio.nivel_actual ? 'ahora' : ''),
  }));
  return el('span.pie-modo', {},
    el('span.puntos', { role: 'img', 'aria-label': `Nivel ${mio.nivel_actual} de ${ultimo}` },
       puntos),
    el('span', {}, mio.niveles_superados.length >= ultimo
      ? 'Los siete superados'
      : `Nivel ${mio.nivel_actual} de ${ultimo}`));
}

// --- La progresión, que es solo del Reto ------------------------------------

/**
 * La escalera del Reto: los siete de un vistazo y abierto el que toca.
 *
 * **Reescrita el 04/08/2026, y no por gusto.** Eran siete tarjetas apiladas, con
 * su nombre y su objetivo de tres renglones cada una, y pedía **1437 px contra
 * los 553 de un iPhone SE**: casi tres pantallas de desplazamiento en la que más
 * se visita del juego. Y eso medido con el progreso vacío, o sea sin la tarjeta
 * de «Cómo va», que en un móvil de verdad va detrás.
 *
 * No se arreglaba apretando márgenes, porque no era un problema de espaciado:
 * **seis de los siete están cerrados y gastaban tres renglones cada uno
 * describiendo algo que no se puede jugar**. La descripción de un nivel cerrado
 * no informa —no dice cuándo se abre ni qué hacer para abrirlo— y ocupa el sitio
 * de la que sí importa.
 *
 * Así que los siete pasan a ser **una fila de siete**, que es la misma pieza que
 * «O los de un nivel» de la pantalla de preparar: el alumno ya la conoce de los
 * otros tres modos, y aquí dice lo mismo con los candados puestos. Debajo, **la
 * tarjeta entera del nivel que toca** —el más alto que está abierto—, que es la
 * única de las siete que se iba a leer. De 1437 px a menos de la mitad, y el
 * botón de jugar deja de estar bajo el pliegue.
 *
 * Los superados siguen siendo pulsables: repetir un nivel ya superado es lo que
 * hace de la escalera un sitio al que se vuelve y no un trámite.
 */
export function pantallaNiveles(consola, { params }) {
  const { datos, progreso } = consola;
  const juego = consola.juego(params.juego);
  const mio = progreso.deJuego(juego.id);

  const estadoDe = (nivel) => ({
    superado: mio.niveles_superados.includes(nivel.id),
    abierto: progreso.nivelAbierto(juego.id, nivel.id),
  });

  // El que toca: el más alto de los abiertos. Es el que la escalera está
  // proponiendo, y por tanto el único cuyo objetivo se va a leer.
  const actual = [...datos.niveles].reverse().find((n) => estadoDe(n).abierto)
    ?? datos.niveles[0];

  const escalones = datos.niveles.map((nivel) => {
    const { superado, abierto } = estadoDe(nivel);
    const escalon = el(abierto ? 'a.escalon' : 'span.escalon', {
      href: abierto ? `#/${juego.id}/jugar?nivel=${nivel.id}&modo=individual` : null,
      clase: [superado ? 'superado' : '', abierto ? '' : 'cerrado',
              nivel.id === actual.id ? 'actual' : ''].join(' '),
      'aria-disabled': abierto ? null : 'true',
      // El título lleva el nombre porque el escalón solo lleva un número: en un
      // ratón se lee al pasar por encima, y a un lector de pantalla le llega
      // siempre. Un «3» a secas no dice nada.
      title: abierto
        ? `${nivel.nombre}: ${nivel.objetivo}`
        : `${nivel.nombre} — se abre al superar el nivel ${nivel.id - 1}`,
      'aria-label': abierto
        ? `Nivel ${nivel.id}, ${nivel.nombre}${superado ? ', superado' : ''}`
        : `Nivel ${nivel.id}, ${nivel.nombre}, cerrado`,
    }, superado ? '✓' : nivel.id);
    return escalon;
  });

  return el('section', {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${juego.id}/modos` }, '‹ Modos'),
      el('h2', {}, MODOS.individual.nombre)),

    // Una línea y no el párrafo de cuatro que había. Lo que decía de más —que
    // aquí manda el nivel, que es el único con candados— ya lo dice el `detalle`
    // del modo en la pantalla anterior, y los candados se ven puestos aquí
    // debajo. Repetirlo costaba 110 px en la pantalla que no cabía.
    el('p.nota.entradilla', {},
       `Siete niveles de ${datos.niveles[0].items} ítems, que se superan con `
       + `${datos.niveles[0].aciertos_para_superar}.`),

    el('div.escalera', { role: 'group', 'aria-label': 'Los siete niveles' }, escalones),

    tarjetaDelNivel(juego, actual, estadoDe(actual)),

    // La tabla de «Cómo va» estaba aquí abajo y **solo aparecía si habías
    // jugado**, que es justo por lo que se escapó a la prueba: `caber.html` mide
    // con el progreso recién estrenado y ahí no existe. Con un progreso normal
    // son 299 px y esta pantalla pasaba de 632 a 931 contra los 553 de un
    // iPhone SE. Ahora se llega con un botón, y la tabla tiene pantalla propia.
    //
    // **Botón y no enlace subrayado.** Era `a.enlace`: una frase gris con la
    // tipografía del texto y una raya debajo, o sea la única cosa pulsable del
    // juego que no se parece a nada de lo que aquí se pulsa. Un hipervínculo de
    // página web en una pantalla hecha de pegatinas se lee como una nota al pie,
    // no como un sitio al que ir. Ver `.secundario` en consola.css.
    mio.items_jugados
      ? el('div.acciones', {},
        el('a.secundario', { href: `#/${juego.id}/progreso` }, 'Progreso del Reto'))
      : null);
}

/**
 * El histórico: todo lo jugado, no la última partida.
 *
 * Son dos datos distintos y por eso son dos pantallas y no una. «Cómo lo has
 * hecho» sale de `consola.ultimoResumen` y desaparece al recargar; esto sale del
 * progreso guardado y sigue ahí mañana.
 */
export function pantallaProgreso(consola, { params }) {
  const { datos, progreso } = consola;
  const juego = consola.juego(params.juego);
  const mio = progreso.deJuego(juego.id);

  return el('section', {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${juego.id}/niveles` }, '‹ Reto'),
      el('h2', {}, 'Progreso del Reto')),

    // Sin nada jugado no hay tabla que enseñar, y un hueco en blanco parecería
    // un fallo. A esta pantalla no se llega desde la escalera hasta que hay algo
    // dentro, pero a una dirección se llega escribiéndola.
    mio.items_jugados
      ? resumenDelJuego(datos, progreso, juego)
      : el('p.nota', {}, 'Aquí aparecerá cómo llevas cada intervalo en cuanto juegues una partida.'));
}

/**
 * El nivel que toca, entero: su número, su nombre, qué entrena y el botón.
 *
 * Es la única de las siete tarjetas que sobrevivió, y el motivo es que era la
 * única que alguien iba a leer. Lleva el botón de jugar en grande porque **esta
 * pantalla tiene una sola cosa que hacer**, y antes ese botón no existía: se
 * entraba pulsando la tarjeta, que es un objetivo de toque que no se anuncia.
 */
function tarjetaDelNivel(juego, nivel, { superado }) {
  return el('div.tarjeta.nivel-actual', {},
    el('p.rotulo', {}, superado ? `Nivel ${nivel.id} · superado` : `Nivel ${nivel.id}`),
    el('h3', {}, nivel.nombre),
    el('p.nota', {}, nivel.objetivo),
    nivel.nota_didactica && el('p.didactica', {}, nivel.nota_didactica),
    el('a.principal.grande', {
      href: `#/${juego.id}/jugar?nivel=${nivel.id}&modo=individual`,
    }, superado ? 'Repetir' : 'Jugar'));
}

function resumenDelJuego(datos, progreso, juego) {
  const mio = progreso.deJuego(juego.id);
  if (!mio.items_jugados) return null;

  // Los cinco pares peor llevados. Es lo que en la Fase 6 pesará el sorteo; de
  // momento solo se enseña, que ya orienta a quien practique por su cuenta.
  const flojos = Object.entries(mio.estadisticas)
    .map(([clave, e]) => {
      const [intervalo, direccion] = clave.split('|');
      const total = e.aciertos + e.fallos;
      return { intervalo, direccion, total, tasa: e.aciertos / total, ms: e.ms_total / total };
    })
    .filter((p) => p.total >= 3)
    .sort((a, b) => a.tasa - b.tasa)
    .slice(0, 5);

  return el('div.tarjeta', {},
    el('h3', {}, 'Cómo va'),
    el('p.nota', {}, `${mio.items_jugados} ítems jugados · mejor racha ${mio.mejor_racha}`),
    flojos.length ? el('table.tabla', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Intervalo'), el('th', {}, 'Aciertos'), el('th', {}, 'Tiempo'))),
      el('tbody', {}, flojos.map((p) => el('tr', {},
        el('td', {}, `${datos.intervalo(p.intervalo).etiqueta} ${p.direccion === 'asc' ? '↑' : '↓'}`),
        el('td', {}, `${Math.round(p.tasa * 100)} %`),
        el('td', {}, segundos(p.ms)))))) : null);
}

// --- Elegir los intervalos, para los tres modos que no usan niveles ---------
//
// Era la pantalla de la Práctica y ahora la comparten la Práctica, el
// Contrarreloj y el Concurso. Lo que cambia entre los tres es qué se pregunta
// además: los ítems donde los ítems terminan la partida, y los equipos y el
// plazo en el Concurso. Lo que se elige —los doce intervalos y la dirección— es
// lo mismo, y por eso es una sola pantalla y no tres parecidas.

export function pantallaPreparar(consola, { params, consulta, ir }) {
  const { datos } = consola;
  const juego = consola.juego(params.juego);
  const modo = MODOS[consulta.get('modo')] ? consulta.get('modo') : 'libre';
  const pideItems = duracionEn(modo) === 'items';
  const porEquipos = porEquiposEn(modo);

  // Cuántos hay que marcar lo pone **el juego**, no esta pantalla. Hasta el
  // 03/08/2026 esto era un `import` de `js/juegos/intervalos/juego.js`: una
  // pantalla compartida colgando de un juego concreto, que además habría
  // reventado cualquier compilación que no llevara Intervalia dentro.
  const minimo = juego.minimoElegidos ?? 1;

  // **Se entra sin nada elegido.** Traía 3m y 3M puestas, y una elección que
  // ya viene hecha no se lee como un ejemplo: se lee como lo que toca hacer, y
  // el alumno le da a Empezar sin mirar. Esta pantalla existe justo para que
  // elija él, así que la lista arranca en gris y el botón de empezar, apagado.
  const elegidos = new Set();
  let direccion = 'azar';
  let items = 10;
  let equipos = 4;
  let plazo = 15;

  const empezar = el('button.principal', { type: 'button' },
                     porEquipos ? 'Empezar el concurso' : 'Empezar');
  const aviso = el('p.nota');

  /**
   * Cómo se dice en esta pantalla la dirección de un nivel.
   *
   * Es la vuelta exacta de lo que hace `configLibre`, que convierte `azar` en
   * las dos direcciones. Sin esta traducción, **los niveles 5, 6 y 7 son
   * indistinguibles**: los tres llevan los mismos doce intervalos y solo se
   * diferencian en esto.
   */
  const direccionDe = (nivel) => (nivel.direcciones.length === 2 ? 'azar' : nivel.direcciones[0]);

  /**
   * Cada control sabe volver a pintarse a partir del estado, y nadie toca
   * clases por su cuenta.
   *
   * Se hizo así después de que el atajo por niveles encendiera tres círculos a
   * la vez: cuando cada botón lleva su propio `elegido` a mano, dos controles
   * que dependen del mismo dato acaban discrepando. Aquí el estado son
   * `elegidos`, `direccion` e `items`, y todo lo demás se deduce.
   */
  const refrescos = [];
  const actualizar = () => {
    const pocos = elegidos.size < minimo;
    empezar.disabled = pocos;
    // De una línea, no de dos. La explicación —que con un solo intervalo la
    // cuadrícula deja un único botón pulsable y se acierta sin escuchar— era
    // verdad y era cara: dos renglones fijos en la pantalla que se salía 369 px.
    // Lo que hay que saber para desbloquear el botón es cuántos faltan.
    aviso.textContent = pocos
      ? `Elige al menos ${minimo} intervalos.`
      : `${elegidos.size} intervalos elegidos.`;
    for (const refrescar of refrescos) refrescar();
  };

  /** Enciende o apaga un botón, con su estado accesible al lado. */
  const pintarChip = (boton, puesto) => {
    boton.classList.toggle('elegido', puesto);
    boton.setAttribute('aria-pressed', String(puesto));
  };

  /** Deja puestos exactamente estos intervalos, y esta dirección si se pide. */
  const marcar = (ids, dir = null) => {
    elegidos.clear();
    ids.forEach((id) => elegidos.add(id));
    if (dir) direccion = dir;
    actualizar();
  };

  const casillas = datos.intervalos.map((intervalo) => {
    const boton = el('button.chip.respuesta', {
      type: 'button',
      datos: { cualidad: intervalo.cualidad, intervalo: intervalo.id },
      'aria-pressed': 'false',
      onclick: () => {
        if (elegidos.has(intervalo.id)) elegidos.delete(intervalo.id);
        else elegidos.add(intervalo.id);
        actualizar();
      },
    }, intervalo.etiqueta);
    boton.style.setProperty('--color', datos.color(intervalo.id));
    refrescos.push(() => pintarChip(boton, elegidos.has(intervalo.id)));
    return boton;
  });

  // El atajo que pedía «practicar el nivel concreto» sin depender de haberlo
  // desbloqueado: carga ese nivel y desde ahí se retoca.
  //
  // Carga **los intervalos y la dirección**, porque las dos cosas son el nivel:
  // el 5 son los doce ascendentes y el 6 los doce descendentes, y cargar solo
  // los intervalos dejaba los dos iguales. Y el círculo se deriva de las dos, no
  // de lo último que se pulsó: así se enciende igual si eliges el nivel 3 que si
  // llegas a su combinación a mano, y se apaga en cuanto dejas de estar en ella.
  // `.grado` los hace redondos y del tamaño de los escalones de la pantalla del
  // Reto, y no es cosmética: son **la misma cosa** —los siete niveles— y así los
  // siete caben en una fila en vez de partirse en dos. Una escalera partida en
  // dos filas deja de leerse como una escalera.
  const chipsNivel = datos.niveles.map((n) => {
    const boton = el('button.chip.grado', {
      type: 'button',
      datos: { nivel: String(n.id) },
      'aria-pressed': 'false',
      title: `${n.nombre}: ${n.intervalos.join(', ')}`,
      onclick: () => marcar(n.intervalos, direccionDe(n)),
    }, n.id);
    refrescos.push(() => pintarChip(boton,
      n.intervalos.length === elegidos.size
      && n.intervalos.every((id) => elegidos.has(id))
      && direccion === direccionDe(n)));
    return boton;
  });

  /**
   * Un grupo de opciones excluyentes.
   *
   * `reparte` las pone en columnas iguales en vez de en una fila que envuelve, y
   * eso es lo que impide que «Ascendentes / Descendentes / Al azar» se parta en
   * dos renglones en un teléfono. Se usa donde las opciones son pocas y de ancho
   * parecido; con los diez equipos del Concurso no vale, y allí envuelve.
   */
  const grupo = (titulo, opciones, leer, alElegir, { reparte = false } = {}) => {
    const botones = opciones.map(([id, texto]) => {
      const boton = el('button.chip', {
        type: 'button',
        'aria-pressed': 'false',
        onclick: () => { alElegir(id); actualizar(); },
      }, texto);
      refrescos.push(() => pintarChip(boton, leer() === id));
      return boton;
    });
    return el('div.grupo', {},
      el('h3', {}, titulo),
      el(`div.fila${reparte ? '.reparte' : ''}`, {}, botones));
  };

  const grupoDireccion = grupo(
    'Dirección', [['asc', 'Ascendentes'], ['desc', 'Descendentes'], ['azar', 'Al azar']],
    () => direccion, (v) => { direccion = v; }, { reparte: true });

  // El Contrarreloj no pregunta cuántos ítems: los que entren en el minuto.
  const grupoItems = pideItems
    ? grupo('Ítems', [[10, '10'], [20, '20'], [30, '30']], () => items, (v) => { items = v; },
            { reparte: true })
    : null;

  const numeros = [];
  for (let n = 2; n <= MAX_EQUIPOS; n++) numeros.push([n, String(n)]);
  const grupoEquipos = porEquipos
    ? grupo('Equipos', numeros, () => equipos, (v) => { equipos = v; })
    : null;
  const grupoPlazo = porEquipos
    ? grupo('Tiempo para responder',
            PLAZOS.map((p) => [p, p === null ? 'Sin reloj' : `${p} s`]),
            () => plazo, (v) => { plazo = v; })
    : null;

  // Lo que explica el plazo cambia con el plazo, así que se repinta como todo lo
  // demás en vez de escribirse una vez al montar la pantalla.
  const notaPlazo = porEquipos ? el('p.nota') : null;
  if (notaPlazo) {
    refrescos.push(() => {
      // Corta a propósito. La versión larga explicaba por qué levantan todos a
      // la vez y por qué la solución espera a «Resolver», y eran 153 px en la
      // pantalla que el profesor monta proyectada. Lo que hay que saber para
      // elegir el plazo es qué pasa al llegar a cero; el porqué está en
      // docs/consola.md y no hace falta delante de la clase.
      notaPlazo.textContent = plazo === null
        ? 'Tú decides cuándo levantan las pizarras.'
        : 'Al llegar a cero levantan todos a la vez. La solución espera a «Resolver».';
    });
  }

  empezar.onclick = () => {
    const orden = datos.intervalos.map((i) => i.id).filter((id) => elegidos.has(id));
    // La partida entera sigue viajando en la dirección, que es lo que permite
    // dejar un concurso montado en un marcador o en un QR. Lo que cambia desde
    // que el Concurso no cuelga de un nivel es que la lista de intervalos va
    // dentro en vez del número del nivel: más larga, y sigue cabiendo de sobra.
    let destino = `/${juego.id}/jugar?modo=${modo}&intervalos=${orden.join(',')}`
      + `&direccion=${direccion}`;
    if (pideItems) destino += `&items=${items}`;
    if (porEquipos) destino += `&equipos=${equipos}&plazo=${plazo ?? 'sin'}`;
    ir(destino);
  };

  actualizar();

  // El Concurso se marca porque su pantalla es de otra forma: la monta el
  // profesor en el portátil del aula, proyectada, y pregunta cinco cosas en vez
  // de tres. A partir de 46rem se reparte en dos columnas, igual que su partida.
  return el(`section.preparar${porEquipos ? '.preparar-aula' : ''}`, {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${juego.id}/modos` }, '‹ Modos'),
      el('h2', {}, MODOS[modo].nombre)),

    el('p.nota.entradilla', {}, MODOS[modo].detalle),

    el('div.tarjeta', {},
      // «Todos» y «Ninguno» van **en el renglón del rótulo**, no debajo de la
      // cuadrícula. Son lo que se le hace a esa lista, así que su sitio es al
      // lado de su nombre; debajo eran un renglón entero de 38 px en la pantalla
      // que se salía 369.
      // El rótulo y su cuadrícula van en un bloque, no sueltos. Es lo que hace
      // que al repartir el espacio sobrante no se abra un hueco entre una lista
      // y el nombre de esa lista: lo que se separa son los grupos, no una
      // etiqueta de lo que etiqueta.
      el('div.bloque', {},
         el('div.rotulo-fila', {},
            el('h3', {}, 'Intervalos'),
            el('span.atajos', {},
               el('button.enlace', {
                 type: 'button',
                 onclick: () => marcar(datos.intervalos.map((i) => i.id)),
               }, 'Todos'),
               el('button.enlace', { type: 'button', onclick: () => marcar([]) }, 'Ninguno'))),
         el('div.cuadricula', {}, casillas)),

      // El atajo por niveles deja de ser una comodidad y pasa a ser la pieza que
      // sustituye a la escalera en estos tres modos: es como se monta «el
      // concurso del nivel 5» sin tener que acordarse de qué intervalos lleva.
      el('div.grupo', {},
        el('h3', {}, 'O los de un nivel'),
        el('div.fila', {}, chipsNivel)),

      grupoDireccion,
      grupoItems,
      grupoEquipos,
      grupoPlazo,

      notaPlazo,

      el('div.arranque', {}, empezar, aviso)));
  // Aquí había una línea explicando que suena el registro más ancho, con los
  // números MIDI dentro. Quien juega no necesita saber en qué unidades piensa el
  // programa: el registro es una decisión del juego, no un ajuste que se toque.
  // Sigue documentado donde toca, en `docs/contrato_datos.md`.
}
