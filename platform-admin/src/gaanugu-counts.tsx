import { useEffect, useMemo, useState, useCallback } from 'react'
import { formatDay } from './api'
import { formatDate } from './api'
import {
  gaanugu, type GCountLine, type GCountPlan, type GWarehouse,
} from './gaanugu-api'
import { useList, View } from './gaanugu-screens'
import { Button, ConfirmModal, DataTable, Field, Modal, Pill, useToast } from './ui'

/* ================= STOCK COUNTS ================= */
const COUNT_TABS = ['Count Plans', 'Execute Count', 'Reconciliation'] as const
const COUNT_TONE: Record<string, 'green' | 'gold' | 'rust' | 'slate' | 'forest'> = {
  PLANNED: 'slate', IN_PROGRESS: 'gold', COMPLETED: 'forest', RECONCILED: 'green',
}

export function GCounts() {
  const [sub, setSub] = useState<(typeof COUNT_TABS)[number]>('Count Plans')
  const plans = useList<GCountPlan>('/counts/plans')
  const [activeId, setActiveId] = useState<number | null>(null)
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {COUNT_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Count Plans' && <PlansTable plans={plans} onOpen={(id) => { setActiveId(id); setSub('Execute Count') }} />}
      {sub === 'Execute Count' && <ExecutePlan plans={plans} activeId={activeId} setActiveId={setActiveId} />}
      {sub === 'Reconciliation' && <Reconciliation plans={plans} activeId={activeId} setActiveId={setActiveId} />}
    </section>
  )
}

function planCols(onOpen: (id: number) => void) {
  return [
    { key: 'planCode', label: 'Plan #' },
    { key: 'scopeDesc', label: 'Scope' },
    { key: 'warehouse', label: 'Warehouse', render: (p: GCountPlan) => p.warehouse ?? 'All' },
    { key: 'plannedDate', label: 'Planned', render: (p: GCountPlan) => formatDay(p.plannedDate ?? '') },
    { key: 'status', label: 'Status', render: (p: GCountPlan) => <Pill tone={COUNT_TONE[p.status] ?? 'plain'}>{p.status.replace(/_/g, ' ')}</Pill> },
    { key: 'lineCount', label: 'Lines', numeric: true },
    { key: 'varianceCount', label: 'Variances', numeric: true, render: (p: GCountPlan) =>
      p.varianceCount > 0 ? <Pill tone="rust">{p.varianceCount}</Pill> : 0 },
    { key: 'open', label: '', render: (p: GCountPlan) => <Button variant="ghost" small onClick={() => onOpen(p.id)}>Open</Button> },
  ] as never
}

function PlansTable({ plans, onOpen }: { plans: ReturnType<typeof useList<GCountPlan>>; onOpen: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px 0' }}>
        <Pill tone="forest">{plans.data?.length ?? 0} plans</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={plans.reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ New count plan</Button>
      </div>
      <View loading={plans.loading} error={plans.error} rows={plans.data as never[] | null} empty="No count plans yet." onRetry={plans.reload}
        cols={planCols(onOpen)} />
      <PlanModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Plan created with lines'); plans.reload() }} />
    </div>
  )
}

function PlanModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [warehouses, setWarehouses] = useState<GWarehouse[]>([])
  const [form, setForm] = useState({ warehouseId: '', scopeDesc: '', plannedDate: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    gaanugu.list<GWarehouse>('/warehouses').then(setWarehouses).catch(() => undefined)
  }, [open])
  const valid = form.plannedDate
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.post('/counts/plans', {
        warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
        scopeDesc: form.scopeDesc.trim() || null, plannedDate: form.plannedDate,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="New count plan" sub="Lines are generated from current stock positions in scope." open={open} onClose={onClose}>
      <Field label="Scope description"><input className="input" style={{ width: '100%' }} value={form.scopeDesc} onChange={(e) => setForm((f) => ({ ...f, scopeDesc: e.target.value }))} placeholder="Weekly count — A-rack bottles" autoFocus /></Field>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Warehouse (blank = all)">
          <select className="input" value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}>
            <option value="">All warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="Planned date"><input className="input" type="date" value={form.plannedDate} onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))} /></Field>
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Create plan'}</Button>
      </div>
    </Modal>
  )
}

function usePlanDetail(activeId: number | null) {
  const [detail, setDetail] = useState<GCountPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Reload only when the selected plan changes or explicitly asked — reloading on every
  // plans-list refresh would wipe unsaved counted quantities mid-entry.
  const load = useCallback(() => {
    if (!activeId) { setDetail(null); return }
    gaanugu.get<GCountPlan>(`/counts/plans/${activeId}`).then(setDetail).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [activeId])
  useEffect(load, [load])
  return { detail, error, reload: load }
}

function ExecutePlan({ plans, activeId, setActiveId }: {
  plans: ReturnType<typeof useList<GCountPlan>>; activeId: number | null; setActiveId: (id: number) => void
}) {
  const candidates = useMemo(() => plans.data?.filter((p) => p.status === 'PLANNED' || p.status === 'IN_PROGRESS') ?? [], [plans.data])
  const { detail, error, reload } = usePlanDetail(activeId)
  const toast = useToast()
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)

  const start = async () => {
    if (!detail) return
    setBusy(true)
    try {
      await gaanugu.post(`/counts/plans/${detail.id}/start`)
      toast('success', 'Count started')
      plans.reload(); reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const saveLine = async (lineId: number) => {
    if (drafts[lineId] === undefined) return
    setBusy(true)
    try {
      await gaanugu.update(`/counts/lines/${lineId}`, { countedQty: Number(drafts[lineId]) })
      setDrafts((d) => { const n = { ...d }; delete n[lineId]; return n })
      reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const complete = async () => {
    if (!detail) return
    setBusy(true)
    try {
      await gaanugu.post(`/counts/plans/${detail.id}/complete`)
      toast('success', 'Count completed — variances computed')
      plans.reload(); reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="card">
        <div className="toolbar" style={{ padding: '12px 16px' }}>
          <Pill tone="gold">{candidates.length} plans awaiting count</Pill>
          <div className="spacer" />
          <Button variant="ghost" small onClick={plans.reload}>Refresh</Button>
        </div>
        <View loading={plans.loading} error={plans.error} rows={candidates as never[] | null} empty="Nothing to count — create a plan first." onRetry={plans.reload}
          cols={planCols(setActiveId)} />
      </div>
      {activeId && (
        <div className="card">
          <div className="toolbar" style={{ padding: '12px 16px' }}>
            <strong>{detail?.planCode ?? 'Loading…'}</strong>
            {detail && <Pill tone={COUNT_TONE[detail.status] ?? 'plain'}>{detail.status.replace(/_/g, ' ')}</Pill>}
            {detail?.status === 'IN_PROGRESS' && detail.lines && (
              <Pill tone="plain">{detail.lines.filter((l) => l.countedQty != null).length} / {detail.lines.length} counted</Pill>
            )}
            <div className="spacer" />
            {detail?.status === 'PLANNED' && <Button variant="gold" small disabled={busy} onClick={start}>Start count</Button>}
            {detail?.status === 'IN_PROGRESS' && <Button variant="gold" small disabled={busy} onClick={complete}>Complete count</Button>}
            <Button variant="ghost" small onClick={reload}>Reload</Button>
          </div>
          {error && <p style={{ padding: '0 16px', color: 'var(--rust)' }}>{error}</p>}
          {detail?.lines && (
            <DataTable columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'product', label: 'Oil' },
              { key: 'batchCode', label: 'Batch', render: (l: GCountLine) => l.batchCode ?? '—' },
              { key: 'warehouse', label: 'Warehouse' },
              { key: 'systemQty', label: 'System', numeric: true },
              { key: 'counted', label: 'Counted', numeric: true, render: (l: GCountLine) =>
                detail.status === 'IN_PROGRESS' ? (
                  <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <input className="input" style={{ width: 90, textAlign: 'right' }} type="number" min="0"
                      defaultValue={l.countedQty ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [l.id]: e.target.value }))} />
                    <Button variant="ghost" small disabled={drafts[l.id] === undefined || busy} onClick={() => saveLine(l.id)}>Save</Button>
                  </span>
                ) : (l.countedQty ?? '—') },
              { key: 'variance', label: 'Variance', numeric: true, render: (l: GCountLine) =>
                l.variance == null ? '—' : l.variance === 0 ? <Pill tone="green">0</Pill> : <Pill tone="rust">{l.variance}</Pill> },
            ] as never} rows={detail.lines as never[]} />
          )}
        </div>
      )}
    </div>
  )
}

function Reconciliation({ plans, activeId, setActiveId }: {
  plans: ReturnType<typeof useList<GCountPlan>>; activeId: number | null; setActiveId: (id: number) => void
}) {
  const candidates = useMemo(() => plans.data?.filter((p) => p.status === 'COMPLETED' || p.status === 'RECONCILED') ?? [], [plans.data])
  const { detail, error, reload } = usePlanDetail(activeId)
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmReconcile, setConfirmReconcile] = useState(false)
  const reconcile = async () => {
    if (!detail) return
    setBusy(true)
    try {
      const res = await gaanugu.post<{ adjustmentsPosted: number }>(`/counts/plans/${detail.id}/reconcile`)
      toast('success', `Reconciled — ${res.adjustmentsPosted} adjustment(s) posted to the ledger`)
      setConfirmReconcile(false)
      plans.reload(); reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const variances = detail?.lines?.filter((l) => l.variance != null && l.variance !== 0) ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="card">
        <div className="toolbar" style={{ padding: '12px 16px' }}>
          <Pill tone="forest">{candidates.length} completed counts</Pill>
          <div className="spacer" />
          <Button variant="ghost" small onClick={plans.reload}>Refresh</Button>
        </div>
        <View loading={plans.loading} error={plans.error} rows={candidates as never[] | null} empty="No completed counts yet." onRetry={plans.reload}
          cols={planCols(setActiveId)} />
      </div>
      {activeId && detail && (
        <div className="card">
          <div className="toolbar" style={{ padding: '12px 16px' }}>
            <strong>{detail.planCode}</strong>
            <Pill tone={COUNT_TONE[detail.status] ?? 'plain'}>{detail.status.replace(/_/g, ' ')}</Pill>
            {detail.completedAt && <span style={{ fontSize: 12, color: 'var(--muted)' }}>completed {formatDate(detail.completedAt)}</span>}
            <div className="spacer" />
            {detail.status === 'COMPLETED' && (
              <Button variant="gold" small disabled={busy} onClick={() => setConfirmReconcile(true)}>
                Reconcile — post {variances.length} adjustment(s)
              </Button>
            )}
            <Button variant="ghost" small onClick={reload}>Reload</Button>
          </div>
          <ConfirmModal open={confirmReconcile}
            title={`Reconcile ${detail.planCode}`}
            sub={`${variances.length} variance line(s) will become permanent ledger adjustments (ADJUSTMENT_IN/OUT) referencing this count. This cannot be undone.`}
            confirmLabel="Post adjustments" busy={busy}
            onClose={() => setConfirmReconcile(false)} onConfirm={reconcile} />
          {error && <p style={{ padding: '0 16px', color: 'var(--rust)' }}>{error}</p>}
          {variances.length === 0 ? (
            <p style={{ padding: '0 16px 14px', color: 'var(--muted)' }}>Zero variance — physical matches system. Nothing to post.</p>
          ) : (
            <DataTable columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'warehouse', label: 'Warehouse' },
              { key: 'systemQty', label: 'System', numeric: true },
              { key: 'countedQty', label: 'Counted', numeric: true },
              { key: 'variance', label: 'Variance', numeric: true, render: (l: GCountLine) => <Pill tone="rust">{l.variance}</Pill> },
              { key: 'countedBy', label: 'Counted by' },
            ] as never} rows={variances as never[]} />
          )}
        </div>
      )}
    </div>
  )
}
