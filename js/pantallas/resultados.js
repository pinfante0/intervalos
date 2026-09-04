










import { el, segundos } from '../nucleo/dom.js';
import { nombreModo } from '../nucleo/modos.js';

export function pantallaResultados(consola, { params, ir }) {
  const { datos, progreso } = consola;
  const resumen = consola.ultimoResumen;
  if (!resumen || resumen.juego !== params.juego) {
    ir(`/${params.juego}/modos`, { reemplazar: true });
    return null;
  }

  const { cierre } = resumen;
  const total = resumen.aciertos + resumen.fallos;
  const medio = total ? resumen.ms_total / total : 0;





  const escaleraCompleta = progreso.deJuego(params.juego)
    .niveles_superados.length >= datos.ultimoNivel;






  return el('section.resultados', { clase: resumen.equipos ? 'resultados-aula' : '' },
    el('header.cabecera', {},
      el('a.atras', { href: `#/${params.juego}/modos` }, '‹ Modos'),



      el('h2', {}, resumen.nivel_nombre
        ? `${resumen.nivel_nombre} · ${nombreModo(resumen.modo)}`
        : nombreModo(resumen.modo))),

    el('div.tarjeta.resultado', {},
      el('p.marca', {}, `${resumen.aciertos} / ${total}`),



      resumen.modo === 'aula'
        ? el('p.nota', {}, `respuestas acertadas entre los ${resumen.equipos.length} equipos, `
          + `en ${resumen.items} intervalos`)
        : el('p.nota', {},
          `Racha máxima ${resumen.racha_max} · ${segundos(medio)} de media por respuesta`),
      veredicto(resumen, cierre, escaleraCompleta)),

    resumen.equipos && clasificacion(resumen.equipos),

    acciones(params.juego, resumen, cierre));
}


















export function pantallaDetalle(consola, { params, ir }) {
  const { datos } = consola;
  const resumen = consola.ultimoResumen;
  if (!resumen || resumen.juego !== params.juego) {
    ir(`/${params.juego}/modos`, { reemplazar: true });
    return null;
  }

  return el('section', {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${params.juego}/resultados` }, '‹ Resultados'),
      el('h2', {}, 'Cómo lo has hecho')),

    desglose(datos, resumen));
}






















function acciones(juego, resumen, cierre) {
  const seguir = cierre.desbloqueado
    ? el('a.principal', {
      href: `#/${juego}/jugar?nivel=${cierre.desbloqueado}&modo=individual`,
    }, 'Siguiente nivel')
    : el('a.principal', { href: `#${resumen.enlace_repetir}` }, 'Otra vez');

  return el('div.acciones', {},
    seguir,



    el('a.secundario', { href: `#/${juego}/detalle` }, 'Cómo lo has hecho'),
    el('a.secundario', { href: `#/${juego}/modos` }, 'Volver a los modos'));
}





function veredicto(resumen, cierre, escaleraCompleta) {




  if (escaleraCompleta && cierre.superado) {
    return el('p.veredicto.bien', {},
      '¡Los siete niveles superados! Ya distingues los doce intervalos en las '
      + 'dos direcciones.');
  }
  if (cierre.desbloqueado) {
    return el('p.veredicto.bien', {}, `Nivel superado. Se abre el nivel ${cierre.desbloqueado}.`);
  }
  if (cierre.progresa) {
    return el('p.veredicto.bien', {}, 'Nivel superado otra vez.');
  }
  if (resumen.modo === 'individual' && resumen.aciertos_para_superar !== null) {
    return el('p.veredicto', {},
      `Hacen falta ${resumen.aciertos_para_superar} aciertos para superar el nivel.`);
  }
  const porque = {
    contrarreloj: 'El Contrarreloj cuenta para las estadísticas, pero no abre niveles: '
      + 'eso solo lo hace el Reto.',
    aula: 'En el Concurso quien responde es la clase, así que no mueve el progreso de '
      + 'este aparato más allá de las estadísticas.',
    libre: 'La Práctica suma a las estadísticas y no mueve el nivel: eso solo lo hace el Reto.',
  }[resumen.modo];
  return porque ? el('p.veredicto', {}, porque) : null;
}

function clasificacion(equipos) {
  const orden = [...equipos].sort((a, b) => b.aciertos - a.aciertos || a.fallos - b.fallos);
  return el('div.tarjeta.equipos', {},
    el('h3', {}, 'Equipos'),
    el('table.tabla', {},
      el('tbody', {}, orden.map((equipo, i) => el('tr', { clase: i === 0 ? 'primero' : '' },
        el('td', {}, `${i + 1}.`),
        el('td', {}, equipo.nombre),
        el('td', {}, `${equipo.aciertos} de ${equipo.aciertos + equipo.fallos}`))))));
}


function desglose(datos, resumen) {
  const pares = new Map();
  for (const r of resumen.respuestas) {
    const clave = `${r.intervalo}|${r.direccion}`;
    const fila = pares.get(clave)
      ?? { intervalo: r.intervalo, direccion: r.direccion, aciertos: 0, total: 0, confundidos: [] };
    fila.total++;
    if (r.acierto) fila.aciertos++;




    else if (r.respuesta) fila.confundidos.push(r.respuesta);
    pares.set(clave, fila);
  }
  if (!pares.size) return null;

  const filas = [...pares.values()].sort(
    (a, b) => a.aciertos / a.total - b.aciertos / b.total);

  return el('div.tarjeta', {},
    el('h3', {}, 'Por intervalo'),
    el('table.tabla', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Intervalo'), el('th', {}, 'Aciertos'), el('th', {}, 'Se contestó'))),
      el('tbody', {}, filas.map((fila) => el('tr', {},
        el('td', {},
          el('span.pastilla', {
            estilo: { '--color': datos.color(fila.intervalo) },
          }, datos.intervalo(fila.intervalo).etiqueta),
          fila.direccion === 'asc' ? ' ascendente' : ' descendente'),
        el('td', {}, `${fila.aciertos} de ${fila.total}`),


        el('td', {}, fila.confundidos.length
          ? [...new Set(fila.confundidos)]
            .map((r) => datos.intervaloDeRespuesta(r).etiqueta).join(', ')
          : '—'))))));
}
