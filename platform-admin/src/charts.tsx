/* Dependency-free SVG charts for the analytics dashboard — brand tokens only. */

export const CHART_COLORS = ['#184e32', '#c59b27', '#246942', '#bc4747', '#717972', '#b8860b', '#4a7c59']

const MUTED = 'var(--muted)'
const HAIRLINE = 'var(--hairline)'

export interface Slice { label: string; value: number; pct?: number }

/** Donut with the headline percentage/value in the centre and a legend with per-slice %. */
export function Donut({ data, size = 170, centerValue, centerLabel }: {
  data: Slice[]; size?: number; centerValue: string; centerLabel: string
}) {
  const total = data.reduce((a, s) => a + s.value, 0)
  const r = 70
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--cream)" strokeWidth="22" />
          {total > 0 && data.map((s, i) => {
            const frac = s.value / total
            const dash = `${frac * c} ${c}`
            const el = (
              <circle key={s.label} cx="90" cy="90" r={r} fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="22"
                strokeDasharray={dash} strokeDashoffset={-offset * c} strokeLinecap="butt" />
            )
            offset += frac
            return el
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--serif)' }}>{centerValue}</span>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>{centerLabel}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        {data.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--charcoal)', fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: MUTED }}>{s.value.toLocaleString('en-IN')}</span>
            <strong style={{ width: 48, textAlign: 'right' }}>{s.pct != null ? `${s.pct}%` : ''}</strong>
          </div>
        ))}
        {total === 0 && <p style={{ margin: 0, color: MUTED, fontSize: 12, textAlign: 'center' }}>No data yet</p>}
      </div>
    </div>
  )
}

/** Horizontal bars scaled to the largest value, each labelled with its share. */
export function HBars({ data, format }: { data: Slice[]; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const showPct = data.every((d) => d.pct != null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{d.label}</span>
            <span style={{ color: MUTED }}>
              {format ? format(d.value) : d.value.toLocaleString('en-IN')}
              {showPct && <strong style={{ color: 'var(--primary)', marginLeft: 8 }}>{d.pct}%</strong>}
            </span>
          </div>
          <div style={{ height: 16, background: 'var(--cream)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`, height: '100%', borderRadius: 8,
              background: `linear-gradient(90deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[i % CHART_COLORS.length]}cc)`,
              minWidth: d.value ? 8 : 0,
            }} />
          </div>
        </div>
      ))}
      {data.length === 0 && <p style={{ margin: 0, color: MUTED, fontSize: 12 }}>No data yet</p>}
    </div>
  )
}

export interface Series { name: string; color?: string; values: number[] }

/** Stacked vertical columns for month-shaped data (e.g. spend paid vs pending). */
export function VBars({ months, series, format }: { months: string[]; series: Series[]; format?: (v: number) => string }) {
  const totals = months.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0))
  const max = Math.max(...totals, 1)
  const colors = series.map((s, i) => s.color ?? CHART_COLORS[i % CHART_COLORS.length])
  return (
    <div>
      <div style={{ display: 'flex', gap: 18, justifyContent: 'flex-end', marginBottom: 10, fontSize: 11, fontWeight: 700 }}>
        {series.map((s, i) => (
          <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: colors[i] }} />{s.name}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 170, borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: 0 }}>
        {months.map((mo, i) => (
          <div key={mo} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>{totals[i] ? (format ? format(totals[i]) : compact(totals[i])) : ''}</span>
            <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '70%', maxWidth: 44, height: 130, justifyContent: 'flex-start' }}>
              {series.map((s, si) => (
                <div key={s.name} title={`${s.name}: ${s.values[i] ?? 0}`} style={{
                  width: '100%',
                  height: `${((s.values[i] ?? 0) / max) * 100}%`,
                  background: colors[si],
                  borderRadius: si === 0 ? '5px 5px 0 0' : 0,
                  minHeight: (s.values[i] ?? 0) > 0 ? 3 : 0,
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        {months.map((mo) => <span key={mo} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase' }}>{mo}</span>)}
      </div>
    </div>
  )
}

function compact(v: number): string {
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : String(v)
}
