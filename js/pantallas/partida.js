


































import { el, vaciar, añadir, esperar, reloj } from '../nucleo/dom.js';
import { Ronda, MS_CONTRARRELOJ } from '../nucleo/rondas.js';
import { MODOS, MAX_EQUIPOS, nombreModo, eligeEn, pistaEn, repartoEn } from '../nucleo/modos.js';
import { nombreEs } from '../nucleo/alturas.js';









const PAUSA_ACIERTO = 2200;







const PAUSA_FALLO_CONTRARRELOJ = 2400;











const PAUSA_ANTES_DE_CORREGIR = 900;

export function pantallaPartida(consola, { params, consulta, ir }) {
  const { datos, progreso, piano } = consola;
  const juego = consola.juego(params.juego);

  const modo = consulta.get('modo') ?? 'individual';


  const nivel = consulta.has('nivel') ? datos.nivel(Number(consulta.get('nivel'))) : null;
  const equipos = Math.min(MAX_EQUIPOS, Math.max(2, cuantos(consulta, 'equipos', 4)));
  const plazo = consulta.get('plazo') === 'sin' ? null : cuantos(consulta, 'plazo', 15);

  const config = eligeEn(modo) === 'nivel'
    ? juego.configDeNivel(datos, nivel)
    : juego.configLibre(datos, {
      intervalos: (consulta.get('intervalos') ?? '').split(',').filter(Boolean),
      direccion: consulta.get('direccion') ?? 'azar',
      items: cuantos(consulta, 'items', 10),
    });

  const nodo = el('section.partida');
  let vivo = true;
  let cronometro = null;
  let soltarEspera = null;

  const alSalir = () => {
    vivo = false;
    clearInterval(cronometro);
    soltarEspera?.();
    piano.callar();
  };

  pintarPreparacion();
  return { nodo, alSalir };








  function pintarPreparacion() {




    const titulo = nivel
      ? `Nivel ${nivel.id} · ${nivel.nombre}`
      : nombreModo(modo);
    const estado = el('p.estado');

    const empezar = el('button.principal.grande', {
      type: 'button',
      onclick: async () => {
        empezar.disabled = true;
        estado.textContent = 'Preparando el piano…';
        try {
          await piano.despertar();
          await piano.precargarRegistro(config.registro);
        } catch (fallo) {
          estado.textContent = `No se ha podido abrir el audio: ${fallo.message}`;
          empezar.disabled = false;
          return;
        }
        if (vivo) jugar();
      },
    }, 'Empezar');

    vaciar(nodo).append(
      cabeceraSimple(titulo, params.juego, modo),
      el('div.tarjeta', {},
        el('p.objetivo', {}, nivel ? nivel.objetivo : resumenElegido()),
        el('div.arranque', {}, empezar, estado),
        nivel?.nota_didactica && el('p.didactica', {}, nivel.nota_didactica)),
    );
  }








  function resumenElegido() {
    const nombres = config.intervalos.map((id) => datos.intervalo(id).etiqueta).join(', ');
    const direccion = { asc: 'ascendentes', desc: 'descendentes', azar: 'en las dos direcciones' }[
      consulta.get('direccion') ?? 'azar'];
    const cuantos = modo === 'contrarreloj'
      ? 'Un minuto'
      : `${config.items} ítems`;
    const conEquipos = modo === 'aula'
      ? ` · ${equipos} equipos, ${plazo === null ? 'sin reloj' : `${plazo} s`} por intervalo`
      : '';
    return `${cuantos} de ${nombres}, ${direccion}.${conEquipos}`;
  }



  function jugar() {
    const porEquipos = modo === 'aula';





    nodo.classList.toggle('aula', porEquipos);
    const ronda = new Ronda({
      juego: params.juego,
      nivel: nivel?.id ?? null,
      modo,
      items: modo === 'contrarreloj' ? null : config.items,
      limiteMs: modo === 'contrarreloj' ? MS_CONTRARRELOJ : null,
      msPorItem: porEquipos && plazo !== null ? plazo * 1000 : null,
      equipos: porEquipos ? nombresDeEquipos(equipos) : null,



      generar: juego.generador(datos, config, {
        nivel: nivel?.id ?? null,
        historial: repartoEn(modo) === 'adaptativo'
          ? (intervalo, direccion) => progreso.estadistica(params.juego, intervalo, direccion)
          : null,
      }),
    });

    const marcador = el('div.marcador');
    const escuchar = el('button.escuchar', {
      type: 'button', 'aria-label': 'Escuchar el intervalo', onclick: () => sonar(),
    }, el('span.triangulo'));
    const etiqueta = el('p.etiqueta', {}, 'ESCUCHAR');
    const cuenta = el('p.cuenta-atras');
    const aviso = el('p.aviso');
    const racha = el('span.racha');
    const acciones = el('div.acciones-item');












    const cuandoPista = pistaEn(modo);
    const pista = cuandoPista === 'nunca' ? null : botonPista();




    const banda = el('div.estimulo', {},
      el('div.lado', {}, pista),
      el('div.centro', {}, escuchar, etiqueta, cuenta),
      el('div.lado'));


    const escena = el('div.escena');



    let avisadoDelTiempo = false;

    const respuestas = juego.montarRespuesta({
      datos, config, interactiva: !porEquipos, responder: (elegida) => contestar(elegida),
    });





    vaciar(nodo).append(
      el('header.cabecera', {},
        el('a.atras', { href: `#/${params.juego}/modos` }, '‹ Salir'),
        marcador, racha),
      escena);

    if (modo === 'contrarreloj') {
      cronometro = setInterval(() => {
        if (!vivo) return clearInterval(cronometro);
        pintarMarcador();
      }, 200);
    }

    servir(ronda.comenzar());










    function escenaResponder() {
      escena.className = 'escena responder';
      banda.classList.remove('compacta');
      vaciar(escena).append(banda, aviso, acciones, respuestas.nodo);
    }








    function escenaCorregir() {
      escena.className = 'escena corregir';
      banda.classList.add('compacta');
      vaciar(escena).append(banda, aviso, acciones);
    }



    async function servir(item) {
      if (!item || !vivo) return;
      respuestas.preparar();
      vaciar(acciones);
      aviso.textContent = '';
      aviso.className = 'aviso';
      cuenta.textContent = '';
      escenaResponder();
      pintarMarcador();
      pintarPista('responder');
      await sonar();
      if (!vivo) return;
      if (porEquipos) abrirPlazo();
    }

    async function sonar() {
      const item = ronda.item;
      if (!item || !vivo) return;
      escuchar.disabled = true;
      escuchar.classList.add('sonando');
      etiqueta.textContent = 'SONANDO';
      try {
        await juego.presentar(item, piano);
      } catch (fallo) {
        aviso.textContent = `El piano no ha podido sonar: ${fallo.message}`;
        aviso.className = 'aviso mal';
      }
      if (!vivo) return;
      escuchar.classList.remove('sonando');
      escuchar.disabled = false;
      etiqueta.textContent = 'REPETIR';




      ronda.escuchado();
    }















    function botonPista() {
      const boton = el('button.pista', {
        type: 'button',
        onclick: () => sonarPista(boton),
      }, el('span.icono', {}, '♪'), 'Canción');
      return boton;
    }













    function pintarPista(momento) {
      if (!pista) return;
      const item = ronda.item;
      const hay = item ? juego.pista(datos, item) : null;
      const toca = cuandoPista === 'siempre' || momento === 'corregir';
      const ver = Boolean(hay) && toca;
      pista.hidden = !ver;
      pista.disabled = !ver;
      if (ver) pista.title = `Suena «${hay.cancion.titulo}», que empieza por este intervalo`;
    }

    async function sonarPista(boton) {
      const item = ronda.item;
      const hay = item && juego.pista(datos, item);
      if (!hay || !vivo) return;
      boton.disabled = true;
      escuchar.disabled = true;
      const { cancion, sonando } = hay;








      pintarAviso('pista-sonando', el('span.linea', {},
        `«${cancion.titulo}» empieza por este intervalo.`));
      try {
        await piano.tocarMelodia(sonando.notas, sonando.duraciones, sonando.tempo);
      } finally {
        if (vivo) { boton.disabled = false; escuchar.disabled = false; }
      }
    }



    async function contestar(elegida) {
      if (!vivo || ronda.terminada || porEquipos) return;
      respuestas.bloquear();
      const resultado = ronda.responder(elegida);

      progreso.anotarRespuesta(params.juego, {
        intervalo: resultado.item.intervalo,
        direccion: resultado.item.direccion,
        acierto: resultado.acierto,
        respuesta: elegida,
        ms: resultado.ms,
      });

      respuestas.marcar(resultado.item, elegida, resultado.acierto);
      pintarMarcador();





      if (resultado.acierto || modo === 'contrarreloj') {
        comentario(resultado, elegida);
        await esperar(resultado.acierto ? PAUSA_ACIERTO : PAUSA_FALLO_CONTRARRELOJ);
      } else {




        comentario(resultado, elegida, { conNotas: false });




        await esperar(PAUSA_ANTES_DE_CORREGIR);
        if (!vivo) return;
        escenaCorregir();





        pintarPista('corregir');
        await esperarPulsacion('Siguiente', {
          panel: pantallaDeError(resultado.item, elegida),
        });
      }
      if (!vivo) return;

      const siguiente = ronda.siguiente();
      if (siguiente) servir(siguiente);
      else terminar();
    }










    function comentario({ item, acierto }, elegida, { conNotas = true } = {}) {







      const linea = acierto
        ? el('span.linea', {}, '¡Bien! ', abreviatura(item.intervalo, { propio: false }))
        : el('span.linea', {}, 'Era ', abreviatura(item.intervalo, { propio: false }), ', no ',
             abreviatura(elegida, { propio: false }));
      pintarAviso(`grande ${acierto ? 'bien' : 'mal'}`, linea, conNotas && alturas(item));
    }












    function pantallaDeError(item, elegida) {
      return juego.montarError?.({
        datos,
        item,
        respuesta: elegida,



        veces: progreso.confusion(params.juego, item.intervalo, item.direccion, elegida),
        tocar: tocarSalto,
      }) ?? null;
    }







    async function tocarSalto(notas) {
      if (!vivo) return false;


      const pistaComoEstaba = pista?.disabled;
      escuchar.disabled = true;
      if (pista) pista.disabled = true;
      try {
        await piano.tocarIntervalo(notas);
      } catch (fallo) {
        aviso.textContent = `El piano no ha podido sonar: ${fallo.message}`;
        aviso.className = 'aviso mal';
      } finally {
        if (vivo) {
          escuchar.disabled = false;
          if (pista) pista.disabled = pistaComoEstaba;
        }
      }
      return vivo;
    }










    function abrirPlazo() {
      const resolver = el('button.principal', {
        type: 'button', onclick: () => resolverItem(),
      }, 'Resolver');
      vaciar(acciones).append(resolver);

      if (ronda.msPorItem === null) {
        aviso.textContent = 'Cuando estén listos, que levanten las pizarras.';
        aviso.className = 'aviso turno';
        return;
      }

      clearInterval(cronometro);
      cronometro = setInterval(() => {
        if (!vivo || ronda.terminada) return clearInterval(cronometro);
        const quedan = ronda.msDelItem;
        if (quedan === null) return;
        if (quedan > 0) {
          cuenta.textContent = Math.ceil(quedan / 1000);
          cuenta.className = 'cuenta-atras corriendo';
        } else {
          clearInterval(cronometro);
          cuenta.textContent = '';
          aviso.textContent = '¡Arriba las pizarras!';
          aviso.className = 'aviso grande turno';
          resolver.focus();
        }
      }, 100);
    }


    function resolverItem() {
      clearInterval(cronometro);
      cuenta.textContent = '';
      const item = ronda.item;
      respuestas.resolver(item);




      banda.classList.add('compacta');



      pintarAviso('resuelto bien',
                  el('span.solucion', {},
                     abreviatura(item.intervalo),
                     el('span.flecha', {}, item.direccion === 'asc' ? '↑' : '↓')),
                  alturas(item));

      const acertados = new Set();
      const tabla = el('div.clasificacion');

      const fichas = ronda.equipos.map((equipo) => el('button.equipo', {
        type: 'button',
        'aria-pressed': 'false',
        'aria-label': `${equipo.nombre}, ha acertado`,
        onclick: (evento) => {
          if (acertados.has(equipo.numero)) acertados.delete(equipo.numero);
          else acertados.add(equipo.numero);
          const marcado = acertados.has(equipo.numero);
          evento.currentTarget.classList.toggle('acertado', marcado);
          evento.currentTarget.setAttribute('aria-pressed', String(marcado));
          pintarClasificacion(tabla, acertados);
        },
      }, equipo.numero));

      const siguiente = el('button.principal', {
        type: 'button',
        onclick: () => {
          const resultado = ronda.responderEquipos([...acertados]);



          for (const equipo of resultado.equipos) {
            progreso.anotarRespuesta(params.juego, {
              intervalo: item.intervalo,
              direccion: item.direccion,
              acierto: equipo.acierto,
              respuesta: null,
              ms: 0,
            });
          }
          const proximo = ronda.siguiente();
          if (proximo) servir(proximo);
          else terminar();
        },
      }, 'Siguiente');

      vaciar(acciones).append(
        el('p.instruccion', {}, '¿Qué equipos la han acertado?'),
        el('div.equipos-fila', {}, fichas),
        tabla,
        el('div.par', {}, siguiente));
      pintarClasificacion(tabla, acertados);





      pintarPista('corregir');
    }


    function pintarClasificacion(tabla, acertados) {
      const provisional = ronda.equipos
        .map((e) => ({ ...e, aciertos: e.aciertos + (acertados.has(e.numero) ? 1 : 0) }))
        .sort((a, b) => b.aciertos - a.aciertos || a.numero - b.numero);
      const lider = provisional[0]?.aciertos ?? 0;

      vaciar(tabla).append(...provisional.map((e, i) => el('div.puesto', {
        clase: e.aciertos === lider && lider > 0 ? 'lider' : '',
      },
      el('span.pos', {}, `${i + 1}.`),
      el('span.quien', {}, e.nombre),
      el('span.tantos', {}, e.aciertos))));
    }



    function pintarAviso(clase, ...contenido) {
      vaciar(aviso);
      aviso.className = `aviso ${clase}`;
      añadir(aviso, contenido);
    }











    function abreviatura(id, { propio = true } = {}) {
      const intervalo = datos.intervalo(id);
      const nodo = el('strong.abrev', { title: intervalo.nombre }, intervalo.etiqueta);
      if (propio) nodo.style.setProperty('--color', datos.color(id));
      else nodo.classList.add('del-veredicto');
      return nodo;
    }


    function alturas(item) {
      return el('span.alturas', {}, item.notas.map(nombreEs).join(' → '));
    }








    function esperarPulsacion(texto, { panel = null } = {}) {
      return new Promise((listo) => {
        const boton = el('button.principal', { type: 'button', onclick: () => listo() }, texto);



        añadir(vaciar(acciones), [panel, el('div.par', {}, boton)]);
        boton.focus();
        soltarEspera = listo;
      });
    }

    function pintarMarcador() {
      vaciar(marcador);
      if (modo === 'contrarreloj') {
        marcador.append(el('span.crono', {}, reloj(ronda.msRestantes)),
                        el('span.cuenta', {}, `${ronda.aciertos} aciertos`));





        const pendiente = ronda.respondidos < ronda.numero;
        if (ronda.msRestantes === 0 && !ronda.terminada && pendiente && !avisadoDelTiempo) {
          avisadoDelTiempo = true;
          aviso.textContent = '¡Tiempo! Contesta este último y se acabó.';
          aviso.className = 'aviso turno';
        }
      } else {
        marcador.append(puntos(ronda));
      }

      vaciar(racha);
      if (!porEquipos && ronda.racha > 1) {
        racha.append(el('span.llama', {}, '🔥'), el('span.numero', {}, ronda.racha));
        racha.className = `racha viva${ronda.racha >= 5 ? ' ardiendo' : ''}`;
      } else {
        racha.className = 'racha';
      }
    }

    function terminar() {
      clearInterval(cronometro);
      const resumen = ronda.resumen();
      const superado = Boolean(nivel) && modo === 'individual'
        && resumen.aciertos >= nivel.aciertos_para_superar;
      resumen.cierre = progreso.cerrarPartida(params.juego, {
        nivel: nivel?.id ?? null,
        modo,
        aciertos: resumen.aciertos,
        fallos: resumen.fallos,
        racha_max: resumen.racha_max,
        ms_total: resumen.ms_total,
        superado,
        ultimo_nivel: datos.ultimoNivel,
      });
      resumen.nivel_nombre = nivel ? `Nivel ${nivel.id} · ${nivel.nombre}` : null;
      resumen.aciertos_para_superar = nivel?.aciertos_para_superar ?? null;
      resumen.enlace_repetir = location.hash.slice(1);
      consola.ultimoResumen = resumen;
      ir(`/${params.juego}/resultados`, { reemplazar: true });
    }
  }
}












function cuantos(consulta, clave, porDefecto) {
  if (!consulta.has(clave)) return porDefecto;
  const valor = Math.round(Number(consulta.get(clave)));
  return Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
}


function puntos(ronda) {
  const fila = el('div.puntos', {
    role: 'img',
    'aria-label': `Ítem ${ronda.numero} de ${ronda.total}`,
  });
  for (let i = 1; i <= ronda.total; i++) {
    fila.append(el('span.punto', {
      clase: i <= ronda.respondidos ? 'hecho' : (i === ronda.numero ? 'ahora' : ''),
    }));
  }
  return fila;
}


function nombresDeEquipos(cuantos) {
  return Array.from({ length: cuantos }, (unused, i) => `Equipo ${i + 1}`);
}


function cabeceraSimple(titulo, juego, modo) {
  const atras = eligeEn(modo) === 'nivel'
    ? `#/${juego}/niveles`
    : `#/${juego}/preparar?modo=${modo}`;
  return el('header.cabecera', {},
    el('a.atras', { href: atras }, eligeEn(modo) === 'nivel' ? '‹ Niveles' : '‹ Cambiar'),
    el('h2', {}, titulo));
}
