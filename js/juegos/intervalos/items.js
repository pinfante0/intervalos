










import { MIDI_MIN, MIDI_MAX } from '../../nucleo/alturas.js';










export function notasDePartida(semitonos, direccion, registro) {
  const min = Math.max(registro.min, MIDI_MIN);
  const max = Math.min(registro.max, MIDI_MAX);
  const desde = direccion === 'asc' ? min : min + semitonos;
  const hasta = direccion === 'asc' ? max - semitonos : max;
  const notas = [];
  for (let n = desde; n <= hasta; n++) notas.push(n);
  return notas;
}









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





















export function pesoDe({ aciertos = 0, fallos = 0 } = {}) {
  const tasaDeFallo = (fallos + 1) / (aciertos + fallos + 2);
  return 1 + 3 * tasaDeFallo;
}




















export function generadorDeItems(datos, {
  intervalos, direcciones, registro, nivel = null, azar = Math.random, historial = null,
}) {
  const pares = paresJugables(datos, { intervalos, direcciones, registro });
  if (!pares.length) {
    throw new Error('Ningún intervalo cabe en este registro: la partida no tendría qué sonar.');
  }



  const pesos = new Map(pares.map((p) => [
    p, historial ? pesoDe(historial(p.intervalo, p.direccion)) : 1,
  ]));

  const elegir = (lista) => lista[Math.min(lista.length - 1, Math.floor(azar() * lista.length))];


  const elegirPesado = (lista) => {
    if (lista.length === 1) return lista[0];
    const total = lista.reduce((suma, p) => suma + pesos.get(p), 0);
    let punto = azar() * total;
    for (const par of lista) {
      punto -= pesos.get(par);
      if (punto < 0) return par;
    }
    return lista[lista.length - 1];
  };

  return function generar(numero, anterior) {




    let posibles = pares;
    if (anterior && pares.length > 1) {
      posibles = pares.filter(
        (p) => p.intervalo !== anterior.intervalo || p.direccion !== anterior.direccion);
    }




    const par = elegirPesado(posibles);

    let candidatas = par.candidatas;
    if (anterior && candidatas.length > 1) {
      const sinRepetir = candidatas.filter((n) => n !== anterior.nota_inicial);
      if (sinRepetir.length) candidatas = sinRepetir;
    }




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
