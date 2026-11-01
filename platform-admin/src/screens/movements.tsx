import { Button, Pill } from '../ui'
import { formatDate } from '../api/formats'
import { type StockMovement } from '../api/types'
import { useList, View } from '../api/list'

const movementTone = (t: string) => (t.endsWith('_IN') ? 'green' : t === 'ADJUSTMENT_OUT' ? 'rust' : 'gold') as never



export function MovementsScreen() {
  const { data, error, loading, reload } = useList<StockMovement>('/stock-movements?size=500')
  return (
    <section>
      <div className="toolbar">
        <Pill tone="green">IN = received</Pill><Pill tone="gold">OUT = issued / transfer / adjustment</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No movements recorded." onRetry={reload}
          cols={[
            { key: 'movementNo', label: 'Ref' },
            { key: 'movedAt', label: 'When', render: (m: StockMovement) => formatDate(m.movedAt) },
            { key: 'type', label: 'Type', render: (m: StockMovement) => <Pill tone={movementTone(m.type)}>{m.type.replace(/_/g, ' ')}</Pill> },
            { key: 'sku', label: 'SKU', render: (m: StockMovement) => m.variant?.sku },
            { key: 'fromTo', label: 'From → To', render: (m: StockMovement) =>
              `${m.fromWarehouse?.name ?? '—'} → ${m.toWarehouse?.name ?? '—'}` },
            { key: 'quantity', label: 'Qty', numeric: true, render: (m: StockMovement) =>
              <span style={{ fontWeight: 700, color: m.type.endsWith('_IN') ? 'var(--herb)' : 'var(--rust)' }}>
                {m.type.endsWith('_IN') ? '+' : '−'}{m.quantity}
              </span> },
            { key: 'referenceId', label: 'Reference' },
            { key: 'performedBy', label: 'By' },
          ] as never} />
      </div>
    </section>
  )
}
