<script lang="ts">
  import { createRng } from '../engine/rng'
  import { currentPlanetDef, planet } from '../state/planet.svelte'
  import {
    fireIntensity,
    o2Percent,
    pollutionPercent,
    totalAtmosphere,
  } from '../systems/atmosphere'
  import { forestFill } from '../systems/forest'
  import { populationCapacity } from '../systems/population'

  /**
   * Der Planet als drehende Kugel (DESIGN.md §2).
   *
   * Alles hier ist Ableitung aus dem Spielstand, nichts ist Dekoration:
   * der Bewuchs wächst mit dem O₂-Anteil, der Dunst mit den Schadstoffen,
   * die Lichter auf der Nachtseite mit der Bevölkerung, die glühenden Flecken
   * mit der Brandstärke. Wer die Zahlen nicht liest, sieht sie trotzdem.
   *
   * Zur Regel „Zeitabhängige Logik nur als registriertes System" (CLAUDE.md):
   * die Drehung hier ist **keine** Spiellogik. Sie wird nicht gespeichert,
   * beeinflusst nichts und darf deshalb an requestAnimationFrame hängen —
   * im Gegenteil, im Tick wäre sie an die Simulationsrate gekoppelt und
   * würde beim Offline-Nachlauf durchdrehen.
   */

  let canvas: HTMLCanvasElement | undefined = $state()

  /** Fixe Geländepunkte je Planet — derselbe Planet sieht immer gleich aus. */
  interface Feature {
    lat: number
    lon: number
    size: number
    /** 0…1 — ab welchem Bewuchsgrad dieser Punkt grün wird. */
    greenAt: number
    shade: number
  }

  function buildFeatures(seed: string): Feature[] {
    const rng = createRng(`oberflaeche:${seed}`)
    const list: Feature[] = []
    for (let i = 0; i < 110; i++) {
      list.push({
        // asin sorgt für gleichmäßige Verteilung auf der Kugel statt
        // Häufung an den Polen.
        lat: Math.asin(rng.range(-1, 1)),
        lon: rng.range(0, Math.PI * 2),
        size: rng.range(0.05, 0.16),
        greenAt: rng.range(0, 0.9),
        shade: rng.range(-0.12, 0.12),
      })
    }
    return list
  }

  function rgb(c: string): { r: number; g: number; b: number } {
    return {
      r: parseInt(c.slice(1, 3), 16),
      g: parseInt(c.slice(3, 5), 16),
      b: parseInt(c.slice(5, 7), 16),
    }
  }

  function mix(a: string, b: string, t: number): string {
    const x = rgb(a)
    const y = rgb(b)
    const k = Math.min(1, Math.max(0, t))
    const v = (p: number, q: number) => Math.round(p + (q - p) * k)
    return `rgb(${v(x.r, y.r)}, ${v(x.g, y.g)}, ${v(x.b, y.b)})`
  }

  /** Farbe aufhellen oder abdunkeln. `mix()` liefert bereits rgb(), daher beides. */
  function shadeOf(color: string, amount: number, alpha = 1): string {
    const c = color.startsWith('#')
      ? rgb(color)
      : (() => {
          const [r = 0, g = 0, b = 0] = color.match(/\d+/g)?.map(Number) ?? []
          return { r, g, b }
        })()
    const f = (v: number) => Math.round(Math.min(255, Math.max(0, v * amount)))
    return `rgba(${f(c.r)}, ${f(c.g)}, ${f(c.b)}, ${alpha})`
  }

  $effect(() => {
    const el = canvas
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    const langsam = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let features = buildFeatures(planet.id)
    let featureSeed = planet.id
    let raf = 0
    const start = performance.now()

    function draw(now: number): void {
      const def = currentPlanetDef()
      if (featureSeed !== def.id) {
        features = buildFeatures(def.id)
        featureSeed = def.id
      }

      const dpr = window.devicePixelRatio || 1
      const w = el!.clientWidth
      const h = el!.clientHeight
      if (el!.width !== w * dpr || el!.height !== h * dpr) {
        el!.width = w * dpr
        el!.height = h * dpr
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.36
      const t = langsam ? 0 : ((now - start) / 1000) * 0.09

      /* --- Werte aus dem Spielstand ------------------------------------- */
      const o2 = o2Percent()
      const ziel = def.o2Window.min
      // Bewuchs folgt dem O₂-Anteil, bekommt aber vom echten Wald einen Schub.
      const bewuchs = Math.min(1, (o2 / Math.max(1, ziel)) * 0.8 + forestFill() * 0.35)
      const dreck = def.maxPollution ? Math.min(1, pollutionPercent() / def.maxPollution) : 0
      const feuer = fireIntensity()
      const kapazitaet = populationCapacity()
      const besiedelt = kapazitaet.gt(0)
        ? Math.min(1, planet.settlers.div(kapazitaet).toNumber())
        : 0
      // Wie dicht die Lufthülle wirkt: erzeugtes Gas gegen das native Inertgas.
      const luft = Math.min(
        1,
        totalAtmosphere().sub(def.baseAtmosphere).div(def.baseAtmosphere).toNumber(),
      )

      const himmel = mix(def.palette.sky, '#6a5a3a', dreck * 0.7)

      /* --- Atmosphärenhof ------------------------------------------------ */
      const hofR = r * (1.06 + 0.16 * luft)
      const hof = ctx!.createRadialGradient(cx, cy, r * 0.92, cx, cy, hofR)
      hof.addColorStop(0, shadeOf(himmel, 1, 0.42 * (0.25 + luft)))
      hof.addColorStop(1, shadeOf(himmel, 1, 0))
      ctx!.fillStyle = hof
      ctx!.beginPath()
      ctx!.arc(cx, cy, hofR, 0, Math.PI * 2)
      ctx!.fill()

      /* --- Grundkugel -----------------------------------------------------
         Der Bewuchs färbt die *ganze* Kugel, nicht nur einzelne Flecken.
         Mit Flecken allein bewegte sich die Durchschnittsfarbe beim
         Begrünen von 118,102,83 auf 114,104,82 — gemessen unsichtbar,
         obwohl DESIGN §2 genau das sichtbar machen will.
      --------------------------------------------------------------------- */
      const boden = mix(def.palette.rock, '#4f9457', bewuchs * 0.6)
      const grund = ctx!.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r)
      grund.addColorStop(0, shadeOf(boden, 1.25))
      grund.addColorStop(0.7, shadeOf(boden, 0.85))
      grund.addColorStop(1, shadeOf(boden, 0.35))
      ctx!.save()
      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, Math.PI * 2)
      ctx!.clip()
      ctx!.fillStyle = grund
      ctx!.fillRect(cx - r, cy - r, r * 2, r * 2)

      /* --- Oberfläche ------------------------------------------------------ */
      for (const f of features) {
        const lon = f.lon + t
        const cosLat = Math.cos(f.lat)
        const x = cosLat * Math.sin(lon)
        const y = Math.sin(f.lat)
        const z = cosLat * Math.cos(lon)
        if (z <= 0) continue

        // Licht von links oben, damit die Kugel plastisch wirkt.
        const licht = Math.max(0, x * -0.45 + y * 0.5 + z * 0.74)
        const px = cx + x * r
        const py = cy - y * r
        const gr = f.size * r * (0.5 + z * 0.5)

        const gruen = bewuchs > f.greenAt
        const basis = gruen ? mix(boden, '#2f7a40', 0.5) : boden
        // Zurückhaltend: die Flecken sollen Landmassen andeuten, nicht die
        // Kugel scheckig machen. Mit voller Deckkraft und dunklem Multiplikator
        // sah der Planet krank aus statt bewachsen.
        ctx!.fillStyle = shadeOf(basis, 0.82 + licht * 0.45 + f.shade, 0.22 + z * 0.22)
        ctx!.beginPath()
        ctx!.arc(px, py, gr, 0, Math.PI * 2)
        ctx!.fill()
      }

      /* --- Der Farbtupfer des Planeten ------------------------------------ */
      // Pyras Lava, Kryos Eisfelder, Nimbus' Gasbänder: wenige, größere Flecken.
      for (let i = 0; i < features.length; i += 7) {
        const f = features[i]!
        const lon = f.lon + t
        const cosLat = Math.cos(f.lat)
        const x = cosLat * Math.sin(lon)
        const y = Math.sin(f.lat)
        const z = cosLat * Math.cos(lon)
        if (z <= 0) continue
        ctx!.fillStyle = shadeOf(def.palette.accent, 1, 0.12 * z)
        ctx!.beginPath()
        ctx!.arc(cx + x * r, cy - y * r, f.size * r * 1.2 * z, 0, Math.PI * 2)
        ctx!.fill()
      }

      /* --- Schadstoffdunst -------------------------------------------------- */
      if (dreck > 0.02) {
        ctx!.fillStyle = `rgba(150, 120, 60, ${0.35 * dreck})`
        ctx!.fillRect(cx - r, cy - r, r * 2, r * 2)
      }

      /* --- Nachtseite ------------------------------------------------------- */
      const nacht = ctx!.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.2, cx, cy, r * 1.15)
      nacht.addColorStop(0, 'rgba(0,0,0,0)')
      nacht.addColorStop(0.55, 'rgba(0,0,0,0.12)')
      nacht.addColorStop(1, 'rgba(0,0,0,0.82)')
      ctx!.fillStyle = nacht
      ctx!.fillRect(cx - r, cy - r, r * 2, r * 2)

      /* --- Lichter der Siedlungen ------------------------------------------ */
      if (besiedelt > 0.01) {
        for (const f of features) {
          if (f.greenAt > besiedelt * 1.6) continue
          const lon = f.lon + t
          const cosLat = Math.cos(f.lat)
          const x = cosLat * Math.sin(lon)
          const y = Math.sin(f.lat)
          const z = cosLat * Math.cos(lon)
          if (z <= 0) continue
          const licht = x * -0.45 + y * 0.5 + z * 0.74
          // Nur dort, wo es dunkel ist — sonst sieht man sie ohnehin nicht.
          if (licht > 0.25) continue
          ctx!.fillStyle = `rgba(255, 214, 140, ${0.75 * z})`
          ctx!.beginPath()
          ctx!.arc(cx + x * r, cy - y * r, Math.max(0.7, r * 0.012), 0, Math.PI * 2)
          ctx!.fill()
        }
      }

      /* --- Brände ----------------------------------------------------------- */
      if (feuer > 0.01) {
        const flackern = 0.6 + 0.4 * Math.sin(now / 90)
        for (let i = 0; i < features.length; i += 5) {
          const f = features[i]!
          if (f.greenAt > feuer * 2.2) continue
          const lon = f.lon + t
          const cosLat = Math.cos(f.lat)
          const x = cosLat * Math.sin(lon)
          const y = Math.sin(f.lat)
          const z = cosLat * Math.cos(lon)
          if (z <= 0) continue
          ctx!.fillStyle = `rgba(255, 128, 48, ${0.65 * z * flackern})`
          ctx!.beginPath()
          ctx!.arc(cx + x * r, cy - y * r, r * 0.035 * (0.6 + flackern * 0.6), 0, Math.PI * 2)
          ctx!.fill()
        }
      }

      ctx!.restore()

      /* --- Lichtsaum am Rand ------------------------------------------------ */
      ctx!.strokeStyle = shadeOf(himmel, 1.6, 0.35 + 0.45 * luft)
      ctx!.lineWidth = 1.5
      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, Math.PI * 2)
      ctx!.stroke()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  })
</script>

<canvas bind:this={canvas} aria-label="Ansicht des Planeten {planet.name}"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 220px;
  }
</style>
