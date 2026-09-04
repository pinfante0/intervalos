
















import { cargarDatos, EDICION, LISTA_BLANCA } from './nucleo/datos.js';
import { Progreso } from './nucleo/progreso.js';
import { Navegacion } from './nucleo/navegacion.js';
import { Piano } from './nucleo/audio.js';
import { el } from './nucleo/dom.js';

import { juego as intervalos } from './juegos/intervalos/juego.js';
import { pantallaAjustes, pantallaCreditos } from './pantallas/ajustes.js';
import { pantallaEntrada, pantallaModos, pantallaNiveles, pantallaPreparar, pantallaProgreso }
  from './pantallas/niveles.js';
import { pantallaPartida } from './pantallas/partida.js';
import { pantallaResultados, pantallaDetalle } from './pantallas/resultados.js';




















const JUEGO = intervalos;

async function arrancar() {
  const contenedor = document.getElementById('pantalla');
  const progreso = new Progreso();




  const pedida = new URLSearchParams(location.search).get('edicion');
  const edicion = LISTA_BLANCA[pedida] ? pedida : EDICION;

  let datos;
  try {
    datos = await cargarDatos({ edicion });
  } catch (fallo) {
    contenedor.append(el('div.tarjeta.fallo', {},
      el('h2', {}, 'No se han podido cargar los datos'),
      el('p', {}, fallo.message)));
    return;
  }

  const piano = new Piano({ volumen: progreso.ajustes.volumen });

  const consola = {
    datos,
    progreso,
    piano,

    ultimoResumen: null,











    juego(id) {
      if (id !== undefined && id !== JUEGO.id) {
        throw new Error(`Aquí no hay ningún juego «${id}».`);
      }
      return JUEGO;
    },


    aplicarTema(tema) {
      if (tema === 'auto') delete document.documentElement.dataset.tema;
      else document.documentElement.dataset.tema = tema;
    },
  };

  consola.aplicarTema(progreso.ajustes.tema);









  const nav = new Navegacion(contenedor);
  nav.ruta('/', () => pantallaEntrada(consola, { params: { juego: JUEGO.id } }))
    .ruta('/ajustes', () => pantallaAjustes(consola))
    .ruta('/creditos', () => pantallaCreditos(consola))
    .ruta('/:juego', (ctx) => pantallaEntrada(consola, ctx))
    .ruta('/:juego/modos', (ctx) => pantallaModos(consola, ctx))
    .ruta('/:juego/niveles', (ctx) => pantallaNiveles(consola, ctx))
    .ruta('/:juego/preparar', (ctx) => pantallaPreparar(consola, ctx))
    .ruta('/:juego/jugar', (ctx) => pantallaPartida(consola, ctx))
    .ruta('/:juego/resultados', (ctx) => pantallaResultados(consola, ctx))




    .ruta('/:juego/detalle', (ctx) => pantallaDetalle(consola, ctx))
    .ruta('/:juego/progreso', (ctx) => pantallaProgreso(consola, ctx))
    .arrancar();




  addEventListener('visibilitychange', () => {
    if (document.hidden) piano.callar();
  });
}

arrancar();
