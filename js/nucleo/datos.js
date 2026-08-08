// Los datos del juego: cargarlos una vez y poder preguntarles cosas.
//
// Los tres JSON de web/datos/ son el contrato (docs/contrato_datos.md). Aquí se
// leen, se indexan por id y se filtran las canciones por licencia. Lo que se
// puede derivar se deriva aquí y no se guarda en ningún archivo: el registro más
// ancho, las canciones de un par intervalo/dirección, si un nivel está abierto.
//
// La regla que ordena este módulo es la del contrato: si el mismo hecho vive en
// dos sitios, acabará con dos valores.

const RAIZ = new URL('../../datos/', import.meta.url);

// --- Licencias --------------------------------------------------------------
// Las dos versiones del juego son un filtro sobre `licencia`, no dos copias del
// proyecto. Y el filtro es **por lista blanca**: lo que no consta como
// utilizable no entra, así que un descuido cuesta una canción de menos y no un
// disgusto. Las dos listas se escriben enteras a propósito; una lista negra
// («todo menos protegida») dejaría pasar cualquier valor nuevo que apareciera.

export const LISTA_BLANCA = {
  publicable: ['dominio_publico', 'tradicional', 'libre'],
  aula: ['dominio_publico', 'tradicional', 'libre', 'protegida', 'por_verificar'],
};

/**
 * Qué edición se está sirviendo.
 *
 * **Por defecto la restringida**, y ese es todo el motivo de que valga
 * `publicable` y no `aula`: lo que pasa sin hacer nada —servir esta carpeta,
 * copiarla a algún sitio, olvidarse— tiene que ser lo que no da un disgusto.
 * La de aula se produce, no se hereda: `herramientas/montar_publicable.py
 * --edicion aula` deja una carpeta con esta constante cambiada.
 *
 * Y el filtro de aquí es lo que se **enseña**, no lo que se **descarga**: la
 * poda de `canciones.json` la hace ese mismo script al construir. `?edicion=`
 * permite comprobar desde el navegador qué se vería en la otra edición, y es
 * para mirar, no para proteger: lo que no debe publicarse tiene que no estar
 * en los archivos publicados.
 */
export const EDICION = 'publicable';

// --- Carga ------------------------------------------------------------------

async function leer(archivo, raiz) {
  const respuesta = await fetch(new URL(archivo, raiz));
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer datos/${archivo} (${respuesta.status}). `
      + 'La web hay que servirla: desde file:// el navegador no descarga nada.');
  }
  return respuesta.json();
}

/**
 * Lee los tres archivos y devuelve los `Datos` del juego.
 *
 *     const datos = await cargarDatos();
 *     datos.intervalo('3m').semitonos   // 3
 */
export async function cargarDatos({ raiz = RAIZ, edicion = EDICION } = {}) {
  const [intervalos, niveles, canciones] = await Promise.all([
    leer('intervalos.json', raiz),
    leer('niveles.json', raiz),
    leer('canciones.json', raiz),
  ]);
  return new Datos({ intervalos, niveles, canciones, edicion });
}

export class Datos {
  constructor({ intervalos, niveles, canciones, edicion = EDICION }) {
    if (!LISTA_BLANCA[edicion]) {
      throw new Error(`Edición desconocida: "${edicion}". Solo hay ${Object.keys(LISTA_BLANCA)}.`);
    }
    this.edicion = edicion;

    this.cualidades = intervalos.cualidades;
    this.intervalos = [...intervalos.intervalos].sort((a, b) => a.orden - b.orden);
    this.niveles = niveles.niveles;
    this.licencias = canciones.licencias;

    // El filtro de licencias, aplicado una sola vez al cargar. A partir de aquí
    // nadie más vuelve a mirar el campo `licencia` para decidir si algo se usa.
    const permitidas = LISTA_BLANCA[edicion];
    this.canciones = canciones.canciones.filter((c) => permitidas.includes(c.licencia));
    this.canciones_descartadas = canciones.canciones.length - this.canciones.length;

    this.#porId = new Map(this.intervalos.map((i) => [i.id, i]));
    this.#porNivel = new Map(this.niveles.map((n) => [n.id, n]));
  }

  #porId;
  #porNivel;

  // --- Intervalos -----------------------------------------------------------

  /** El intervalo con ese id. Falla si no existe: sería un error de datos. */
  intervalo(id) {
    const encontrado = this.#porId.get(id);
    if (!encontrado) throw new Error(`No hay ningún intervalo "${id}" en intervalos.json.`);
    return encontrado;
  }

  /**
   * El intervalo que acepta esta respuesta, que **no es lo mismo que su id**.
   *
   * El tritono se llama `4A` y admite también `5d`, y el contrato lo pide desde
   * la Fase 1: «un modo de respuesta escrita —o el modo de aula, donde responde
   * el profesor— tiene que aceptar las dos». Hoy la cuadrícula solo manda ids,
   * así que esto y `intervalo()` devuelven lo mismo; el día que llegue una
   * respuesta escrita, buscar `5d` por id no encontraría nada y esto sí.
   *
   * Quien recibe una **respuesta** usa esta; quien recibe un **intervalo**, la
   * otra. Confundirlas es el fallo que esto viene a evitar.
   */
  intervaloDeRespuesta(respuesta) {
    const directo = this.#porId.get(respuesta);
    if (directo) return directo;
    const acepta = this.intervalos.find((i) => i.respuestas_validas.includes(respuesta));
    if (!acepta) throw new Error(`Ningún intervalo acepta la respuesta "${respuesta}".`);
    return acepta;
  }

  /** El color de la cualidad de un intervalo. Vive en el JSON, no en el CSS. */
  color(id) {
    return this.cualidades[this.intervalo(id).cualidad].color;
  }

  // --- Niveles --------------------------------------------------------------

  nivel(id) {
    const encontrado = this.#porNivel.get(id);
    if (!encontrado) throw new Error(`No hay ningún nivel ${id} en niveles.json.`);
    return encontrado;
  }

  get ultimoNivel() {
    return this.niveles[this.niveles.length - 1].id;
  }

  /**
   * El registro más ancho de la progresión, que es el que usa la práctica
   * libre. Derivado de los niveles y no escrito aparte: si algún día el nivel 7
   * se ensancha, la práctica libre se ensancha con él.
   */
  get registroMasAncho() {
    return {
      min: Math.min(...this.niveles.map((n) => n.registro.min)),
      max: Math.max(...this.niveles.map((n) => n.registro.max)),
    };
  }

  // --- Canciones ------------------------------------------------------------

  /**
   * Las canciones de referencia de un par intervalo/dirección, ya filtradas por
   * licencia. Puede devolver una lista vacía: el tritono descendente y las dos
   * séptimas descendentes no tienen anclaje popular y se resuelven con técnica.
   */
  cancionesDe(intervalo, direccion) {
    return this.canciones.filter((c) => c.intervalo === intervalo && c.direccion === direccion);
  }

  /** Los pares intervalo/dirección que se quedan sin canción, para avisar. */
  get paresSinCancion() {
    const sin = [];
    for (const i of this.intervalos) {
      for (const d of ['asc', 'desc']) {
        if (this.cancionesDe(i.id, d).length === 0) sin.push(`${i.id}|${d}`);
      }
    }
    return sin;
  }
}
