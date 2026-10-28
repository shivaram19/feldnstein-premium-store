import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/* ---------- buttons ---------- */
export function Button({
  variant = 'primary',
  small,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'ghost-light'; small?: boolean }) {
  const classes = ['btn', `btn-${variant}`, small ? 'btn-sm' : ''].filter(Boolean).join(' ')
  return <button className={classes} {...props} />
}

/* ---------- pill ---------- */
export type PillTone = 'green' | 'rust' | 'gold' | 'forest' | 'slate' | 'plain'
export function Pill({ tone = 'plain', children, onClick, selected }: { tone?: PillTone; children: ReactNode; onClick?: () => void; selected?: boolean }) {
  return (
    <span className={`pill pill-${tone}${selected ? ' selected' : ''}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {children}
    </span>
  )
}

/* ---------- field ---------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

/* ---------- modal ---------- */
export function Modal({
  title,
  sub,
  open,
  onClose,
  children,
}: {
  title: string
  sub?: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {sub && <p className="modal-sub">{sub}</p>}
        {children}
      </div>
    </div>
  )
}

/* ---------- data table ---------- */
export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  numeric?: boolean
}

export function DataTable<T>({ columns, rows, rowClass }: { columns: Column<T>[]; rows: T[]; rowClass?: (row: T) => string | undefined }) {
  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.numeric ? 'num' : ''}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={rowClass?.(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? 'num' : ''}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- states ---------- */
export function LoadingRows({ cols = 4 }: { cols?: number }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="skeleton-row" key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <div className="skeleton" key={j} style={{ flex: j === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state">
      <div className="state-title">{title}</div>
      <div>{hint ?? 'Use the action button above to create the first record.'}</div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state">
      <div className="state-title">Couldn’t load this view</div>
      <div>{message}</div>
      <Button variant="ghost" onClick={onRetry}>Retry</Button>
    </div>
  )
}

/* ---------- KPI ---------- */
export function Kpi({ label, value, dark }: { label: string; value: ReactNode; dark?: boolean }) {
  return (
    <div className={`kpi${dark ? ' kpi-dark' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}

/* ---------- toast ---------- */
interface ToastItem { id: number; kind: 'success' | 'error'; message: string }
const ToastCtx = createContext<(kind: 'success' | 'error', message: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const push = useCallback((kind: 'success' | 'error', message: string) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
