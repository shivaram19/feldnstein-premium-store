import { useState, useMemo } from 'react'
import { Button, DataTable, Pill } from '../ui'
import { formatDay } from '../api/formats'
import { type StockLevel, type Warehouse } from '../api/types'
import { useList, View, availableUnits } from '../api/list'

export function WarehousesScreen() {
  const { data, error, loading, reload } = useList<Warehouse>('/warehouses?size=500')
  const stock = useList<StockLevel>('/stock-levels?size=500')
  const [selected, setSelected] = useState<number | null>(null)
  const active = data?.find((w) => w.id === selected)
  const stockRows = useMemo(
    () => stock.data?.filter((s) => s.warehouse?.id === selected) ?? null,
    [stock.data, selected])
  return (
    <section>
      <div className="card">
        <div className="toolbar" style={{ padding: '12px 16px 0' }}>
          <Pill tone="forest">{data?.length ?? 0} warehouses</Pill>
          <div className="spacer" />
          <Button variant="ghost" small onClick={() => { reload(); stock.reload() }}>Refresh</Button>
        </div>
        <View loading={loading} error={error} rows={data as never[] | null} empty="No warehouses defined." onRetry={reload}
          rowClass={((w: Warehouse) => (w.id === selected ? 'row-selected' : undefined)) as never}
          cols={[
            { key: 'code', label: 'Code', render: (w: Warehouse) => <Pill tone="forest">{w.code}</Pill> },
            { key: 'name', label: 'Name' },
            { key: 'type', label: 'Type', render: (w: Warehouse) => <Pill tone="plain">{w.type.replace(/_/g, ' ')}</Pill> },
            { key: 'manager', label: 'Manager', render: (w: Warehouse) => w.managerName ?? '—' },
            { key: 'units', label: 'Units held', numeric: true, render: (w: Warehouse) =>
              stock.data?.filter((s) => s.warehouse?.id === w.id).reduce((n, s) => n + s.onHand, 0) ?? '—' },
            { key: 'open', label: '', render: (w: Warehouse) => <Button variant="ghost" small onClick={() => setSelected(w.id === selected ? null : w.id)}>{selected === w.id ? 'Close' : 'View stock'}</Button> },
          ] as never} />
      </div>
      {active && (
        <div className="card" style={{ marginTop: 22 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Stock at {active.name}
          </div>
          {stock.loading ? <p style={{ padding: 16 }}>Loading…</p>
            : !stockRows || stockRows.length === 0 ? <p style={{ padding: 16, color: 'var(--muted)' }}>No stock held at this warehouse.</p>
            : <DataTable columns={[
                { key: 'sku', label: 'SKU', render: (s: StockLevel) => s.variant?.sku },
                { key: 'product', label: 'Oil', render: (s: StockLevel) => s.variant?.product?.name },
                { key: 'batch', label: 'Batch', render: (s: StockLevel) => s.batch?.code ?? '—' },
                { key: 'onHand', label: 'On hand', numeric: true },
                { key: 'reserved', label: 'Reserved', numeric: true },
                { key: 'available', label: 'Available', numeric: true, render: (s: StockLevel) => <Pill tone={availableUnits(s, true) < 10 ? 'rust' : 'green'}>{availableUnits(s, true)}</Pill> },
                { key: 'expiry', label: 'Expires', render: (s: StockLevel) => formatDay(s.expiryDate ?? '') },
              ] as never} rows={stockRows as never[]} />}
        </div>
      )}
    </section>
  )
}
