










export const CLAVE = 'emd.progreso.v1';
export const VERSION = 1;










const MODOS_QUE_PROGRESAN = ['individual'];


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


  get persiste() {
    return !this.#almacen.volatil;
  }

  #leer() {
    let guardado = null;
    try {
      guardado = JSON.parse(this.#almacen.getItem(CLAVE) || 'null');
    } catch {

      guardado = null;
    }
    if (!guardado || guardado.version !== VERSION) {


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

    }
  }


  get instantanea() {
    return structuredClone(this.#datos);
  }



  get ajustes() {
    return { ...this.#datos.ajustes };
  }

  ajustar(cambios) {
    Object.assign(this.#datos.ajustes, cambios);
    this.#guardar();
    return this.ajustes;
  }




  deJuego(juego) {
    this.#datos.juegos[juego] ??= juegoVacio();
    return this.#datos.juegos[juego];
  }


  estadistica(juego, intervalo, direccion) {
    return this.deJuego(juego).estadisticas[par(intervalo, direccion)]
      ?? { aciertos: 0, fallos: 0, ms_total: 0 };
  }










  confusion(juego, intervalo, direccion, respuesta) {
    return this.deJuego(juego).confusiones[par(intervalo, direccion)]?.[respuesta] ?? 0;
  }


  nivelAbierto(juego, nivel) {
    return nivel <= this.deJuego(juego).nivel_actual;
  }












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


      if (nivel === datos.nivel_actual && nivel < ultimo_nivel) {
        datos.nivel_actual = nivel + 1;
        desbloqueado = datos.nivel_actual;
      }
    }

    this.#guardar();
    return { superado, progresa, desbloqueado, mejor_racha: datos.mejor_racha };
  }




  borrar() {
    const ajustes = this.ajustes;
    this.#datos = { version: VERSION, actualizado: null, ajustes, juegos: {} };
    this.#guardar();
  }
}
