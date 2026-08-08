// La consola: arranque y cableado.
//
// **La consola es el armazón, no un menú. Cerrado el 07/08/2026.** Aquí ponía
// que el proyecto era «una consola con varios juegos dentro», y de eso salía una
// pantalla de inicio que enseñaba una lista de juegos. Ya no: **cada juego se
// reparte por su cuenta, con su enlace y su portada**, porque uno puede acabar
// en una asignatura y otro en otra, y a quien recibe Intervalia una lista con
// dos juegos que no puede abrir no le dice nada. Lo que se comparte es el
// código —el motor de rondas, el piano, el progreso, el estilo, estas
// pantallas—, y eso no tiene por qué verse desde fuera.
//
// Así que una compilación lleva **un juego**, `#/` es su portada y no hay menú
// en ninguna parte. El día que exista el Juego 2, su módulo entra en js/juegos/
// y se monta su propia compilación; lo que no vuelve es la lista.
//
// Ver docs/consola.md.

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

/**
 * El juego que lleva esta compilación. Uno, y por eso no es una lista.
 *
 * Aquí había un array de tres —Intervalia y los dos que aún no existen, apagados
 * y con su descripción—, entre dos marcas de comentario para que
 * `montar_publicable.py --juego` pudiera cortar ahí y producir una compilación
 * que no los nombrase. Toda esa maquinaria existía para esconder un menú, y el
 * menú se ha ido: **cada juego se reparte por su cuenta**, así que el caso
 * «varios dentro y hay que quitar los que sobran» no se da nunca.
 *
 * Los dos que faltan no se pierden por esto: están descritos, con su temario y
 * sus niveles, en `docs/ideas_de_juego.md`, que es donde se piensan. Un `resumen`
 * de dos líneas en un array de JavaScript no era su sitio; era el texto que
 * necesitaba una tarjeta de menú.
 *
 * Las rutas siguen siendo `/:juego/...` a propósito, con el id dentro, para que
 * un QR de aula o el marcador de un alumno sigan valiendo. Que hoy solo haya un
 * valor posible no es razón para cambiarlas.
 */
const JUEGO = intervalos;

async function arrancar() {
  const contenedor = document.getElementById('pantalla');
  const progreso = new Progreso();

  // `?edicion=publicable` sirve para comprobar desde el navegador qué se ve en
  // la versión publicable. Es para mirar, no para proteger: la versión que se
  // publique de verdad no puede llevar en los archivos lo que no debe enseñar.
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
    /** El resumen de la última partida, para la pantalla de resultados. */
    ultimoResumen: null,

    /**
     * El juego de esta compilación. Con `id` además comprueba que la dirección
     * habla de él.
     *
     * Sin argumento lo devuelve y ya: lo piden las dos pantallas que no cuelgan
     * de ninguna ruta con `:juego` dentro —ajustes y créditos—, que necesitan su
     * nombre para el enlace de vuelta. Con argumento sigue validando, porque las
     * rutas siguen llevando el id y una dirección escrita a mano puede traer
     * cualquier cosa.
     */
    juego(id) {
      if (id !== undefined && id !== JUEGO.id) {
        throw new Error(`Aquí no hay ningún juego «${id}».`);
      }
      return JUEGO;
    },

    /** `auto` deja mandar al sistema; los otros dos, al alumno. */
    aplicarTema(tema) {
      if (tema === 'auto') delete document.documentElement.dataset.tema;
      else document.documentElement.dataset.tema = tema;
    },
  };

  consola.aplicarTema(progreso.ajustes.tema);

  // Las rutas concretas van antes que `/:juego`, que se las tragaría todas.
  //
  // **`#/` es la entrada del juego**, que es su portada si la trae y sus cuatro
  // modos si no. Aquí había una bifurcación —portada o menú de la consola— y ya
  // no hay nada que bifurcar. Detrás, `/modos` son los cuatro, `/niveles` la
  // progresión —que solo usa el Reto— y `/preparar` la cuadrícula de intervalos
  // que comparten los otros tres. Todas son literales detrás de `:juego`, así
  // que ninguna se traga a otra.
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
    // Las dos tablas de detalle, que hasta el 07/08/2026 iban al final de la
    // pantalla de la que cuelgan y la sacaban de la pantalla del teléfono.
    // `/detalle` es de la última partida y vive en memoria; `/progreso`, del
    // progreso guardado.
    .ruta('/:juego/detalle', (ctx) => pantallaDetalle(consola, ctx))
    .ruta('/:juego/progreso', (ctx) => pantallaProgreso(consola, ctx))
    .arrancar();

  // Al ocultarse la pestaña —el alumno cambia de aplicación, el profesor cambia
  // de ventana proyectada— se calla el piano. Volver y encontrarse una nota a
  // medias es peor que el silencio.
  addEventListener('visibilitychange', () => {
    if (document.hidden) piano.callar();
  });
}

arrancar();
