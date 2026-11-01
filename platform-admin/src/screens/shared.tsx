import type { ReactNode } from 'react'

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span>{children}</span>
      {action}
    </div>
  )
}
