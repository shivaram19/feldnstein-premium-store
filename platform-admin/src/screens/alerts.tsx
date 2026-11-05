import { useState, useMemo } from 'react'
import { Button, DataTable, Field, Modal, Pill, useToast } from '../ui'
import { formatDate } from '../api/formats'
import { type StockLevel, type AlertRule, type Alert, type AppSetting, type AuditEvent, gaanugu } from '../api/types'
import { useList, View, availableUnits } from '../api/list'

/* ================= ALERTS ================= */
const ALERT_TABS = ['Active Alerts', 'Alert Rules'] as const
const SEV_TONE: Record<string, 'green' | 'gold' | 'rust' | 'slate'> = {
  INFO: 'slate', WARNING: 'gold', CRITICAL: 'rust',
}
const RULE_TYPES = ['LOW_STOCK', 'NEAR_EXPIRY', 'QC_OVERDUE'] as const

export function AlertsScreen() {
  const [sub, setSub] = useState<(typeof ALERT_TABS)[number]>('Active Alerts')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {ALERT_TABS.map((t) => (
            <Pill key={t} tone={sub === t ? 'forest' : 'plain'} selected={sub === t} onClick={() => setSub(t)}>{t}</Pill>
          ))}
        </div>
      </div>
      {sub === 'Active Alerts' ? <ActiveAlerts /> : <AlertRules />}
    </section>
  )
}

function ActiveAlerts() {
  const { data, error, loading, reload } = useList<Alert>('/alerts?size=500')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const open = useMemo(() => data?.filter((a) => a.status === 'OPEN') ?? [], [data])
  const others = useMemo(() => data?.filter((a) => a.status !== 'OPEN').slice(0, 20) ?? [], [data])
  const dismiss = async (a: Alert) => {
    setBusy(true)
    try {
      await gaanugu.update(`/alerts/${a.id}`, { ...a, status: 'DISMISSED' })
      toast('success', 'Alert dismissed')
      reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const regenerate = async () => {
    setBusy(true)
    try {
      await gaanugu.post('/alerts-ops/regenerate')
      toast('success', 'Alerts regenerated from rules')
      reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const cols = [
    { key: 'severity', label: 'Severity', render: (a: Alert) => <Pill tone={SEV_TONE[a.severity] ?? 'plain'}>{a.severity}</Pill> },
    { key: 'alertType', label: 'Type', render: (a: Alert) => <Pill tone="forest">{a.alertType.replace(/_/g, ' ')}</Pill> },
    { key: 'message', label: 'Message' },
    { key: 'refId', label: 'Reference' },
    { key: 'createdAt', label: 'Raised', render: (a: Alert) => formatDate(a.createdAt) },
    { key: 'status', label: 'Status', render: (a: Alert) => <Pill tone={a.status === 'OPEN' ? 'gold' : 'slate'}>{a.status}</Pill> },
  ] as never
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px 0' }}>
        <Pill tone="rust">{open.length} open</Pill>
        <div className="spacer" />
        <Button variant="ghost" small disabled={busy} onClick={regenerate}>{busy ? 'Working…' : 'Regenerate from rules'}</Button>
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <div style={{ padding: '4px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)' }}>OPEN</div>
      {open.length === 0 && !loading && <p style={{ padding: '0 16px 12px', color: 'var(--muted)' }}>No open alerts — inventory is healthy.</p>}
      {open.length > 0 && (
        <DataTable columns={[
          ...cols,
          { key: 'dismiss', label: '', render: (a: Alert) => <Button variant="ghost" small disabled={busy} onClick={() => dismiss(a)}>Dismiss</Button> },
        ] as never} rows={open as never[]} />
      )}
      {others.length > 0 && (
        <>
          <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--muted)', borderTop: '1px solid var(--hairline)' }}>HISTORY</div>
          <DataTable columns={cols} rows={others as never[]} />
        </>
      )}
      {(loading || error) && <View loading={loading} error={error} rows={[]} cols={cols} empty="" onRetry={reload} />}
    </div>
  )
}

function AlertRules() {
  const { data, error, loading, reload } = useList<AlertRule>('/alert-rules?size=500')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const toggle = async (r: AlertRule) => {
    setBusy(true)
    try {
      await gaanugu.update(`/alert-rules/${r.id}`, { ...r, active: !r.active })
      toast('success', r.active ? 'Rule paused' : 'Rule activated')
      reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 16px 0' }}>
        <Pill tone="forest">{data?.filter((r) => r.active).length ?? 0} active rules</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
        <Button variant="gold" small onClick={() => setOpen(true)}>+ New rule</Button>
      </div>
      <View loading={loading} error={error} rows={data as never[] | null} empty="No alert rules defined." onRetry={reload}
        cols={[
          { key: 'ruleType', label: 'Type', render: (r: AlertRule) => <Pill tone="forest">{r.ruleType.replace(/_/g, ' ')}</Pill> },
          { key: 'scope', label: 'Scope', render: (r: AlertRule) => r.scopeRef ?? 'ALL' },
          { key: 'threshold', label: 'Threshold', numeric: true, render: (r: AlertRule) =>
            r.ruleType === 'NEAR_EXPIRY' ? `${r.thresholdValue} days` : r.ruleType === 'QC_OVERDUE' ? `${r.thresholdValue} days` : `${r.thresholdValue} units` },
          { key: 'active', label: 'Status', render: (r: AlertRule) => <Pill tone={r.active ? 'green' : 'slate'}>{r.active ? 'ACTIVE' : 'paused'}</Pill> },
          { key: 'toggle', label: '', render: (r: AlertRule) => <Button variant="ghost" small disabled={busy} onClick={() => toggle(r)}>{r.active ? 'Pause' : 'Activate'}</Button> },
        ] as never} />
      <RuleModal open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); toast('success', 'Rule created'); reload() }} />
    </div>
  )
}

function RuleModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ ruleType: 'LOW_STOCK', scopeRef: 'ALL', thresholdValue: '20' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = Number(form.thresholdValue) > 0
  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await gaanugu.create('/alert-rules?size=500', {
        ruleType: form.ruleType, scopeRef: form.scopeRef.trim() || 'ALL',
        thresholdValue: Number(form.thresholdValue), active: true,
      })
      onCreated()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <Modal title="New alert rule" sub="The evaluator materialises alerts every 60s (or on demand)." open={open} onClose={onClose}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field label="Type">
          <select className="input" value={form.ruleType} onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value }))}>
            {RULE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Scope (SKU or ALL)"><input className="input" value={form.scopeRef} onChange={(e) => setForm((f) => ({ ...f, scopeRef: e.target.value }))} /></Field>
        <Field label="Threshold"><input className="input" type="number" min="1" value={form.thresholdValue} onChange={(e) => setForm((f) => ({ ...f, thresholdValue: e.target.value }))} /></Field>
      </div>
      {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="gold" disabled={!valid || busy} onClick={submit}>{busy ? 'Saving…' : 'Create rule'}</Button>
      </div>
    </Modal>
  )
}

/* ================= SETTINGS ================= */
const SETTINGS_TABS = [
  { id: 'general', label: 'General', prefix: 'general.' },
  { id: 'reorder', label: 'Reorder Rules', prefix: 'reorder.' },
  { id: 'expiry', label: 'Expiry Policy', prefix: 'expiry.' },
  { id: 'bullpress', label: 'Bull & Press Config', prefix: null },
  { id: 'permissions', label: 'Permissions', prefix: 'permissions' },
] as const

export function SettingsScreen() {
  const [sub, setSub] = useState<(typeof SETTINGS_TABS)[number]['id']>('general')
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          {SETTINGS_TABS.map((t) => (
            <Pill key={t.id} tone={sub === t.id ? 'forest' : 'plain'} selected={sub === t.id} onClick={() => setSub(t.id)}>{t.label}</Pill>
          ))}
        </div>
      </div>
      {sub === 'permissions' ? <PermissionsMatrix /> : <SettingsGroup
        prefixes={sub === 'bullpress' ? ['bull.', 'press.'] : [SETTINGS_TABS.find((t) => t.id === sub)!.prefix!]} />}
    </section>
  )
}

function SettingsGroup({ prefixes }: { prefixes: string[] }) {
  const { data, error, loading, reload } = useList<AppSetting>('/settings')
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [invalid, setInvalid] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const rows = useMemo(
    () => data?.filter((s) => prefixes.some((p) => s.settingKey.startsWith(p))) ?? null,
    [data, prefixes])
  const validate = (s: AppSetting, value: string): string | null => {
    if (value.trim() === '') return null
    switch (s.valueType) {
      case 'INTEGER': return /^\d+$/.test(value.trim()) ? null : 'whole number expected'
      case 'DECIMAL': return /^\d+(\.\d+)?$/.test(value.trim()) ? null : 'number expected'
      case 'BOOLEAN': return /^(true|false)$/i.test(value.trim()) ? null : 'true or false'
      default: return null
    }
  }
  const save = async (s: AppSetting) => {
    const value = drafts[s.id]
    if (value === undefined) return
    const problem = validate(s, value)
    if (problem) {
      setInvalid((d) => ({ ...d, [s.id]: problem }))
      return
    }
    setBusy(true)
    try {
      await gaanugu.update(`/settings/${s.id}`, { ...s, settingValue: value })
      toast('success', `${s.settingKey} updated`)
      setDrafts((d) => { const n = { ...d }; delete n[s.id]; return n })
      setInvalid((d) => { const n = { ...d }; delete n[s.id]; return n })
      reload()
    } catch (e) { toast('error', e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <div className="card">
      <View loading={loading} error={error} rows={rows as never[] | null} empty="No settings in this group." onRetry={reload}
        cols={[
          { key: 'settingKey', label: 'Key', render: (s: AppSetting) => <code style={{ fontSize: 12 }}>{s.settingKey}</code> },
          { key: 'value', label: 'Value', render: (s: AppSetting) => (
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
              <input className="input" style={{ width: 220, borderColor: invalid[s.id] ? 'var(--rust)' : undefined }}
                aria-invalid={!!invalid[s.id]} defaultValue={s.settingValue ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))} />
              {invalid[s.id] && <span style={{ fontSize: 11, color: 'var(--rust)', fontWeight: 600 }}>{invalid[s.id]}</span>}
            </span>
          ) },
          { key: 'type', label: 'Type', render: (s: AppSetting) => <Pill tone="plain">{s.valueType}</Pill> },
          { key: 'description', label: 'What it controls' },
          { key: 'save', label: '', render: (s: AppSetting) => (
            <Button variant="ghost" small disabled={drafts[s.id] === undefined || busy} onClick={() => save(s)}>Save</Button>
          ) },
        ] as never} />
    </div>
  )
}

const ROLE_MATRIX: { capability: string; admin: boolean; operator: boolean; customer: boolean }[] = [
  { capability: 'View dashboards, stock, batches, quality', admin: true, operator: true, customer: false },
  { capability: 'Create/edit batches, QC checks, procurement, counts', admin: true, operator: true, customer: false },
  { capability: 'Post stock transfers, adjustments, hold/release', admin: true, operator: true, customer: false },
  { capability: 'Dismiss alerts, manage alert rules', admin: true, operator: true, customer: false },
  { capability: 'Manage orders — cancel & refund (ADR-0014)', admin: true, operator: true, customer: false },
  { capability: 'View analytics & reports, run/download CSV', admin: true, operator: false, customer: false },
  { capability: 'Edit settings (general, reorder, expiry, bull & press)', admin: true, operator: false, customer: false },
  { capability: 'View audit log', admin: true, operator: false, customer: false },
  { capability: 'Shop and place orders (storefront)', admin: false, operator: false, customer: true },
]

function PermissionsMatrix() {
  type Row = (typeof ROLE_MATRIX)[number]
  return (
    <div className="card">
      <DataTable columns={[
        { key: 'capability', label: 'Capability' },
        { key: 'admin', label: 'ADMIN', render: (r: Row) => r.admin ? <Pill tone="green">✓</Pill> : <Pill tone="slate">—</Pill> },
        { key: 'operator', label: 'OPERATOR', render: (r: Row) => r.operator ? <Pill tone="green">✓</Pill> : <Pill tone="slate">—</Pill> },
        { key: 'customer', label: 'CUSTOMER', render: (r: Row) => r.customer ? <Pill tone="green">✓</Pill> : <Pill tone="slate">—</Pill> },
      ] as never} rows={ROLE_MATRIX as never[]} />
      <p style={{ padding: '0 16px 14px', margin: 0, fontSize: 12, color: 'var(--muted)' }}>
        Roles are enforced by the Quarkus security realm (ADR-0005). Demo realm users are not editable at runtime.
      </p>
    </div>
  )
}

/* ================= AUDIT LOG ================= */
export function AuditLogScreen() {
  const { data, error, loading, reload } = useList<AuditEvent>('/audit-events')
  const [action, setAction] = useState('ALL')
  const actions = useMemo(() => [...new Set(data?.map((e) => e.action) ?? [])], [data])
  const rows = useMemo(
    () => !data ? null : action === 'ALL' ? data : data.filter((e) => e.action === action),
    [data, action])
  return (
    <section>
      <div className="toolbar">
        <div className="filter-row">
          <Pill tone={action === 'ALL' ? 'forest' : 'plain'} selected={action === 'ALL'} onClick={() => setAction('ALL')}>All</Pill>
          {actions.map((a) => (
            <Pill key={a} tone={action === a ? 'forest' : 'plain'} selected={action === a} onClick={() => setAction(a)}>{a.replace(/_/g, ' ')}</Pill>
          ))}
        </div>
        <div className="spacer" />
        {rows && <Pill tone="plain">{rows.length} events</Pill>}
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={rows as never[] | null}
          empty={action === 'ALL' ? 'No audit events captured yet.' : `No ${action.replace(/_/g, ' ').toLowerCase()} events.`}
          onRetry={reload}
          cols={[
            { key: 'at', label: 'When', render: (e: AuditEvent) => formatDate(e.at) },
            { key: 'actor', label: 'Actor', render: (e: AuditEvent) => <Pill tone="forest">{e.actor}</Pill> },
            { key: 'action', label: 'Action', render: (e: AuditEvent) => <Pill tone="gold">{e.action.replace(/_/g, ' ')}</Pill> },
            { key: 'entityId', label: 'Reference' },
            { key: 'detail', label: 'Detail', render: (e: AuditEvent) =>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{e.detailJson ?? '—'}</span> },
          ] as never} />
      </div>
    </section>
  )
}

/* ================= HOLD & RELEASE (QC) ================= */
export function HoldReleaseScreen() {
  const stock = useList<StockLevel>('/stock-levels?size=500')
  const [modal, setModal] = useState<{ level: StockLevel; mode: 'hold' | 'release' } | null>(null)
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const submit = async () => {
    if (!modal) return
    setBusy(true); setError(null)
    try {
      await gaanugu.post(`/stock/${modal.mode}`, { stockLevelId: modal.level.id, quantity: Number(qty) })
      toast('success', modal.mode === 'hold' ? 'Units placed on hold' : 'Units released')
      setModal(null); setQty('')
      stock.reload()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const held = stock.data?.reduce((n, s) => n + (s.onHold ?? 0), 0) ?? 0
  return (
    <section>
      <div className="toolbar">
        <Pill tone="gold">{held} units on hold</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={stock.reload}>Refresh</Button>
      </div>
      <div className="card">
        <View loading={stock.loading} error={stock.error} rows={stock.data as never[] | null} empty="No stock positions." onRetry={stock.reload}
          cols={[
            { key: 'sku', label: 'SKU', render: (s: StockLevel) => s.variant?.sku },
            { key: 'product', label: 'Oil', render: (s: StockLevel) => s.variant?.product?.name },
            { key: 'batch', label: 'Batch', render: (s: StockLevel) => s.batch?.code ?? '—' },
            { key: 'warehouse', label: 'Warehouse', render: (s: StockLevel) => s.warehouse?.name },
            { key: 'onHand', label: 'On hand', numeric: true },
            { key: 'available', label: 'Available', numeric: true, render: (s: StockLevel) => availableUnits(s, true) },
            { key: 'onHold', label: 'On hold', numeric: true, render: (s: StockLevel) =>
              (s.onHold ?? 0) > 0 ? <Pill tone="gold">{s.onHold}</Pill> : 0 },
            { key: 'actions', label: '', render: (s: StockLevel) => (
              <span style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" small disabled={availableUnits(s, true) <= 0} onClick={() => { setModal({ level: s, mode: 'hold' }); setQty('') }}>Hold</Button>
                <Button variant="ghost" small disabled={!(s.onHold ?? 0)} onClick={() => { setModal({ level: s, mode: 'release' }); setQty('') }}>Release</Button>
              </span>
            ) },
          ] as never} />
      </div>
      <Modal title={modal?.mode === 'hold' ? 'Place units on hold' : 'Release held units'}
        sub={modal ? `${modal.level.variant?.sku} · ${modal.level.warehouse?.name}` : ''}
        open={!!modal} onClose={() => setModal(null)}>
        <Field label="Quantity">
          <input className="input" type="number" min="1"
            max={modal?.mode === 'hold' ? (modal ? availableUnits(modal.level, true) : undefined) : (modal?.level.onHold ?? undefined)}
            value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        {error && <p style={{ color: 'var(--rust)', fontSize: 13, fontWeight: 600 }}>{error}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button variant="gold" disabled={!qty || Number(qty) <= 0 || busy} onClick={submit}>{busy ? 'Saving…' : 'Confirm'}</Button>
        </div>
      </Modal>
    </section>
  )
}
