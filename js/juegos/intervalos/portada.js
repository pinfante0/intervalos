
























import { el } from '../../nucleo/dom.js';










const DE_QUE_VA = 'Un juego para trabajar el reconocimiento auditivo de intervalos musicales.';











export function montarPortada({ juego, datos, entrar, accesos = null }) {






  const cinta = el('div.cinta', { 'aria-hidden': 'true' },
    datos.intervalos.map((intervalo, turno) => {
      const grano = el('span.grano', {}, intervalo.etiqueta);
      grano.style.setProperty('--color', datos.color(intervalo.id));
      grano.style.setProperty('--turno', String(turno));
      return grano;
    }));








  return el('section.portada-llena', {},
    el('div.chrome', {}, accesos),

    el('div.centro', {},
      el('h1', {}, juego.nombre),
      el('p.pitch', {}, DE_QUE_VA),
      cinta,
      el('a.principal.grande.comenzar', { href: entrar }, 'Comenzar')),









    el('footer.sello', {},
      el('span.institucion', {},
        el('span.escudo', { 'aria-hidden': 'true' }),
        'Universidad de Jaén'),
      el('span.autor', {}, 'Pablo Infante Amate')));
}
