












import { el, segundos } from '../nucleo/dom.js';
import { accesos } from './ajustes.js';
import { MODOS, TODOS, MAX_EQUIPOS, PLAZOS, eligeEn, duracionEn, porEquiposEn }
  from '../nucleo/modos.js';


const puertaDe = (juego, modo) => (eligeEn(modo) === 'nivel'
  ? `#/${juego}/niveles`
  : `#/${juego}/preparar?modo=${modo}`);















export function pantallaEntrada(consola, ctx) {
  const juego = consola.juego(ctx.params.juego);
  if (!juego.portada) return pantallaModos(consola, ctx);
  return juego.portada({
    juego,
    datos: consola.datos,
    entrar: `#/${juego.id}/modos`,




    accesos: accesos(),
  });
}

export function pantallaModos(consola, { params }) {
  const { datos, progreso } = consola;
  const juego = consola.juego(params.juego);
  const mio = progreso.deJuego(juego.id);




  const volver = juego.portada ? `#/${juego.id}` : null;




  const sinOtraPuerta = !juego.portada;





  const tarjetas = TODOS.map((modo) => el('a.modo-tarjeta', {
    href: puertaDe(juego.id, modo.id),
    datos: { modo: modo.id },
  },
  el('h3', {}, modo.nombre),



  el('p', {}, modo.resumen),
  pieDeModo(datos, mio, modo)));













  return el('section.modos', {},
    el('header.cabecera', {},
      volver ? el('a.atras', { href: volver }, '‹ Inicio') : null,
      el('h2', {}, juego.portada ? 'Modo de juego' : juego.nombre),



      sinOtraPuerta ? accesos() : null),







    el('div.modos-lista', {}, tarjetas));
}







function pieDeModo(datos, mio, modo) {
  if (modo.elige !== 'nivel') {
    return el('span.pie-modo', {}, duracionEn(modo.id) === 'reloj'
      ? 'Un minuto'
      : (porEquiposEn(modo.id) ? 'Hasta diez equipos' : 'Los ítems que elijas'));
  }

  const ultimo = datos.ultimoNivel;
  const puntos = datos.niveles.map((n) => el('span.punto', {
    clase: mio.niveles_superados.includes(n.id) ? 'hecho'
      : (n.id === mio.nivel_actual ? 'ahora' : ''),
  }));
  return el('span.pie-modo', {},
    el('span.puntos', { role: 'img', 'aria-label': `Nivel ${mio.nivel_actual} de ${ultimo}` },
       puntos),
    el('span', {}, mio.niveles_superados.length >= ultimo
      ? 'Los siete superados'
      : `Nivel ${mio.nivel_actual} de ${ultimo}`));
}




























export function pantallaNiveles(consola, { params }) {
  const { datos, progreso } = consola;
  const juego = consola.juego(params.juego);
  const mio = progreso.deJuego(juego.id);

  const estadoDe = (nivel) => ({
    superado: mio.niveles_superados.includes(nivel.id),
    abierto: progreso.nivelAbierto(juego.id, nivel.id),
  });



  const actual = [...datos.niveles].reverse().find((n) => estadoDe(n).abierto)
    ?? datos.niveles[0];

  const escalones = datos.niveles.map((nivel) => {
    const { superado, abierto } = estadoDe(nivel);
    const escalon = el(abierto ? 'a.escalon' : 'span.escalon', {
      href: abierto ? `#/${juego.id}/jugar?nivel=${nivel.id}&modo=individual` : null,
      clase: [superado ? 'superado' : '', abierto ? '' : 'cerrado',
              nivel.id === actual.id ? 'actual' : ''].join(' '),
      'aria-disabled': abierto ? null : 'true',



      title: abierto
        ? `${nivel.nombre}: ${nivel.objetivo}`
        : `${nivel.nombre} — se abre al superar el nivel ${nivel.id - 1}`,
      'aria-label': abierto
        ? `Nivel ${nivel.id}, ${nivel.nombre}${superado ? ', superado' : ''}`
        : `Nivel ${nivel.id}, ${nivel.nombre}, cerrado`,
    }, superado ? '✓' : nivel.id);
    return escalon;
  });

  return el('section', {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${juego.id}/modos` }, '‹ Modos'),
      el('h2', {}, MODOS.individual.nombre)),





    el('p.nota.entradilla', {},
       `Siete niveles de ${datos.niveles[0].items} ítems, que se superan con `
       + `${datos.niveles[0].aciertos_para_superar}.`),

    el('div.escalera', { role: 'group', 'aria-label': 'Los siete niveles' }, escalones),

    tarjetaDelNivel(juego, actual, estadoDe(actual)),












    mio.items_jugados
      ? el('div.acciones', {},
        el('a.secundario', { href: `#/${juego.id}/progreso` }, 'Progreso del Reto'))
      : null);
}








export function pantallaProgreso(consola, { params }) {
  const { datos, progreso } = consola;
  const juego = consola.juego(params.juego);
  const mio = progreso.deJuego(juego.id);

  return el('section', {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${juego.id}/niveles` }, '‹ Reto'),
      el('h2', {}, 'Progreso del Reto')),




    mio.items_jugados
      ? resumenDelJuego(datos, progreso, juego)
      : el('p.nota', {}, 'Aquí aparecerá cómo llevas cada intervalo en cuanto juegues una partida.'));
}









function tarjetaDelNivel(juego, nivel, { superado }) {
  return el('div.tarjeta.nivel-actual', {},
    el('p.rotulo', {}, superado ? `Nivel ${nivel.id} · superado` : `Nivel ${nivel.id}`),
    el('h3', {}, nivel.nombre),
    el('p.nota', {}, nivel.objetivo),
    nivel.nota_didactica && el('p.didactica', {}, nivel.nota_didactica),
    el('a.principal.grande', {
      href: `#/${juego.id}/jugar?nivel=${nivel.id}&modo=individual`,
    }, superado ? 'Repetir' : 'Jugar'));
}

function resumenDelJuego(datos, progreso, juego) {
  const mio = progreso.deJuego(juego.id);
  if (!mio.items_jugados) return null;



  const flojos = Object.entries(mio.estadisticas)
    .map(([clave, e]) => {
      const [intervalo, direccion] = clave.split('|');
      const total = e.aciertos + e.fallos;
      return { intervalo, direccion, total, tasa: e.aciertos / total, ms: e.ms_total / total };
    })
    .filter((p) => p.total >= 3)
    .sort((a, b) => a.tasa - b.tasa)
    .slice(0, 5);

  return el('div.tarjeta', {},
    el('h3', {}, 'Cómo va'),
    el('p.nota', {}, `${mio.items_jugados} ítems jugados · mejor racha ${mio.mejor_racha}`),
    flojos.length ? el('table.tabla', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'Intervalo'), el('th', {}, 'Aciertos'), el('th', {}, 'Tiempo'))),
      el('tbody', {}, flojos.map((p) => el('tr', {},
        el('td', {}, `${datos.intervalo(p.intervalo).etiqueta} ${p.direccion === 'asc' ? '↑' : '↓'}`),
        el('td', {}, `${Math.round(p.tasa * 100)} %`),
        el('td', {}, segundos(p.ms)))))) : null);
}









export function pantallaPreparar(consola, { params, consulta, ir }) {
  const { datos } = consola;
  const juego = consola.juego(params.juego);
  const modo = MODOS[consulta.get('modo')] ? consulta.get('modo') : 'libre';
  const pideItems = duracionEn(modo) === 'items';
  const porEquipos = porEquiposEn(modo);





  const minimo = juego.minimoElegidos ?? 1;





  const elegidos = new Set();
  let direccion = 'azar';
  let items = 10;
  let equipos = 4;
  let plazo = 15;

  const empezar = el('button.principal', { type: 'button' },
                     porEquipos ? 'Empezar el concurso' : 'Empezar');
  const aviso = el('p.nota');









  const direccionDe = (nivel) => (nivel.direcciones.length === 2 ? 'azar' : nivel.direcciones[0]);










  const refrescos = [];
  const actualizar = () => {
    const pocos = elegidos.size < minimo;
    empezar.disabled = pocos;




    aviso.textContent = pocos
      ? `Elige al menos ${minimo} intervalos.`
      : `${elegidos.size} intervalos elegidos.`;
    for (const refrescar of refrescos) refrescar();
  };


  const pintarChip = (boton, puesto) => {
    boton.classList.toggle('elegido', puesto);
    boton.setAttribute('aria-pressed', String(puesto));
  };


  const marcar = (ids, dir = null) => {
    elegidos.clear();
    ids.forEach((id) => elegidos.add(id));
    if (dir) direccion = dir;
    actualizar();
  };

  const casillas = datos.intervalos.map((intervalo) => {
    const boton = el('button.chip.respuesta', {
      type: 'button',
      datos: { cualidad: intervalo.cualidad, intervalo: intervalo.id },
      'aria-pressed': 'false',
      onclick: () => {
        if (elegidos.has(intervalo.id)) elegidos.delete(intervalo.id);
        else elegidos.add(intervalo.id);
        actualizar();
      },
    }, intervalo.etiqueta);
    boton.style.setProperty('--color', datos.color(intervalo.id));
    refrescos.push(() => pintarChip(boton, elegidos.has(intervalo.id)));
    return boton;
  });













  const chipsNivel = datos.niveles.map((n) => {
    const boton = el('button.chip.grado', {
      type: 'button',
      datos: { nivel: String(n.id) },
      'aria-pressed': 'false',
      title: `${n.nombre}: ${n.intervalos.join(', ')}`,
      onclick: () => marcar(n.intervalos, direccionDe(n)),
    }, n.id);
    refrescos.push(() => pintarChip(boton,
      n.intervalos.length === elegidos.size
      && n.intervalos.every((id) => elegidos.has(id))
      && direccion === direccionDe(n)));
    return boton;
  });









  const grupo = (titulo, opciones, leer, alElegir, { reparte = false } = {}) => {
    const botones = opciones.map(([id, texto]) => {
      const boton = el('button.chip', {
        type: 'button',
        'aria-pressed': 'false',
        onclick: () => { alElegir(id); actualizar(); },
      }, texto);
      refrescos.push(() => pintarChip(boton, leer() === id));
      return boton;
    });
    return el('div.grupo', {},
      el('h3', {}, titulo),
      el(`div.fila${reparte ? '.reparte' : ''}`, {}, botones));
  };

  const grupoDireccion = grupo(
    'Dirección', [['asc', 'Ascendentes'], ['desc', 'Descendentes'], ['azar', 'Al azar']],
    () => direccion, (v) => { direccion = v; }, { reparte: true });


  const grupoItems = pideItems
    ? grupo('Ítems', [[10, '10'], [20, '20'], [30, '30']], () => items, (v) => { items = v; },
            { reparte: true })
    : null;

  const numeros = [];
  for (let n = 2; n <= MAX_EQUIPOS; n++) numeros.push([n, String(n)]);
  const grupoEquipos = porEquipos
    ? grupo('Equipos', numeros, () => equipos, (v) => { equipos = v; })
    : null;
  const grupoPlazo = porEquipos
    ? grupo('Tiempo para responder',
            PLAZOS.map((p) => [p, p === null ? 'Sin reloj' : `${p} s`]),
            () => plazo, (v) => { plazo = v; })
    : null;



  const notaPlazo = porEquipos ? el('p.nota') : null;
  if (notaPlazo) {
    refrescos.push(() => {





      notaPlazo.textContent = plazo === null
        ? 'Tú decides cuándo levantan las pizarras.'
        : 'Al llegar a cero levantan todos a la vez. La solución espera a «Resolver».';
    });
  }

  empezar.onclick = () => {
    const orden = datos.intervalos.map((i) => i.id).filter((id) => elegidos.has(id));




    let destino = `/${juego.id}/jugar?modo=${modo}&intervalos=${orden.join(',')}`
      + `&direccion=${direccion}`;
    if (pideItems) destino += `&items=${items}`;
    if (porEquipos) destino += `&equipos=${equipos}&plazo=${plazo ?? 'sin'}`;
    ir(destino);
  };

  actualizar();




  return el(`section.preparar${porEquipos ? '.preparar-aula' : ''}`, {},
    el('header.cabecera', {},
      el('a.atras', { href: `#/${juego.id}/modos` }, '‹ Modos'),
      el('h2', {}, MODOS[modo].nombre)),

    el('p.nota.entradilla', {}, MODOS[modo].detalle),

    el('div.tarjeta', {},








      el('div.bloque', {},
         el('div.rotulo-fila', {},
            el('h3', {}, 'Intervalos'),
            el('span.atajos', {},
               el('button.enlace', {
                 type: 'button',
                 onclick: () => marcar(datos.intervalos.map((i) => i.id)),
               }, 'Todos'),
               el('button.enlace', { type: 'button', onclick: () => marcar([]) }, 'Ninguno'))),
         el('div.cuadricula', {}, casillas)),




      el('div.grupo', {},
        el('h3', {}, 'O los de un nivel'),
        el('div.fila', {}, chipsNivel)),

      grupoDireccion,
      grupoItems,
      grupoEquipos,
      grupoPlazo,

      notaPlazo,

      el('div.arranque', {}, empezar, aviso)));




}
