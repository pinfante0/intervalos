








import { el } from '../nucleo/dom.js';









const atrasALaPuerta = (consola) => el('a.atras', { href: '#/' },
  `‹ ${consola.juego().nombre}`);












export const accesos = () => el('nav.acciones-chrome', {},
  el('a.chip', { href: '#/ajustes' }, 'Ajustes'),
  el('a.chip', { href: '#/creditos' }, 'Créditos'));



export function pantallaAjustes(consola) {
  const { progreso, piano } = consola;
  const ajustes = progreso.ajustes;

  const temas = [['auto', 'Como el sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
  const botonesTema = temas.map(([id, texto]) => el('button.chip', {
    type: 'button',
    clase: id === ajustes.tema ? 'elegido' : '',
    onclick: (evento) => {
      consola.aplicarTema(id);
      progreso.ajustar({ tema: id });
      for (const hermano of evento.target.parentElement.children) {
        hermano.classList.remove('elegido');
      }
      evento.target.classList.add('elegido');
    },
  }, texto));

  const valor = el('span.cifra', {}, `${Math.round(ajustes.volumen * 100)} %`);
  const deslizador = el('input', {
    type: 'range', min: 0, max: 100, value: Math.round(ajustes.volumen * 100),
    'aria-label': 'Volumen',
    oninput: (evento) => {
      const v = Number(evento.target.value) / 100;
      piano.volumen = v;
      valor.textContent = `${evento.target.value} %`;
      progreso.ajustar({ volumen: v });
    },
  });



  const probar = el('button', {
    type: 'button',
    onclick: async () => {
      await piano.despertar();
      await piano.tocarIntervalo([60, 67]);
    },
  }, 'Probar');

  const borrar = el('button.peligro', {
    type: 'button',
    onclick: (evento) => {
      if (evento.target.dataset.seguro !== 'si') {
        evento.target.dataset.seguro = 'si';
        evento.target.textContent = '¿Seguro? Pulsa otra vez';
        return;
      }
      progreso.borrar();
      evento.target.textContent = 'Borrado';
      evento.target.disabled = true;
    },
  }, 'Borrar todo el progreso');

  return el('section', {},
    el('header.cabecera', {},
      atrasALaPuerta(consola),
      el('h2', {}, 'Ajustes')),

    el('div.tarjeta', {},
      el('h3', {}, 'Tema'),
      el('div.fila', {}, botonesTema)),

    el('div.tarjeta', {},
      el('h3', {}, 'Volumen'),
      el('div.fila', {}, deslizador, valor, probar)),

    el('div.tarjeta', {},
      el('h3', {}, 'Progreso'),
      el('p.nota', {}, progreso.persiste
        ? 'El progreso se guarda en este aparato, sin nombre ni identificador de ningún '
          + 'tipo. No sale de aquí y no se puede saber de quién es.'
        : 'Este navegador no deja guardar nada —modo privado, seguramente—, así que el '
          + 'progreso durará lo que dure la pestaña abierta. Se puede jugar igual.'),
      borrar));
}



export function pantallaCreditos(consola) {
  return el('section', {},
    el('header.cabecera', {},
      atrasALaPuerta(consola),
      el('h2', {}, 'Créditos')),














    el('div.tarjeta.autoria', {},
      el('p.antefirma', {}, 'Juego desarrollado por'),
      el('p.firma', {}, 'Pablo Infante Amate')),


















    el('div.tarjeta', {},

















      el('h3', {}, 'De dónde sale'),
      el('p', {}, 'Creado para la asignatura Educación Musical y su Didáctica de la '
        + 'Universidad de Jaén, pero sirve en otros contextos educativos o como '
        + 'entretenimiento.'),









      el('h3', {}, 'El sonido'),
      el('p', {}, 'Las 48 notas de piano proceden de ',
        el('a', { href: 'https://github.com/gleitz/midi-js-soundfonts', target: '_blank',
                  rel: 'noopener' }, 'midi-js-soundfonts'),
        ' (CC BY 3.0).'),







      el('h3', {}, 'Cómo funciona'),
      el('p', {}, 'No se recoge ningún dato. El progreso vive en este navegador.')));
}
