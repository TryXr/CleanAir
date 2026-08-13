import Decimal from 'break_infinity.js'

/** Alles, was sich als Zahl interpretieren lässt. */
export type Numeric = Decimal | number | string

/** Kurzform-Konstruktor. `d(5).add(x)` statt `new Decimal(5).add(x)`. */
export function d(value: Numeric): Decimal {
  return value instanceof Decimal ? value : new Decimal(value)
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'] as const

/** Ab dieser Zehnerpotenz wird auf 1.23e42 umgeschaltet. */
const SCIENTIFIC_AT = SUFFIXES.length * 3

/** Entfernt sinnlose Nullen: "1.20" -> "1.2", "5.00" -> "5". */
function trim(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/**
 * Hauptformatierer: 942 / 1.23K / 4.56M / 1.23e42.
 * Bewusst die einzige Stelle, an der Zahlen zu Text werden — damit eine
 * spätere Notations-Umstellung (wissenschaftlich / Engineering) ein Eingriff
 * an einem Ort bleibt.
 */
export function format(value: Numeric, decimals = 2): string {
  const n = d(value)
  if (n.lt(0)) return '-' + format(n.neg(), decimals)
  if (n.lt(1000)) return trim(n.toFixed(decimals))

  const exp = n.exponent
  if (exp >= SCIENTIFIC_AT) {
    return `${trim(n.mantissa.toFixed(decimals))}e${exp}`
  }

  const tier = Math.floor(exp / 3)
  const scaled = n.div(Decimal.pow(10, tier * 3))
  return trim(scaled.toFixed(decimals)) + (SUFFIXES[tier] ?? '')
}

/** Ganzzahlig — für Bevölkerung, Gebäudeanzahl, alles Zählbare. */
export function formatInt(value: Numeric): string {
  const n = d(value)
  return n.lt(1000) ? n.floor().toString() : format(n, 2)
}

/** Produktionsraten: "1.23K O₂/s". */
export function formatRate(value: Numeric, unit = ''): string {
  return `${format(value)}${unit ? ' ' + unit : ''}/s`
}

/** Atmosphärenwerte: 20.9 %. */
export function formatPercent(value: Numeric, decimals = 1): string {
  return `${d(value).toFixed(decimals)} %`
}

/** Sekunden -> "2h 05m", "3m 12s", "45s". Für Timer und Offline-Zeiten. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const s = Math.floor(seconds)
  if (s < 60) return `${s}s`

  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`

  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`

  return `${Math.floor(h / 24)}d ${String(h % 24).padStart(2, '0')}h`
}
