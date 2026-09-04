









const RAIZ = new URL('../../datos/', import.meta.url);








export const LISTA_BLANCA = {
  publicable: ['dominio_publico', 'tradicional', 'libre'],
  aula: ['dominio_publico', 'tradicional', 'libre', 'protegida', 'por_verificar'],
};
















export const EDICION = 'publicable';



async function leer(archivo, raiz) {
  const respuesta = await fetch(new URL(archivo, raiz));
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer datos/${archivo} (${respuesta.status}). `
      + 'La web hay que servirla: desde file:// el navegador no descarga nada.');
  }
  return respuesta.json();
}







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



    const permitidas = LISTA_BLANCA[edicion];
    this.canciones = canciones.canciones.filter((c) => permitidas.includes(c.licencia));
    this.canciones_descartadas = canciones.canciones.length - this.canciones.length;

    this.#porId = new Map(this.intervalos.map((i) => [i.id, i]));
    this.#porNivel = new Map(this.niveles.map((n) => [n.id, n]));
  }

  #porId;
  #porNivel;




  intervalo(id) {
    const encontrado = this.#porId.get(id);
    if (!encontrado) throw new Error(`No hay ningún intervalo "${id}" en intervalos.json.`);
    return encontrado;
  }













  intervaloDeRespuesta(respuesta) {
    const directo = this.#porId.get(respuesta);
    if (directo) return directo;
    const acepta = this.intervalos.find((i) => i.respuestas_validas.includes(respuesta));
    if (!acepta) throw new Error(`Ningún intervalo acepta la respuesta "${respuesta}".`);
    return acepta;
  }


  color(id) {
    return this.cualidades[this.intervalo(id).cualidad].color;
  }



  nivel(id) {
    const encontrado = this.#porNivel.get(id);
    if (!encontrado) throw new Error(`No hay ningún nivel ${id} en niveles.json.`);
    return encontrado;
  }

  get ultimoNivel() {
    return this.niveles[this.niveles.length - 1].id;
  }






  get registroMasAncho() {
    return {
      min: Math.min(...this.niveles.map((n) => n.registro.min)),
      max: Math.max(...this.niveles.map((n) => n.registro.max)),
    };
  }








  cancionesDe(intervalo, direccion) {
    return this.canciones.filter((c) => c.intervalo === intervalo && c.direccion === direccion);
  }


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
