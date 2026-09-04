













import { MIDI_MIN, MIDI_MAX, enRegistro, notasDe } from './alturas.js';







const TAU_SOLTAR = 0.16;


const COLA = 5 * TAU_SOLTAR;


const RAMPA_FINAL = 0.02;




const PULSACION = 1.10;


const PULSACION_FINAL = 2.0;


















const SEPARACION = 1.15;


const ADELANTO = 0.06;















const GANANCIA_MAESTRA = 6.19;


const MS_CALLAR = 30;


const DESCARGAS_A_LA_VEZ = 6;

const RAIZ_MUESTRAS = new URL('../../audio/piano/', import.meta.url);








export function planNota(midi, { pulsacion = PULSACION_FINAL, ganancia = 1 } = {}) {
  return [{ midi, cuando: 0, pulsacion, ganancia }];
}







export function planIntervalo([primera, segunda],
                              { separacion = SEPARACION, ganancia = 1 } = {}) {
  return [
    { midi: primera, cuando: 0, pulsacion: PULSACION, ganancia },
    { midi: segunda, cuando: separacion, pulsacion: PULSACION_FINAL, ganancia },
  ];
}















export function planMelodia(notas, duraciones, tempo, { ganancia = 1 } = {}) {
  const pulso = 60 / tempo;
  let cuando = 0;
  return notas.map((midi, i) => {
    const evento = { midi, cuando, pulsacion: duraciones[i] * pulso, ganancia };
    cuando += duraciones[i] * pulso;
    return evento;
  });
}












export class Piano {
  #ctx = null;
  #propio = true;
  #maestro = null;
  #muestras = new Map();
  #vivas = new Set();
  #volumen;
  #raiz;
  #generacion = 0;





  constructor({ raiz = RAIZ_MUESTRAS, volumen = 0.8, contexto = null } = {}) {
    this.#raiz = raiz;
    this.#volumen = volumen;
    if (contexto) {
      this.#ctx = contexto;
      this.#propio = false;
      this.#crearMaestro();
    }
  }




  get despierto() {
    if (!this.#ctx) return false;
    return this.#propio ? this.#ctx.state === 'running' : true;
  }

  get volumen() {
    return this.#volumen;
  }


  set volumen(v) {
    this.#volumen = Math.min(1, Math.max(0, v));
    if (this.#maestro) {
      const t = this.#ctx.currentTime;
      this.#maestro.gain.cancelScheduledValues(t);
      this.#maestro.gain.setTargetAtTime(GANANCIA_MAESTRA * this.#volumen, t, 0.01);
    }
  }


  get estado() {
    return {
      contexto: this.#ctx ? this.#ctx.state : 'sin crear',
      frecuencia: this.#ctx ? this.#ctx.sampleRate : null,
      cargadas: [...this.#muestras.keys()].filter((m) => this.cargada(m)).length,
      sonando: this.#vivas.size,
    };
  }

  cargada(midi) {
    const m = this.#muestras.get(midi);
    return m !== undefined && !(m instanceof Promise);
  }












  async despertar() {
    if (!this.#propio) return true;

    if (!this.#ctx) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) throw new Error('Este navegador no tiene Web Audio.');
      this.#ctx = new Contexto({ latencyHint: 'interactive' });
      this.#crearMaestro();
    }
    if (this.#ctx.state !== 'running') await this.#ctx.resume();




    const mudo = this.#ctx.createBufferSource();
    mudo.buffer = this.#ctx.createBuffer(1, 1, this.#ctx.sampleRate);
    mudo.connect(this.#maestro);
    mudo.start();

    return this.despierto;
  }

  #crearMaestro() {
    this.#maestro = this.#ctx.createGain();
    this.#maestro.gain.value = GANANCIA_MAESTRA * this.#volumen;
    this.#maestro.connect(this.#ctx.destination);
  }









  async precargar(notas) {
    const pendientes = [...new Set(notas)].filter((m) => enRegistro(m) && !this.cargada(m));
    if (pendientes.length && !this.#ctx) await this.despertar();
    for (let i = 0; i < pendientes.length; i += DESCARGAS_A_LA_VEZ) {
      await Promise.all(pendientes.slice(i, i + DESCARGAS_A_LA_VEZ).map((m) => this.#muestra(m)));
    }
    return pendientes.length;
  }











  async precargarRegistro(registro) {
    return this.precargar(notasDe(registro));
  }

  async #muestra(midi) {
    const guardada = this.#muestras.get(midi);
    if (guardada) return guardada;

    const promesa = (async () => {
      try {
        const respuesta = await fetch(new URL(`${midi}.mp3`, this.#raiz));
        if (!respuesta.ok) {
          throw new Error(`No se pudo descargar la muestra ${midi}.mp3 (${respuesta.status}).`);
        }
        const audio = await this.#ctx.decodeAudioData(await respuesta.arrayBuffer());
        this.#muestras.set(midi, audio);
        return audio;
      } catch (fallo) {



        this.#muestras.delete(midi);
        throw fallo;
      }
    })();



    this.#muestras.set(midi, promesa);
    return promesa;
  }




  async tocarNota(midi, opciones) {
    return this.#reproducir(planNota(midi, opciones));
  }


  async tocarIntervalo(notas, opciones) {
    return this.#reproducir(planIntervalo(notas, opciones));
  }


  async tocarMelodia(notas, duraciones, tempo, opciones) {
    return this.#reproducir(planMelodia(notas, duraciones, tempo, opciones));
  }








  async programar(plan) {


    this.callar();
    const mia = this.#generacion;

    if (!this.despierto) await this.despertar();
    const buffers = await Promise.all(plan.map((e) => this.#pedir(e.midi)));



    if (mia !== this.#generacion) return null;

    const inicio = this.#ctx.currentTime + ADELANTO;
    let final = inicio;
    plan.forEach((evento, i) => {
      final = Math.max(final, this.#programar(buffers[i], inicio + evento.cuando,
                                              evento.pulsacion, evento.ganancia));
    });
    return final;
  }







  callar() {
    this.#generacion++;
    if (!this.#ctx) return;
    const t = this.#ctx.currentTime;
    const hasta = t + MS_CALLAR / 1000;
    for (const { fuente, volumen } of this.#vivas) {
      volumen.gain.cancelScheduledValues(t);
      volumen.gain.setValueAtTime(volumen.gain.value, t);
      volumen.gain.linearRampToValueAtTime(0, hasta);
      try {
        fuente.stop(hasta);
      } catch {

      }
    }
    this.#vivas.clear();
  }

  async #reproducir(plan) {
    const final = await this.programar(plan);
    if (final === null) return false;
    const espera = (final - this.#ctx.currentTime) * 1000;
    await new Promise((listo) => setTimeout(listo, Math.max(0, espera)));
    return true;
  }

  async #pedir(midi) {
    if (!enRegistro(midi)) {
      throw new RangeError(
        `La nota ${midi} está fuera del material muestreado (${MIDI_MIN}-${MIDI_MAX}) `
        + 'y no puede sonar. Es un error en los datos: pasa validar_datos.py.');
    }
    return this.#muestra(midi);
  }








  #programar(buffer, cuando, pulsacion, ganancia) {
    const fuente = this.#ctx.createBufferSource();
    fuente.buffer = buffer;

    const volumen = this.#ctx.createGain();
    const suelta = cuando + pulsacion;
    const fin = Math.min(suelta + COLA, cuando + buffer.duration);
    const inicioRampa = fin - RAMPA_FINAL;

    volumen.gain.setValueAtTime(ganancia, cuando);
    if (inicioRampa > suelta) {


      volumen.gain.setTargetAtTime(0, suelta, TAU_SOLTAR);




      volumen.gain.setValueAtTime(
        ganancia * Math.exp(-(inicioRampa - suelta) / TAU_SOLTAR), inicioRampa);
    }
    volumen.gain.linearRampToValueAtTime(0, fin);

    fuente.connect(volumen).connect(this.#maestro);
    fuente.start(cuando);
    fuente.stop(fin);

    const viva = { fuente, volumen };
    this.#vivas.add(viva);
    fuente.onended = () => {
      this.#vivas.delete(viva);
      volumen.disconnect();
    };
    return fin;
  }
}


export const AJUSTES = {
  TAU_SOLTAR, COLA, RAMPA_FINAL, PULSACION, PULSACION_FINAL,
  SEPARACION, ADELANTO, GANANCIA_MAESTRA, MIDI_MIN, MIDI_MAX,
};
