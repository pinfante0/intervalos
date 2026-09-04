











export const MS_CONTRARRELOJ = 60_000;

export class Ronda {
  #generar;
  #comprobar;
  #items = [];
  #respuestas = [];
  #t0 = null;
  #servido = null;
  #escuchado = null;
  #racha = 0;
  #rachaMax = 0;
  #cerrada = false;












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



  get comenzada() { return this.#t0 !== null; }
  get item() { return this.#items[this.#items.length - 1] ?? null; }
  get numero() { return this.#items.length; }
  get respondidos() { return this.#respuestas.length; }
  get racha() { return this.#racha; }
  get rachaMax() { return this.#rachaMax; }
  get terminada() { return this.#cerrada; }


  get porEquipos() { return this.equipos !== null; }

  get aciertos() {
    if (this.porEquipos) return this.equipos.reduce((suma, e) => suma + e.aciertos, 0);
    return this.#respuestas.filter((r) => r.acierto).length;
  }

  get fallos() {
    if (this.porEquipos) return this.equipos.reduce((suma, e) => suma + e.fallos, 0);
    return this.#respuestas.length - this.aciertos;
  }


  get clasificacion() {
    if (!this.porEquipos) return null;
    return [...this.equipos].sort((a, b) => b.aciertos - a.aciertos || a.fallos - b.fallos);
  }


  get msRestantes() {
    if (this.limiteMs === null) return null;
    if (!this.comenzada) return this.limiteMs;
    return Math.max(0, this.limiteMs - (performance.now() - this.#t0));
  }











  get msDelItem() {
    const desde = this.#escuchado;
    if (this.msPorItem === null || desde === null) return null;
    return Math.max(0, this.msPorItem - (performance.now() - desde));
  }



  comenzar() {
    this.#t0 = performance.now();
    return this.siguiente();
  }









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










  escuchado() {
    this.#escuchado ??= performance.now();
  }





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


  abandonar() {
    this.#cerrar();
  }





  resumen() {




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
