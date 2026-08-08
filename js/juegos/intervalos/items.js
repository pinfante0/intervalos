// Generación de los ítems del juego de intervalos.
//
// El contrato de datos decidió que un ítem **se genera, no se almacena**: es
// intervalo + dirección + nota de partida, y la nota de partida es aleatoria por
// diseño. Si el juego arrancara siempre en do, el alumno acabaría reconociendo
// la segunda nota por su altura absoluta en vez del intervalo, que es el fallo
// clásico de estos entrenadores y destruye la transferencia.
//
// Aquí están, entonces, las reglas de sorteo. Ver docs/contrato_datos.md,
// apartado 2.

import { MIDI_MIN, MIDI_MAX } from '../../nucleo/alturas.js';

/**
 * Las notas de partida válidas: aquellas en las que **las dos** notas caen
 * dentro del registro.
 *
 * Se construye la lista de candidatas y se sortea sobre ella, en vez de sortear
 * una nota y comprobar después. Es la diferencia entre un juego que a veces no
 * suena y uno que no puede fallar: una 8J ascendente desde la nota más alta del
 * registro se sale, y esa nota simplemente no entra en el sorteo.
 */
export function notasDePartida(semitonos, direccion, registro) {
  const min = Math.max(registro.min, MIDI_MIN);
  const max = Math.min(registro.max, MIDI_MAX);
  const desde = direccion === 'asc' ? min : min + semitonos;
  const hasta = direccion === 'asc' ? max - semitonos : max;
  const notas = [];
  for (let n = desde; n <= hasta; n++) notas.push(n);
  return notas;
}

/**
 * Los pares intervalo/dirección que se pueden servir en un registro, cada uno
 * con sus notas de partida ya resueltas.
 *
 * Un par sin ninguna candidata se cae de la lista en vez de dar un ítem mudo.
 * En la progresión no debería ocurrir nunca —`validar_datos.py` lo comprueba
 * nivel a nivel—, pero la práctica libre la configura el alumno.
 */
export function paresJugables(datos, { intervalos, direcciones, registro }) {
  const pares = [];
  for (const id of intervalos) {
    const intervalo = datos.intervalo(id);
    for (const direccion of direcciones) {
      const candidatas = notasDePartida(intervalo.semitonos, direccion, registro);
      if (candidatas.length) {
        pares.push({
          intervalo: id,
          direccion,
          semitonos: intervalo.semitonos,
          respuestas_validas: intervalo.respuestas_validas,
          candidatas,
        });
      }
    }
  }
  return pares;
}

/**
 * Cuánto pesa un par en el sorteo, a partir de lo que el alumno lleva hecho con
 * él. Uno que se falla siempre sale unas **tres veces más** que uno que se
 * acierta siempre.
 *
 * La tasa de fallo se suaviza con un acierto y un fallo de regalo —(f+1)/(n+2)—
 * y eso resuelve dos problemas de una vez, sin ningún caso especial:
 *
 *   · **El par que no se ha visto nunca** no tiene tasa que calcular. Con el
 *     suavizado le sale 0,5, o sea, peso medio-alto: entra pronto en el sorteo,
 *     que es lo que hace falta para saber si se le da bien, pero no arrasa.
 *   · **Un fallo suelto no es un 100 % de fallos.** Sin suavizar, fallar el
 *     primer 6M lo dejaría con la tasa máxima para siempre jamás; con él, un
 *     fallo de uno da 0,67 y hacen falta varios para llegar arriba. El peso
 *     sigue a la evidencia, y no al ruido.
 *
 * El tope de 3:1 está elegido para que se note sin obsesionar: con un reparto
 * mucho más agresivo, una práctica de diez ítems se convierte en el mismo par
 * repetido y el alumno deja de reconocer lo que ya sabía.
 */
export function pesoDe({ aciertos = 0, fallos = 0 } = {}) {
  const tasaDeFallo = (fallos + 1) / (aciertos + fallos + 2);
  return 1 + 3 * tasaDeFallo;
}

/**
 * Devuelve la función que el motor de rondas llama para pedir el ítem
 * siguiente: `generar(numero, anterior)`.
 *
 * Los pares y sus candidatas se calculan **una vez por partida**, no en cada
 * ítem. Sortear entonces cuesta dos índices.
 *
 * `historial` es lo que convierte el reparto en adaptativo: una función
 * `(intervalo, direccion) => { aciertos, fallos }`, que en el juego es el
 * progreso guardado. Sin ella el reparto es uniforme, y **esa es la opción por
 * defecto a propósito**: quien reparte adaptativo tiene que pedirlo.
 *
 * Los pesos se calculan **una vez por partida**, como los pares. Recalcularlos
 * ítem a ítem haría que una sola respuesta moviera el reparto de lo que queda, y
 * una respuesta suelta es ruido: la partida siguiente ya recoge el cambio.
 *
 * `azar` se puede sustituir para poder comprobar el sorteo con números
 * conocidos; el juego no la pasa.
 */
export function generadorDeItems(datos, {
  intervalos, direcciones, registro, nivel = null, azar = Math.random, historial = null,
}) {
  const pares = paresJugables(datos, { intervalos, direcciones, registro });
  if (!pares.length) {
    throw new Error('Ningún intervalo cabe en este registro: la partida no tendría qué sonar.');
  }

  // Sin historial, todos pesan igual y el sorteo pesado da exactamente el
  // uniforme: no hacen falta dos caminos que mantener.
  const pesos = new Map(pares.map((p) => [
    p, historial ? pesoDe(historial(p.intervalo, p.direccion)) : 1,
  ]));

  const elegir = (lista) => lista[Math.min(lista.length - 1, Math.floor(azar() * lista.length))];

  /** Sorteo con pesos: cada par ocupa un tramo proporcional al suyo. */
  const elegirPesado = (lista) => {
    if (lista.length === 1) return lista[0];
    const total = lista.reduce((suma, p) => suma + pesos.get(p), 0);
    let punto = azar() * total;
    for (const par of lista) {
      punto -= pesos.get(par);
      if (punto < 0) return par;
    }
    return lista[lista.length - 1];   // por si azar() devuelve exactamente 1
  };

  return function generar(numero, anterior) {
    // No se repite el par (intervalo, dirección) dos ítems seguidos, ni la misma
    // nota de partida dos veces seguidas. Las dos reglas se levantan cuando
    // cumplirlas es imposible —una práctica libre de un solo par, un intervalo
    // que solo cabe de una manera—, porque la alternativa sería no dar ítem.
    let posibles = pares;
    if (anterior && pares.length > 1) {
      posibles = pares.filter(
        (p) => p.intervalo !== anterior.intervalo || p.direccion !== anterior.direccion);
    }
    // Aquí es donde el reparto adaptativo hace su trabajo: se pesa lo que queda
    // después de aplicar la regla de no repetir, no antes. Al revés, el par más
    // pesado saldría, se quedaría fuera del sorteo siguiente por repetición, y
    // volvería al otro: se alternarían dos ítems toda la partida.
    const par = elegirPesado(posibles);

    let candidatas = par.candidatas;
    if (anterior && candidatas.length > 1) {
      const sinRepetir = candidatas.filter((n) => n !== anterior.nota_inicial);
      if (sinRepetir.length) candidatas = sinRepetir;
    }
    // La nota de partida se sortea **uniforme y siempre**. Lo que se entrena es
    // la distancia, no la altura: pesar también la nota dejaría al alumno
    // oyendo el mismo do y aprendiendo la segunda nota de memoria, que es el
    // fallo clásico que el ítem generado venía a evitar.
    const nota_inicial = elegir(candidatas);

    return {
      numero,
      intervalo: par.intervalo,
      direccion: par.direccion,
      nota_inicial,
      notas: [nota_inicial, nota_inicial + (par.direccion === 'asc' ? par.semitonos : -par.semitonos)],
      respuestas_validas: [...par.respuestas_validas],
      nivel,
    };
  };
}
