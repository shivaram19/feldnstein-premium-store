import { useEffect, useMemo, useState } from 'react'
import { download, formatDate } from './api'
import {
  gaanugu, type GReportRun, type GReportSchedule, type GStockLevel, type GWarehouse,
} from './gaanugu-api'
import { useList, View } from './gaanugu-screens'
import { Button, Field, Pill, useToast } from './ui'

/* ================= REPORTS ================= */
const REPORT_TABS = ['Standard Reports', 'Custom Builder', 'Scheduled Reports'] as const

const STANDARD_REPORTS = [
  { id: 'inventory-summary', label: 'Inventory Summary', desc: 'Every stock position: on hand, reserved, hold, value, expiry.' },
  { id: 'production-yield', label: 'Production Yield', desc: 'Per batch: seed in, oil out, yield %, total cost, cost per litre.' },
  { id: 'expiry-fefo', label: 'Expiry / FEFO', desc: 'Stock ordered by expiry — first-expired, first-out picking order.' },
  { id: 'procurement-spend', label: 'Procurement Spend', desc: 'Farmer-wise purchases, quantities, and payment status.' },
] as const

export function GReports() {
  const [sub, setSub] = useState<(typeof REPORT_TABS)[number]>('Standard Reports')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {REPORT_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Standard Reports' && <StandardReports />}
      {sub === 'Custom Builder' && <CustomBuilder />}
      {sub === 'Scheduled Reports' && <ScheduledReports />}
    </section>
  )
}

/* ---------- standard ---------- */
type ReportRow = Record<string, string>

function StandardReports() {
  const [active, setActive] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {STANDARD_REPORTS.map((r) => (
          <div key={r.id} className="card" style={{ padding: 16, cursor: 'pointer', borderColor: active === r.id ? 'var(--primary)' : undefined }}
            onClick={() => setActive(active === r.id ? null : r.id)}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{r.label}</div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>{r.desc}</p>
          </div>
        ))}
      </div>
      {active && <ReportTable reportId={active} />}
    </div>
  )
}

function ReportTable({ reportId, params }: { reportId: string; params?: string }) {
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const load = () => {
    setLoading(true); setError(null)
    gaanugu.get<ReportRow[]>(`/reports/${reportId}${params ?? ''}`)
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [reportId, params])
  const cols = useMemo(() => rows && rows.length > 0 ? Object.keys(rows[0]) : [], [rows])
  const csv = () => download(`/g/reports/${reportId}${params ?? ''}${params?.includes('?') ? '&' : '?'}format=csv`, `${reportId}.csv`)
    .then(() => toast('success', 'CSV downloaded'))
    .catch((e: unknown) => toast('error', e instanceof Error ? e.message : String(e)))
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px' }}>
        <Pill tone="forest">{rows?.length ?? 0} rows</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={csv}>Download CSV</Button>
        <Button variant="ghost" small onClick={load}>Refresh</Button>
      </div>
      {loading ? <p style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
        : error ? <p style={{ padding: 16, color: 'var(--rust)' }}>{error}</p>
        : !rows || rows.length === 0 ? <p style={{ padding: 16, color: 'var(--muted)' }}>No rows for this report.</p>
        : (
          <div className="table-scroll">
            <table className="data">
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c}>{r[c] ?? '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

/* ---------- custom builder (whitelisted ledger) ---------- */
const GROUP_BYS = ['TYPE', 'PRODUCT', 'WAREHOUSE'] as const
const MOVE_TYPES = ['PRODUCTION_IN', 'PROCUREMENT_IN', 'TRANSFER_OUT', 'TRANSFER_IN', 'ORDER_OUT', 'ADJUSTMENT_OUT', 'ADJUSTMENT_IN'] as const

function CustomBuilder() {
  const today = new Date()
  const threeMonthsAgo = new Date(today.getTime() - 90 * 864e5)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const [form, setForm] = useState({
    from: iso(threeMonthsAgo), to: iso(today), groupBy: 'TYPE' as (typeof GROUP_BYS)[number],
    type: '', variantId: '', warehouseId: '',
  })
  const [params, setParams] = useState<string | null>(null)
  const stock = useList<GStockLevel>('/stock-levels')
  const warehouses = useList<GWarehouse>('/warehouses')
  const build = () => {
    const q = new URLSearchParams({ from: form.from, to: form.to, groupBy: form.groupBy })
    if (form.type) q.set('type', form.type)
    if (form.variantId) q.set('variantId', form.variantId)
    if (form.warehouseId) q.set('warehouseId', form.warehouseId)
    setParams(`?${q.toString()}`)
  }
  const skus = useMemo(() => [...new Map((stock.data ?? []).map((s) => [s.variant?.id, s.variant?.sku])).entries()].filter(([id]) => id), [stock.data])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="card" style={{ padding: 16, maxWidth: 860 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)' }}>
          The custom builder operates on the stock-movement ledger only — group by a whitelisted
          dimension, filter by date / SKU / warehouse / movement type. No arbitrary SQL (ADR-0011).
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="From"><input className="input" type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} /></Field>
          <Field label="To"><input className="input" type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} /></Field>
          <Field label="Group by">
            <select className="input" value={form.groupBy} onChange={(e) => setForm((f) => ({ ...f, groupBy: e.target.value as typeof form.groupBy }))}>
              {GROUP_BYS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Movement type">
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="">All</option>
              {MOVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="SKU">
            <select className="input" value={form.variantId} onChange={(e) => setForm((f) => ({ ...f, variantId: e.target.value }))}>
              <option value="">All</option>
              {skus.map(([id, sku]) => <option key={id} value={id}>{sku}</option>)}
            </select>
          </Field>
          <Field label="Warehouse">
            <select className="input" value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}>
              <option value="">All</option>
              {warehouses.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Button variant="gold" disabled={!form.from || !form.to} onClick={build}>Run report</Button>
        </div>
      </div>
      {params && <ReportTable reportId="ledger" params={params} key={params} />}
    </div>
  )
}

/* ---------- scheduled ---------- */
const FREQ_TONE: Record<string, 'green' | 'gold' | 'forest'> = { DAILY: 'green', WEEKLY: 'gold', MONTHLY: 'forest' }

function ScheduledReports() {
  const schedules = useList<GReportSchedule>('/report-schedules')
  const runs = useList<GReportRun>('/reports/runs')
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const runNow = async (s: GReportSchedule) => {
    setBusy(true)
    try {
      await gaanugu.post(`/reports/schedules/${s.id}/run-now`)
      toast('success', `"${s.name}" ran — see runs below`)
      runs.reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const downloadRun = (r: GReportRun) =>
    download(`/g/reports/runs/${r.id}/csv`, `${r.reportType.toLowerCase()}-${r.id}.csv`)
      .then(() => toast('success', 'CSV downloaded'))
      .catch((e: unknown) => toast('error', e instanceof Error ? e.message : String(e)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="card">
        <div className="toolbar" style={{ padding: '12px 16px' }}>
          <Pill tone="forest">A scheduler checks due schedules every 60s and stores the CSV run.</Pill>
          <div className="spacer" />
          <Button variant="ghost" small onClick={() => { schedules.reload(); runs.reload() }}>Refresh</Button>
        </div>
        <View loading={schedules.loading} error={schedules.error} rows={schedules.data as never[] | null} empty="No schedules defined." onRetry={schedules.reload}
          cols={[
            { key: 'name', label: 'Schedule' },
            { key: 'reportType', label: 'Report', render: (s: GReportSchedule) => <Pill tone="plain">{s.reportType.replace(/_/g, ' ')}</Pill> },
            { key: 'frequency', label: 'Frequency', render: (s: GReportSchedule) => <Pill tone={FREQ_TONE[s.frequency] ?? 'plain'}>{s.frequency}</Pill> },
            { key: 'nextRun', label: 'Next run', render: (s: GReportSchedule) => s.nextRun ?? '—' },
            { key: 'active', label: 'Status', render: (s: GReportSchedule) => <Pill tone={s.active ? 'green' : 'slate'}>{s.active ? 'ACTIVE' : 'paused'}</Pill> },
            { key: 'run', label: '', render: (s: GReportSchedule) => <Button variant="ghost" small disabled={busy} onClick={() => runNow(s)}>Run now</Button> },
          ] as never} />
      </div>
      <div className="card">
        <div className="toolbar" style={{ padding: '12px 16px' }}>
          <strong style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Recent runs</strong>
          <div className="spacer" />
          <Button variant="ghost" small onClick={runs.reload}>Refresh</Button>
        </div>
        <View loading={runs.loading} error={runs.error} rows={runs.data as never[] | null} empty="No runs yet — schedules produce their first run when due." onRetry={runs.reload}
          cols={[
            { key: 'runAt', label: 'Run at', render: (r: GReportRun) => formatDate(r.runAt) },
            { key: 'scheduleName', label: 'Schedule' },
            { key: 'reportType', label: 'Report', render: (r: GReportRun) => <Pill tone="plain">{r.reportType.replace(/_/g, ' ')}</Pill> },
            { key: 'download', label: '', render: (r: GReportRun) => <Button variant="ghost" small onClick={() => downloadRun(r)}>Download CSV</Button> },
          ] as never} />
      </div>
    </div>
  )
}
