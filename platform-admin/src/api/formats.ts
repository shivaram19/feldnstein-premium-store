export function formatINR(v: number): string {
  return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Percentages from the API are raw BigDecimals — round for display. */
export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${Math.round(v * 10) / 10}%`
}

/** Date-only formatting — for DATE columns where a time component would be misleading. */
export function formatDay(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { dateStyle: 'medium' })
}
