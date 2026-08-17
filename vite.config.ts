import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  /*
   * **Relativ, nicht absolut.**
   *
   * Voreingestellt ist `/`, und damit stehen im gebauten `index.html` Pfade
   * wie `/assets/index-abc.js`. Das funktioniert nur, wenn die Seite direkt
   * auf einer Domain-Wurzel liegt — auf einer GitHub-Pages-Projektseite
   * (`…github.io/CleanAir/`) sucht der Browser dann unter
   * `…github.io/assets/` und bekommt 404, die Seite bleibt schwarz.
   *
   * `./` macht die Pfade relativ zum Dokument und läuft damit an der Wurzel,
   * in einem Unterordner und sogar aus einem lokalen Dateipfad. Möglich ist
   * das, weil CleanAir eine einzige Seite ohne Routing ist: die Reiter sind
   * Zustand, keine URLs. Gäbe es echte Unterpfade, bräuchte es stattdessen
   * den konkreten Basispfad.
   */
  base: './',
  plugins: [svelte()],
  server: { port: 5173 },
})
