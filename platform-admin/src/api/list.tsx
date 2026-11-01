import { useCallback, useEffect, useState } from 'react'
import { gaanugu, type StockLevel } from './types'
import { DataTable, EmptyState, ErrorState, LoadingRows, type Column } from '../ui'

/** Sellable units at a stock position. `includeOnHold` also excludes quarantined units. */
export const availableUnits = (s: StockLevel, includeOnHold = false): number =>
  s.onHand - s.reserved - (includeOnHold ? (s.onHold ?? 0) : 0)

export function useList<T>(path: string) {
  const [data, setData] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    let cancelled = false
    setLoading(true); setError(null)
    gaanugu.list<T>(path)
      .then((rows) => !cancelled && setData(rows))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [path])
  useEffect(() => reload(), [reload])
  return { data, error, loading, reload }
}

export function View({ loading, error, rows, cols, empty, rowClass, onRetry }: {
  loading: boolean; error: string | null; rows: unknown[] | null
  cols: Column<never>[]; empty: string
  rowClass?: (row: never) => string | undefined; onRetry: () => void
}) {
  if (loading) return <LoadingRows cols={cols.length} />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!rows || rows.length === 0) return <EmptyState title={empty} />
  return <DataTable columns={cols} rows={rows as never[]} rowClass={rowClass} />
}
