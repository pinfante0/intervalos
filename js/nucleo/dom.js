















export function el(nombre, props = {}, ...hijos) {
  const [etiqueta, ...clases] = nombre.split('.');
  const nodo = document.createElement(etiqueta || 'div');
  if (clases.length) nodo.className = clases.join(' ');

  for (const [clave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'clase') nodo.classList.add(...String(valor).split(' ').filter(Boolean));
    else if (clave === 'datos') Object.assign(nodo.dataset, valor);
    else if (clave === 'estilo') estilar(nodo, valor);
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2), valor);
    else if (clave in nodo) nodo[clave] = valor;
    else nodo.setAttribute(clave, valor);
  }

  añadir(nodo, hijos);
  return nodo;
}






function estilar(nodo, estilos) {
  for (const [propiedad, valor] of Object.entries(estilos)) {
    if (propiedad.startsWith('--')) nodo.style.setProperty(propiedad, valor);
    else nodo.style[propiedad] = valor;
  }
}


export function añadir(nodo, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}


export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  return nodo;
}


export function reloj(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}


export function segundos(ms, decimales = 1) {
  return `${(ms / 1000).toFixed(decimales).replace('.', ',')} s`;
}


export const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));
