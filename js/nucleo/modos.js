// Los cuatro modos de juego, en un único sitio.
//
// El `id` es el que viaja en la dirección, el que se guarda en el progreso y el
// que decide el contrato de datos; el `nombre` es lo que lee el alumno. Son dos
// cosas distintas a propósito, como el `id` y la `etiqueta` de un intervalo:
// cambiar cómo se llama un modo en pantalla no puede invalidar las partidas ya
// guardadas ni los enlaces que alguien tenga en un marcador.
//
// Van en dos familias, y esa es la respuesta a «no veo bien los modos»:
//
//   · **Práctica** está fuera de la progresión y es la única donde el alumno
//     elige qué suena.
//   · **Reto, Contrarreloj y Concurso** son tres formas de jugar un mismo nivel
//     de la progresión, y en las tres el nivel manda: no se elige nada.
//
// De ahí que en el reto no se pueda elegir el intervalo, que es lo que más
// desconcierta al llegar: el reto es el nivel tal como viene.

/**
 * Cuándo se puede pedir la pista en cada modo.
 *
 *   `siempre`      · disponible durante todo el ítem
 *   `tras-fallar`  · solo cuando ya se ha fallado, en la escena de corregir
 *   `al-resolver`  · cuando el profesor destapa la respuesta ante la clase
 *   `nunca`        · no aparece
 *
 * La regla que hay detrás: donde se **mide** la ayuda no puede llegar antes de
 * la respuesta, o el nivel se supera pidiéndola cada vez. Donde se **entrena**
 * —la práctica— sí. Y en el concurso es material de explicación para el
 * profesor, así que llega con la corrección.
 *
 * **Esto es el cuándo, no el dónde.** Hasta el 04/08/2026 eran la misma decisión
 * y el botón salía en tres sitios distintos según el modo; ahora el sitio es uno
 * —la banda del estímulo, a la izquierda del círculo— y aquí solo se decide si
 * está. Ver `pantallas/partida.js`.
 *
 * El caso del **contrarreloj** hay que repensarlo aparte, porque su motivo
 * cambió el 03/08/2026 y el que había escrito dejó de ser cierto: desde que solo
 * el Reto usa niveles, el contrarreloj **no mide nada que se gaste** —no abre
 * niveles—, así que «donde se mide» ya no lo cubre. Y su marca tampoco se
 * inflaría: la canción dura varios segundos, o sea que pedirla ya se cobra sola
 * en ítems perdidos. Sigue en `nunca` por un motivo distinto y más simple: **ahí
 * no da tiempo a usarla**. Oír una melodía, reconocerla y deducir de ella el
 * salto no cabe en el ritmo de ese modo, y un botón que existe pero no se puede
 * aprovechar estorba más que ayuda.
 */

/**
 * Cómo se sortean los ítems en cada modo.
 *
 *   `adaptativo` · los pares que el alumno falla salen más, hasta unas tres
 *                  veces más que los que acierta siempre
 *   `uniforme`   · todos los pares del nivel con la misma probabilidad
 *
 * La regla que hay detrás es **la misma que la de la pista**, aplicada al
 * sorteo: donde se entrena, el juego ayuda; donde se mide, no. Y aquí «ayudar»
 * tiene una consecuencia que costó ver:
 *
 * **Un reparto adaptativo en el Reto endurecería el nivel según el alumno
 * mejora.** `aciertos_para_superar` es 8 de 10 y no se mueve, así que si el
 * sorteo sirviera sobre todo los pares flojos, ese 8 significaría «8 de tus
 * peores» en vez de «8 del nivel». Y como el algoritmo persigue el punto débil
 * de cada momento, la exigencia se recolocaría cada vez que el alumno progresa:
 * se puede uno quedar atascado mejorando. Además dos alumnos con el mismo 8 de
 * 10 no habrían hecho el mismo examen, y el Reto es lo que abre niveles.
 *
 * Por eso el Contrarreloj y el Concurso también reparten uniforme, cada uno por
 * su motivo: el contrarreloj es una marca —cuántos en un minuto— y una marca con
 * ítems distintos cada vez no se puede comparar con la anterior; y en el
 * concurso el progreso guardado es el del aparato del profesor, que no dice nada
 * de lo que falla la clase.
 *
 * Decidido el 01/08/2026, Fase 6.
 */
/**
 * Qué hay que elegir antes de jugar, que es lo que ordena la consola desde el
 * 03/08/2026.
 *
 *   `nivel`       · la progresión manda: sus intervalos, su dirección, su
 *                   registro y sus candados
 *   `intervalos`  · elige quien juega, con la cuadrícula de la Práctica y el
 *                   registro más ancho
 *
 * **Solo el Reto usa niveles, porque solo el Reto los mueve.** Antes los tres
 * modos que miden colgaban de un nivel, y eso obligaba a entrar por un nivel
 * desbloqueado para llegar a cualquiera de ellos: en el portátil del aula solo
 * se podía lanzar el Concurso del nivel 1, y para dar clase con el 5 había que
 * sentarse a superar el Reto cuatro veces en ese aparato. El candado tenía
 * sentido en el modo que abre niveles y en ningún otro.
 *
 * Para el Contrarreloj y el Concurso la progresión no desaparece, cambia de
 * sitio: el atajo «O los de un nivel» de la pantalla de configuración carga los
 * intervalos y la dirección de cualquiera de los siete, sin pedir permiso.
 */

/**
 * Qué termina la partida.
 *
 *   `items` · un número de ítems, que se elige o lo pone el nivel
 *   `reloj` · el minuto del contrarreloj, y los ítems que entren
 */
/**
 * Cada modo se describe dos veces, y no es repetirse: son dos sitios distintos.
 *
 *   `resumen` · una línea, para la tarjeta de la pantalla de modos. Ahí las
 *               cuatro tarjetas compiten por el alto de un teléfono, y con tres
 *               renglones cada una **la cuarta se quedaba fuera de la pantalla**:
 *               el precio de explicarlas era no ver una de las cuatro.
 *   `detalle` · la explicación entera, para la pantalla de preparar, donde ya se
 *               ha elegido el modo y hay sitio de sobra para contarlo.
 *
 * Es la misma idea que el `resumen` de un juego frente a su portada: en la
 * pantalla donde se elige se lee lo justo para elegir, y lo demás espera a que
 * haya elegido.
 */
export const MODOS = {
  libre: {
    id: 'libre',
    nombre: 'Práctica',
    orden: 1,
    resumen: 'Eliges tú qué suena y en qué dirección.',
    detalle: 'Eliges tú qué intervalos suenan y en qué dirección. Para estudiar por tu '
      + 'cuenta lo que te haga falta.',
    pista: 'siempre',
    reparto: 'adaptativo',
    elige: 'intervalos',
    duracion: 'items',
    porEquipos: false,
  },
  individual: {
    id: 'individual',
    nombre: 'Reto',
    orden: 2,
    // Dicho en imperativo y por lo que se hace, no por lo que el modo es. Las
    // dos versiones anteriores describían el mecanismo —«el nivel tal como
    // viene», «los intervalos los pone el nivel y no hay reloj»— y las dos
    // fallaban en lo mismo: **explicaban «nivel» a quien todavía no sabe qué es
    // un nivel aquí**. Esta no lo explica, lo enseña: dice qué hacer y qué pasa
    // si lo haces, y de ahí se deduce solo que hay una escalera.
    resumen: 'Supera un nivel para pasar al siguiente.',
    detalle: 'Los ítems del nivel, sin reloj y sin elegir nada. Es el único modo que abre '
      + 'el nivel siguiente.',
    pista: 'tras-fallar',
    reparto: 'uniforme',
    elige: 'nivel',
    duracion: 'items',
    porEquipos: false,
  },
  contrarreloj: {
    id: 'contrarreloj',
    nombre: 'Contrarreloj',
    orden: 3,
    resumen: 'Un minuto, los ítems que entren.',
    detalle: 'Un minuto, los ítems que entren. Cuenta para las estadísticas, pero no abre '
      + 'niveles ni da tiempo a oír canciones.',
    pista: 'nunca',
    reparto: 'uniforme',
    elige: 'intervalos',
    duracion: 'reloj',
    porEquipos: false,
  },
  aula: {
    id: 'aula',
    // El paréntesis no es una aclaración, es una señal de a quién no le toca:
    // un alumno practicando en casa abría «Concurso» y se encontraba una
    // pantalla para diez equipos con pizarra. El detalle lo explicaba; la
    // etiqueta, no, y la etiqueta es lo que se lee.
    nombre: 'Concurso (en el aula)',
    orden: 4,
    resumen: 'Proyectado en clase, por equipos.',
    detalle: 'Proyectado en clase: suena una vez, todos los equipos responden a la vez en '
      + 'su pizarra y el profesor registra quién ha acertado. No mueve el progreso de nadie.',
    pista: 'al-resolver',
    reparto: 'uniforme',
    elige: 'intervalos',
    duracion: 'items',
    porEquipos: true,
  },
};

/**
 * Equipos que caben en el Concurso. Diez son diez pizarras que mirar.
 *
 * Vive aquí y no en la pantalla de la partida desde que la configuración del
 * Concurso se elige antes de entrar: es un dato del modo, no del bucle de juego.
 */
export const MAX_EQUIPOS = 10;

/** Plazos por ítem que se ofrecen en el Concurso. `null` es «sin reloj, mando yo». */
export const PLAZOS = [10, 15, 20, 30, null];

/** Qué hay que elegir antes de jugar en este modo. Ver arriba. */
export const eligeEn = (id) => MODOS[id]?.elige ?? 'intervalos';

/** Si la partida la termina un número de ítems o el reloj. */
export const duracionEn = (id) => MODOS[id]?.duracion ?? 'items';

/** Si responden equipos en sus pizarras en vez de una persona en la pantalla. */
export const porEquiposEn = (id) => MODOS[id]?.porEquipos === true;

/** Los cuatro, en el orden en que se presentan. */
export const TODOS = Object.values(MODOS).sort((a, b) => a.orden - b.orden);

export const nombreModo = (id) => MODOS[id]?.nombre ?? id;

export const pistaEn = (id) => MODOS[id]?.pista ?? 'nunca';

/**
 * Cómo reparte este modo. Un modo desconocido reparte uniforme, que es la
 * opción que no ayuda: si algún día se añade un modo y se olvida declararlo,
 * el fallo será que no adapta, y no que regala un nivel.
 */
export const repartoEn = (id) => MODOS[id]?.reparto ?? 'uniforme';
