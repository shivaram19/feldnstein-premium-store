import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span>{children}</span>
      {action}
    </div>
  )
}

/** Debounced search input — fires `onSearch` 300 ms after the last keystroke. */
export function SearchBox({ placeholder, onSearch }: { placeholder: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState('')
  useEffect(() => {
    const t = setTimeout(() => onSearch(value.trim()), 300)
    return () => clearTimeout(t)
  }, [value, onSearch])
  return (
    <input className="input" type="search" placeholder={placeholder} value={value}
      aria-label="Search" onChange={(e) => setValue(e.target.value)} />
  )
}
