




















import { el } from '../../nucleo/dom.js';
import { transportada } from '../../nucleo/canciones.js';
import { generadorDeItems } from './items.js';
import { montarError } from './error.js';
import { montarPortada } from './portada.js';


export const MINIMO_LIBRE = 2;








export const juego = {




  id: 'intervalos',
  nombre: 'Intervalia',
  tema: 'Tema 4',
  resumen: 'Suena un intervalo melódico y hay que nombrarlo con su abreviatura. '
    + 'Es la tarea del examen, con el mismo timbre y la misma nomenclatura.',
  disponible: true,











  minimoElegidos: MINIMO_LIBRE,


  async presentar(item, piano) {
    await piano.tocarIntervalo(item.notas);
  },


  configDeNivel(datos, nivel) {
    return {
      intervalos: nivel.intervalos,
      direcciones: nivel.direcciones,
      registro: nivel.registro,
      items: nivel.items,
    };
  },













  configLibre(datos, { intervalos, direccion = 'azar', items = 10 }) {
    if (intervalos.length < MINIMO_LIBRE) {
      throw new Error(`Hay que elegir al menos ${MINIMO_LIBRE} intervalos: con uno solo, `
        + 'la cuadrícula deja un único botón pulsable y no hay nada que decidir.');
    }
    return {
      intervalos,
      direcciones: direccion === 'azar' ? ['asc', 'desc'] : [direccion],
      registro: datos.registroMasAncho,
      items,
    };
  },

  generador(datos, config, opciones) {
    return generadorDeItems(datos, { ...config, ...opciones });
  },
















  pista(datos, item) {
    for (const cancion of datos.cancionesDe(item.intervalo, item.direccion)) {
      const sonando = transportada(cancion, item.nota_inicial);



      if (sonando) return { cancion, sonando };
    }
    return null;
  },












  montarError,









  portada: montarPortada,











  montarRespuesta({ datos, config, responder, interactiva = true }) {
    const enJuego = new Set(config.intervalos);
    const botones = new Map();

    const cuadricula = el('div.cuadricula', { role: 'group', 'aria-label': 'Respuestas' });
    for (const intervalo of datos.intervalos) {
      const activo = enJuego.has(intervalo.id);
      const boton = el('button.respuesta', {
        type: 'button',
        disabled: true,
        'aria-label': intervalo.nombre,
        title: activo ? intervalo.nombre : `${intervalo.nombre} — no entra en esta ronda`,
        datos: { cualidad: intervalo.cualidad, activo: String(activo) },
        onclick: interactiva ? () => responder(intervalo.id) : null,
      }, intervalo.etiqueta);


      boton.style.setProperty('--color', datos.color(intervalo.id));
      botones.set(intervalo.id, boton);
      cuadricula.append(boton);
    }

    const nodo = el('div.respuestas', {},
      el('p.pregunta', {}, '¿Qué intervalo es?'),
      cuadricula);

    const limpiar = () => {
      for (const boton of botones.values()) {
        boton.classList.remove('acierto', 'fallo', 'correcta');
      }
    };

    return {
      nodo,








      preparar() {
        limpiar();
        if (!interactiva) return;
        for (const [id, boton] of botones) boton.disabled = !enJuego.has(id);
      },


      bloquear() {
        for (const boton of botones.values()) boton.disabled = true;
      },






      marcar(item, respuesta, acierto) {
        botones.get(respuesta)?.classList.add(acierto ? 'acierto' : 'fallo');
        if (!acierto) botones.get(item.intervalo)?.classList.add('correcta');
      },


      resolver(item) {
        botones.get(item.intervalo)?.classList.add('correcta');
      },
    };
  },
};
