// El progreso del alumno, en su propio dispositivo.
//
// Un solo objeto bajo la clave `emd.progreso.v1`, un solo JSON.parse al
// arrancar. Sin servidor y sin datos personales: no hay nombre, ni
// identificador, ni nada que permita saber de quién es esto. Ver
// docs/contrato_datos.md, apartado 5.
//
// La unidad de medida de todo el juego es el par intervalo/dirección —la clave
// «3m|asc»—, porque la 6ª ascendente y la descendente son dos habilidades
// distintas y todo el diseño parte de ahí.

export const CLAVE = 'emd.progreso.v1';
export const VERSION = 1;

/**
 * Qué modos mueven la progresión de niveles.
 *
 * Los cuatro alimentan `estadisticas` y `confusiones` —oír un intervalo es oír
 * un intervalo, lo mande quien lo mande—, pero solo el individual mueve
 * `nivel_actual`. En el modo de aula responde el profesor por el grupo, y en la
 * práctica libre el alumno elige lo que le conviene practicar: ninguno de los
 * dos dice si un nivel está superado.
 */
const MODOS_QUE_PROGRESAN = ['individual'];

/** La clave de la unidad de medida. Un único sitio donde se compone. */
export const par = (intervalo, direccion) => `${intervalo}|${direccion}`;

const AJUSTES_POR_DEFECTO = { tema: 'auto', volumen: 0.8 };

function juegoVacio() {
  return {
    nivel_actual: 1,
    niveles_superados: [],
    mejor_racha: 0,
    items_jugados: 0,
    estadisticas: {},
    confusiones: {},
    ultima_partida: null,
  };
}

/**
 * Almacén de repuesto para cuando `localStorage` no está.
 *
 * En modo privado de Safari escribir lanza, y en un aula se juega con lo que
 * cada uno lleve en el bolsillo. Sin esto, el juego se caería al primer acierto
 * en el móvil de alguien; con esto, funciona toda la partida y solo se pierde al
 * cerrar. Es la degradación correcta: lo que importa es la clase, no el registro.
 */
function almacenDeMemoria() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    volatil: true,
  };
}

function almacenDisponible() {
  try {
    const prueba = `${CLAVE}.prueba`;
    localStorage.setItem(prueba, '1');
    localStorage.removeItem(prueba);
    return localStorage;
  } catch {
    return almacenDeMemoria();
  }
}

export class Progreso {
  #almacen;
  #datos;

  constructor(almacen = almacenDisponible()) {
    this.#almacen = almacen;
    this.#datos = this.#leer();
  }

  /** ¿Se está guardando de verdad, o solo hasta cerrar la pestaña? */
  get persiste() {
    return !this.#almacen.volatil;
  }

  #leer() {
    let guardado = null;
    try {
      guardado = JSON.parse(this.#almacen.getItem(CLAVE) || 'null');
    } catch {
      // Un objeto corrupto no debe impedir jugar. Se empieza de cero.
      guardado = null;
    }
    if (!guardado || guardado.version !== VERSION) {
      // Aquí irá la migración el día que la versión cambie: leer la vieja,
      // convertirla y escribir la nueva. Hoy solo hay una versión.
      return { version: VERSION, actualizado: null, ajustes: { ...AJUSTES_POR_DEFECTO }, juegos: {} };
    }
    guardado.ajustes = { ...AJUSTES_POR_DEFECTO, ...guardado.ajustes };
    guardado.juegos ??= {};
    return guardado;
  }

  #guardar() {
    this.#datos.actualizado = new Date().toISOString();
    try {
      this.#almacen.setItem(CLAVE, JSON.stringify(this.#datos));
    } catch {
      // Cuota llena o permisos: se sigue jugando con lo que hay en memoria.
    }
  }

  /** Copia de lo guardado, para mirarlo o exportarlo. */
  get instantanea() {
    return structuredClone(this.#datos);
  }

  // --- Ajustes --------------------------------------------------------------

  get ajustes() {
    return { ...this.#datos.ajustes };
  }

  ajustar(cambios) {
    Object.assign(this.#datos.ajustes, cambios);
    this.#guardar();
    return this.ajustes;
  }

  // --- Un juego -------------------------------------------------------------

  /** El progreso de un juego, creándolo vacío la primera vez. */
  deJuego(juego) {
    this.#datos.juegos[juego] ??= juegoVacio();
    return this.#datos.juegos[juego];
  }

  /** Aciertos, fallos y tiempo de un par intervalo/dirección. */
  estadistica(juego, intervalo, direccion) {
    return this.deJuego(juego).estadisticas[par(intervalo, direccion)]
      ?? { aciertos: 0, fallos: 0, ms_total: 0 };
  }

  /**
   * Cuántas veces se ha contestado `respuesta` donde sonaba este par.
   *
   * Es la lectura de `confusiones`, que se guarda desde la Fase 1 y hasta la
   * Fase 4 no se leía en ningún sitio. La pantalla de error la usa para decir
   * «es la 3.ª vez que dices 4J cuando suena 5J», que era exactamente la frase
   * que el contrato de datos prometía al elegir guardar **qué se contestó en vez
   * de qué**. El reparto adaptativo de la Fase 6 leerá lo mismo.
   */
  confusion(juego, intervalo, direccion, respuesta) {
    return this.deJuego(juego).confusiones[par(intervalo, direccion)]?.[respuesta] ?? 0;
  }

  /** ¿Está abierto este nivel? El siguiente al último superado, y los pasados. */
  nivelAbierto(juego, nivel) {
    return nivel <= this.deJuego(juego).nivel_actual;
  }

  // --- Lo que escribe el motor de rondas ------------------------------------

  /**
   * Una respuesta, acertada o no.
   *
   * Cuando se falla se guarda además **qué se contestó en vez de qué**. Ese es
   * el dato que hace posible la pantalla de error inteligente («otra vez has
   * confundido la 3m con la 3M») y el reparto adaptativo fino de la Fase 6.
   * Cuesta cuatro líneas guardarlo ahora y obligaría a rehacer el esquema si se
   * dejara para después.
   */
  anotarRespuesta(juego, { intervalo, direccion, acierto, respuesta, ms = 0 }) {
    const datos = this.deJuego(juego);
    const clave = par(intervalo, direccion);

    const est = (datos.estadisticas[clave] ??= { aciertos: 0, fallos: 0, ms_total: 0 });
    est[acierto ? 'aciertos' : 'fallos']++;
    est.ms_total += Math.round(ms);
    datos.items_jugados++;

    if (!acierto && respuesta) {
      const confusion = (datos.confusiones[clave] ??= {});
      confusion[respuesta] = (confusion[respuesta] ?? 0) + 1;
    }

    this.#guardar();
  }

  /**
   * El final de una partida. Devuelve qué ha cambiado, para poder contarlo en la
   * pantalla de resultados.
   *
   * `superado` lo decide quien llama, que es quien tiene delante el nivel y su
   * `aciertos_para_superar`. Aquí se decide lo otro: si ese resultado mueve o no
   * la progresión, que depende solo del modo.
   */
  cerrarPartida(juego, { nivel = null, modo, aciertos, fallos, racha_max = 0,
                         ms_total = 0, superado = false, ultimo_nivel = Infinity }) {
    const datos = this.deJuego(juego);
    datos.ultima_partida = {
      nivel, modo, fecha: new Date().toISOString(), aciertos, fallos, racha_max, ms_total,
    };
    datos.mejor_racha = Math.max(datos.mejor_racha, racha_max);

    const progresa = MODOS_QUE_PROGRESAN.includes(modo) && superado && nivel !== null;
    let desbloqueado = null;
    if (progresa) {
      if (!datos.niveles_superados.includes(nivel)) {
        datos.niveles_superados = [...datos.niveles_superados, nivel].sort((a, b) => a - b);
      }
      // Solo abre el siguiente si se acaba de superar el nivel al que se había
      // llegado. Repetir el 2 cuando ya se está en el 5 no adelanta nada.
      if (nivel === datos.nivel_actual && nivel < ultimo_nivel) {
        datos.nivel_actual = nivel + 1;
        desbloqueado = datos.nivel_actual;
      }
    }

    this.#guardar();
    return { superado, progresa, desbloqueado, mejor_racha: datos.mejor_racha };
  }

  // --- Borrar ---------------------------------------------------------------

  /** Empezar de cero. La única forma de que el alumno se quite el progreso. */
  borrar() {
    const ajustes = this.ajustes;   // los ajustes no son progreso: se conservan
    this.#datos = { version: VERSION, actualizado: null, ajustes, juegos: {} };
    this.#guardar();
  }
}
