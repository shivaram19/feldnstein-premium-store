import { useState, useEffect, useCallback } from 'react'
import { DataTable, ErrorState, Kpi, LoadingRows, Pill } from '../ui'
import { formatINR } from '../api/formats'
import { type ChartsData, type DashboardSummary, gaanugu, batchStatusTone } from '../api/types'
import { Donut, HBars, VBars, CHART_COLORS } from '../charts'
import { PanelTitle } from './shared'

const GRID3 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 } as const
const GRID2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 22 } as const
const PAD = { padding: 18 } as const

export function AnalyticsScreen() {
  const [dash, setDash] = useState<DashboardSummary | null>(null)
  const [charts, setCharts] = useState<ChartsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trace, setTrace] = useState<Record<string, unknown>[] | null>(null)
  const [traceError, setTraceError] = useState(false)
  const load = useCallback(() => {
    setError(null); setTraceError(false)
    gaanugu.dashboard().then(setDash).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    gaanugu.charts().then(setCharts).catch(() => setCharts(null))
    gaanugu.traceability().then(setTrace).catch(() => setTraceError(true))
  }, [])
  useEffect(load, [load])

  if (error) return <div className="card"><ErrorState message={error} onRetry={load} /></div>
  if (!dash || !charts) return <div className="card"><LoadingRows cols={4} /></div>

  const batchTotal = charts.batchStatus.reduce((a, s) => a + s.count, 0)
  const qcTotal = charts.qcTrend.reduce((a, m) => a + m.checks, 0)
  const qcPassed = charts.qcTrend.reduce((a, m) => a + m.passed, 0)
  const unitsOnHand = charts.availability.reduce((a, s) => a + s.units, 0)
  const sellablePct = charts.availability.find((s) => s.label === 'Sellable')?.pct ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="kpi-grid">
        <Kpi dark label="Stock asset value" value={formatINR(dash.stockValue)} />
        <Kpi label="Yield to date (L)" value={dash.totalYieldLitres} />
        <Kpi label="Procurement paid" value={formatINR(dash.procurementPaid)} />
        <Kpi label="Procurement pending" value={formatINR(dash.procurementPending)} />
        <Kpi label="QC pass rate" value={qcTotal ? `${Math.round((qcPassed / qcTotal) * 1000) / 10}%` : '—' } />
        <Kpi label="Units on hand" value={unitsOnHand.toLocaleString('en-IN')} />
      </div>

      <div style={GRID3}>
        <div className="card" data-testid="chart-batch-pipeline">
          <PanelTitle>Batch pipeline</PanelTitle>
          <div style={PAD}>
            <Donut
              centerValue={String(batchTotal)}
              centerLabel="batches"
              data={charts.batchStatus.map((s) => ({ label: s.status.replace('_', ' '), value: s.count, pct: s.pct }))}
            />
          </div>
        </div>
        <div className="card" data-testid="chart-qc-rate">
          <PanelTitle>Quality — pass rate</PanelTitle>
          <div style={PAD}>
            <Donut
              centerValue={qcTotal ? `${Math.round((qcPassed / qcTotal) * 1000) / 10}%` : '—'}
              centerLabel="QC passed"
              data={[
                { label: 'Passed', value: qcPassed, pct: qcTotal ? Math.round((qcPassed / qcTotal) * 1000) / 10 : 0 },
                { label: 'Failed / hold', value: qcTotal - qcPassed, pct: qcTotal ? Math.round(((qcTotal - qcPassed) / qcTotal) * 1000) / 10 : 0 },
              ]}
            />
          </div>
        </div>
        <div className="card" data-testid="chart-availability">
          <PanelTitle>Stock availability</PanelTitle>
          <div style={PAD}>
            <Donut
              centerValue={`${sellablePct}%`}
              centerLabel="sellable"
              data={charts.availability.map((s) => ({ label: s.label, value: s.units, pct: s.pct }))}
            />
          </div>
        </div>
      </div>

      <div style={GRID2}>
        <div className="card" data-testid="chart-stock-value">
          <PanelTitle>Stock value by product</PanelTitle>
          <div style={PAD}>
            <HBars
              data={charts.stockByProduct.map((s) => ({ label: s.product.replace('Cold-Pressed ', '').replace(' Oil', ''), value: s.value, pct: s.pct }))}
              format={formatINR}
            />
          </div>
        </div>
        <div className="card" data-testid="chart-yield-month">
          <PanelTitle>Oil yield by month (litres)</PanelTitle>
          <div style={PAD}>
            <VBars
              months={charts.yieldByMonth.map((m) => m.month)}
              series={[{ name: 'Litres', values: charts.yieldByMonth.map((m) => Number(m.litres)) }]}
              format={(v) => `${Math.round(v * 10) / 10}L`}
            />
          </div>
        </div>
        <div className="card" data-testid="chart-spend-month">
          <PanelTitle>Procurement spend by month</PanelTitle>
          <div style={PAD}>
            <VBars
              months={charts.spendByMonth.map((m) => m.month)}
              series={[
                { name: 'Paid', color: CHART_COLORS[0], values: charts.spendByMonth.map((m) => Number(m.paid)) },
                { name: 'Pending', color: CHART_COLORS[1], values: charts.spendByMonth.map((m) => Number(m.pending)) },
              ]}
              format={inrCompact}
            />
          </div>
        </div>
        <div className="card" data-testid="chart-expiry">
          <PanelTitle>Expiry risk — units by window</PanelTitle>
          <div style={PAD}>
            <HBars data={charts.expiry.map((e) => ({ label: e.bucket, value: e.units }))} />
          </div>
        </div>
      </div>

      <div style={GRID2}>
        <div className="card" data-testid="chart-qc-trend">
          <PanelTitle>QC checks vs passed — monthly</PanelTitle>
          <div style={PAD}>
            <VBars
              months={charts.qcTrend.map((m) => m.month)}
              series={[
                { name: 'Passed', color: CHART_COLORS[0], values: charts.qcTrend.map((m) => m.passed) },
                { name: 'Failed', color: CHART_COLORS[3], values: charts.qcTrend.map((m) => m.checks - m.passed) },
              ]}
            />
          </div>
        </div>
        <div className="card" data-testid="chart-bull-yield">
          <PanelTitle>Top bulls by oil yield (L)</PanelTitle>
          <div style={PAD}>
            <HBars
              data={charts.yieldByBull.map((b) => ({ label: b.name, value: Number(b.litres) }))}
              format={(v) => `${Math.round(v * 10) / 10} L`}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <PanelTitle>Traceability — farmer → bull → press → batch</PanelTitle>
        {traceError ? (
          <p style={{ padding: 16, color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>
            Couldn’t load traceability — <button className="linklike" onClick={load}>retry</button>
          </p>
        ) : !trace ? <LoadingRows cols={5} /> : (
          <DataTable columns={[
            { key: 'batchCode', label: 'Batch' },
            { key: 'product', label: 'Oil' },
            { key: 'farmer', label: 'Farmer' },
            { key: 'bull', label: 'Bull' },
            { key: 'operator', label: 'Operator' },
            { key: 'press', label: 'Press' },
            { key: 'oilYieldLitres', label: 'Yield (L)', numeric: true },
            { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Pill tone={batchStatusTone(String(r.status))}>{String(r.status).replace('_', ' ')}</Pill> },
          ] as never} rows={trace as never[]} />
        )}
      </div>
    </div>
  )
}

function inrCompact(v: number): string {
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
}
