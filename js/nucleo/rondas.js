// El motor de rondas: una serie de ítems, un marcador y un reloj.
//
// No sabe qué es un intervalo. Recibe un `generar(numero, anterior)` que produce
// el ítem siguiente y un `comprobar(item, respuesta)` que dice si la respuesta
// vale, y con eso lleva la cuenta. Esa frontera es lo que hace que el Juego 2 y
// el Juego 3 hereden todo esto sin tocarlo: lo que cambia entre juegos es cómo
// se produce un ítem y qué pantalla lo responde, no cómo se lleva una racha.
//
// Las reglas de generación de los ítems de intervalos —que son del contrato de
// datos— viven en js/juegos/intervalos/items.js, que es de quien son.

/** Cuánto dura una partida a contrarreloj. Valor de partida, sin alumnos delante. */
export const MS_CONTRARRELOJ = 60_000;

export class Ronda {
  #generar;
  #comprobar;
  #items = [];          // los ítems servidos, en orden
  #respuestas = [];      // una por ítem contestado
  #t0 = null;            // arranque de la partida
  #servido = null;       // cuándo se puso en pantalla el ítem actual
  #escuchado = null;     // cuándo terminó de sonar la primera vez
  #racha = 0;
  #rachaMax = 0;
  #cerrada = false;

  /**
   * @param {object} config
   * @param {string} config.modo         'individual' | 'contrarreloj' | 'aula'
   * @param {?number} config.items       cuántos ítems; null si manda el reloj
   * @param {?number} config.limiteMs    tope de tiempo de la partida, o null
   * @param {?number} config.msPorItem   plazo para responder cada ítem, o null
   * @param {?string[]} config.equipos   nombres de los equipos, o null
   * @param {?number} config.nivel       nivel de la progresión, o null
   * @param {function} config.generar    (numero, anterior) => ítem
   * @param {function} config.comprobar  (ítem, respuesta) => booleano
   */
  constructor({ modo = 'individual', items = 10, limiteMs = null, msPorItem = null,
                equipos = null, nivel = null, juego = 'intervalos', generar, comprobar }) {
    if (typeof generar !== 'function') throw new Error('Una ronda necesita un generador de ítems.');
    if (items === null && limiteMs === null) {
      throw new Error('Una ronda sin número de ítems y sin límite de tiempo no termina nunca.');
    }
    this.modo = modo;
    this.juego = juego;
    this.nivel = nivel;
    this.total = items;
    this.limiteMs = limiteMs;
    this.msPorItem = msPorItem;
    this.equipos = equipos?.length
      ? equipos.map((nombre, i) => ({ numero: i + 1, nombre, aciertos: 0, fallos: 0 }))
      : null;
    this.#generar = generar;
    this.#comprobar = comprobar ?? ((item, respuesta) => item.respuestas_validas.includes(respuesta));
  }

  // --- Estado ---------------------------------------------------------------

  get comenzada() { return this.#t0 !== null; }
  get item() { return this.#items[this.#items.length - 1] ?? null; }
  get numero() { return this.#items.length; }
  get respondidos() { return this.#respuestas.length; }
  get racha() { return this.#racha; }
  get rachaMax() { return this.#rachaMax; }
  get terminada() { return this.#cerrada; }

  /** ¿Responde una persona o responden varios equipos a la vez? */
  get porEquipos() { return this.equipos !== null; }

  get aciertos() {
    if (this.porEquipos) return this.equipos.reduce((suma, e) => suma + e.aciertos, 0);
    return this.#respuestas.filter((r) => r.acierto).length;
  }

  get fallos() {
    if (this.porEquipos) return this.equipos.reduce((suma, e) => suma + e.fallos, 0);
    return this.#respuestas.length - this.aciertos;
  }

  /** Los equipos ordenados por aciertos: la clasificación en vivo. */
  get clasificacion() {
    if (!this.porEquipos) return null;
    return [...this.equipos].sort((a, b) => b.aciertos - a.aciertos || a.fallos - b.fallos);
  }

  /** Milisegundos que quedan, o `null` si esta ronda no va contra el reloj. */
  get msRestantes() {
    if (this.limiteMs === null) return null;
    if (!this.comenzada) return this.limiteMs;
    return Math.max(0, this.limiteMs - (performance.now() - this.#t0));
  }

  /**
   * Milisegundos que le quedan al ítem en pantalla, o `null` si este juego no
   * pone plazo a cada ítem.
   *
   * Es distinto de `msRestantes`, que mide la partida entera: el contrarreloj
   * pone plazo a la partida y el modo de aula se lo pone a cada pregunta. En el
   * aula ese plazo no es adorno: es lo que obliga a que todos los equipos se
   * comprometan **en el mismo instante**, y sin eso el segundo equipo copia al
   * primero.
   */
  get msDelItem() {
    const desde = this.#escuchado;
    if (this.msPorItem === null || desde === null) return null;
    return Math.max(0, this.msPorItem - (performance.now() - desde));
  }

  // --- El ciclo -------------------------------------------------------------

  comenzar() {
    this.#t0 = performance.now();
    return this.siguiente();
  }

  /**
   * El ítem siguiente, o `null` si la ronda ha terminado.
   *
   * A contrarreloj el reloj se mira **aquí**, al pedir uno nuevo, y no mientras
   * se contesta: si el minuto se acaba con un ítem en pantalla, ese ítem se
   * termina de contestar. Cortar a mitad de una pregunta ya escuchada se vive
   * como una injusticia y no mide nada mejor.
   */
  siguiente() {
    if (this.#cerrada) return null;
    if (this.total !== null && this.#items.length >= this.total) return this.#cerrar();
    if (this.msRestantes === 0) return this.#cerrar();

    const item = this.#generar(this.#items.length + 1, this.item);
    this.#items.push(item);
    this.#servido = performance.now();
    this.#escuchado = null;
    return item;
  }

  /**
   * El estímulo ha terminado de sonar. A partir de aquí cuenta el tiempo de
   * respuesta, que es lo que se guarda en `ms_total`.
   *
   * Sin esto, el tiempo de cada ítem incluiría los tres segundos que tarda el
   * intervalo en sonar y mediría el reproductor en vez del alumno. Se puede
   * llamar de más: solo cuenta la primera vez de cada ítem, porque repetir la
   * escucha es parte de pensar la respuesta.
   */
  escuchado() {
    this.#escuchado ??= performance.now();
  }

  /**
   * Responde el ítem en pantalla. Devuelve qué ha pasado, sin tocar el progreso:
   * guardar es de quien llama, que es quien sabe en qué juego está.
   */
  responder(respuesta) {
    const item = this.#pendiente();
    const acierto = this.#comprobar(item, respuesta);
    const ms = Math.round(performance.now() - (this.#escuchado ?? this.#servido));

    this.#racha = acierto ? this.#racha + 1 : 0;
    this.#rachaMax = Math.max(this.#rachaMax, this.#racha);

    const resultado = { item, respuesta, acierto, ms };
    this.#respuestas.push(resultado);
    return resultado;
  }

  /**
   * Cierra el ítem en el modo de aula, donde **todos los equipos oyen el mismo
   * intervalo y responden a la vez**. `acertados` son los números de equipo
   * —1, 2, 3…— que lo tienen bien; los demás cuentan como fallo.
   *
   * Que respondan a la vez y no por turnos es lo que hace comparables a los
   * equipos: con turnos, a uno pueden tocarle los tres fáciles y a otro los tres
   * difíciles, y la clasificación mide la suerte del reparto. Además participa
   * la clase entera en cada ítem en vez de una décima parte.
   *
   * No se guarda **qué** contestó cada equipo, solo si acertó: el profesor lee N
   * pizarras y toca N números, y pedirle que además busque doce botones por
   * equipo convertiría cinco segundos en un minuto. La consecuencia es que el
   * aula no alimenta `confusiones`, y está asumida.
   */
  responderEquipos(acertados) {
    if (!this.porEquipos) throw new Error('Esta ronda no se juega por equipos.');
    const item = this.#pendiente();
    const aciertaN = new Set(acertados);

    const detalle = this.equipos.map((equipo) => {
      const acierto = aciertaN.has(equipo.numero);
      equipo[acierto ? 'aciertos' : 'fallos']++;
      return { numero: equipo.numero, nombre: equipo.nombre, acierto };
    });

    const resultado = { item, respuesta: null, acierto: null, ms: 0, equipos: detalle };
    this.#respuestas.push(resultado);
    return resultado;
  }

  #pendiente() {
    const item = this.item;
    if (!item) throw new Error('No hay ningún ítem que responder.');
    if (this.#respuestas.length >= this.#items.length) {
      throw new Error(`El ítem ${item.numero} ya está contestado.`);
    }
    return item;
  }

  #cerrar() {
    this.#cerrada = true;
    return null;
  }

  /** Cerrar antes de tiempo, cuando el alumno se sale de la partida. */
  abandonar() {
    this.#cerrar();
  }

  /**
   * Lo que hay que contar al terminar: la mitad va a la pantalla de resultados y
   * la otra mitad a `progreso.cerrarPartida()`.
   */
  resumen() {
    // Por equipos, cada ítem se despliega en una respuesta por equipo. Así el
    // desglose por par intervalo/dirección de la pantalla de resultados sale
    // igual en los cuatro modos —«la clase acertó la 6m descendente 12 de 30»—
    // sin que esa pantalla tenga que saber cómo se ha jugado.
    const respuestas = this.#respuestas.flatMap((r) => {
      const donde = { intervalo: r.item.intervalo, direccion: r.item.direccion };
      if (!r.equipos) return [{ ...donde, respuesta: r.respuesta, acierto: r.acierto, ms: r.ms }];
      return r.equipos.map((e) => ({ ...donde, respuesta: null, acierto: e.acierto, ms: 0, equipo: e.numero }));
    });

    return {
      juego: this.juego,
      nivel: this.nivel,
      modo: this.modo,
      items: this.respondidos,
      aciertos: this.aciertos,
      fallos: this.fallos,
      racha_max: this.#rachaMax,
      ms_total: this.#respuestas.reduce((suma, r) => suma + r.ms, 0),
      equipos: this.equipos ? this.equipos.map((e) => ({ ...e })) : null,
      respuestas,
    };
  }
}
