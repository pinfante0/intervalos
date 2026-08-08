# Muestras de piano

48 notas de piano de cola, una por archivo, cubriendo desde el MIDI 43 hasta el 90
(cuatro octavas). El nombre de cada archivo **es su número MIDI**: `60.mp3` es el do
central. Se nombran así, y no `C4` o `Do3`, porque la nomenclatura española y la
científica se llevan dos octavas y esa confusión ya ha costado tiempo en este proyecto.

Formato: MP3, 44,1 kHz, estéreo, unos 3,1 s por nota. El conjunto pesa 1,1 MB.

Las muestras vienen sin apagadores: suenan hasta extinguirse. La articulación —la caída
al soltar la tecla— la aplica el juego.

## Procedencia y licencia

Tomadas nota a nota del proyecto **midi-js-soundfonts**, que las publica ya renderizadas
a partir del **Fluid (R3) General MIDI SoundFont**, instrumento *acoustic grand piano*.

- Fuente: https://github.com/gleitz/midi-js-soundfonts
- SoundFont original: FluidR3_GM
- Licencia: **Creative Commons Attribution 3.0** (CC BY 3.0)

La licencia solo exige **citar la autoría**. No lleva cláusula de "compartir igual", así
que no obliga al resto del proyecto a adoptar la misma licencia — que es la razón por la
que se eligió este banco y no los otros dos del mismo repositorio, ambos CC BY-SA.

**Esta atribución tiene que aparecer también en los créditos del juego**, no solo aquí.

## Cómo se eligieron

Frente al piano que habíamos sintetizado, medido nota a nota. El sintetizado resultó ser
mucho más sordo en el registro grave —centroide espectral de 545 Hz frente a 1567 Hz en
la misma nota—, porque el filtro del martillo tenía una frecuencia de corte fija y en el
grave se llevaba por delante casi todo el espectro. El procedimiento de comparación está
en `motor_audio/comparar_muestras.py`.
