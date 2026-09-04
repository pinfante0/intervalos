


















































































































export const MODOS = {
  libre: {
    id: 'libre',
    nombre: 'Práctica',
    orden: 1,
    resumen: 'Eliges tú qué suena y en qué dirección.',
    detalle: 'Eliges tú qué intervalos suenan y en qué dirección. Para estudiar por tu '
      + 'cuenta lo que te haga falta.',
    pista: 'siempre',
    reparto: 'adaptativo',
    elige: 'intervalos',
    duracion: 'items',
    porEquipos: false,
  },
  individual: {
    id: 'individual',
    nombre: 'Reto',
    orden: 2,






    resumen: 'Supera un nivel para pasar al siguiente.',
    detalle: 'Los ítems del nivel, sin reloj y sin elegir nada. Es el único modo que abre '
      + 'el nivel siguiente.',
    pista: 'tras-fallar',
    reparto: 'uniforme',
    elige: 'nivel',
    duracion: 'items',
    porEquipos: false,
  },
  contrarreloj: {
    id: 'contrarreloj',
    nombre: 'Contrarreloj',
    orden: 3,
    resumen: 'Un minuto, los ítems que entren.',
    detalle: 'Un minuto, los ítems que entren. Cuenta para las estadísticas, pero no abre '
      + 'niveles ni da tiempo a oír canciones.',
    pista: 'nunca',
    reparto: 'uniforme',
    elige: 'intervalos',
    duracion: 'reloj',
    porEquipos: false,
  },
  aula: {
    id: 'aula',




    nombre: 'Concurso (en el aula)',
    orden: 4,
    resumen: 'Proyectado en clase, por equipos.',
    detalle: 'Proyectado en clase: suena una vez, todos los equipos responden a la vez en '
      + 'su pizarra y el profesor registra quién ha acertado. No mueve el progreso de nadie.',
    pista: 'al-resolver',
    reparto: 'uniforme',
    elige: 'intervalos',
    duracion: 'items',
    porEquipos: true,
  },
};







export const MAX_EQUIPOS = 10;


export const PLAZOS = [10, 15, 20, 30, null];


export const eligeEn = (id) => MODOS[id]?.elige ?? 'intervalos';


export const duracionEn = (id) => MODOS[id]?.duracion ?? 'items';


export const porEquiposEn = (id) => MODOS[id]?.porEquipos === true;


export const TODOS = Object.values(MODOS).sort((a, b) => a.orden - b.orden);

export const nombreModo = (id) => MODOS[id]?.nombre ?? id;

export const pistaEn = (id) => MODOS[id]?.pista ?? 'nunca';






export const repartoEn = (id) => MODOS[id]?.reparto ?? 'uniforme';
