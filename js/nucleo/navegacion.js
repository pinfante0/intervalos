











import { vaciar } from './dom.js';

export class Navegacion {
  #rutas = [];
  #contenedor;
  #alSalir = null;
  #actual = null;

  constructor(contenedor) {
    this.#contenedor = contenedor;
  }






  ruta(patron, pantalla) {
    const partes = patron.split('/').filter(Boolean);
    this.#rutas.push({ patron, partes, pantalla });
    return this;
  }


  get actual() {
    return this.#actual;
  }

  ir(destino, { reemplazar = false } = {}) {
    const url = `#${destino}`;
    if (reemplazar) location.replace(url);
    else location.hash = url.slice(1);
  }

  atras() {
    history.back();
  }

  arrancar() {
    addEventListener('hashchange', () => this.#pintar());
    this.#pintar();
  }

  #emparejar(camino) {
    const partes = camino.split('/').filter(Boolean);
    for (const ruta of this.#rutas) {
      if (ruta.partes.length !== partes.length) continue;
      const params = {};
      const encaja = ruta.partes.every((trozo, i) => {
        if (trozo.startsWith(':')) {
          params[trozo.slice(1)] = decodeURIComponent(partes[i]);
          return true;
        }
        return trozo === partes[i];
      });
      if (encaja) return { ruta, params };
    }
    return null;
  }

  async #pintar() {



    try {
      this.#alSalir?.();
    } catch (fallo) {
      console.error('Al salir de la pantalla anterior:', fallo);
    }
    this.#alSalir = null;

    const bruto = location.hash.slice(1) || '/';
    const [camino, consulta = ''] = bruto.split('?');
    this.#actual = camino;

    const encontrada = this.#emparejar(camino);
    if (!encontrada) {
      this.ir('/', { reemplazar: true });
      return;
    }

    const contexto = {
      params: encontrada.params,
      consulta: new URLSearchParams(consulta),
      ir: (destino, opciones) => this.ir(destino, opciones),
    };

    let resultado;
    try {
      resultado = await encontrada.ruta.pantalla(contexto);
    } catch (fallo) {
      console.error(fallo);
      resultado = pantallaDeFallo(fallo);
    }

    const nodo = resultado?.nodo ?? resultado;
    this.#alSalir = resultado?.alSalir ?? null;

    vaciar(this.#contenedor);
    if (nodo) this.#contenedor.append(nodo);
    scrollTo(0, 0);


    this.#contenedor.focus({ preventScroll: true });
  }
}

function pantallaDeFallo(fallo) {
  const seccion = document.createElement('section');
  seccion.className = 'tarjeta fallo';
  const titulo = document.createElement('h2');
  titulo.textContent = 'Algo se ha roto';
  const detalle = document.createElement('p');
  detalle.textContent = String(fallo?.message ?? fallo);
  const salida = document.createElement('p');
  const enlace = document.createElement('a');
  enlace.href = '#/';
  enlace.textContent = 'Volver al menú';
  salida.append(enlace);
  seccion.append(titulo, detalle, salida);
  return seccion;
}
