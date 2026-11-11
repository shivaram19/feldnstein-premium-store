import { Button, Pill } from '../ui'
import { formatINR, formatDay } from '../api/formats'
import { type StockLevel } from '../api/types'
import { useList, View, availableUnits } from '../api/list'

export function StockScreen() {
  const { data, error, loading, reload } = useList<StockLevel>('/stock-levels?size=500')
  return (
    <section>
      <div className="toolbar">
        <Pill tone="forest">{data?.length ?? 0} positions</Pill>
        <div className="spacer" />
        <Button variant="ghost" small onClick={reload}>Refresh</Button>
      </div>
      <div className="card">
        <View loading={loading} error={error} rows={data as never[] | null} empty="No stock on hand." onRetry={reload}
          rowClass={((s: StockLevel) => (availableUnits(s) < 10 ? 'row-low-stock' : undefined)) as never}
          cols={[
            { key: 'sku', label: 'SKU', render: (s: StockLevel) => s.variant?.sku },
            { key: 'product', label: 'Oil', render: (s: StockLevel) => s.variant?.product?.name },
            { key: 'batch', label: 'Batch', render: (s: StockLevel) => s.batch?.batchCode ?? s.batch?.code ?? '—' },
            { key: 'warehouse', label: 'Warehouse', render: (s: StockLevel) => s.warehouse?.name },
            { key: 'onHand', label: 'On hand', numeric: true },
            { key: 'reserved', label: 'Reserved', numeric: true },
            { key: 'onHold', label: 'On hold', numeric: true, render: (s: StockLevel) =>
              s.onHold ? <Pill tone="gold">{s.onHold}</Pill> : 0 },
            { key: 'available', label: 'Available', numeric: true, render: (s: StockLevel) =>
              <Pill tone={availableUnits(s) < 10 ? 'rust' : 'green'}>{availableUnits(s)}</Pill> },
            { key: 'unitCost', label: 'Unit cost', numeric: true, render: (s: StockLevel) => (s.unitCost != null ? formatINR(s.unitCost) : '—') },
            { key: 'expiryDate', label: 'Expires', render: (s: StockLevel) => formatDay(s.expiryDate ?? '') },
          ] as never} />
      </div>
    </section>
  )
}
