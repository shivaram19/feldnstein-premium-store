import { useState } from 'react'
import { Button, ConfirmModal, DataTable, Modal, Pill, useToast, type Column } from '../ui'
import { formatDate, formatINR } from '../api/formats'
import { gaanugu, type OrderDetail, type OrderLineView, type OrderListItem } from '../api/types'
import { useList, View } from '../api/list'
import { PanelTitle } from './shared'

const STATUSES = ['PENDING', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

function statusTone(s: string): 'green' | 'rust' | 'gold' | 'forest' | 'slate' {
  switch (s) {
    case 'DELIVERED': return 'green'
    case 'SHIPPED': return 'forest'
    case 'CONFIRMED': return 'forest'
    case 'PAID': return 'gold'
    case 'CANCELLED': return 'rust'
    default: return 'slate'
  }
}

const NEXT_ACTION: Record<string, { action: string; label: string }> = {
  PAID: { action: 'confirm', label: 'Confirm order' },
  CONFIRMED: { action: 'ship', label: 'Mark shipped' },
  SHIPPED: { action: 'deliver', label: 'Mark delivered' },
}

export function OrdersScreen() {
  const [status, setStatus] = useState<string>('')
  const orders = useList<OrderListItem>(`/orders?size=200${status ? `&status=${status}` : ''}`)
  const toast = useToast()
  const [detailCode, setDetailCode] = useState<string | null>(null)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [pendingAction, setPendingAction] = useState<{ action: string; label: string } | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)

  const openDetail = (code: string) => {
    setDetailCode(code)
    setDetail(null)
    gaanugu.get<OrderDetail>(`/orders/${code}`).then(setDetail).catch(() => setDetailCode(null))
  }

  const runAction = (action: string, reason?: string) => {
    if (!detailCode) return
    setBusy(true)
    const body = action === 'cancel' ? { reason: reason || 'cancelled by admin' } : undefined
    gaanugu.post<OrderDetail>(`/orders/${detailCode}/${action}`, body)
      .then((d) => {
        setDetail(d)
        toast('success', `Order ${detailCode} ${action === 'cancel' ? 'cancelled' : d.status.toLowerCase()}`)
        orders.reload()
      })
      .catch((e: unknown) => toast('error', e instanceof Error ? e.message : 'Action failed'))
      .finally(() => { setBusy(false); setPendingAction(null); setCancelOpen(false); setCancelReason('') })
  }

  const cols: Column<never>[] = [
    { key: 'orderCode', label: 'Order', render: (o: OrderListItem) => (
      <button className="linklike" onClick={() => openDetail(o.orderCode)}>{o.orderCode}</button>
    ) },
    { key: 'customerName', label: 'Customer', render: (o: OrderListItem) => (
      <span>{o.customerName}<br /><small style={{ color: 'var(--muted)' }}>{o.email}</small></span>
    ) },
    { key: 'itemCount', label: 'Items', numeric: true },
    { key: 'grandTotal', label: 'Total', numeric: true, render: (o: OrderListItem) => formatINR(o.grandTotal) },
    { key: 'createdAt', label: 'Placed', render: (o: OrderListItem) => formatDate(o.createdAt) },
    { key: 'status', label: 'Status', render: (o: OrderListItem) => (
      <Pill tone={statusTone(o.status)}>{o.status}</Pill>
    ) },
  ] as never

  const action = detail ? NEXT_ACTION[detail.status] : undefined
  const cancellable = detail && ['PENDING', 'PAID', 'CONFIRMED'].includes(detail.status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['', ...STATUSES].map((s) => (
          <Pill key={s || 'ALL'} tone={status === s ? 'forest' : 'plain'} selected={status === s}
            onClick={() => setStatus(s)}>{s || 'All'}</Pill>
        ))}
      </div>

      <div className="card" data-testid="orders-table">
        <PanelTitle>Customer orders</PanelTitle>
        <View loading={orders.loading} error={orders.error} rows={orders.data as never[] | null}
          cols={cols} empty="No orders yet — share the storefront link." onRetry={orders.reload} />
      </div>

      <Modal open={!!detailCode} onClose={() => setDetailCode(null)}
        title={detail ? `Order ${detail.orderCode}` : 'Order'}>
        {!detail ? <p>Loading…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill tone={statusTone(detail.status)}>{detail.status}</Pill>
              {detail.payment && (
                <Pill tone={detail.payment.status === 'PAID' ? 'forest' : detail.payment.status === 'REFUNDED' ? 'rust' : 'gold'}>
                  {detail.payment.provider} · {detail.payment.status}
                </Pill>
              )}
              <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{formatINR(detail.grandTotal)}</span>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              {detail.customerName} · {detail.phone} · {detail.email}<br />{detail.address}
            </p>

            <DataTable columns={[
              { key: 'product', label: 'Item', render: (l: OrderLineView) => <span>{l.product}<br /><small style={{ color: 'var(--muted)' }}>{l.sku} · {l.sizeMl} ml</small></span> },
              { key: 'qty', label: 'Qty', numeric: true },
              { key: 'unitPrice', label: 'Price', numeric: true, render: (l: OrderLineView) => formatINR(l.unitPrice) },
              { key: 'lineTotal', label: 'Total', numeric: true, render: (l: OrderLineView) => formatINR(l.lineTotal) },
            ] as never} rows={detail.lines as never[]} />

            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {Object.entries(detail.timeline).map(([k, v]) => (
                <div key={k}>{k}: {formatDate(v)}</div>
              ))}
              {detail.cancelReason && <div style={{ color: 'var(--rust)' }}>Reason: {detail.cancelReason}</div>}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {cancellable && (
                <Button variant="ghost" onClick={() => setCancelOpen(true)}>Cancel & refund</Button>
              )}
              {action && (
                <Button variant="gold" disabled={busy} onClick={() => setPendingAction({ action: action.action, label: action.label })}>
                  {action.label}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!pendingAction} busy={busy}
        title={pendingAction?.label ?? ''}
        sub={`This moves order ${detailCode} forward in the fulfilment pipeline.`}
        confirmLabel={pendingAction?.label}
        onClose={() => setPendingAction(null)}
        onConfirm={() => pendingAction && runAction(pendingAction.action)} />

      <ConfirmModal open={cancelOpen} busy={busy}
        title="Cancel this order?"
        sub="Reserved stock is released back to inventory. A paid payment is refunded."
        confirmLabel="Cancel order"
        onClose={() => setCancelOpen(false)}
        onConfirm={() => runAction('cancel', cancelReason)} />
    </div>
  )
}
