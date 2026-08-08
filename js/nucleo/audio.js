// Reproductor de piano sobre las 48 muestras de web/audio/piano/.
//
// Recibe notas MIDI y las toca. No sabe qué es un intervalo ni una canción: eso
// lo decide quien llama. Lo único que aporta encima de las muestras es la
// articulación —la caída al soltar la tecla, que las muestras no traen, porque
// se grabaron sin apagadores— y la programación temporal.
//
// Las constantes de esta cabecera están medidas, no elegidas de oído:
//
//     python Piloto_videojuego/herramientas/medir_muestras.py
//
// Si se toca alguna hay que volver a pasar el script, y después escuchar
// pruebas/audio.html. Ver docs/reproductor.md.

import { MIDI_MIN, MIDI_MAX, enRegistro, notasDe } from './alturas.js';

// --- Articulación -----------------------------------------------------------
// Al soltar la tecla, el reproductor aplica la misma caída exponencial que se
// usó en motor_audio/comparar_muestras.py para elegir este banco: es el sonido
// que se escuchó antes de decidir.

/** Constante de tiempo de la caída al soltar, en segundos. −20 dB en 0,37 s. */
const TAU_SOLTAR = 0.16;

/** Cuánto se deja sonar tras soltar antes de cortar la fuente: −43 dB. */
const COLA = 5 * TAU_SOLTAR;

/** Bajada recta final, para que al cortar la fuente no quede un chasquido. */
const RAMPA_FINAL = 0.02;

// --- Tiempos por defecto ----------------------------------------------------

/** Tecla mantenida en una nota que no es la última de la frase. */
const PULSACION = 1.10;

/** La última nota se deja resonar más, que es como se toca un final. */
const PULSACION_FINAL = 2.0;

/**
 * De ataque a ataque entre las dos notas de un intervalo melódico.
 *
 * Subida de 0,90 a 1,15 s el 31/07/2026, con alumnos de primero en la cabeza:
 * 0,90 iba justo para oír, medir y decidir. En tempo, negras a 52.
 *
 * **Hay un techo, y no es de comodidad.** Pasados 1,3-1,5 s entre ataques, las
 * dos notas dejan de oírse como un salto y se oyen como dos sonidos sueltos, y
 * entonces el intervalo cuesta más de reconocer, no menos: lo que se reconoce es
 * la distancia entre ellas, y para medirla hay que percibirlas como un gesto. Si
 * hace falta más lento en los primeros niveles, es un dato por nivel —Fase 6—,
 * no un número más grande aquí.
 *
 * `PULSACION` acompaña: la primera tecla se suelta 0,05 s antes de que entre la
 * segunda, como antes, para que la articulación solo se estire y no cambie de
 * carácter.
 */
const SEPARACION = 1.15;

/** Margen para programar sin que el instante caiga en el pasado. */
const ADELANTO = 0.06;

// --- Nivel ------------------------------------------------------------------

/**
 * Ganancia única para todo el banco.
 *
 * Las muestras vienen a −20 dBFS: el pico más alto de las 48 es 0,097. Con esta
 * ganancia, el peor caso de suma que puede producir el juego —una canción de
 * referencia, donde se solapan varias notas— queda en 0,89, justo por debajo de
 * saturar. Medido con medir_muestras.py y contrastado con `ffmpeg volumedetect`.
 *
 * Es una sola ganancia a propósito. Igualar los picos nota a nota igualaría
 * también el equilibrio entre el grave y el agudo, que es parte del
 * instrumento.
 */
const GANANCIA_MAESTRA = 6.19;

/** Milisegundos de bajada al callar. Corto, pero no tanto como para chasquear. */
const MS_CALLAR = 30;

/** Descargas simultáneas durante la precarga. */
const DESCARGAS_A_LA_VEZ = 6;

const RAIZ_MUESTRAS = new URL('../../audio/piano/', import.meta.url);

// --- El plan ----------------------------------------------------------------
// Un plan es la lista de qué nota suena, cuándo y cuánto se mantiene: la pieza
// entera de información temporal, en forma de dato. El reproductor lo toca y el
// banco de pruebas lo mide, así que lo que se mide no puede desviarse de lo que
// suena.

/** Una nota sola. */
export function planNota(midi, { pulsacion = PULSACION_FINAL, ganancia = 1 } = {}) {
  return [{ midi, cuando: 0, pulsacion, ganancia }];
}

/**
 * Un intervalo melódico: dos notas seguidas, en el orden en que se reciben.
 *
 * El reproductor no sabe si eso es una tercera menor ascendente. Recibe
 * `item.notas` —que el contrato de datos ya deja resueltas— y las toca.
 */
export function planIntervalo([primera, segunda],
                              { separacion = SEPARACION, ganancia = 1 } = {}) {
  return [
    { midi: primera, cuando: 0, pulsacion: PULSACION, ganancia },
    { midi: segunda, cuando: separacion, pulsacion: PULSACION_FINAL, ganancia },
  ];
}

/**
 * Una canción de referencia: notas ya transportadas, duraciones en pulsos de
 * negra y tempo en negras por minuto, tal como vienen de canciones.json.
 *
 * Cada tecla se mantiene el valor de su figura y se suelta cuando entra la
 * siguiente. **También la última**: al soltarla le queda la cola de los
 * apagadores, que es lo que hace que un final no se corte en seco.
 *
 * Aquí hubo un error que se oía y no se veía. La última nota se dejaba sonar
 * 2 segundos fijos, ignorando su figura, y así toda canción acababa con una
 * redonda que no estaba escrita. Con notas todas iguales apenas se nota; en
 * cuanto la última es corta, el final suena mal. Una canción de referencia es
 * un dato musical y el reproductor no tiene voto sobre su ritmo.
 */
export function planMelodia(notas, duraciones, tempo, { ganancia = 1 } = {}) {
  const pulso = 60 / tempo;
  let cuando = 0;
  return notas.map((midi, i) => {
    const evento = { midi, cuando, pulsacion: duraciones[i] * pulso, ganancia };
    cuando += duraciones[i] * pulso;
    return evento;
  });
}

/**
 * El piano del juego.
 *
 * Uso mínimo:
 *
 *     const piano = new Piano();
 *     boton.addEventListener('click', async () => {
 *       await piano.despertar();              // desde un gesto del usuario
 *       await piano.tocarIntervalo([60, 64]);
 *     });
 */
export class Piano {
  #ctx = null;
  #propio = true;            // ¿creamos nosotros el contexto?
  #maestro = null;
  #muestras = new Map();     // midi -> AudioBuffer | Promise<AudioBuffer>
  #vivas = new Set();        // voces sonando ahora mismo
  #volumen;
  #raiz;
  #generacion = 0;           // sube al callar; invalida lo que quedara en marcha

  /**
   * `contexto` solo lo usa el banco de pruebas, para renderizar en un
   * OfflineAudioContext y medir el resultado. El juego no lo pasa.
   */
  constructor({ raiz = RAIZ_MUESTRAS, volumen = 0.8, contexto = null } = {}) {
    this.#raiz = raiz;
    this.#volumen = volumen;
    if (contexto) {
      this.#ctx = contexto;
      this.#propio = false;
      this.#crearMaestro();
    }
  }

  // --- Estado ---------------------------------------------------------------

  /** ¿Puede sonar ya? Falso mientras no haya habido un gesto del usuario. */
  get despierto() {
    if (!this.#ctx) return false;
    return this.#propio ? this.#ctx.state === 'running' : true;
  }

  get volumen() {
    return this.#volumen;
  }

  /** De 0 a 1. Se aplica al instante, con una rampa corta para no chasquear. */
  set volumen(v) {
    this.#volumen = Math.min(1, Math.max(0, v));
    if (this.#maestro) {
      const t = this.#ctx.currentTime;
      this.#maestro.gain.cancelScheduledValues(t);
      this.#maestro.gain.setTargetAtTime(GANANCIA_MAESTRA * this.#volumen, t, 0.01);
    }
  }

  /** Para la pantalla de carga y el banco de pruebas. */
  get estado() {
    return {
      contexto: this.#ctx ? this.#ctx.state : 'sin crear',
      frecuencia: this.#ctx ? this.#ctx.sampleRate : null,
      cargadas: [...this.#muestras.keys()].filter((m) => this.cargada(m)).length,
      sonando: this.#vivas.size,
    };
  }

  cargada(midi) {
    const m = this.#muestras.get(midi);
    return m !== undefined && !(m instanceof Promise);
  }

  // --- Arranque -------------------------------------------------------------

  /**
   * Abre el audio. **Hay que llamarlo desde el manejador de un gesto del
   * usuario** —un click o un toque—: en iOS y en Chrome no suena nada hasta que
   * el usuario ha tocado la pantalla, y un contexto creado fuera de un gesto
   * nace suspendido. Si el juego lo llama al cargar la página, no sonará nada y
   * además la primera espera se quedará colgada esperando el permiso.
   *
   * Es idempotente: llamarlo de más no cuesta nada.
   */
  async despertar() {
    if (!this.#propio) return true;      // contexto prestado: manda quien lo prestó

    if (!this.#ctx) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) throw new Error('Este navegador no tiene Web Audio.');
      this.#ctx = new Contexto({ latencyHint: 'interactive' });
      this.#crearMaestro();
    }
    if (this.#ctx.state !== 'running') await this.#ctx.resume();

    // El desbloqueo clásico de iOS: un buffer mudo de una sola muestra. Sin él,
    // algunas versiones dejan el contexto en «running» pero mudo hasta que ha
    // sonado algo dentro del propio gesto.
    const mudo = this.#ctx.createBufferSource();
    mudo.buffer = this.#ctx.createBuffer(1, 1, this.#ctx.sampleRate);
    mudo.connect(this.#maestro);
    mudo.start();

    return this.despierto;
  }

  #crearMaestro() {
    this.#maestro = this.#ctx.createGain();
    this.#maestro.gain.value = GANANCIA_MAESTRA * this.#volumen;
    this.#maestro.connect(this.#ctx.destination);
  }

  // --- Muestras -------------------------------------------------------------

  /**
   * Deja listas las notas que se van a necesitar. Devuelve cuántas descargó.
   *
   * No es obligatorio: tocar una nota que no esté cargada la descarga primero.
   * Precargar solo evita el retraso de la primera vez.
   */
  async precargar(notas) {
    const pendientes = [...new Set(notas)].filter((m) => enRegistro(m) && !this.cargada(m));
    if (pendientes.length && !this.#ctx) await this.despertar();
    for (let i = 0; i < pendientes.length; i += DESCARGAS_A_LA_VEZ) {
      await Promise.all(pendientes.slice(i, i + DESCARGAS_A_LA_VEZ).map((m) => this.#muestra(m)));
    }
    return pendientes.length;
  }

  /**
   * Precarga el registro de un nivel: `piano.precargarRegistro(nivel.registro)`.
   *
   * Es la política de la Fase 2, y cierra lo que el contrato de datos dejaba
   * abierto: **se carga al entrar en un nivel, no al arrancar el juego**. El
   * banco entero pesa 1,1 MB y cabría de una vez, pero el menú no necesita
   * sonar, y el registro de los primeros niveles es la mitad del banco. Lo que
   * falte se descarga solo, así que equivocarse aquí cuesta una espera, no un
   * fallo.
   */
  async precargarRegistro(registro) {
    return this.precargar(notasDe(registro));
  }

  async #muestra(midi) {
    const guardada = this.#muestras.get(midi);
    if (guardada) return guardada;

    const promesa = (async () => {
      try {
        const respuesta = await fetch(new URL(`${midi}.mp3`, this.#raiz));
        if (!respuesta.ok) {
          throw new Error(`No se pudo descargar la muestra ${midi}.mp3 (${respuesta.status}).`);
        }
        const audio = await this.#ctx.decodeAudioData(await respuesta.arrayBuffer());
        this.#muestras.set(midi, audio);  // sustituye la promesa por el buffer
        return audio;
      } catch (fallo) {
        // Se olvida el intento fallido. Si quedara guardada la promesa
        // rechazada, un corte de red de un segundo dejaría esa nota muda para
        // el resto de la partida, y en un aula eso pasa.
        this.#muestras.delete(midi);
        throw fallo;
      }
    })();

    // Se guarda la promesa, no solo el resultado: si dos sitios piden la misma
    // nota a la vez, comparten una única descarga.
    this.#muestras.set(midi, promesa);
    return promesa;
  }

  // --- Tocar ----------------------------------------------------------------

  /** Una nota. La promesa se resuelve cuando ha dejado de sonar. */
  async tocarNota(midi, opciones) {
    return this.#reproducir(planNota(midi, opciones));
  }

  /** Un intervalo melódico. La promesa se resuelve cuando ha dejado de sonar. */
  async tocarIntervalo(notas, opciones) {
    return this.#reproducir(planIntervalo(notas, opciones));
  }

  /** Una canción de referencia ya transportada. */
  async tocarMelodia(notas, duraciones, tempo, opciones) {
    return this.#reproducir(planMelodia(notas, duraciones, tempo, opciones));
  }

  /**
   * Programa un plan y devuelve el instante en que acaba, en tiempo del
   * contexto; `null` si se canceló mientras descargaba.
   *
   * Público porque el banco de pruebas programa sobre un contexto offline para
   * medir. El juego usa los `tocar*`.
   */
  async programar(plan) {
    // El piano toca una cosa cada vez. Empezar algo nuevo calla lo anterior en
    // vez de sumarse a ello: dos intervalos solapados no son un estímulo.
    this.callar();
    const mia = this.#generacion;

    if (!this.despierto) await this.despertar();
    const buffers = await Promise.all(plan.map((e) => this.#pedir(e.midi)));

    // Descargar una muestra lleva su tiempo, y en ese tiempo el alumno ha
    // podido pulsar otra cosa. Si ya no mandamos nosotros, no se programa nada.
    if (mia !== this.#generacion) return null;

    const inicio = this.#ctx.currentTime + ADELANTO;
    let final = inicio;
    plan.forEach((evento, i) => {
      final = Math.max(final, this.#programar(buffers[i], inicio + evento.cuando,
                                              evento.pulsacion, evento.ganancia));
    });
    return final;
  }

  /**
   * Corta lo que esté sonando y anula lo que quedara por empezar.
   *
   * Es lo que necesita el botón de repetir: pulsarlo dos veces seguidas no debe
   * dejar dos intervalos solapados.
   */
  callar() {
    this.#generacion++;
    if (!this.#ctx) return;
    const t = this.#ctx.currentTime;
    const hasta = t + MS_CALLAR / 1000;
    for (const { fuente, volumen } of this.#vivas) {
      volumen.gain.cancelScheduledValues(t);
      volumen.gain.setValueAtTime(volumen.gain.value, t);
      volumen.gain.linearRampToValueAtTime(0, hasta);
      try {
        fuente.stop(hasta);
      } catch {
        // La fuente ya había terminado por su cuenta.
      }
    }
    this.#vivas.clear();
  }

  async #reproducir(plan) {
    const final = await this.programar(plan);
    if (final === null) return false;
    const espera = (final - this.#ctx.currentTime) * 1000;
    await new Promise((listo) => setTimeout(listo, Math.max(0, espera)));
    return true;
  }

  async #pedir(midi) {
    if (!enRegistro(midi)) {
      throw new RangeError(
        `La nota ${midi} está fuera del material muestreado (${MIDI_MIN}-${MIDI_MAX}) `
        + 'y no puede sonar. Es un error en los datos: pasa validar_datos.py.');
    }
    return this.#muestra(midi);
  }

  /**
   * Una voz: fuente y envolvente. Devuelve el instante en que se apaga.
   *
   * Todo se programa por adelantado contra el reloj de la tarjeta de sonido, no
   * nota a nota con temporizadores: un `setTimeout` se retrasa cuando el hilo
   * está ocupado, y un intervalo mal medido es un intervalo mal enseñado.
   */
  #programar(buffer, cuando, pulsacion, ganancia) {
    const fuente = this.#ctx.createBufferSource();
    fuente.buffer = buffer;

    const volumen = this.#ctx.createGain();
    const suelta = cuando + pulsacion;
    const fin = Math.min(suelta + COLA, cuando + buffer.duration);
    const inicioRampa = fin - RAMPA_FINAL;

    volumen.gain.setValueAtTime(ganancia, cuando);
    if (inicioRampa > suelta) {
      // setTargetAtTime es exactamente exp(−t/τ): la misma caída que se midió
      // en Python antes de elegir estas muestras.
      volumen.gain.setTargetAtTime(0, suelta, TAU_SOLTAR);
      // Y aquí se congela la curva en su valor para bajar recto hasta cero. El
      // punto fijo es obligatorio: una rampa lineal arranca en el evento
      // anterior, así que sin él sustituiría la caída exponencial entera por
      // una recta. Sonaría, y sonaría mal.
      volumen.gain.setValueAtTime(
        ganancia * Math.exp(-(inicioRampa - suelta) / TAU_SOLTAR), inicioRampa);
    }
    volumen.gain.linearRampToValueAtTime(0, fin);

    fuente.connect(volumen).connect(this.#maestro);
    fuente.start(cuando);
    fuente.stop(fin);

    const viva = { fuente, volumen };
    this.#vivas.add(viva);
    fuente.onended = () => {
      this.#vivas.delete(viva);
      volumen.disconnect();
    };
    return fin;
  }
}

/** Publicadas para el banco de pruebas y para quien mida. */
export const AJUSTES = {
  TAU_SOLTAR, COLA, RAMPA_FINAL, PULSACION, PULSACION_FINAL,
  SEPARACION, ADELANTO, GANANCIA_MAESTRA, MIDI_MIN, MIDI_MAX,
};
