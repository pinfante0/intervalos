// El bucle de una partida: preparar, sonar, responder, repetir.
//
// Es la pantalla que usa todo lo demás —los datos, el reproductor, el motor de
// rondas, el progreso— y la única que sabe en qué orden. Del juego concreto solo
// conoce cinco cosas: cómo se configura una ronda, qué suena, qué cuadrícula la
// responde, cuál es su pista y qué enseña cuando se falla. Ver docs/consola.md.
//
// Hay dos bucles, no uno. En solitario responde quien juega, en la pantalla; en
// el aula responden varios equipos a la vez, en sus pizarras, y el profesor
// registra quién ha acertado. Comparten el estímulo, la cuadrícula y la pista, y
// se separan justo en el momento de resolver el ítem.
//
// **Una pantalla, un trabajo. Reestructurado el 04/08/2026.** Antes esto era una
// columna que crecía: al fallar, el panel de comparación se metía entre la
// corrección y la cuadrícula y la partida pedía 1022 px en un teléfono que tiene
// 553. O sea que el momento didáctico del juego —el único sitio donde se mira la
// respuesta correcta— era el que quedaba fuera de la pantalla, y para verlo
// entero había que saber que hay que desplazar. Ahora los dos momentos del ítem
// son **dos escenas que se relevan** dentro del mismo armazón:
//
//   · **responder** · la banda del estímulo, el aviso y la cuadrícula
//   · **corregir**  · la banda en pequeño, el veredicto y la pantalla de error
//
// La cuadrícula no está en la segunda, y eso es lo único que el cambio podía
// perder: al fallar se marca el botón bueno en su sitio, y dónde estaba se
// aprende mirando ahí. Por eso la escena no cambia en el acto sino tras
// `PAUSA_ANTES_DE_CORREGIR`, con la cuadrícula marcada delante.
//
// El aula no releva nada: allí la cuadrícula proyectada es la chuleta de qué
// respuestas caben, y esa pantalla es apaisada y no tiene el problema.
//
// La regla que manda sobre el orden de todo esto la puso la Fase 2:
// `despertar()` tiene que salir de un gesto del usuario. Por eso hay un botón de
// empezar de verdad y no una pantalla que arranque sola.

import { el, vaciar, añadir, esperar, reloj } from '../nucleo/dom.js';
import { Ronda, MS_CONTRARRELOJ } from '../nucleo/rondas.js';
import { MODOS, MAX_EQUIPOS, nombreModo, eligeEn, pistaEn, repartoEn } from '../nucleo/modos.js';
import { nombreEs } from '../nucleo/alturas.js';

/**
 * Lo que se deja ver un acierto antes de pasar al ítem siguiente.
 *
 * Dos segundos largos parecen muchos escritos aquí y se quedan cortos jugando:
 * hay que leer la abreviatura, mirar las dos notas y volver a la cuadrícula. La
 * otra mitad del arreglo fue acortar el texto —«5J» y no «Quinta justa»—, que es
 * lo que de verdad se lee de una pasada.
 */
const PAUSA_ACIERTO = 2200;

/**
 * Y lo que se deja ver un fallo **cuando no se puede parar**, que es solo a
 * contrarreloj: ahí el reloj corre y un botón de continuar castigaría por leer.
 * En los demás modos el fallo espera a que se pulse, porque es el único momento
 * en que el alumno mira la respuesta correcta y tres segundos no dan.
 */
const PAUSA_FALLO_CONTRARRELOJ = 2400;

/**
 * Lo que se deja ver la cuadrícula marcada antes de pasar a la escena de
 * corregir.
 *
 * Es el precio de que corregir sea una pantalla entera en vez de un trozo más de
 * la columna. Al fallar, la cuadrícula señala el botón bueno **en su sitio**, y
 * eso es lo único que la pantalla de error no enseña: ella compara los dos
 * saltos, pero dónde estaba el botón se aprende mirando la cuadrícula. Un
 * segundo escaso basta para verlo; más, y es una espera.
 */
const PAUSA_ANTES_DE_CORREGIR = 900;

export function pantallaPartida(consola, { params, consulta, ir }) {
  const { datos, progreso, piano } = consola;
  const juego = consola.juego(params.juego);

  const modo = consulta.get('modo') ?? 'individual';
  // Solo el Reto trae nivel. En los otros tres la partida se describe entera con
  // los intervalos que vienen en la dirección: ver `nucleo/modos.js`.
  const nivel = consulta.has('nivel') ? datos.nivel(Number(consulta.get('nivel'))) : null;
  const equipos = Math.min(MAX_EQUIPOS, Math.max(2, cuantos(consulta, 'equipos', 4)));
  const plazo = consulta.get('plazo') === 'sin' ? null : cuantos(consulta, 'plazo', 15);

  const config = eligeEn(modo) === 'nivel'
    ? juego.configDeNivel(datos, nivel)
    : juego.configLibre(datos, {
      intervalos: (consulta.get('intervalos') ?? '').split(',').filter(Boolean),
      direccion: consulta.get('direccion') ?? 'azar',
      items: cuantos(consulta, 'items', 10),
    });

  const nodo = el('section.partida');
  let vivo = true;
  let cronometro = null;
  let soltarEspera = null;     // corta una espera de clic al salirse de la pantalla

  const alSalir = () => {
    vivo = false;
    clearInterval(cronometro);
    soltarEspera?.();
    piano.callar();
  };

  pintarPreparacion();
  return { nodo, alSalir };

  // --- Antes de empezar -----------------------------------------------------

  /**
   * El botón de empezar no es un adorno de diseño: es el gesto del usuario del
   * que cuelga `despertar()`. Sin él, en iOS no sonaría nada y en Chrome el
   * contexto de audio nacería suspendido.
   */
  function pintarPreparacion() {
    // El título dice el modo siempre, y el nivel solo donde hay nivel. Antes
    // decía «Práctica» a todo lo que no fuera un nivel, y desde que el
    // Contrarreloj y el Concurso tampoco lo llevan, eso era mentira en dos de
    // los cuatro modos.
    const titulo = nivel
      ? `Nivel ${nivel.id} · ${nivel.nombre}`
      : nombreModo(modo);
    const estado = el('p.estado');

    const empezar = el('button.principal.grande', {
      type: 'button',
      onclick: async () => {
        empezar.disabled = true;
        estado.textContent = 'Preparando el piano…';
        try {
          await piano.despertar();
          await piano.precargarRegistro(config.registro);
        } catch (fallo) {
          estado.textContent = `No se ha podido abrir el audio: ${fallo.message}`;
          empezar.disabled = false;
          return;
        }
        if (vivo) jugar();
      },
    }, 'Empezar');

    vaciar(nodo).append(
      cabeceraSimple(titulo, params.juego, modo),
      el('div.tarjeta', {},
        el('p.objetivo', {}, nivel ? nivel.objetivo : resumenElegido()),
        el('div.arranque', {}, empezar, estado),
        nivel?.nota_didactica && el('p.didactica', {}, nivel.nota_didactica)),
    );
  }

  /**
   * Qué se ha configurado, para poder comprobarlo antes de empezar.
   *
   * Es lo que sustituye al objetivo del nivel en los tres modos que no lo
   * llevan. En el Concurso importa más que en ningún otro: el profesor lo lee
   * proyectado, delante de la clase, justo antes de que suene el primer ítem.
   */
  function resumenElegido() {
    const nombres = config.intervalos.map((id) => datos.intervalo(id).etiqueta).join(', ');
    const direccion = { asc: 'ascendentes', desc: 'descendentes', azar: 'en las dos direcciones' }[
      consulta.get('direccion') ?? 'azar'];
    const cuantos = modo === 'contrarreloj'
      ? 'Un minuto'
      : `${config.items} ítems`;
    const conEquipos = modo === 'aula'
      ? ` · ${equipos} equipos, ${plazo === null ? 'sin reloj' : `${plazo} s`} por intervalo`
      : '';
    return `${cuantos} de ${nombres}, ${direccion}.${conEquipos}`;
  }

  // --- La partida -----------------------------------------------------------

  function jugar() {
    const porEquipos = modo === 'aula';
    // El Concurso se marca en la propia sección porque su pantalla es de otra
    // forma: es la única que se ve proyectada y apaisada, y a partir de 46rem se
    // reparte en dos columnas en vez de seguir siendo una tira vertical. Medido:
    // en columna pedía 1066 px y no cabía ni en un proyector de 720p ni en el
    // portátil de 768 que hay en casi todas las aulas.
    nodo.classList.toggle('aula', porEquipos);
    const ronda = new Ronda({
      juego: params.juego,
      nivel: nivel?.id ?? null,
      modo,
      items: modo === 'contrarreloj' ? null : config.items,
      limiteMs: modo === 'contrarreloj' ? MS_CONTRARRELOJ : null,
      msPorItem: porEquipos && plazo !== null ? plazo * 1000 : null,
      equipos: porEquipos ? nombresDeEquipos(equipos) : null,
      // El reparto adaptativo entra por aquí, y solo donde el modo lo declara:
      // el generador recibe con qué se ha peleado el alumno, o no recibe nada y
      // sortea uniforme. Quién lo declara y por qué, en nucleo/modos.js.
      generar: juego.generador(datos, config, {
        nivel: nivel?.id ?? null,
        historial: repartoEn(modo) === 'adaptativo'
          ? (intervalo, direccion) => progreso.estadistica(params.juego, intervalo, direccion)
          : null,
      }),
    });

    const marcador = el('div.marcador');
    const escuchar = el('button.escuchar', {
      type: 'button', 'aria-label': 'Escuchar el intervalo', onclick: () => sonar(),
    }, el('span.triangulo'));
    const etiqueta = el('p.etiqueta', {}, 'ESCUCHAR');
    const cuenta = el('p.cuenta-atras');
    const aviso = el('p.aviso');
    const racha = el('span.racha');
    const acciones = el('div.acciones-item');

    // **Cuándo** aparece la pista depende del modo; **dónde**, ya no. Hasta el
    // 04/08/2026 eran la misma decisión —en el pie donde se entrena, junto al
    // botón de seguir donde se mide— y el resultado era que el mismo botón salía
    // en dos sitios distintos según el modo, y en la Práctica en el peor de los
    // dos: debajo de la cuadrícula, o sea fuera de la pantalla en un teléfono.
    // Ahora vive **siempre en la banda del estímulo, a la izquierda del círculo**,
    // y lo que cambia entre modos es solo si está o no. Un botón que aparece a
    // ratos tiene que aparecer siempre en el mismo sitio, o no se busca.
    //
    // Y ahí, además, no cuesta alto: es la única esquina de la pantalla que
    // estaba vacía. Ver nucleo/modos.js para el cuándo.
    const cuandoPista = pistaEn(modo);
    const pista = cuandoPista === 'nunca' ? null : botonPista();

    // Los dos lados sostienen el hueco aunque la pista no esté, que es lo que
    // deja el círculo centrado en la pantalla y no medio dedo a la derecha
    // cuando este par no tiene canción.
    const banda = el('div.estimulo', {},
      el('div.lado', {}, pista),
      el('div.centro', {}, escuchar, etiqueta, cuenta),
      el('div.lado'));

    /** La escena que se está pintando ahora. Ver la cabecera del archivo. */
    const escena = el('div.escena');

    // El aviso de «¡Tiempo!» se da **una vez**, no en cada tic del cronómetro.
    // Ver `pintarMarcador()`.
    let avisadoDelTiempo = false;

    const respuestas = juego.montarRespuesta({
      datos, config, interactiva: !porEquipos, responder: (elegida) => contestar(elegida),
    });

    // La racha sube a la cabecera, que es donde ya estaba el marcador: son el
    // mismo dato —cómo va esto— y estaban en los dos extremos de la pantalla. Lo
    // que había abajo era un pie entero, con su raya y sus márgenes, sosteniendo
    // un emoji y un número.
    vaciar(nodo).append(
      el('header.cabecera', {},
        el('a.atras', { href: `#/${params.juego}/modos` }, '‹ Salir'),
        marcador, racha),
      escena);

    if (modo === 'contrarreloj') {
      cronometro = setInterval(() => {
        if (!vivo) return clearInterval(cronometro);
        pintarMarcador();
      }, 200);
    }

    servir(ronda.comenzar());

    // --- Las dos escenas ----------------------------------------------------

    /**
     * Escuchar y contestar: la banda entera, el aviso y los doce botones.
     *
     * En el aula `acciones` va aquí dentro y no en la otra escena, porque allí no
     * hay otra escena: la cuadrícula proyectada es la chuleta de qué respuestas
     * caben y no se quita en ningún momento del ítem.
     */
    function escenaResponder() {
      escena.className = 'escena responder';
      banda.classList.remove('compacta');
      vaciar(escena).append(banda, aviso, acciones, respuestas.nodo);
    }

    /**
     * Mirar el fallo: la banda en pequeño —el círculo sigue repitiendo el ítem y
     * la pista sigue en su esquina—, el veredicto y la pantalla de error.
     *
     * Sin la cuadrícula, y por eso `contestar()` la deja ver marcada antes de
     * llamar aquí.
     */
    function escenaCorregir() {
      escena.className = 'escena corregir';
      banda.classList.add('compacta');
      vaciar(escena).append(banda, aviso, acciones);
    }

    // --- El ciclo de un ítem ------------------------------------------------

    async function servir(item) {
      if (!item || !vivo) return;
      respuestas.preparar();
      vaciar(acciones);
      aviso.textContent = '';
      aviso.className = 'aviso';
      cuenta.textContent = '';
      escenaResponder();
      pintarMarcador();
      pintarPista('responder');
      await sonar();
      if (!vivo) return;
      if (porEquipos) abrirPlazo();
    }

    async function sonar() {
      const item = ronda.item;
      if (!item || !vivo) return;
      escuchar.disabled = true;
      escuchar.classList.add('sonando');
      etiqueta.textContent = 'SONANDO';
      try {
        await juego.presentar(item, piano);
      } catch (fallo) {
        aviso.textContent = `El piano no ha podido sonar: ${fallo.message}`;
        aviso.className = 'aviso mal';
      }
      if (!vivo) return;
      escuchar.classList.remove('sonando');
      escuchar.disabled = false;
      etiqueta.textContent = 'REPETIR';
      // El cronómetro de la respuesta arranca cuando el estímulo ha terminado de
      // sonar, no cuando aparece el ítem: si no, `ms_total` mediría el
      // reproductor y no al alumno. Y en el aula es de aquí de donde cuelga el
      // plazo, que empieza cuando la clase ha terminado de oír.
      ronda.escuchado();
    }

    // --- La pista -----------------------------------------------------------

    /**
     * El botón, que es uno solo y siempre igual.
     *
     * Antes eran dos formas —una pastilla pequeña que ponía «Pista» en el pie y
     * una grande que ponía «Escuchar la canción» junto a «Siguiente»—, porque
     * vivían en dos sitios distintos. Ahora vive en uno, así que es una.
     *
     * Y dice **«Canción»** y no «Pista». Lo que hace no es dar una letra ni
     * descartar opciones: toca una melodía que ya te sabes para que la compares.
     * Eso lo explicaba el `title`, que en un teléfono no existe, y lo decía ya la
     * versión grande. La etiqueta es lo que se lee.
     */
    function botonPista() {
      const boton = el('button.pista', {
        type: 'button',
        onclick: () => sonarPista(boton),
      }, el('span.icono', {}, '♪'), 'Canción');
      return boton;
    }

    /**
     * Si toca enseñarla ahora mismo. Dos condiciones, y las dos esconden el
     * botón en vez de apagarlo:
     *
     *   · **Que la haya.** Cerrada la Fase 5 son 21 de los 24 pares en la edición
     *     de aula y 18 en la publicable; tres no la tendrán nunca. Un botón
     *     apagado permanente no se lee como «aquí no toca», se lee como roto.
     *   · **Que el modo la permita en este momento del ítem.** Donde se mide, la
     *     ayuda no llega antes que la respuesta: ver nucleo/modos.js.
     *
     * El hueco del lado se reserva igual, así que el círculo no se mueve.
     */
    function pintarPista(momento) {
      if (!pista) return;
      const item = ronda.item;
      const hay = item ? juego.pista(datos, item) : null;
      const toca = cuandoPista === 'siempre' || momento === 'corregir';
      const ver = Boolean(hay) && toca;
      pista.hidden = !ver;
      pista.disabled = !ver;
      if (ver) pista.title = `Suena «${hay.cancion.titulo}», que empieza por este intervalo`;
    }

    async function sonarPista(boton) {
      const item = ronda.item;
      const hay = item && juego.pista(datos, item);
      if (!hay || !vivo) return;
      boton.disabled = true;
      escuchar.disabled = true;
      const { cancion, sonando } = hay;
      // Solo el título. Aquí colgaba «(sin verificar al piano todavía)» cuando
      // `verificada` estaba a false, y eso es **una nota de la cocina en la cara
      // del que juega**: le cuenta el estado interno de un banco de datos que no
      // sabe que existe, y encima justo mientras escucha la ayuda. Es el mismo
      // error que ya se corrigió en los créditos y en las notas didácticas, y en
      // PLATEA se veía en Love Story y en Man in the Mirror. Quién ha escuchado
      // qué se sigue sabiendo, donde importa: `validar_datos.py` lo avisa y
      // `pruebas/banco.js` lo enseña. Ninguna de las dos se publica.
      pintarAviso('pista-sonando', el('span.linea', {},
        `«${cancion.titulo}» empieza por este intervalo.`));
      try {
        await piano.tocarMelodia(sonando.notas, sonando.duraciones, sonando.tempo);
      } finally {
        if (vivo) { boton.disabled = false; escuchar.disabled = false; }
      }
    }

    // --- En solitario -------------------------------------------------------

    async function contestar(elegida) {
      if (!vivo || ronda.terminada || porEquipos) return;
      respuestas.bloquear();
      const resultado = ronda.responder(elegida);

      progreso.anotarRespuesta(params.juego, {
        intervalo: resultado.item.intervalo,
        direccion: resultado.item.direccion,
        acierto: resultado.acierto,
        respuesta: elegida,
        ms: resultado.ms,
      });

      respuestas.marcar(resultado.item, elegida, resultado.acierto);
      pintarMarcador();

      // Acertar se lee de un vistazo y se pasa solo. Fallar, no: es el único
      // momento en que se mira la respuesta correcta, y con un reloj por detrás
      // no se mira, se aguanta. Así que el fallo para la partida hasta que se
      // pulse. A contrarreloj no, porque allí el reloj es el juego.
      if (resultado.acierto || modo === 'contrarreloj') {
        comentario(resultado, elegida);
        await esperar(resultado.acierto ? PAUSA_ACIERTO : PAUSA_FALLO_CONTRARRELOJ);
      } else {
        // Donde la partida para, el fallo deja de ser un renglón y pasa a ser una
        // pantalla: la de error, que es lo que convierte un fallo en algo que se
        // aprende. Las notas del ítem salen de la corrección porque ahí abajo
        // están las dos, cada una en su salto.
        comentario(resultado, elegida, { conNotas: false });
        // Pero antes, la cuadrícula marcada. Es lo que se pierde al cambiar de
        // escena y no lo enseña nada más: la pantalla de error compara los dos
        // saltos, y dónde estaba el botón bueno solo se aprende viéndolo
        // encenderse en su sitio.
        await esperar(PAUSA_ANTES_DE_CORREGIR);
        if (!vivo) return;
        escenaCorregir();
        // Y aquí, y no antes, es donde la pista tiene sentido en un modo que
        // mide: la partida está parada, el alumno mira la respuesta correcta, y
        // oír la canción es lo que convierte ese error en algo que se recuerda.
        // En la Práctica ya estaba puesta desde el principio y sigue donde
        // estaba, que es de lo que se trata.
        pintarPista('corregir');
        await esperarPulsacion('Siguiente', {
          panel: pantallaDeError(resultado.item, elegida),
        });
      }
      if (!vivo) return;

      const siguiente = ronda.siguiente();
      if (siguiente) servir(siguiente);
      else terminar();
    }

    /**
     * La corrección, con **la misma abreviatura que llevan los botones**.
     *
     * «5J» y no «Quinta justa»: es la nomenclatura del examen, es lo que el
     * alumno acaba de pulsar, y sobre todo se lee de un golpe de vista en vez de
     * palabra a palabra. Un mensaje que dura dos segundos no puede pedir que se
     * lea una frase. El tritono no necesita explicación aparte porque su
     * etiqueta ya es «4A/5d».
     */
    function comentario({ item, acierto }, elegida, { conNotas = true } = {}) {
      // Aquí la abreviatura va **del color del veredicto**, no del de su
      // cualidad: verde entera si se acierta, roja entera si se falla. Con el
      // color propio, en el nivel 1 no se notaba —los tres intervalos son
      // justos, o sea verdes, y coincidía con el «bien»—, pero en el nivel 2
      // salía «¡Bien!» en verde con un 3M naranja en medio, y eso ya no se lee
      // como un acierto. Un mensaje que dura dos segundos tiene que decir una
      // sola cosa.
      const linea = acierto
        ? el('span.linea', {}, '¡Bien! ', abreviatura(item.intervalo, { propio: false }))
        : el('span.linea', {}, 'Era ', abreviatura(item.intervalo, { propio: false }), ', no ',
             abreviatura(elegida, { propio: false }));
      pintarAviso(`grande ${acierto ? 'bien' : 'mal'}`, linea, conNotas && alturas(item));
    }

    // --- La pantalla de error -----------------------------------------------

    /**
     * El momento didáctico, y lo único de la Fase 4 que no era delegable.
     *
     * El armazón decide **cuándo** aparece —al fallar, y solo donde la partida
     * para— y le presta el piano. Qué se enseña dentro lo pone el juego: aquí
     * son los dos saltos desde la misma nota, y en el Juego 2 será el oboe y el
     * clarinete que se ha dicho. Un juego que no la traiga se queda como estaba,
     * con el botón de seguir y nada más.
     */
    function pantallaDeError(item, elegida) {
      return juego.montarError?.({
        datos,
        item,
        respuesta: elegida,
        // Cuántas veces se ha cometido **esta** confusión, contando la de ahora.
        // Es el dato que el contrato guarda desde la Fase 1 —qué se contestó en
        // vez de qué— y este es el primer sitio donde sirve para algo.
        veces: progreso.confusion(params.juego, item.intervalo, item.direccion, elegida),
        tocar: tocarSalto,
      }) ?? null;
    }

    /**
     * Toca un salto para la pantalla de error, con la pantalla quieta mientras
     * suena. Devuelve `false` cuando ya no hay a quién enseñárselo —se ha salido
     * de la partida—, que es lo que corta una comparación por la mitad en vez de
     * soltar el segundo salto sobre una pantalla que ya no existe.
     */
    async function tocarSalto(notas) {
      if (!vivo) return false;
      // La pista se devuelve como estaba, no encendida: donde no hay canción el
      // botón está apagado y escondido, y no puede volver de esto encendido.
      const pistaComoEstaba = pista?.disabled;
      escuchar.disabled = true;
      if (pista) pista.disabled = true;
      try {
        await piano.tocarIntervalo(notas);
      } catch (fallo) {
        aviso.textContent = `El piano no ha podido sonar: ${fallo.message}`;
        aviso.className = 'aviso mal';
      } finally {
        if (vivo) {
          escuchar.disabled = false;
          if (pista) pista.disabled = pistaComoEstaba;
        }
      }
      return vivo;
    }

    // --- Por equipos --------------------------------------------------------

    /**
     * Se ha oído el intervalo: empieza el plazo. Al llegar a cero **no se enseña
     * nada**: solo se avisa de que hay que levantar las pizarras. La respuesta
     * correcta la saca el profesor cuando ya las ha visto, porque si apareciera
     * sola en el instante del cero, un equipo podría corregir la suya en lo que
     * el profesor tarda en mirar.
     */
    function abrirPlazo() {
      const resolver = el('button.principal', {
        type: 'button', onclick: () => resolverItem(),
      }, 'Resolver');
      vaciar(acciones).append(resolver);

      if (ronda.msPorItem === null) {
        aviso.textContent = 'Cuando estén listos, que levanten las pizarras.';
        aviso.className = 'aviso turno';
        return;
      }

      clearInterval(cronometro);
      cronometro = setInterval(() => {
        if (!vivo || ronda.terminada) return clearInterval(cronometro);
        const quedan = ronda.msDelItem;
        if (quedan === null) return;
        if (quedan > 0) {
          cuenta.textContent = Math.ceil(quedan / 1000);
          cuenta.className = 'cuenta-atras corriendo';
        } else {
          clearInterval(cronometro);
          cuenta.textContent = '';
          aviso.textContent = '¡Arriba las pizarras!';
          aviso.className = 'aviso grande turno';
          resolver.focus();
        }
      }, 100);
    }

    /** Ya están arriba las pizarras: se enseña la respuesta y se van marcando. */
    function resolverItem() {
      clearInterval(cronometro);
      cuenta.textContent = '';
      const item = ronda.item;
      respuestas.resolver(item);
      // El círculo encoge al resolver: ya ha sonado, nadie lo va a pulsar
      // mientras se marcan las pizarras, y a 10rem en la pantalla proyectada son
      // 90 px que le hacen falta a la clasificación. `servir()` lo devuelve a su
      // tamaño con el ítem siguiente.
      banda.classList.add('compacta');

      // Proyectada, esta es la línea que mira la clase entera desde el fondo del
      // aula, así que va enorme y con el color de su cualidad.
      pintarAviso('resuelto bien',
                  el('span.solucion', {},
                     abreviatura(item.intervalo),
                     el('span.flecha', {}, item.direccion === 'asc' ? '↑' : '↓')),
                  alturas(item));

      const acertados = new Set();
      const tabla = el('div.clasificacion');

      const fichas = ronda.equipos.map((equipo) => el('button.equipo', {
        type: 'button',
        'aria-pressed': 'false',
        'aria-label': `${equipo.nombre}, ha acertado`,
        onclick: (evento) => {
          if (acertados.has(equipo.numero)) acertados.delete(equipo.numero);
          else acertados.add(equipo.numero);
          const marcado = acertados.has(equipo.numero);
          evento.currentTarget.classList.toggle('acertado', marcado);
          evento.currentTarget.setAttribute('aria-pressed', String(marcado));
          pintarClasificacion(tabla, acertados);
        },
      }, equipo.numero));

      const siguiente = el('button.principal', {
        type: 'button',
        onclick: () => {
          const resultado = ronda.responderEquipos([...acertados]);
          // Cada equipo es una respuesta de verdad, de alumnos de verdad, así
          // que las diez del ítem cuentan diez veces. Sin `respuesta`, porque en
          // el aula no se registra qué puso cada uno, solo si acertó.
          for (const equipo of resultado.equipos) {
            progreso.anotarRespuesta(params.juego, {
              intervalo: item.intervalo,
              direccion: item.direccion,
              acierto: equipo.acierto,
              respuesta: null,
              ms: 0,
            });
          }
          const proximo = ronda.siguiente();
          if (proximo) servir(proximo);
          else terminar();
        },
      }, 'Siguiente');

      vaciar(acciones).append(
        el('p.instruccion', {}, '¿Qué equipos la han acertado?'),
        el('div.equipos-fila', {}, fichas),
        tabla,
        el('div.par', {}, siguiente));
      pintarClasificacion(tabla, acertados);

      // En el concurso la canción es material de explicación: llega con la
      // corrección, delante de toda la clase, no antes de que respondan. Aparece
      // en la banda de arriba, en la misma esquina que en los otros tres modos,
      // aunque aquí la escena no cambie.
      pintarPista('corregir');
    }

    /** La clasificación, actualizándose mientras se marca. */
    function pintarClasificacion(tabla, acertados) {
      const provisional = ronda.equipos
        .map((e) => ({ ...e, aciertos: e.aciertos + (acertados.has(e.numero) ? 1 : 0) }))
        .sort((a, b) => b.aciertos - a.aciertos || a.numero - b.numero);
      const lider = provisional[0]?.aciertos ?? 0;

      vaciar(tabla).append(...provisional.map((e, i) => el('div.puesto', {
        clase: e.aciertos === lider && lider > 0 ? 'lider' : '',
      },
      el('span.pos', {}, `${i + 1}.`),
      el('span.quien', {}, e.nombre),
      el('span.tantos', {}, e.aciertos))));
    }

    // --- Comunes ------------------------------------------------------------

    function pintarAviso(clase, ...contenido) {
      vaciar(aviso);
      aviso.className = `aviso ${clase}`;
      añadir(aviso, contenido);
    }

    /**
     * La abreviatura del intervalo. Es la misma pieza que llevan los botones de
     * la cuadrícula, y a propósito: leerla aquí y buscarla allí tiene que ser el
     * mismo gesto.
     *
     * `propio` decide de qué color va. Con el de su cualidad donde la
     * abreviatura **identifica** un intervalo —la solución que se proyecta en el
     * Concurso—, y con el del veredicto donde lo que se lee es si está bien o
     * mal. Ver `comentario()`.
     */
    function abreviatura(id, { propio = true } = {}) {
      const intervalo = datos.intervalo(id);
      const nodo = el('strong.abrev', { title: intervalo.nombre }, intervalo.etiqueta);
      if (propio) nodo.style.setProperty('--color', datos.color(id));
      else nodo.classList.add('del-veredicto');
      return nodo;
    }

    /** Qué notas han sonado, en nomenclatura española. Letra pequeña: es el detalle. */
    function alturas(item) {
      return el('span.alturas', {}, item.notas.map(nombreEs).join(' → '));
    }

    /**
     * Espera a que se pulse un botón. Se suelta sola si se abandona la pantalla.
     *
     * `panel` va encima del botón de seguir. El orden no es casual: primero lo
     * que hay que mirar, y el botón de salir de ahí al final, donde no se pulsa
     * sin querer antes de haber mirado nada.
     */
    function esperarPulsacion(texto, { panel = null } = {}) {
      return new Promise((listo) => {
        const boton = el('button.principal', { type: 'button', onclick: () => listo() }, texto);
        // Por `añadir` y no por `append`: un panel que no existe —el juego que
        // no traiga pantalla de error— tiene que no pintar nada, y `append(null)`
        // escribe la palabra «null» en medio de la pantalla.
        añadir(vaciar(acciones), [panel, el('div.par', {}, boton)]);
        boton.focus();
        soltarEspera = listo;
      });
    }

    function pintarMarcador() {
      vaciar(marcador);
      if (modo === 'contrarreloj') {
        marcador.append(el('span.crono', {}, reloj(ronda.msRestantes)),
                        el('span.cuenta', {}, `${ronda.aciertos} aciertos`));
        // Este aviso comparte nodo con la corrección, y el cronómetro pasa por
        // aquí cinco veces por segundo: escribiéndolo en cada pasada, borraba el
        // «Era 8J, no 4J» del último ítem a los 200 ms de pintarlo. Y es justo el
        // ítem que la regla de no cortar a mitad de pregunta quería salvar. Así
        // que se dice una sola vez, y solo mientras quede algo que contestar.
        const pendiente = ronda.respondidos < ronda.numero;
        if (ronda.msRestantes === 0 && !ronda.terminada && pendiente && !avisadoDelTiempo) {
          avisadoDelTiempo = true;
          aviso.textContent = '¡Tiempo! Contesta este último y se acabó.';
          aviso.className = 'aviso turno';
        }
      } else {
        marcador.append(puntos(ronda));
      }
      // La racha es de quien juega solo: en el aula la lleva la clasificación.
      vaciar(racha);
      if (!porEquipos && ronda.racha > 1) {
        racha.append(el('span.llama', {}, '🔥'), el('span.numero', {}, ronda.racha));
        racha.className = `racha viva${ronda.racha >= 5 ? ' ardiendo' : ''}`;
      } else {
        racha.className = 'racha';
      }
    }

    function terminar() {
      clearInterval(cronometro);
      const resumen = ronda.resumen();
      const superado = Boolean(nivel) && modo === 'individual'
        && resumen.aciertos >= nivel.aciertos_para_superar;
      resumen.cierre = progreso.cerrarPartida(params.juego, {
        nivel: nivel?.id ?? null,
        modo,
        aciertos: resumen.aciertos,
        fallos: resumen.fallos,
        racha_max: resumen.racha_max,
        ms_total: resumen.ms_total,
        superado,
        ultimo_nivel: datos.ultimoNivel,
      });
      resumen.nivel_nombre = nivel ? `Nivel ${nivel.id} · ${nivel.nombre}` : null;
      resumen.aciertos_para_superar = nivel?.aciertos_para_superar ?? null;
      resumen.enlace_repetir = location.hash.slice(1);
      consola.ultimoResumen = resumen;
      ir(`/${params.juego}/resultados`, { reemplazar: true });
    }
  }
}

/**
 * Un número entero y positivo de la dirección, o el de por defecto.
 *
 * La partida entera viaja en la dirección para que quepa en un QR o en un
 * marcador, y eso significa que la dirección llega **rota** de vez en cuando: un
 * QR mal leído, un enlace que el correo parte por la mitad. Sin este filtro,
 * `Number('perro')` es `NaN` y el `NaN` se cuela hasta el final sin quejarse:
 * `equipos` daba una lista vacía y «Resolver» lanzaba, `plazo` mandaba levantar
 * las pizarras nada más sonar el intervalo, y `items` dejaba una partida que no
 * terminaba nunca, porque `10 >= NaN` es falso para siempre.
 */
function cuantos(consulta, clave, porDefecto) {
  if (!consulta.has(clave)) return porDefecto;
  const valor = Math.round(Number(consulta.get(clave)));
  return Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
}

/** Los puntitos de la cabecera del mockup: uno por ítem, encendidos los pasados. */
function puntos(ronda) {
  const fila = el('div.puntos', {
    role: 'img',
    'aria-label': `Ítem ${ronda.numero} de ${ronda.total}`,
  });
  for (let i = 1; i <= ronda.total; i++) {
    fila.append(el('span.punto', {
      clase: i <= ronda.respondidos ? 'hecho' : (i === ronda.numero ? 'ahora' : ''),
    }));
  }
  return fila;
}

/** «Equipo 1», «Equipo 2»… Números y no letras: es como se numeran los grupos. */
function nombresDeEquipos(cuantos) {
  return Array.from({ length: cuantos }, (unused, i) => `Equipo ${i + 1}`);
}

/** La cabecera de la preparación, con la vuelta a la pantalla de la que se vino. */
function cabeceraSimple(titulo, juego, modo) {
  const atras = eligeEn(modo) === 'nivel'
    ? `#/${juego}/niveles`
    : `#/${juego}/preparar?modo=${modo}`;
  return el('header.cabecera', {},
    el('a.atras', { href: atras }, eligeEn(modo) === 'nivel' ? '‹ Niveles' : '‹ Cambiar'),
    el('h2', {}, titulo));
}
